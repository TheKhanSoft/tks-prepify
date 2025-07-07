
'use server';

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  Timestamp,
  DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Plan, Download } from '@/types';

const serializeDate = (date: any): string | null => {
  if (!date) return null;
  if (date instanceof Timestamp) return date.toDate().toISOString();
  if (date instanceof Date) return date.toISOString();
  if (typeof date === 'string') return date;
  const parsedDate = new Date(date);
  return isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
};

const docToDownload = (doc: DocumentData): Download => {
    const data = doc.data();
    return {
        id: doc.id,
        userId: data.userId,
        paperId: data.paperId,
        createdAt: serializeDate(data.createdAt)!,
    }
}

/**
 * Counts the number of downloads for a user within the current month.
 */
export async function countMonthlyDownloads(userId: string): Promise<number> {
    if (!userId) return 0;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch all download records for the user to avoid needing a composite index.
    // This is less efficient at scale but works without database index configuration.
    const downloadsQuery = query(
        collection(db, 'downloads'),
        where('userId', '==', userId)
    );
    const snapshot = await getDocs(downloadsQuery);

    let count = 0;
    snapshot.forEach(doc => {
        const data = doc.data();
        // Filter in-memory by comparing dates
        if (data.createdAt && data.createdAt.toDate() >= startOfMonth) {
            count++;
        }
    });
    
    return count;
}


/**
 * Checks if a user can download based on their plan quota and records the download if they can.
 */
export async function checkAndRecordDownload(
    userId: string,
    paperId: string,
    plan: Plan,
): Promise<{ success: boolean; message: string; }> {

    const downloadFeature = plan.features.find(f => f.key === 'downloads');
    
    if (!downloadFeature) {
        return { success: false, message: "Your current plan does not include paper downloads." };
    }

    if (downloadFeature.isQuota) {
        const quotaLimit = downloadFeature.limit ?? 0;

        if (quotaLimit !== -1) { // -1 means unlimited
            // We'll simplify and assume all download quotas are monthly for now.
            const monthlyDownloads = await countMonthlyDownloads(userId);
            if (monthlyDownloads >= quotaLimit) {
                return { success: false, message: `You have reached your monthly download limit of ${quotaLimit}.` };
            }
        }
    }
    
    // Quota check passed, or feature is included without quota. Record the download.
    const downloadsCol = collection(db, 'downloads');
    await addDoc(downloadsCol, {
        userId,
        paperId,
        createdAt: serverTimestamp(),
    });

    return { success: true, message: 'Download recorded.' };
}
