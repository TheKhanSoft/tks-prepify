
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

// Combined type for a question within a paper context
export type PaperQuestion = Question & { order: number; linkId: string };

function docToQuestion(doc: DocumentData): Question {
  const data = doc.data();
  return {
    id: doc.id,
    questionText: data.questionText,
    type: data.type,
    options: data.options,
    correctAnswer: data.correctAnswer,
    explanation: data.explanation,
  };
}

// Fetches questions for a specific paper, including their order and link ID
export async function fetchQuestionsForPaper(paperId: string): Promise<PaperQuestion[]> {
  if (!paperId) return [];

  const paperQuestionsCol = collection(db, 'paper_questions');
  const paperQuestionsQuery = query(paperQuestionsCol, where('paperId', '==', paperId));
  const paperQuestionsSnapshot = await getDocs(paperQuestionsQuery);

  if (paperQuestionsSnapshot.empty) {
    return [];
  }

  const links = paperQuestionsSnapshot.docs.map(doc => ({
    linkId: doc.id,
    questionId: doc.data().questionId as string,
    order: doc.data().order as number,
  }));
  
  const questionIds = links.map(link => link.questionId);
  
  if (questionIds.length === 0) {
      return [];
  }

  // Fetch all question documents in a single query
  const questionsCol = collection(db, 'questions');
  const questionsQuery = query(questionsCol, where('__name__', 'in', questionIds));
  const questionsSnapshot = await getDocs(questionsQuery);

  const questionsMap = new Map<string, Question>();
  questionsSnapshot.forEach(doc => {
    questionsMap.set(doc.id, docToQuestion(doc));
  });

  const paperQuestions = links
    .map(link => {
      const questionData = questionsMap.get(link.questionId);
      return questionData ? { ...questionData, order: link.order, linkId: link.linkId } : null;
    })
    .filter((q): q is PaperQuestion => q !== null);

  // Sort by order
  paperQuestions.sort((a, b) => a.order - b.order);

  return paperQuestions;
}

// Gets a single question from the central bank
export async function getQuestionById(questionId: string): Promise<Question | null> {
    if (!questionId) return null;
    const questionDocRef = doc(db, "questions", questionId);
    const questionDoc = await getDoc(questionDocRef);
    return questionDoc.exists() ? docToQuestion(questionDoc) : null;
}

// Gets the link document to find a question's order within a paper
export async function getQuestionLink(paperId: string, questionId: string) {
    const q = query(
        collection(db, "paper_questions"), 
        where("paperId", "==", paperId), 
        where("questionId", "==", questionId)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
    }
    return null;
}


// Adds a new question to the bank and links it to a paper
export async function addQuestionToPaper(paperId: string, questionData: Omit<Question, 'id'>, order: number) {
    const batch = writeBatch(db);

    // 1. Add question to the central 'questions' bank
    const questionRef = doc(collection(db, 'questions'));
    batch.set(questionRef, questionData);
    
    // 2. Create the link in 'paper_questions'
    const linkRef = doc(collection(db, 'paper_questions'));
    batch.set(linkRef, { paperId, questionId: questionRef.id, order });

    // 3. Update question count on paper
    const paperRef = doc(db, "papers", paperId);
    batch.update(paperRef, { questionCount: increment(1) });
    
    await batch.commit();
}

// Imports a batch of questions, adds them to the bank, and links them to the paper
export async function addQuestionsBatch(paperId: string, questions: (Omit<Question, 'id'> & { order: number })[]) {
    const batch = writeBatch(db);
    const questionsCollection = collection(db, 'questions');
    const paperQuestionsCollection = collection(db, 'paper_questions');

    questions.forEach(q => {
        const { order, ...questionData } = q;
        
        // Add question to the bank
        const questionRef = doc(questionsCollection);
        batch.set(questionRef, questionData);

        // Add link to the paper
        const linkRef = doc(paperQuestionsCollection);
        batch.set(linkRef, { paperId, questionId: questionRef.id, order });
    });
    
    // Update question count on paper
    const paperRef = doc(db, "papers", paperId);
    batch.update(paperRef, { questionCount: increment(questions.length) });

    await batch.commit();
}


// Updates a question in the central bank
export async function updateQuestion(questionId: string, questionData: Partial<Omit<Question, 'id'>>) {
    const questionRef = doc(db, 'questions', questionId);
    await updateDoc(questionRef, questionData);
}

// Updates a question's order within a specific paper
export async function updateQuestionOrderForPaper(linkId: string, newOrder: number) {
    const linkRef = doc(db, 'paper_questions', linkId);
    await updateDoc(linkRef, { order: newOrder });
}

// Removes a question's link from a paper, but doesn't delete it from the bank
export async function removeQuestionFromPaper(paperId: string, linkId: string) {
    const batch = writeBatch(db);

    // Delete the link document
    const linkDocRef = doc(db, 'paper_questions', linkId);
    batch.delete(linkDocRef);

    // Decrement question count on paper
    const paperRef = doc(db, "papers", paperId);
    batch.update(paperRef, { questionCount: increment(-1) });
    
    await batch.commit();
}


// Copies all question links from a source paper to a new paper
export async function copyPaperQuestions(sourcePaperId: string, newPaperId: string) {
  const linksQuery = query(collection(db, 'paper_questions'), where('paperId', '==', sourcePaperId));
  const linksSnapshot = await getDocs(linksQuery);

  if (linksSnapshot.empty) {
    return; // No questions to copy
  }

  const paperQuestionsCollection = collection(db, 'paper_questions');
  const CHUNK_SIZE = 499; // Firestore batch limit is 500
  const docChunks = [];

  // Slice the documents into chunks
  for (let i = 0; i < linksSnapshot.docs.length; i += CHUNK_SIZE) {
    docChunks.push(linksSnapshot.docs.slice(i, i + CHUNK_SIZE));
  }

  // Process each chunk in a separate batch
  for (const chunk of docChunks) {
    const batch = writeBatch(db);
    chunk.forEach(docSnap => {
        const linkData = docSnap.data();
        const newLinkRef = doc(paperQuestionsCollection);
        batch.set(newLinkRef, {
            paperId: newPaperId,
            questionId: linkData.questionId,
            order: linkData.order,
        });
    });
    await batch.commit();
  }
}


// Updates the order for multiple questions in a single batch
export async function batchUpdateQuestionOrder(updates: { linkId: string; order: number }[]) {
  if (updates.length === 0) return;

  const batch = writeBatch(db);
  updates.forEach(update => {
    const docRef = doc(db, 'paper_questions', update.linkId);
    batch.update(docRef, { order: update.order });
  });

  await batch.commit();
}
