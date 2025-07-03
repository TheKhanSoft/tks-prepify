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
  session?: string;
  featured?: boolean;
  published?: boolean;
  questionsPerPage?: number | null;
  // SEO fields
  keywords?: string;
  metaTitle?: string;
  metaDescription?: string;
}

export interface QuestionCategory {
  id: string;
  name: string;
  parentId?: string | null;
  // These are added during processing, not stored in Firestore
  subcategories?: QuestionCategory[];
}


export interface Question {
  id: string;
  questionText: string;
  type: 'mcq' | 'short_answer';
  options?: string[]; // Only for MCQ
  correctAnswer: string | string[];
  explanation?: string;
  questionCategoryId?: string;
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

export interface SocialLink {
  platform: string;
  url: string;
}

export interface Settings {
    siteName: string;
    siteDescription: string;
    defaultQuestionCount: number;
    defaultDuration: number;
    defaultQuestionsPerPage: number;
    // Homepage Hero Section
    heroTitlePrefix?: string;
    heroTitleHighlight?: string;
    heroTitleSuffix?: string;
    heroSubtitle?: string;
    heroButton1Text?: string;
    heroButton1Link?: string;
    heroButton2Text?: string;
    heroButton2Link?: string;
    heroImage?: string;
    // Social Links
    socialLinks: SocialLink[];
}
