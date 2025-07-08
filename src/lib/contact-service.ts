
'use server';

import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { ContactSubmission } from '@/types';

type ContactFormData = {
  name: string;
  email: string;
  topic: string;
  subject: string;
  message: string;
}

export async function submitContactForm(data: ContactFormData) {
  try {
    const submissionsCollection = collection(db, 'contact_submissions');
    await addDoc(submissionsCollection, {
      ...data,
      createdAt: serverTimestamp(),
      isRead: false,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to submit message. Please try again later." };
  }
}

export async function fetchContactSubmissions(): Promise<ContactSubmission[]> {
  try {
    const submissionsCol = collection(db, 'contact_submissions');
    const q = query(submissionsCol, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        email: data.email,
        topic: data.topic,
        subject: data.subject,
        message: data.message,
        createdAt: data.createdAt.toDate(), // convert Firestore Timestamp to JS Date
        isRead: data.isRead,
      } as ContactSubmission;
    });
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
