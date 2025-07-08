
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
  writeBatch,
  where,
  limit
} from 'firebase/firestore';
import { db } from './firebase';
import type { HelpArticle, HelpCategory } from '@/types';
import { cache } from 'react';

// === Category Service Functions ===

const docToHelpCategory = (doc: DocumentData): HelpCategory => ({
  id: doc.id,
  name: doc.data().name,
});

export const fetchHelpCategories = cache(async (): Promise<HelpCategory[]> => {
  const categoriesCol = collection(db, 'help_categories');
  const q = query(categoriesCol, orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToHelpCategory);
});

export async function getHelpCategoryById(id: string): Promise<HelpCategory | null> {
    const docRef = doc(db, 'help_categories', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docToHelpCategory(docSnap) : null;
}

export async function addHelpCategory(name: string) {
  const categoriesCol = collection(db, 'help_categories');
  await addDoc(categoriesCol, { name });
}

export async function updateHelpCategory(id: string, name: string) {
  const docRef = doc(db, 'help_categories', id);
  await updateDoc(docRef, { name });
}

export async function deleteHelpCategory(id: string) {
  // First, find all articles in this category and update them to be uncategorized
  const articlesQuery = query(collection(db, 'help_articles'), where('categoryId', '==', id));
  const articlesSnapshot = await getDocs(articlesQuery);
  
  const batch = writeBatch(db);
  articlesSnapshot.forEach(articleDoc => {
    batch.update(articleDoc.ref, { categoryId: '' }); // or null
  });

  // Then delete the category document
  const categoryDocRef = doc(db, 'help_categories', id);
  batch.delete(categoryDocRef);
  
  await batch.commit();
}


// === Article Service Functions ===

const docToHelpArticle = (doc: DocumentData): HelpArticle => {
    const data = doc.data();
    return {
        id: doc.id,
        question: data.question,
        answer: data.answer,
        categoryId: data.categoryId,
        order: data.order,
    };
};

export const fetchHelpArticles = cache(async (): Promise<HelpArticle[]> => {
  const articlesCol = collection(db, 'help_articles');
  const q = query(articlesCol, orderBy('order'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToHelpArticle);
});

export async function getHelpArticleById(id: string): Promise<HelpArticle | null> {
    const docRef = doc(db, 'help_articles', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docToHelpArticle(docSnap) : null;
}

export async function addHelpArticle(data: Omit<HelpArticle, 'id'>) {
    const articlesCol = collection(db, 'help_articles');
    await addDoc(articlesCol, data);
}

export async function addMultipleHelpArticles(
  articles: { question: string; answer: string }[],
  categoryId: string
) {
  const batch = writeBatch(db);
  const articlesCol = collection(db, 'help_articles');
  
  const q = query(articlesCol, where("categoryId", "==", categoryId), orderBy("order", "desc"), limit(1));
  const snapshot = await getDocs(q);
  let maxOrder = 0;
  if (!snapshot.empty) {
    maxOrder = snapshot.docs[0].data().order || 0;
  }

  articles.forEach((article, index) => {
    const newArticleRef = doc(articlesCol);
    batch.set(newArticleRef, {
      ...article,
      categoryId: categoryId,
      order: maxOrder + 1 + index,
    });
  });
  
  await batch.commit();
}


export async function updateHelpArticle(id: string, data: Partial<Omit<HelpArticle, 'id'>>) {
    const docRef = doc(db, 'help_articles', id);
    await updateDoc(docRef, data);
}

export async function deleteHelpArticle(id: string) {
    const docRef = doc(db, 'help_articles', id);
    await deleteDoc(docRef);
}
