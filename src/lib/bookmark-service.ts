
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
import type { Bookmark, Plan, Paper } from '@/types';
import { docToPaper } from './paper-service';

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
 * Fetches all active bookmarks for a user and returns the associated paper details.
 */
export async function fetchUserBookmarks(userId: string): Promise<Paper[]> {
  if (!userId) return [];
  
  const bookmarksCol = collection(db, 'bookmarks');
  const q = query(bookmarksCol, where('userId', '==', userId), where('active', '==', true));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return [];
  }

  const paperIds = snapshot.docs.map(doc => doc.data().paperId as string);

  if (paperIds.length === 0) {
    return [];
  }
  
  const papers: Paper[] = [];
  const papersCollection = collection(db, 'papers');

  // Firestore 'in' query has a limit of 30 values per query in v9.
  // We need to fetch papers in chunks if there are more than 30 bookmarks.
  for (let i = 0; i < paperIds.length; i += 30) {
    const chunk = paperIds.slice(i, i + 30);
    if (chunk.length > 0) {
      const papersQuery = query(papersCollection, where('__name__', 'in', chunk));
      const papersSnapshot = await getDocs(papersQuery);
      
      const paperPromises = papersSnapshot.docs
        .filter(doc => doc.exists())
        .map(doc => docToPaper(doc));

      const resolvedPapers = await Promise.all(paperPromises);
      papers.push(...resolvedPapers);
    }
  }

  return papers;
}

/**
 * Counts the number of active bookmarks for a given user.
 */
export async function countActiveBookmarks(userId: string): Promise<number> {
    if (!userId) return 0;
    const activeBookmarksQuery = query(
        collection(db, 'bookmarks'),
        where('userId', '==', userId),
        where('active', '==', true)
    );
    const activeCountSnapshot = await getCountFromServer(activeBookmarksQuery);
    return activeCountSnapshot.data().count;
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
        const activeCount = await countActiveBookmarks(userId);

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
