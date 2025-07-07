
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
import type { Plan, Download, QuotaPeriod } from '@/types';

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
 * Counts the number of downloads for a user within a given period.
 * This function avoids needing a composite index by filtering in memory.
 */
export async function countDownloadsForPeriod(userId: string, period: QuotaPeriod): Promise<number> {
    if (!userId || period === 'lifetime') return 0; // Lifetime usage is not based on creation date but total count.

    const now = new Date();
    let startDate: Date;

    switch (period) {
        case 'daily':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case 'monthly':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'yearly':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        default:
             startDate = new Date(0); // Should not happen with typed period
    }
    
    const downloadsQuery = query(
        collection(db, 'downloads'),
        where('userId', '==', userId)
    );
    const snapshot = await getDocs(downloadsQuery);

    let count = 0;
    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.createdAt && data.createdAt.toDate() >= startDate) {
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
        const period = downloadFeature.period ?? 'monthly';

        if (quotaLimit !== -1) { // -1 means unlimited
            const downloadsThisPeriod = await countDownloadsForPeriod(userId, period);
            if (downloadsThisPeriod >= quotaLimit) {
                return { success: false, message: `You have reached your ${period} download limit of ${quotaLimit}.` };
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
