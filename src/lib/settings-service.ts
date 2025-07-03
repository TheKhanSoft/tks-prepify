
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
            return docSnap.data() as Settings;
        }
    } catch (error) {
        console.error("Error fetching settings:", error);
    }
    // Return default settings if document doesn't exist or on error
    return {
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
