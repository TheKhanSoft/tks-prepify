
'use server';

import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, doc, updateDoc, DocumentData, arrayUnion, getDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import type { ContactSubmission, MessageReply, ContactSubmissionStatus } from '@/types';
import { getUserProfile } from './user-service';
import { getPlanById } from './plan-service';
import { checkAndRecordSupportRequest } from './support-request-service';
import { serializeDate } from './utils';

type ContactFormData = {
  name: string;
  email: string;
  topic: string;
  subject: string;
  message: string;
}

export async function submitContactForm(data: ContactFormData, userId?: string | null) {
  try {
    const submissionsCollection = collection(db, 'contact_submissions');
    
    const initialData: any = {
      ...data,
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

    // If the person replying is not the original author of the ticket, they are an admin.
    const newStatus: ContactSubmissionStatus = replyData.authorId === submissionData.userId ? 'open' : 'replied';

    await updateDoc(submissionRef, {
      replies: arrayUnion({
        ...replyData,
        createdAt: new Date(),
      }),
      status: newStatus,
      lastRepliedAt: serverTimestamp(),
      isRead: newStatus === 'replied' ? false : true, // Mark as unread for the user if admin replies
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to add reply." };
  }
}

const docToContactSubmission = (doc: DocumentData): ContactSubmission => {
    const data = doc.data();
    const replies = data.replies?.map((reply: any): MessageReply => ({
        id: (reply.createdAt?.toDate() || new Date()).toISOString(), // use timestamp as a key
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
    }
}

export async function fetchContactSubmissions(): Promise<ContactSubmission[]> {
  try {
    const submissionsCol = collection(db, 'contact_submissions');
    // Removed orderBy to sort in memory and avoid index issues.
    const q = query(submissionsCol);
    const snapshot = await getDocs(q);
    
    const submissions = snapshot.docs.map(docToContactSubmission);
    
    // Sort in-memory
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
    
    // If a userId is provided, ensure this submission belongs to them.
    if (userId && submission.userId !== userId) {
        return null;
    }
    
    return submission;
}


export async function fetchSubmissionsForUser(userId: string): Promise<ContactSubmission[]> {
  try {
    const submissionsCol = collection(db, 'contact_submissions');
    // Remove orderBy to avoid needing a composite index
    const q = query(submissionsCol, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    
    const submissions = snapshot.docs.map(docToContactSubmission);
    
    // Sort in-memory
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
