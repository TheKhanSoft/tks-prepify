
'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Settings } from '@/types';

// Use a consistent document ID for global settings
const settingsDocRef = doc(db, 'settings', 'global_app_settings');

const defaultSettings: Settings = {
    siteName: 'Prepify',
    siteDescription: 'Ace your exams with AI-powered practice.',
    defaultQuestionCount: 100,
    defaultDuration: 120,
    defaultQuestionsPerPage: 2,
    heroTitlePrefix: 'Excel in Your Tests with',
    heroTitleHighlight: 'Expertly Solved',
    heroTitleSuffix: 'Question Papers',
    heroSubtitle: 'Prepify offers a vast library of solved question papers, complete with detailed explanations and practice tools to help you excel in your exams.',
    heroButton1Text: 'Explore Papers',
    heroButton1Link: '/papers',
    heroButton2Text: 'Get Started',
    heroButton2Link: '/signup',
    heroImage: 'https://placehold.co/600x400.png',
    socialLinks: [],
};

/**
 * Fetches the global application settings.
 * If no settings are found, returns a default set.
 */
export async function fetchSettings(): Promise<Settings> {
    try {
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            // Ensure all fields are present, providing defaults for any that might be missing
            return {
                ...defaultSettings,
                ...data,
                socialLinks: data.socialLinks || [],
            };
        }
    } catch (error) {
        console.error("Error fetching settings:", error);
    }
    // Return default settings if document doesn't exist or on error
    return defaultSettings;
}

/**
 * Updates the global application settings.
 * @param data The new settings data to save.
 */
export async function updateSettings(data: Partial<Settings>) {
    await setDoc(settingsDocRef, data, { merge: true });
}
