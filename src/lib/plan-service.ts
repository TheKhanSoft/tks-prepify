
'use server';

import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, DocumentData, query, orderBy, where } from 'firebase/firestore';
import { db } from './firebase';
import type { Plan } from '@/types';
import { cache } from 'react';

function docToPlan(doc: DocumentData): Plan {
    const data = doc.data();
    return {
        id: doc.id,
        name: data.name,
        price: data.price,
        interval: data.interval,
        description: data.description,
        features: data.features || [],
        published: data.published || false,
        popular: data.popular || false,
        stripePriceId: data.stripePriceId,
    };
}

export const fetchPlans = cache(async (publishedOnly = false): Promise<Plan[]> => {
    const plansCol = collection(db, 'plans');
    let q;
    if (publishedOnly) {
        q = query(plansCol, where('published', '==', true), orderBy('price', 'asc'));
    } else {
        q = query(plansCol, orderBy('price', 'asc'));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToPlan);
});

export async function getPlanById(id: string): Promise<Plan | null> {
    if (!id) return null;
    const planDocRef = doc(db, 'plans', id);
    const planDoc = await getDoc(planDocRef);
    return planDoc.exists() ? docToPlan(planDoc) : null;
}

export async function addPlan(planData: Omit<Plan, 'id'>) {
    const plansCol = collection(db, 'plans');
    await addDoc(plansCol, planData);
}

export async function updatePlan(id: string, planData: Partial<Omit<Plan, 'id'>>) {
    const planDocRef = doc(db, 'plans', id);
    await updateDoc(planDocRef, planData);
}

export async function deletePlan(id: string) {
    const planDocRef = doc(db, 'plans', id);
    await deleteDoc(planDocRef);
}
