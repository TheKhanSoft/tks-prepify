
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  subcategories?: Category[];
  featured?: boolean;
  keywords?: string;
  metaTitle?: string;
  metaDescription?: string;
}

export interface Paper {
  id: string;
  title: string;
  slug: string;
  description: string;
  categoryId: string;
  questionCount: number;
  duration: number; // in minutes
  year?: number;
  featured?: boolean;
}

export interface Question {
  id: string;
  paperId: string;
  questionText: string;
  type: 'mcq' | 'short_answer';
  options?: string[]; // Only for MCQ
  correctAnswer: string | string[];
  explanation?: string;
}

export interface UserAnswer {
  questionId: string;
  selectedOption: string;
  isCorrect: boolean;
  timeSpent: number; // in seconds
}

export interface TestResult {
  id: string;
  paper: Paper;
  answers: UserAnswer[];
  score: number;
  totalTimeSpent: number; // in seconds
  completedAt: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'User';
  createdAt: string;
}
