
'use server';

import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, doc, updateDoc, DocumentData } from 'firebase/firestore';
import { db } from './firebase';
import type { ContactSubmission } from '@/types';
import { getUserProfile } from './user-service';
import { getPlanById } from './plan-service';
import { checkAndRecordSupportRequest } from './support-request-service';

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
      createdAt: serverTimestamp(),
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

const docToContactSubmission = (doc: DocumentData): ContactSubmission => {
    const data = doc.data();
    return {
        id: doc.id,
        name: data.name,
        email: data.email,
        topic: data.topic,
        subject: data.subject,
        message: data.message,
        createdAt: data.createdAt.toDate(),
        isRead: data.isRead,
        userId: data.userId,
        priority: data.priority,
    }
}

export async function fetchContactSubmissions(): Promise<ContactSubmission[]> {
  try {
    const submissionsCol = collection(db, 'contact_submissions');
    const q = query(submissionsCol, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(docToContactSubmission);
  } catch (error) {
    return [];
  }
}

export async function updateSubmissionStatus(id: string, isRead: boolean) {
  try {
    const submissionRef = doc(db, 'contact_submissions', id);
    await updateDoc(submissionRef, { isRead });
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update status." };
  }
}
