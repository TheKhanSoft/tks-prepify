
'use server';

import {
  collection,
  query,
  where,
  addDoc,
  serverTimestamp,
  Timestamp,
  DocumentData,
  getCountFromServer,
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
  isAfter
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
 * This function relies on a composite Firestore index on (userId, createdAt).
 */
export async function countDownloadsForPeriod(
  userId: string,
  period: QuotaPeriod,
  subscriptionDate: Date
): Promise<{count: number; resetDate: string}> {
  if (!userId) {
    throw new Error('User ID is required.');
  }
  
  const now = new Date();
  const subscriptionStart = subscriptionDate;

  let startDate: Date;
  let resetDate: Date;

  switch (period) {
    case 'daily':
      startDate = startOfDay(now);
      resetDate = addDays(startDate, 1);
      break;
    
    case 'weekly': {
        let lastReset = subscriptionStart;
        let nextReset = addWeeks(lastReset, 1);
        while (isAfter(now, nextReset)) {
            lastReset = nextReset;
            nextReset = addWeeks(lastReset, 1);
        }
        startDate = lastReset;
        resetDate = nextReset;
      break;
    }

    case 'monthly': {
        let lastReset = subscriptionStart;
        let nextReset = addMonths(lastReset, 1);
        while (isAfter(now, nextReset)) {
            lastReset = nextReset;
            nextReset = addMonths(lastReset, 1);
        }
        startDate = lastReset;
        resetDate = nextReset;
      break;
    }

    case 'yearly': {
        let lastReset = subscriptionStart;
        let nextReset = addYears(lastReset, 1);
        while (isAfter(now, nextReset)) {
            lastReset = nextReset;
            nextReset = addYears(lastReset, 1);
        }
        startDate = lastReset;
        resetDate = nextReset;
      break;
    }

    case 'lifetime':
      startDate = new Date(0); // The beginning of time
      resetDate = new Date(8640000000000000); // A very far future date
      break;
      
    default:
       throw new Error(`Unsupported quota period: ${period}`);
  }
    
  const downloadsQuery = query(
    collection(db, 'downloads'),
    where('userId', '==', userId),
    where('createdAt', '>=', startDate)
  );

  const snapshot = await getCountFromServer(downloadsQuery);
  return { count: snapshot.data().count, resetDate: resetDate.toISOString() };
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
        // Fetch active user plan subscription date
        const userPlansCol = collection(db, 'user_plans');
        const q = query(userPlansCol, where("userId", "==", userId), where("status", "==", "active"), limit(1));
        const currentPlanSnapshot = await getDocs(q);

        let subscriptionDate: Date;
        if (!currentPlanSnapshot.empty) {
            const currentPlanDoc = currentPlanSnapshot.docs[0].data();
            subscriptionDate = currentPlanDoc.subscriptionDate ? currentPlanDoc.subscriptionDate.toDate() : new Date();
        } else {
            // fallback to user creation date if no active plan history (should be rare)
            const userProfile = await getUserProfile(userId);
            subscriptionDate = userProfile?.createdAt ? new Date(userProfile.createdAt) : new Date();
        }

        // Check every download-related quota
        for (const feature of downloadFeatures) {
            const quotaLimit = feature.limit ?? 0;
            const period = feature.period;

            if (quotaLimit !== -1 && period) { // -1 means unlimited
                const { count: downloadsThisPeriod } = await countDownloadsForPeriod(userId, period, subscriptionDate);
                if (downloadsThisPeriod >= quotaLimit) {
                    return { success: false, message: `You have reached your ${period} download limit of ${quotaLimit}.` };
                }
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
