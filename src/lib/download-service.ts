
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
): Promise<{count: number; resetDate: Date}> {
  if (!userId) {
    throw new Error('User ID is required.');
  }
  
  const now = new Date();
  let startDate: Date;
  let resetDate: Date;

  // Set time to 00:00:00 for accurate day-based comparisons
  now.setHours(0, 0, 0, 0);
  subscriptionDate.setHours(0, 0, 0, 0);

  if (period === 'lifetime') {
    startDate = new Date(0); // The beginning of time
    resetDate = new Date(8640000000000000); // A very far future date
  } else if (period === 'daily') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    resetDate = new Date(startDate);
    resetDate.setDate(startDate.getDate() + 1);
  } else if (period === 'monthly') {
    const anchorDay = subscriptionDate.getDate();
    let cycleStartYear = now.getFullYear();
    let cycleStartMonth = now.getMonth();
    
    if (now.getDate() < anchorDay) {
      cycleStartMonth -= 1;
      if (cycleStartMonth < 0) {
        cycleStartMonth = 11;
        cycleStartYear -= 1;
      }
    }
    
    startDate = new Date(cycleStartYear, cycleStartMonth, anchorDay, 0, 0, 0, 0);
    resetDate = new Date(startDate);
    resetDate.setMonth(resetDate.getMonth() + 1);

  } else if (period === 'yearly') {
    const anchorMonth = subscriptionDate.getMonth();
    const anchorDay = subscriptionDate.getDate();
    let cycleStartYear = now.getFullYear();

    const anniversaryThisYear = new Date(cycleStartYear, anchorMonth, anchorDay, 0, 0, 0, 0);
    
    if (now < anniversaryThisYear) {
      cycleStartYear -= 1;
    }
    
    startDate = new Date(cycleStartYear, anchorMonth, anchorDay, 0, 0, 0, 0);
    resetDate = new Date(startDate);
    resetDate.setFullYear(resetDate.getFullYear() + 1);
  } else {
     throw new Error(`Unsupported quota period: ${period}`);
  }
    
  const downloadsQuery = query(
    collection(db, 'downloads'),
    where('userId', '==', userId),
    where('createdAt', '>=', startDate)
  );

  const snapshot = await getCountFromServer(downloadsQuery);
  return { count: snapshot.data().count, resetDate };
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
