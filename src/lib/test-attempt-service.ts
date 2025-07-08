
'use server';

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  writeBatch,
  serverTimestamp,
  query,
  where,
  orderBy,
  Timestamp,
  DocumentData,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import type { TestConfig, PaperQuestion, QuestionAttempt, TestAttempt } from '@/types';
import { serializeDate } from './utils';

type AnswerEntry = { answer?: string | string[]; timeSpent: number };
type AnswersState = { [questionId: string]: AnswerEntry };

/**
 * Creates a new test attempt record in Firestore when a user starts a test.
 */
export async function startTestAttempt(
  userId: string,
  config: TestConfig
): Promise<string> {
  const attemptsCollection = collection(db, 'test_attempts');
  const newAttemptRef = await addDoc(attemptsCollection, {
    userId,
    testConfigId: config.id,
    testConfigName: config.name,
    testConfigSlug: config.slug,
    startTime: serverTimestamp(),
    endTime: null,
    status: 'in-progress',
    score: 0,
    totalMarks: 0,
    percentage: 0,
    passed: false,
  });
  return newAttemptRef.id;
}


/**
 * Submits the final test results, calculating the score and updating the attempt record.
 */
export async function submitTestAttempt(
  attemptId: string,
  config: TestConfig,
  questions: PaperQuestion[],
  answers: AnswersState
) {
  const batch = writeBatch(db);
  const attemptRef = doc(db, 'test_attempts', attemptId);

  // --- Calculate Score ---
  let score = 0;
  questions.forEach(q => {
    const userAnswerEntry = answers[q.id];
    const userAnswer = userAnswerEntry?.answer;
    let isCorrect = false;

    if (userAnswer !== undefined && userAnswer !== null && (!Array.isArray(userAnswer) || userAnswer.length > 0)) {
        if (q.type === 'mcq') {
            const correctAnswers = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
            const userAnswers = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
            isCorrect = correctAnswers.length === userAnswers.length && correctAnswers.every(val => userAnswers.includes(val));
        } else { // short_answer
            isCorrect = typeof userAnswer === 'string' && q.correctAnswer.toString().trim().toLowerCase() === userAnswer.trim().toLowerCase();
        }
    }
    
    if (isCorrect) {
      score += config.marksPerQuestion;
    } else if (config.hasNegativeMarking && userAnswer) {
      score -= config.negativeMarkValue || 0;
    }
  });

  const totalMarks = config.totalQuestions * config.marksPerQuestion;
  const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
  const passed = percentage >= config.passingMarks;

  // --- Update Main Attempt Document ---
  batch.update(attemptRef, {
    endTime: serverTimestamp(),
    status: 'completed',
    score: Math.max(0, score), // Score cannot be negative
    totalMarks,
    percentage,
    passed,
  });

  // --- Create Question Attempt Subcollection Documents ---
  questions.forEach(q => {
    const userAnswerEntry = answers[q.id];
    const userAnswer = userAnswerEntry?.answer;
    let isCorrect = false;
    if (userAnswer !== undefined && userAnswer !== null && (!Array.isArray(userAnswer) || userAnswer.length > 0)) {
        if (q.type === 'mcq') {
            const correctAnswers = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
            const userAnswers = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
            isCorrect = correctAnswers.length === userAnswers.length && correctAnswers.every(val => userAnswers.includes(val));
        } else { // short_answer
            isCorrect = typeof userAnswer === 'string' && q.correctAnswer.toString().trim().toLowerCase() === userAnswer.trim().toLowerCase();
        }
    }
    
    const questionAttemptRef = doc(collection(db, 'test_attempts', attemptId, 'questions'), q.id);
    batch.set(questionAttemptRef, {
      order: q.order,
      questionId: q.id,
      questionText: q.questionText,
      type: q.type,
      options: q.options || [],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || '',
      questionCategoryId: q.questionCategoryId || null,
      userAnswer: userAnswer || null,
      isCorrect,
      timeSpent: userAnswerEntry?.timeSpent || 0,
    });
  });

  await batch.commit();
}


function docToTestAttempt(doc: DocumentData): TestAttempt {
  const data = doc.data();
  return {
    id: doc.id,
    userId: data.userId,
    testConfigId: data.testConfigId,
    testConfigName: data.testConfigName,
    testConfigSlug: data.testConfigSlug,
    startTime: serializeDate(data.startTime),
    endTime: serializeDate(data.endTime),
    status: data.status,
    score: data.score ?? 0,
    totalMarks: data.totalMarks ?? 0,
    percentage: data.percentage ?? 0,
    passed: data.passed ?? false,
  };
}

function docToQuestionAttempt(doc: DocumentData): QuestionAttempt {
    const data = doc.data();
    return {
        order: data.order ?? 0,
        questionId: data.questionId,
        questionText: data.questionText,
        type: data.type,
        options: data.options,
        correctAnswer: data.correctAnswer,
        explanation: data.explanation,
        userAnswer: data.userAnswer,
        isCorrect: data.isCorrect ?? false,
        timeSpent: data.timeSpent ?? 0,
        questionCategoryId: data.questionCategoryId,
    }
}

/**
 * Fetches a single test attempt and its associated question attempts, ensuring the user is authorized to view it.
 */
export async function getTestAttemptById(attemptId: string, userId: string): Promise<TestAttempt | null> {
    if (!attemptId || !userId) return null;

    const attemptDocRef = doc(db, 'test_attempts', attemptId);
    const attemptDoc = await getDoc(attemptDocRef);

    if (!attemptDoc.exists()) {
        console.warn(`Attempt ${attemptId} not found.`);
        return null;
    }

    const testAttempt = docToTestAttempt(attemptDoc);

    // Authorization check
    if (testAttempt.userId !== userId) {
        console.warn(`User ${userId} is not authorized to view attempt ${attemptId}.`);
        return null;
    }

    const questionsColRef = collection(db, 'test_attempts', attemptId, 'questions');
    const questionsSnapshot = await getDocs(questionsColRef);
    const questionAttempts: QuestionAttempt[] = [];

    questionsSnapshot.docs.forEach(doc => {
        try {
            questionAttempts.push(docToQuestionAttempt(doc));
        } catch (e) {
            console.error("Failed to parse a question attempt document:", doc.id, e);
        }
    });
    
    questionAttempts.sort((a,b) => a.order - b.order);

    testAttempt.questionAttempts = questionAttempts;

    return testAttempt;
}

/**
 * Fetches all test attempts for a given user, regardless of status.
 */
export async function fetchTestAttemptsForUser(userId: string): Promise<TestAttempt[]> {
    if (!userId) return [];
    
    const attemptsCol = collection(db, 'test_attempts');
    const q = query(attemptsCol, where("userId", "==", userId));

    const snapshot = await getDocs(q);
    const attempts: TestAttempt[] = [];
    snapshot.docs.forEach(doc => {
        try {
            attempts.push(docToTestAttempt(doc));
        } catch (e) {
            console.error("Failed to parse a test attempt document:", doc.id, e);
        }
    });
    
    // Sort the results in-memory after fetching
    attempts.sort((a, b) => {
        const dateA = a.startTime ? new Date(a.startTime).getTime() : 0;
        const dateB = b.startTime ? new Date(b.startTime).getTime() : 0;
        return dateB - dateA;
    });

    return attempts;
}

export async function fetchAllTestAttempts(limitCount?: number): Promise<TestAttempt[]> {
    const attemptsCol = collection(db, 'test_attempts');
    
    // Query only for completed tests to reduce the amount of data fetched.
    // We will sort in memory to avoid needing a composite index.
    const q = query(
        attemptsCol, 
        where('status', '==', 'completed')
    );

    const snapshot = await getDocs(q);
    const attempts: TestAttempt[] = [];
    snapshot.docs.forEach(doc => {
        try {
            attempts.push(docToTestAttempt(doc));
        } catch (e) {
            console.error("Failed to parse a test attempt document:", doc.id, e);
        }
    });
    
    // Sort in-memory to get the most recent ones first
    attempts.sort((a, b) => {
        const dateA = a.endTime ? new Date(a.endTime).getTime() : 0;
        const dateB = b.endTime ? new Date(b.endTime).getTime() : 0;
        return dateB - dateA;
    });

    // Apply limit after sorting
    const finalLimit = limitCount || 5;
    return attempts.slice(0, finalLimit);
}
