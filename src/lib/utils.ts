
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { type DocumentData, Timestamp } from "firebase/firestore";
import type { Question } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

export function docToQuestion(doc: DocumentData): Question {
  const data = doc.data();
  return {
    id: doc.id,
    questionText: data.questionText,
    type: data.type,
    options: data.options,
    correctAnswer: data.correctAnswer,
    explanation: data.explanation,
    questionCategoryId: data.questionCategoryId,
  };
}

export const serializeDate = (date: any): string | null => {
  if (!date) return null;
  if (date instanceof Timestamp) return date.toDate().toISOString();
  if (date instanceof Date) return date.toISOString();
  if (typeof date === 'string') return date;
  const parsedDate = new Date(date);
  return isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
};
