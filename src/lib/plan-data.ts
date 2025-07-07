
import type { QuotaPeriod } from "@/types";

export const QuotaPeriods: { value: QuotaPeriod; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'lifetime', label: 'Lifetime' },
];

export const QuotaKeys = [
    { key: 'discussion_forums', label: 'Access Discussion Forums' },
    { key: 'ai_interactions', label: 'AI Interactions' },
    { key: 'bookmarks', label: 'Bookmarks' },
    { key: 'downloads', label: 'Downloads' },
    { key: 'early_access', label: 'Early Access' },
    { key: 'priority_support', label: 'Priority Support' },
    { key: 'take_exam', label: 'Take Exam' },
    { key: 'view_analytics', label: 'View Performance Analytics' },
    { key: 'view_papers', label: 'View Solved Papers' },
];
