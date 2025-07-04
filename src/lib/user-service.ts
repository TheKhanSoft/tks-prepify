
'use server';

import { doc, setDoc, serverTimestamp, getDoc, collection, getDocs, updateDoc, DocumentData } from 'firebase/firestore';
import { db } from './firebase';
import type { User as FirebaseAuthUser } from 'firebase/auth';
import type { User } from '@/types';
import { cache } from 'react';
import { fetchPlans } from './plan-service';

/**
 * Creates or updates a user profile document in Firestore.
 * This is typically called after a user signs up or logs in for the first time.
 * @param user The Firebase Auth user object.
 * @param planId The ID of the plan to assign to the user.
 */
export async function createUserProfile(user: FirebaseAuthUser, planId: string) {
  const userDocRef = doc(db, 'users', user.uid);

  const userDoc = await getDoc(userDocRef);
  if (userDoc.exists()) {
    // User profile already exists, do nothing to avoid overwriting plan, etc.
    return;
  }

  const allPlans = await fetchPlans();
  const assignedPlan = allPlans.find(p => p.id === planId);

  let planExpiryDate: Date | null = null;
  // Special case for a free plan that never expires.
  if (assignedPlan && assignedPlan.name !== 'Free Explorer') {
      // For paid plans, find the pricing option to determine duration.
      // Defaulting to the shortest duration if multiple exist.
      const shortestDurationOption = assignedPlan.pricingOptions.sort((a, b) => a.months - b.months)[0];
      if (shortestDurationOption) {
          const now = new Date();
          planExpiryDate = new Date(now.setMonth(now.getMonth() + shortestDurationOption.months));
      }
  }

  const userData: Omit<User, 'id'> = {
    name: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    planId: planId,
    planExpiryDate: planExpiryDate,
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(userDocRef, userData);
  } catch (error) {
    console.error("Error creating user profile: ", error);
    throw new Error("Could not create user profile in database.");
  }
}

const docToUser = (doc: DocumentData): User => {
    const data = doc.data();
    return {
        id: doc.id,
        name: data.name,
        email: data.email,
        photoURL: data.photoURL,
        planId: data.planId,
        createdAt: data.createdAt,
        planExpiryDate: data.planExpiryDate,
    };
};

export const fetchUserProfiles = cache(async (): Promise<User[]> => {
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);
    return snapshot.docs.map(docToUser);
});


export const getUserProfile = cache(async (userId: string): Promise<User | null> => {
    if (!userId) return null;
    const userDocRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
        return docToUser(docSnap);
    }
    return null;
});

export async function updateUserPlan(userId: string, planId: string) {
    if (!userId || !planId) {
        throw new Error("User ID and Plan ID are required.");
    }
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, { planId });
}

export async function updateUserProfileInFirestore(userId: string, data: { name?: string | null; photoURL?: string | null }) {
    if (!userId) throw new Error("User ID is required.");
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, data);
}
