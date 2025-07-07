
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
  limit
} from 'firebase/firestore';
import { db } from './firebase';
import type { TestConfig, Question, PaperQuestion } from '@/types';
import { fetchQuestionCategories } from './question-category-service';
import { getDescendantQuestionCategoryIds } from './question-category-helpers';
import { docToQuestion } from './utils';

function docToTestConfig(doc: DocumentData): TestConfig {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    description: data.description,
    duration: data.duration,
    passingMarks: data.passingMarks,
    hasNegativeMarking: data.hasNegativeMarking,
    negativeMarkValue: data.negativeMarkValue,
    marksPerQuestion: data.marksPerQuestion,
    published: data.published,
    composition: data.composition || [],
    totalQuestions: data.totalQuestions,
  };
}

export async function fetchTestConfigs(publishedOnly = false): Promise<TestConfig[]> {
  const configsCol = collection(db, 'test_configs');
  const q = query(configsCol, orderBy('name'));
  const snapshot = await getDocs(q);
  const allConfigs = snapshot.docs.map(docToTestConfig);
  if (publishedOnly) {
    return allConfigs.filter(c => c.published);
  }
  return allConfigs;
}

export async function getTestConfigById(id: string): Promise<TestConfig | null> {
  if (!id) return null;
  const configDocRef = doc(db, 'test_configs', id);
  const configDoc = await getDoc(configDocRef);
  return configDoc.exists() ? docToTestConfig(configDoc) : null;
}

export async function addTestConfig(configData: Omit<TestConfig, 'id'>) {
  const configsCol = collection(db, 'test_configs');
  await addDoc(configsCol, configData);
}

export async function updateTestConfig(id: string, configData: Partial<Omit<TestConfig, 'id'>>) {
  const configDocRef = doc(db, 'test_configs', id);
  await updateDoc(configDocRef, configData);
}

export async function deleteTestConfig(id: string) {
  const configDocRef = doc(db, 'test_configs', id);
  await deleteDoc(configDocRef);
}

function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export async function generateTest(configId: string): Promise<{ config: TestConfig; questions: PaperQuestion[] }> {
    const config = await getTestConfigById(configId);
    if (!config || !config.published) {
        throw new Error("Test configuration not found or is not published.");
    }

    const allCategories = await fetchQuestionCategories();
    let generatedQuestions: Question[] = [];

    for (const rule of config.composition) {
        const categoryIds = getDescendantQuestionCategoryIds(rule.questionCategoryId, allCategories);
        if (categoryIds.length === 0) continue;

        const questionsQuery = query(collection(db, 'questions'), where('questionCategoryId', 'in', categoryIds));
        const snapshot = await getDocs(questionsQuery);
        
        let pool = snapshot.docs.map(docToQuestion);
        pool = shuffleArray(pool);
        
        const pickedQuestions = pool.slice(0, rule.count);
        generatedQuestions.push(...pickedQuestions);
    }
    
    // In case some categories didn't have enough questions, we just use what we have.
    // The UI should ideally inform the user if the count is less than expected.

    const finalShuffledQuestions = shuffleArray(generatedQuestions);

    const questionsWithOrder: PaperQuestion[] = finalShuffledQuestions.map((q, index) => ({
        ...q,
        order: index + 1,
        linkId: `${q.id}-${index}` // temporary unique key for client-side rendering
    }));

    return { config, questions: questionsWithOrder };
}
