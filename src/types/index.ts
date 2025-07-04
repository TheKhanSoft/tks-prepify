

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
  id: string; // Firebase UID
  name: string | null;
  email: string | null;
  photoURL?: string | null;
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

export type QuotaPeriod = 'daily' | 'monthly' | 'yearly' | 'lifetime';

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

export interface Settings {
    siteName: string;
    siteDescription: string;
    defaultQuestionCount: number;
    defaultDuration: number;
    defaultQuestionsPerPage: number;
    defaultPlanId?: string;
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
    // About Page
    aboutTitle?: string;
    aboutSubtitle?: string;
    aboutMission?: string;
    aboutVision?: string;
    aboutTeamTitle?: string;
    teamMembers?: TeamMember[];
    // Contact Page
    contactTitle?: string;
    contactSubtitle?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactAddress?: string;
    // Download settings
    pdfWatermarkEnabled?: boolean;
}

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: Date;
  isRead: boolean;
}

export interface Bookmark {
  id: string;
  userId: string;
  paperId: string;
  createdAt: string; // ISO string
  active: boolean;
  removedAt?: string | null; // ISO string
}
