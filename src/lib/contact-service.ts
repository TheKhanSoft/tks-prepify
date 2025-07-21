
'use server';

import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, doc, updateDoc, DocumentData, arrayUnion, getDoc, where, getCountFromServer } from 'firebase/firestore';
import { db } from './firebase';
import type { ContactSubmission, MessageReply, ContactSubmissionStatus } from '@/types';
import { getUserProfile } from './user-service';
import { getPlanById } from './plan-service';
import { checkAndRecordSupportRequest } from './support-request-service';
import { serializeDate } from './utils';

// NOTE: File upload logic is not handled here.
// This service assumes the file has been uploaded to a storage service (e.g., Firebase Storage)
// and the public URL is passed in the `attachmentUrl` field.
// The client-side form needs to handle the upload process.
type ContactFormData = {
  name: string;
  email: string;
  topic: string;
  subject: string;
  message: string;
  orderId?: string;
  attachment?: File; // Keep as File for now, but expect URL in real implementation
}

export async function submitContactForm(data: ContactFormData, userId?: string | null) {
  try {
    const submissionsCollection = collection(db, 'contact_submissions');
    
    // In a real application, you would upload the `data.attachment` file to a cloud storage
    // service here and get back a public URL. For this example, we'll just store a placeholder.
    let attachmentUrl = "";
    if (data.attachment) {
        // Placeholder for file upload logic
        // e.g., attachmentUrl = await uploadFileToFirebaseStorage(data.attachment);
        attachmentUrl = `placeholder_for_${data.attachment.name}`;
    }

    const initialData: any = {
      name: data.name,
      email: data.email,
      topic: data.topic,
      subject: data.subject,
      message: data.message,
      orderId: data.orderId || null,
      attachmentUrl: attachmentUrl || null,
      userId: userId || null,
      priority: false,
      isRead: false,
      status: 'open',
      createdAt: serverTimestamp(),
      lastRepliedAt: serverTimestamp(),
      replies: [],
    };
    
    const newSubmissionRef = await addDoc(submissionsCollection, initialData);

    if (userId) {
      const profile = await getUserProfile(userId);
      if (profile?.planId) {
        const plan = await getPlanById(profile.planId);
        if (plan) {
          const quotaCheck = await checkAndRecordSupportRequest(userId, newSubmissionRef.id, plan);
          if (quotaCheck.success) {
            await updateDoc(newSubmissionRef, { priority: true });
          }
        }
      }
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to submit message. Please try again later." };
  }
}

export interface ReplyData {
  authorId: string;
  authorName: string;
  message: string;
}

export async function addReplyToSubmission(submissionId: string, replyData: ReplyData) {
  try {
    const submissionRef = doc(db, 'contact_submissions', submissionId);
    const submissionSnap = await getDoc(submissionRef);
    if (!submissionSnap.exists()) {
        throw new Error("Submission not found.");
    }
    const submissionData = submissionSnap.data();

    const isAdminReply = replyData.authorId !== submissionData.userId;
    const newStatus: ContactSubmissionStatus = isAdminReply ? 'replied' : 'open';

    await updateDoc(submissionRef, {
      replies: arrayUnion({
        ...replyData,
        createdAt: new Date(),
      }),
      status: newStatus,
      lastRepliedAt: serverTimestamp(),
      isRead: isAdminReply,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to add reply." };
  }
}

const docToContactSubmission = (doc: DocumentData): ContactSubmission => {
    const data = doc.data();
    const replies = data.replies?.map((reply: any): MessageReply => ({
        id: (reply.createdAt?.toDate() || new Date()).toISOString(),
        authorId: reply.authorId,
        authorName: reply.authorName,
        message: reply.message,
        createdAt: reply.createdAt.toDate(),
    })).sort((a: MessageReply, b: MessageReply) => a.createdAt.getTime() - b.createdAt.getTime()) || [];

    return {
        id: doc.id,
        name: data.name,
        email: data.email,
        topic: data.topic,
        subject: data.subject,
        message: data.message,
        createdAt: data.createdAt.toDate(),
        lastRepliedAt: data.lastRepliedAt ? data.lastRepliedAt.toDate() : data.createdAt.toDate(),
        isRead: data.isRead,
        userId: data.userId,
        priority: data.priority,
        replies: replies,
        status: data.status || 'open',
        orderId: data.orderId,
        attachmentUrl: data.attachmentUrl,
    }
}

export async function fetchContactSubmissions(): Promise<ContactSubmission[]> {
  try {
    const submissionsCol = collection(db, 'contact_submissions');
    const q = query(submissionsCol);
    const snapshot = await getDocs(q);
    
    const submissions = snapshot.docs.map(docToContactSubmission);
    
    submissions.sort((a,b) => new Date(b.lastRepliedAt!).getTime() - new Date(a.lastRepliedAt!).getTime());

    return submissions;
  } catch (error) {
    return [];
  }
}

export async function getSubmissionById(submissionId: string, userId?: string): Promise<ContactSubmission | null> {
    const submissionRef = doc(db, 'contact_submissions', submissionId);
    const submissionDoc = await getDoc(submissionRef);

    if (!submissionDoc.exists()) {
        return null;
    }
    
    const submission = docToContactSubmission(submissionDoc);
    
    if (userId && submission.userId !== userId) {
        return null;
    }
    
    return submission;
}


export async function fetchSubmissionsForUser(userId: string): Promise<ContactSubmission[]> {
  try {
    const submissionsCol = collection(db, 'contact_submissions');
    const q = query(submissionsCol, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    
    const submissions = snapshot.docs.map(docToContactSubmission);
    
    submissions.sort((a,b) => new Date(b.lastRepliedAt!).getTime() - new Date(a.lastRepliedAt!).getTime());

    return submissions;
  } catch(e) {
    return [];
  }
}

export async function updateSubmissionStatus(id: string, status: ContactSubmissionStatus, isRead: boolean) {
  try {
    const submissionRef = doc(db, 'contact_submissions', id);
    await updateDoc(submissionRef, { status, isRead });
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update status." };
  }
}

export async function getUnreadMessageSummary(): Promise<{ count: number; hasPriority: boolean }> {
  try {
    const q = query(collection(db, 'contact_submissions'), where('isRead', '==', false));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { count: 0, hasPriority: false };
    }

    const hasPriority = snapshot.docs.some(doc => doc.data().priority === true);
    
    return { count: snapshot.size, hasPriority };
  } catch (error) {
    return { count: 0, hasPriority: false };
  }
}
