
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
import type { Plan, SupportRequest, QuotaPeriod } from '@/types';
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

const docToSupportRequest = (doc: DocumentData): SupportRequest => {
    const data = doc.data();
    return {
        id: doc.id,
        userId: data.userId,
        submissionId: data.submissionId,
        createdAt: serializeDate(data.createdAt)!,
    }
}

export async function countSupportRequestsForPeriod(
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
    startDate = new Date(0);
    resetDate = null;
  } else if (period === 'daily') {
    startDate = startOfDay(now);
    resetDate = addDays(startDate, 1);
  } else {
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

  // Fetch all support requests for the user (avoids composite index)
  const requestsQuery = query(
    collection(db, 'support_requests'),
    where('userId', '==', userId)
  );

  const snapshot = await getDocs(requestsQuery);
  if (snapshot.empty) {
    return { count: 0, resetDate };
  }

  const allRequests = snapshot.docs.map(docToSupportRequest);

  // Filter in memory based on the calculated start date
  const requestsThisPeriod = allRequests.filter(request => {
    const requestDate = new Date(request.createdAt);
    return isAfter(requestDate, startDate) || requestDate.getTime() === startDate.getTime();
  });

  return { count: requestsThisPeriod.length, resetDate };
}


export async function checkAndRecordSupportRequest(
    userId: string,
    submissionId: string,
    plan: Plan,
): Promise<{ success: boolean; message: string; }> {
    const supportFeatures = plan.features.filter(f => f.key === 'priority_support' && f.isQuota);
    
    if (!plan.features.some(f => f.key === 'priority_support')) {
        return { success: false, message: "Your current plan does not include priority support." };
    }

    if (supportFeatures.length > 0) {
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

        for (const feature of supportFeatures) {
            const quotaLimit = feature.limit ?? 0;
            const period = feature.period;

            if (quotaLimit !== -1 && period) {
                const { count: requestsThisPeriod } = await countSupportRequestsForPeriod(userId, period, subscriptionDate);
                if (requestsThisPeriod >= quotaLimit) {
                    return { success: false, message: `You have reached your ${period} priority support limit of ${quotaLimit}.` };
                }
            }
        }
    }
    
    const requestsCol = collection(db, 'support_requests');
    await addDoc(requestsCol, {
        userId,
        submissionId,
        createdAt: serverTimestamp(),
    });

    return { success: true, message: 'Support request recorded.' };
}
