
'use server';

import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import type { QuestionCategory } from '@/types';

type FirestoreQuestionCategory = Omit<QuestionCategory, 'subcategories'> & {
    parentId?: string | null;
}

/**
* Fetches all question categories from Firestore and builds a nested tree structure.
*/
export async function fetchQuestionCategories(): Promise<QuestionCategory[]> {
  if (!isFirebaseConfigured || !db) return [];
  const categoriesCol = collection(db, 'question_categories');
  const categorySnapshot = await getDocs(categoriesCol);
  const categoryList: (QuestionCategory & { parentId?: string | null })[] = categorySnapshot.docs.map(doc => {
    const data = doc.data() as FirestoreQuestionCategory;
    return {
      id: doc.id,
      name: data.name,
      parentId: data.parentId || null,
    };
  });

  const categoryMap = new Map(categoryList.map(c => [c.id, { ...c, subcategories: [] as QuestionCategory[] }]));
  const tree: QuestionCategory[] = [];

  for (const category of categoryList) {
      const mappedCategory = categoryMap.get(category.id)!;
    if (category.parentId) {
      const parent = categoryMap.get(category.parentId);
      if (parent) {
        parent.subcategories.push(mappedCategory);
      }
    } else {
      tree.push(mappedCategory);
    }
  }

  // Sort by name
  tree.sort((a, b) => a.name.localeCompare(b.name));
  categoryMap.forEach(cat => {
    if(cat.subcategories) {
      cat.subcategories.sort((a,b) => a.name.localeCompare(b.name));
    }
  });

  return tree;
}
