
'use server';

import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  writeBatch,
  DocumentData,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Question } from '@/types';

function docToQuestion(doc: DocumentData): Question {
  const data = doc.data();
  return {
    id: doc.id,
    paperId: data.paperId,
    type: data.type,
    questionText: data.questionText,
    options: data.options,
    correctAnswer: data.correctAnswer,
    explanation: data.explanation,
  };
}

export async function fetchQuestionsForPaper(paperId: string): Promise<Question[]> {
  if (!paperId) return [];
  const q = query(collection(db, 'questions'), where('paperId', '==', paperId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => docToQuestion(doc));
}

export async function getQuestionById(questionId: string): Promise<Question | null> {
    if (!questionId) return null;
    const questionDocRef = doc(db, "questions", questionId);
    const questionDoc = await getDoc(questionDocRef);
    return questionDoc.exists() ? docToQuestion(questionDoc) : null;
}

export async function addQuestion(questionData: Omit<Question, 'id'>) {
    const questionsCollection = collection(db, 'questions');
    await addDoc(questionsCollection, questionData);
    
    // Update question count on paper
    const paperRef = doc(db, "papers", questionData.paperId);
    await updateDoc(paperRef, { questionCount: increment(1) });
}

export async function addQuestionsBatch(paperId: string, questions: Omit<Question, 'id'>[]) {
    const batch = writeBatch(db);
    const questionsCollection = collection(db, 'questions');

    questions.forEach(question => {
        const docRef = doc(questionsCollection); // Create a new doc reference with a unique ID
        batch.set(docRef, question);
    });
    
    // Update question count on paper
    const paperRef = doc(db, "papers", paperId);
    batch.update(paperRef, { questionCount: increment(questions.length) });

    await batch.commit();
}

export async function updateQuestion(questionId: string, questionData: Partial<Question>) {
    const questionRef = doc(db, 'questions', questionId);
    await updateDoc(questionRef, questionData);
}

export async function deleteQuestion(questionId: string, paperId: string) {
    await deleteDoc(doc(db, 'questions', questionId));
    
    // Update question count on paper
    const paperRef = doc(db, "papers", paperId);
    await updateDoc(paperRef, { questionCount: increment(-1) });
}
