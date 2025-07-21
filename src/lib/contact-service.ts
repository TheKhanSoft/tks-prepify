
'use server';

import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, doc, updateDoc, DocumentData, arrayUnion, getDoc, where, getCountFromServer } from 'firebase/firestore';
import { db } from './firebase';
import type { ContactSubmission, MessageReply, ContactSubmissionStatus } from '@/types';
import { getUserProfile } from './user-service';
import { getPlanById } from './plan-service';
import { checkAndRecordSupportRequest } from './support-request-service';
import { serializeDate } from './utils';
import { writeFile } from 'fs/promises';
import { join } from 'path';

const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
const MAX_FILE_SIZE = 1024 * 1024; // 1 MB

export async function submitContactForm(formData: FormData) {
  try {
    const submissionsCollection = collection(db, 'contact_submissions');
    
    // --- Extract and Validate Form Data ---
    const rawData = Object.fromEntries(formData.entries());
    
    // Simple validation for required fields
    if (!rawData.name || !rawData.email || !rawData.topic || !rawData.subject || !rawData.message) {
        throw new Error("Missing required form fields.");
    }
    
    let attachmentUrl = "";
    const attachment = rawData.attachment as File | undefined;
    
    if (attachment && attachment.size > 0) {
      if (attachment.size > MAX_FILE_SIZE) {
        throw new Error("File size exceeds 1MB.");
      }
      if (!ACCEPTED_FILE_TYPES.includes(attachment.type)) {
        throw new Error("Invalid file type.");
      }

      const bytes = await attachment.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const isImage = attachment.type.startsWith('image/');
      const folder = isImage ? 'images' : 'pdfs';
      const fileExtension = attachment.name.split('.').pop();
      const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExtension}`;

      const path = join(process.cwd(), 'public', folder, filename);
      await writeFile(path, buffer);
      
      attachmentUrl = `/${folder}/${filename}`;
    }

    const userId = rawData.userId as string | undefined;

    const initialData: any = {
      name: rawData.name,
      email: rawData.email,
      topic: rawData.topic,
      subject: rawData.subject,
      message: rawData.message,
      orderId: rawData.orderId || null,
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
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to submit message. Please try again later." };
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
    
    // Allow admins to view any ticket, but users can only view their own
    if (userId && submission.userId !== userId) {
        const userProfile = await getUserProfile(userId);
        if (userProfile?.role !== 'Super Admin' && userProfile?.role !== 'Admin') {
            return null;
        }
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
