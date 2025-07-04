
'use server';

import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, DocumentData, query, orderBy, where } from 'firebase/firestore';
import { db } from './firebase';
import type { Plan } from '@/types';

function docToPlan(doc: DocumentData): Plan {
    const data = doc.data();
    return {
        id: doc.id,
        name: data.name,
        description: data.description,
        features: data.features || [],
        published: data.published || false,
        popular: data.popular || false,
        pricingOptions: data.pricingOptions || [],
    };
}

export async function fetchPlans(publishedOnly = false): Promise<Plan[]> {
    const plansCol = collection(db, 'plans');
    let q;
    if (publishedOnly) {
        q = query(plansCol, where('published', '==', true));
    } else {
        q = query(plansCol);
    }
    const snapshot = await getDocs(q);
    const plans = snapshot.docs.map(docToPlan);
    
    // Sort by the price of the lowest-month option
    plans.sort((a, b) => {
        const aMinMonths = Math.min(...a.pricingOptions.map(p => p.months));
        const bMinMonths = Math.min(...b.pricingOptions.map(p => p.months));
        const aPrice = a.pricingOptions.find(p => p.months === aMinMonths)?.price || 0;
        const bPrice = b.pricingOptions.find(p => p.months === bMinMonths)?.price || 0;
        return aPrice - bPrice;
    });

    return plans;
}

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
    