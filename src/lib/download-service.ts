
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
 * Date calculations are performed in UTC to align with Firestore timestamps.
 */
export async function countDownloadsForPeriod(userId: string, period: QuotaPeriod): Promise<number> {
    if (!userId || period === 'lifetime') return 0;

    const now = new Date();
    let startDate: Date;

    // Get components in UTC to create a UTC-based start date
    const yearUTC = now.getUTCFullYear();
    const monthUTC = now.getUTCMonth();
    const dateUTC = now.getUTCDate();

    switch (period) {
        case 'daily':
            // Start of the current day in UTC
            startDate = new Date(Date.UTC(yearUTC, monthUTC, dateUTC, 0, 0, 0, 0));
            break;
        case 'monthly':
            // Start of the current month in UTC
            startDate = new Date(Date.UTC(yearUTC, monthUTC, 1, 0, 0, 0, 0));
            break;
        case 'yearly':
            // Start of the current year in UTC
            startDate = new Date(Date.UTC(yearUTC, 0, 1, 0, 0, 0, 0));
            break;
        default:
             startDate = new Date(0); // Should not happen
    }
    
    const downloadsQuery = query(
        collection(db, 'downloads'),
        where('userId', '==', userId)
    );
    const snapshot = await getDocs(downloadsQuery);

    let count = 0;
    snapshot.forEach(doc => {
        const data = doc.data();
        // Firestore Timestamps are timezone-agnostic and can be directly compared to JS Dates
        if (data.createdAt && data.createdAt.toDate() >= startDate) {
            count++;
        }
    });
    
    return count;
}


/**
 * Checks if a user can download based on ALL their plan quotas and records the download if they can.
 */
export async function checkAndRecordDownload(
    userId: string,
    paperId: string,
    plan: Plan,
): Promise<{ success: boolean; message: string; }> {

    const downloadFeatures = plan.features.filter(f => f.key === 'downloads');
    
    if (downloadFeatures.length === 0) {
        return { success: false, message: "Your current plan does not include paper downloads." };
    }
    
    const quotaFeatures = downloadFeatures.filter(f => f.isQuota);

    // Check every download-related quota
    for (const feature of quotaFeatures) {
        const quotaLimit = feature.limit ?? 0;
        const period = feature.period ?? 'monthly';

        if (quotaLimit !== -1) { // -1 means unlimited
            const downloadsThisPeriod = await countDownloadsForPeriod(userId, period);
            if (downloadsThisPeriod >= quotaLimit) {
                return { success: false, message: `You have reached your ${period} download limit of ${quotaLimit}.` };
            }
        }
    }
    
    // All quota checks passed, or the feature is non-quota based. Record the download.
    const downloadsCol = collection(db, 'downloads');
    await addDoc(downloadsCol, {
        userId,
        paperId,
        createdAt: serverTimestamp(),
    });

    return { success: true, message: 'Download recorded.' };
}
