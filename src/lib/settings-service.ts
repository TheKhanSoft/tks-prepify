
'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Settings } from '@/types';

// Use a consistent document ID for global settings
const settingsDocRef = doc(db, 'settings', 'global_app_settings');

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
                siteName: data.siteName || 'Prepify',
                siteDescription: data.siteDescription || 'Ace your exams with AI-powered practice.',
                defaultQuestionCount: data.defaultQuestionCount || 100,
                defaultDuration: data.defaultDuration || 120,
                defaultQuestionsPerPage: data.defaultQuestionsPerPage || 2,
            };
        }
    } catch (error) {
        console.error("Error fetching settings:", error);
    }
    // Return default settings if document doesn't exist or on error
    return {
        siteName: 'Prepify',
        siteDescription: 'Ace your exams with AI-powered practice.',
        defaultQuestionCount: 100,
        defaultDuration: 120,
        defaultQuestionsPerPage: 2,
    };
}

/**
 * Updates the global application settings.
 * @param data The new settings data to save.
 */
export async function updateSettings(data: Settings) {
    await setDoc(settingsDocRef, data, { merge: true });
}
