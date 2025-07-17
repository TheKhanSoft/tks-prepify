
'use server';

import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  DocumentData,
  query,
  orderBy,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import type { PaymentMethod } from '@/types';
import { cache } from 'react';

const docToPaymentMethod = (doc: DocumentData): PaymentMethod => {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    type: data.type,
    enabled: data.enabled,
    details: data.details || {},
  };
};

export const fetchPaymentMethods = cache(async (enabledOnly = false): Promise<PaymentMethod[]> => {
  const methodsCol = collection(db, 'payment_methods');
  // Always order by name, as this is a simple index.
  const q = query(methodsCol, orderBy('name'));
  const snapshot = await getDocs(q);
  const allMethods = snapshot.docs.map(docToPaymentMethod);

  // If enabledOnly is true, filter the results in the code.
  if (enabledOnly) {
    return allMethods.filter(method => method.enabled);
  }

  return allMethods;
});

export async function getPaymentMethodById(id: string): Promise<PaymentMethod | null> {
  const docRef = doc(db, 'payment_methods', id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docToPaymentMethod(docSnap) : null;
}

export async function addPaymentMethod(data: Omit<PaymentMethod, 'id'>) {
  const methodsCol = collection(db, 'payment_methods');
  await addDoc(methodsCol, data);
}

export async function updatePaymentMethod(id: string, data: Partial<Omit<PaymentMethod, 'id'>>) {
  const docRef = doc(db, 'payment_methods', id);
  await updateDoc(docRef, data);
}

export async function deletePaymentMethod(id: string) {
  const docRef = doc(db, 'payment_methods', id);
  await deleteDoc(docRef);
}
