
'use server';

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  limit,
  getCountFromServer,
  Timestamp,
  DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Bookmark, Plan } from '@/types';

// Helper to serialize dates safely
const serializeDate = (date: any): string | null => {
  if (!date) return null;
  if (date instanceof Timestamp) return date.toDate().toISOString();
  if (date instanceof Date) return date.toISOString();
  if (typeof date === 'string') return date;
  const parsedDate = new Date(date);
  return isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
};

const docToBookmark = (doc: DocumentData): Bookmark => {
    const data = doc.data();
    return {
        id: doc.id,
        userId: data.userId,
        paperId: data.paperId,
        createdAt: serializeDate(data.createdAt)!,
        active: data.active,
        removedAt: serializeDate(data.removedAt),
    }
}

/**
 * Fetches the active bookmark for a specific user and paper.
 */
export async function getBookmarkForPaper(userId: string, paperId: string): Promise<Bookmark | null> {
    if (!userId || !paperId) return null;
    const bookmarksCol = collection(db, 'bookmarks');
    const q = query(
        bookmarksCol,
        where('userId', '==', userId),
        where('paperId', '==', paperId),
        where('active', '==', true),
        limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        return null;
    }
    return docToBookmark(snapshot.docs[0]);
}


/**
 * Toggles the bookmark status for a user and a paper.
 * Handles quota checking.
 */
export async function toggleBookmark(
    userId: string,
    paperId: string,
    plan: Plan,
): Promise<{ success: boolean; bookmarked: boolean; message: string; }> {

    const bookmarksCol = collection(db, 'bookmarks');
    const existingBookmarkQuery = query(
        bookmarksCol,
        where('userId', '==', userId),
        where('paperId', '==', paperId),
        limit(1)
    );

    const snapshot = await getDocs(existingBookmarkQuery);
    const existingBookmarkDoc = snapshot.empty ? null : snapshot.docs[0];

    // If bookmark exists and is active, deactivate it.
    if (existingBookmarkDoc && existingBookmarkDoc.data().active) {
        await updateDoc(existingBookmarkDoc.ref, { active: false, removedAt: serverTimestamp() });
        return { success: true, bookmarked: false, message: 'Bookmark removed.' };
    }

    // If we are here, we need to add or reactivate a bookmark, so we must check quota.
    const bookmarkFeature = plan.features.find(f => f.key === 'bookmarks');
    if (!bookmarkFeature?.isQuota) {
        return { success: false, bookmarked: false, message: "Your plan doesn't include bookmarking." };
    }
    
    const { limit: quotaLimit = 0 } = bookmarkFeature;

    if (quotaLimit !== -1) { // -1 means unlimited
        const activeBookmarksQuery = query(
            bookmarksCol,
            where('userId', '==', userId),
            where('active', '==', true)
        );
        const activeCountSnapshot = await getCountFromServer(activeBookmarksQuery);
        const activeCount = activeCountSnapshot.data().count;

        if (activeCount >= quotaLimit) {
            return { success: false, bookmarked: false, message: `You have reached your bookmark limit of ${quotaLimit}.` };
        }
    }

    // Quota check passed. Now, either reactivate or create.
    if (existingBookmarkDoc) { // It was inactive, reactivate it
         await updateDoc(existingBookmarkDoc.ref, { active: true, removedAt: null });
    } else { // It didn't exist, create it
        await addDoc(bookmarksCol, {
            userId,
            paperId,
            createdAt: serverTimestamp(),
            active: true,
            removedAt: null,
        });
    }

    return { success: true, bookmarked: true, message: 'Paper bookmarked!' };
}
