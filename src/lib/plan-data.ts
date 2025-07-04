
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
    { key: 'ai_interactions', label: 'AI Interactions' },
];
