

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

export interface TestConfigComposition {
  questionCategoryId: string;
  percentage: number;
}

export interface TestConfig {
  id: string;
  name: string;
  slug?: string;
  description: string;
  duration: number; // in minutes
  passingMarks: number; // as a percentage, e.g., 50 for 50%
  hasNegativeMarking: boolean;
  negativeMarkValue: number; // e.g., 0.25
  marksPerQuestion: number;
  published: boolean;
  totalQuestions: number;
  composition: TestConfigComposition[];
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

export interface Role {
    id: string;
    name: string;
}

export interface User {
  id: string; // Firebase UID
  name: string | null;
  email: string | null;
  photoURL?: string | null;
  role?: string;
  planId: string;
  planExpiryDate?: string | null; // Dates are serialized to strings for client
  createdAt: string | null; // Dates are serialized to strings for client
}

export type UserPlanStatus = 'active' | 'pending' | 'suspended' | 'expired' | 'migrated' | 'cancelled';

export interface UserPlan {
  id: string; // The document ID of this user_plan entry
  userId: string;
  planId: string;
  planName: string; // Denormalized for easier display
  subscriptionDate: string; // ISO string
  endDate: string | null; // ISO string, null for unlimited plans
  status: UserPlanStatus;
  remarks?: string;
}

export interface SocialLink {
  platform: string;
  url: string;
}

export interface TeamMember {
    name: string;
    role: string;
    avatar: string;
    hint: string;
}

export interface Page {
  id: string; // slug
  title: string;
  content: string;
  metaTitle?: string;
  metaDescription?: string;
}

export interface PricingOption {
  label: string;
  price: number;
  months: number;
  badge?: string;
  stripePriceId?: string;
}

export type QuotaPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'lifetime';

export interface PlanFeature {
  text: string;
  isQuota: boolean;
  key?: string;
  limit?: number;
  period?: QuotaPeriod;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  features: PlanFeature[];
  isAdSupported: boolean;
  published: boolean;
  popular?: boolean;
  pricingOptions: PricingOption[];
}

export interface MessageReply {
  id: string;
  authorId: string;
  authorName: string;
  message: string;
  createdAt: Date;
}

export type ContactSubmissionStatus = 'open' | 'replied' | 'in-progress' | 'closed';

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  topic: string;
  subject: string;
  message: string;
  createdAt: Date;
  isRead: boolean;
  userId?: string;
  priority?: boolean;
  replies?: MessageReply[];
  status: ContactSubmissionStatus;
  lastRepliedAt?: Date | null;
}

export interface SupportRequest {
  id: string;
  userId: string;
  submissionId: string;
  createdAt: string; // ISO string
}


export interface Bookmark {
  id: string;
  userId: string;
  paperId: string;
  createdAt: string; // ISO string
  active: boolean;
  removedAt?: string | null; // ISO string
}

export interface Download {
  id: string;
  userId: string;
  paperId: string;
  createdAt: string; // ISO string
}

// Data models for dynamic test attempts
export interface QuestionAttempt {
  order: number;
  questionId: string;
  questionText: string;
  type: 'mcq' | 'short_answer';
  options?: string[];
  correctAnswer: string | string[];
  explanation?: string;
  userAnswer?: string | string[] | null;
  isCorrect: boolean;
  timeSpent?: number;
  questionCategoryId?: string;
}

export interface TestAttempt {
  id: string; // The doc ID of this attempt
  userId: string;
  userName?: string;
  userEmail?: string;
  testConfigId: string;
  testConfigName: string; // Denormalized for easy display
  testConfigSlug?: string;
  startTime: string | null; // ISO string
  endTime: string | null; // ISO string
  status: 'in-progress' | 'completed';
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  // This will be fetched from a subcollection
  questionAttempts?: QuestionAttempt[];
}

export interface HelpCategory {
  id: string;
  name: string;
}

export interface HelpArticle {
  id: string;
  question: string;
  answer: string;
  categoryId: string;
  order: number;
}

export type PaymentMethodType = 'bank' | 'easypaisa' | 'jazzcash' | 'crypto';

export interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentMethodType;
  enabled: boolean;
  details: {
    // Bank
    bankName?: string;
    accountTitle?: string;
    accountNumber?: string;
    iban?: string;
    // Crypto
    walletAddress?: string;
    network?: string;
  };
}

export interface Discount {
  id: string;
  name: string;
  code?: string; // If undefined, it's an automatic discount
  type: 'percentage' | 'flat';
  value: number; // The percentage or flat amount
  isActive: boolean;
  appliesToAllPlans: boolean;
  applicablePlanIds?: string[];
  appliesToAllDurations: boolean;
  applicableDurations?: string[];
  startDate?: string | null; // ISO string
  endDate?: string | null; // ISO string
}
