
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
} from 'firebase/firestore';
import { db } from './firebase';
import type { Discount } from '@/types';
import { serializeDate } from './utils';
import { cache } from 'react';

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
