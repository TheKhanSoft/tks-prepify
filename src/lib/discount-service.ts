
'use server';

import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  DocumentData,
  where,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Discount } from '@/types';
import { serializeDate } from './utils';
import { cache } from 'react';
import { isWithinInterval, parseISO } from 'date-fns';

const docToDiscount = (doc: DocumentData): Discount => {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    code: data.code,
    type: data.type,
    value: data.value,
    isActive: data.isActive,
    appliesToAllPlans: data.appliesToAllPlans,
    applicablePlanIds: data.applicablePlanIds || [],
    appliesToAllDurations: data.appliesToAllDurations,
    applicableDurations: data.applicableDurations || [],
    startDate: serializeDate(data.startDate),
    endDate: serializeDate(data.endDate),
  };
};

export const fetchDiscounts = cache(async (): Promise<Discount[]> => {
  const discountsCol = collection(db, 'discounts');
  const q = query(discountsCol, orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToDiscount);
});

export async function addDiscount(data: Omit<Discount, 'id'>) {
  const discountsCol = collection(db, 'discounts');
  await addDoc(discountsCol, data);
}

export async function updateDiscount(id: string, data: Partial<Omit<Discount, 'id'>>) {
  const docRef = doc(db, 'discounts', id);
  await updateDoc(docRef, data);
}

export async function deleteDiscount(id: string) {
  const docRef = doc(db, 'discounts', id);
  await deleteDoc(docRef);
}

export async function validateDiscountCode(
  code: string,
  planId: string,
  durationLabel: string
): Promise<{ success: boolean; discount?: Discount; message: string; }> {
  if (!code) {
    return { success: false, message: 'Coupon code cannot be empty.' };
  }

  const q = query(
    collection(db, 'discounts'),
    where('code', '==', code.trim()),
    limit(1)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return { success: false, message: 'This coupon code is not valid.' };
  }

  const discount = docToDiscount(snapshot.docs[0]);

  if (!discount.isActive) {
    return { success: false, message: 'This coupon is no longer active.' };
  }

  const now = new Date();
  const startDate = discount.startDate ? parseISO(discount.startDate) : null;
  const endDate = discount.endDate ? parseISO(discount.endDate) : null;

  if (startDate && now < startDate) {
      return { success: false, message: 'This coupon is not yet valid.' };
  }
  if (endDate && now > endDate) {
      return { success: false, message: 'This coupon has expired.' };
  }
  
  if (!discount.appliesToAllPlans && !discount.applicablePlanIds?.includes(planId)) {
      return { success: false, message: 'This coupon is not valid for the selected plan.' };
  }
  
  if (!discount.appliesToAllDurations && !discount.applicableDurations?.includes(durationLabel)) {
      return { success: false, message: 'This coupon is not valid for the selected billing duration.' };
  }

  return { success: true, discount, message: 'Coupon applied successfully!' };
}
