
'use server';

import {
  collection,
  query,
  where,
  addDoc,
  serverTimestamp,
  Timestamp,
  DocumentData,
  limit,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Plan, Download, QuotaPeriod } from '@/types';
import { getUserProfile } from './user-service';
import {
  startOfDay,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  differenceInWeeks,
  differenceInMonths,
  differenceInYears,
  isAfter,
} from 'date-fns';

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
 * This function fetches all user downloads and filters in memory to avoid needing a composite index.
 */
export async function countDownloadsForPeriod(
  userId: string,
  period: QuotaPeriod,
  subscriptionDate: Date
): Promise<{count: number; resetDate: Date | null}> {
  if (!userId) {
    throw new Error('User ID is required.');
  }

  const now = new Date();
  const subscriptionStart = startOfDay(subscriptionDate);

  let startDate: Date;
  let resetDate: Date | null = null;

  if (period === 'lifetime') {
    startDate = new Date(0); // The beginning of time for querying all downloads
    resetDate = null; // No reset for lifetime
  } else if (period === 'daily') {
    startDate = startOfDay(now);
    resetDate = addDays(startDate, 1);
  } else {
    // Logic for weekly, monthly, yearly based on subscription date
    let difference = 0;
    if (period === 'weekly') {
      difference = differenceInWeeks(now, subscriptionStart, { roundingMethod: 'floor' });
      startDate = addWeeks(subscriptionStart, difference);
      resetDate = addWeeks(startDate, 1);
    } else if (period === 'monthly') {
      difference = differenceInMonths(now, subscriptionStart);
      startDate = addMonths(subscriptionStart, difference);
      resetDate = addMonths(startDate, 1);
    } else { // 'yearly'
      difference = differenceInYears(now, subscriptionStart);
      startDate = addYears(subscriptionStart, difference);
      resetDate = addYears(startDate, 1);
    }
  }
  
  // Fetch all downloads for the user (avoids composite index)
  const downloadsQuery = query(
    collection(db, 'downloads'),
    where('userId', '==', userId)
  );
  
  const snapshot = await getDocs(downloadsQuery);
  if (snapshot.empty) {
    return { count: 0, resetDate };
  }
  
  const allDownloads = snapshot.docs.map(docToDownload);

  // Filter in memory based on the calculated start date
  const downloadsThisPeriod = allDownloads.filter(download => {
    const downloadDate = new Date(download.createdAt);
    return isAfter(downloadDate, startDate) || downloadDate.getTime() === startDate.getTime();
  });
  
  return { count: downloadsThisPeriod.length, resetDate };
}


/**
 * Checks if a user can download based on ALL their plan quotas and records the download if they can.
 */
export async function checkAndRecordDownload(
    userId: string,
    paperId: string,
    plan: Plan,
): Promise<{ success: boolean; message: string; }> {

    const downloadFeatures = plan.features.filter(f => f.key === 'downloads' && f.isQuota);
    
    // Check if the plan allows downloads at all.
    if (!plan.features.some(f => f.key === 'downloads')) {
        return { success: false, message: "Your current plan does not include paper downloads." };
    }

    if (downloadFeatures.length > 0) {
        const userPlansCol = collection(db, 'user_plans');
        const q = query(userPlansCol, where("userId", "==", userId), where("status", "==", "active"), limit(1));
        const currentPlanSnapshot = await getDocs(q);

        let subscriptionDate: Date;
        if (!currentPlanSnapshot.empty) {
            const currentPlanDoc = currentPlanSnapshot.docs[0].data();
            subscriptionDate = currentPlanDoc.subscriptionDate ? currentPlanDoc.subscriptionDate.toDate() : new Date();
        } else {
            const userProfile = await getUserProfile(userId);
            subscriptionDate = userProfile?.createdAt ? new Date(userProfile.createdAt) : new Date();
        }

        for (const feature of downloadFeatures) {
            const quotaLimit = feature.limit ?? 0;
            const period = feature.period;

            if (quotaLimit !== -1 && period) {
                const { count: downloadsThisPeriod } = await countDownloadsForPeriod(userId, period, subscriptionDate);
                if (downloadsThisPeriod >= quotaLimit) {
                    return { success: false, message: `You have reached your ${period} download limit of ${quotaLimit}.` };
                }
            }
        }
    }
    
    const downloadsCol = collection(db, 'downloads');
    await addDoc(downloadsCol, {
        userId,
        paperId,
        createdAt: serverTimestamp(),
    });

    return { success: true, message: 'Download recorded.' };
}
