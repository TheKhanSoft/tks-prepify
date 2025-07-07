
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
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';
import type { TestConfig } from '@/types';

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

export async function fetchTestConfigs(): Promise<TestConfig[]> {
  const configsCol = collection(db, 'test_configs');
  const q = query(configsCol, orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToTestConfig);
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
