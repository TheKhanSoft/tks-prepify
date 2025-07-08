
'use server';

import { doc, setDoc, serverTimestamp, getDoc, collection, getDocs, updateDoc, DocumentData, Timestamp, writeBatch, query, where, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import type { User, Plan, UserPlan, UserPlanStatus } from '@/types';
import { fetchPlans } from './plan-service';

// Define a plain object type for user data to be passed from client to server
type UserProfileData = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

/**
 * Creates a user profile and their initial plan record in Firestore.
 * @param user The plain user data object.
 * @param planId The optional ID of the plan to assign.
 */
export async function createUserProfile(user: UserProfileData, planId?: string) {
  const userDocRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userDocRef);
  if (userDoc.exists()) return; // User already exists

  const allPlans = await fetchPlans();
  
  // Find plan by provided ID, or fall back to finding a "Free Explorer" plan
  let assignedPlan: Plan | null = null;
  if (planId) {
    assignedPlan = allPlans.find(p => p.id === planId) || null;
  }
  if (!assignedPlan) {
    assignedPlan = allPlans.find(p => p.name.toLowerCase() === 'free explorer') || null;
  }

  let planExpiryDate: Date | null = null;
  if (assignedPlan && assignedPlan.name.toLowerCase() !== 'free explorer' && assignedPlan.pricingOptions.length > 0) {
    const shortestDurationOption = [...assignedPlan.pricingOptions].sort((a, b) => a.months - b.months)[0];
    if (shortestDurationOption) {
      const now = new Date();
      planExpiryDate = new Date(now.setMonth(now.getMonth() + shortestDurationOption.months));
    }
  }
  
  const userData = {
    name: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    planId: assignedPlan?.id || '',
    planExpiryDate: planExpiryDate,
    createdAt: serverTimestamp(),
  };

  const batch = writeBatch(db);
  batch.set(userDocRef, userData);

  // Create the initial record in the user_plans history collection if a plan was assigned
  if (assignedPlan) {
    const userPlanDocRef = doc(collection(db, 'user_plans'));
    batch.set(userPlanDocRef, {
      userId: user.uid,
      planId: assignedPlan.id,
      planName: assignedPlan.name,
      subscriptionDate: serverTimestamp(),
      endDate: planExpiryDate,
      status: 'active',
      remarks: 'Initial plan on sign-up.',
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    throw new Error("Could not create user profile in database.");
  }
}

const serializeDate = (date: any): string | null => {
  if (!date) return null;
  if (date instanceof Timestamp) return date.toDate().toISOString();
  if (date instanceof Date) return date.toISOString();
  if (typeof date === 'string') return date;
  const parsedDate = new Date(date);
  return isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
};

// Converts a Firestore document to a fully serialized User object
const docToUser = (doc: DocumentData): User => {
    const data = doc.data();
    return {
        id: doc.id,
        name: data.name || null,
        email: data.email || null,
        photoURL: data.photoURL || null,
        planId: data.planId || '',
        createdAt: serializeDate(data.createdAt),
        planExpiryDate: serializeDate(data.planExpiryDate),
    };
};

export async function fetchUserProfiles(): Promise<User[]> {
  const usersCol = collection(db, 'users');
  const snapshot = await getDocs(usersCol);
  return snapshot.docs.map(docToUser);
}

export const getUserProfile = async (userId: string): Promise<User | null> => {
  if (!userId) return null;
  const userDocRef = doc(db, 'users', userId);
  const docSnap = await getDoc(userDocRef);
  if (docSnap.exists()) {
    return docToUser(docSnap);
  }
  return null;
}

export const updateUserProfileInFirestore = async (userId: string, data: { name?: string | null; photoURL?: string | null }) => {
    if (!userId) throw new Error("User ID is required.");
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, data);
}

export async function changeUserSubscription(
  userId: string,
  newPlanId: string,
  options?: {
    endDate?: Date | null;
    remarks?: string;
  }
) {
  if (!userId || !newPlanId) {
    throw new Error("User ID and new Plan ID are required.");
  }

  const allPlans = await fetchPlans();
  const newPlan = allPlans.find(p => p.id === newPlanId);
  if (!newPlan) {
    throw new Error("The selected plan does not exist.");
  }

  const batch = writeBatch(db);

  // Find the user's current plan in the history to mark it as migrated
  const userPlansCol = collection(db, 'user_plans');
  const q = query(userPlansCol, where("userId", "==", userId), where("status", "==", "active"));
  const currentPlanSnapshot = await getDocs(q);

  if (!currentPlanSnapshot.empty) {
    const currentPlanDoc = currentPlanSnapshot.docs[0];
    batch.update(currentPlanDoc.ref, { status: 'migrated', remarks: `Migrated to ${newPlan.name} by admin.` });
  }

  // Calculate new expiry date if not provided by admin
  let newExpiryDate: Date | null = options?.endDate ?? null;

  if (options?.endDate === undefined) { // Check if it was not provided at all
    if (newPlan.name.toLowerCase() !== 'free explorer' && newPlan.pricingOptions.length > 0) {
      const shortestDurationOption = newPlan.pricingOptions.sort((a, b) => a.months - b.months)[0];
      if (shortestDurationOption) {
        const now = new Date();
        newExpiryDate = new Date(now.setMonth(now.getMonth() + shortestDurationOption.months));
      }
    }
  }


  // Add the new plan record to history
  const newUserPlanRef = doc(collection(db, 'user_plans'));
  batch.set(newUserPlanRef, {
    userId: userId,
    planId: newPlan.id,
    planName: newPlan.name,
    subscriptionDate: serverTimestamp(),
    endDate: newExpiryDate,
    status: 'active',
    remarks: options?.remarks || 'Plan assigned by admin.',
  });

  // Update the main user document with the new plan details
  const userDocRef = doc(db, 'users', userId);
  batch.update(userDocRef, {
    planId: newPlan.id,
    planExpiryDate: newExpiryDate,
  });

  await batch.commit();
}


const docToUserPlan = (doc: DocumentData): UserPlan => {
  const data = doc.data();
  return {
    id: doc.id,
    userId: data.userId,
    planId: data.planId,
    planName: data.planName,
    subscriptionDate: serializeDate(data.subscriptionDate)!,
    endDate: serializeDate(data.endDate),
    status: data.status,
    remarks: data.remarks || '',
  };
};

export async function fetchUserPlanHistory(userId: string): Promise<UserPlan[]> {
  if (!userId) return [];
  const userPlansCol = collection(db, 'user_plans');
  // Removed orderBy to prevent missing-index errors. We will sort client-side.
  const q = query(userPlansCol, where("userId", "==", userId));
  const snapshot = await getDocs(q);
  const plans = snapshot.docs.map(docToUserPlan);

  // Sort the results in-memory after fetching
  plans.sort((a, b) => new Date(b.subscriptionDate).getTime() - new Date(a.subscriptionDate).getTime());
  
  return plans;
}

export async function updateUserPlanHistoryRecord(
  historyId: string,
  data: {
    status?: UserPlanStatus;
    endDate?: Date | null;
    remarks?: string;
  }
) {
  if (!historyId) throw new Error("History record ID is required.");
  const historyDocRef = doc(db, 'user_plans', historyId);
  await updateDoc(historyDocRef, data);
}
