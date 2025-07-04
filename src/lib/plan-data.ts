
import type { QuotaPeriod } from "@/types";

export const QuotaPeriods: { value: QuotaPeriod; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'lifetime', label: 'Lifetime' },
];

export const QuotaKeys = [
    { key: 'downloads', label: 'Downloads' },
    { key: 'bookmarks', label: 'Bookmarks' },
    { key: 'take_exam', label: 'Take Exam' },
    { key: 'ai_interactions', label: 'AI Interactions' },
    { key: 'priority_support', label: 'Priority Support' },
    { key: 'early_access', label: 'Early Access' },
    { key: 'view_analytics', label: 'View Performance Analytics' },
    { key: 'discussion_forums', label: 'Access Discussion Forums' },
];
