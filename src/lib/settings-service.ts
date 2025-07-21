
'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import type { Settings } from '@/types';
import { cache } from 'react';

// Use a consistent document ID for global settings
const settingsDocRef = isFirebaseConfigured && db ? doc(db, 'settings', 'global_app_settings') : null;

const defaultSettings: Settings = {
    siteName: 'TKS Prepify',
    siteDescription: 'Ace your exams with AI-powered practice.',
    defaultQuestionCount: 100,
    defaultDuration: 120,
    defaultQuestionsPerPage: 2,
    defaultPlanId: '',
    heroTitlePrefix: 'Excel in Your Tests with',
    heroTitleHighlight: 'Expertly Solved',
    heroTitleSuffix: 'Question Papers',
    heroSubtitle: '**TKS Prepify** offers a vast library of solved question papers, complete with detailed explanations and practice tools to help you excel in your exams.',
    heroButton1Text: 'Explore Papers',
    heroButton1Link: '/papers',
    heroButton2Text: 'Get Started',
    heroButton2Link: '/signup',
    heroImage: 'https://placehold.co/600x400.png',
    socialLinks: [],
    // About Page Defaults
    aboutTitle: 'About Us',
    aboutSubtitle: 'We are dedicated to providing the best resources for students to excel in their exams.',
    aboutMission: 'Our mission is to democratize education by making high-quality exam preparation materials accessible to every student, everywhere. We believe that with the right tools, anyone can achieve their academic goals. We strive to create a platform that is not only comprehensive but also intuitive and motivating to use.',
    aboutVision: 'We envision a world where exam stress is replaced by confidence. Our goal is to be the most trusted and effective online resource for exam preparation, empowering a global community of learners to unlock their full potential and build a brighter future for themselves.',
    aboutTeamTitle: 'Meet the Team',
    teamMembers: [
        { name: 'Alex Doe', role: 'Founder & CEO', avatar: 'https://placehold.co/100x100.png', hint: 'male portrait' },
        { name: 'Jane Smith', role: 'Lead Developer', avatar: 'https://placehold.co/100x100.png', hint: 'female portrait' },
        { name: 'Sam Wilson', role: 'Content Strategist', avatar: 'https://placehold.co/100x100.png', hint: 'person portrait' },
    ],
    // Contact Page Defaults
    contactTitle: 'Contact Us',
    contactSubtitle: 'Have a question or feedback? We\'d love to hear from you.',
    contactEmail: 'contact@prepify.com',
    contactPhone: '+1 (555) 123-4567',
    contactAddress: '123 Education Lane, Knowledge City, 45678',
    // Download settings
    pdfWatermarkEnabled: true,
    pdfWatermarkText: 'Downloaded From {siteName}',
    emailFromName: 'Prepify Support',
    emailFromAddress: 'noreply@yourdomain.com',
};

/**
 * Fetches the global application settings.
 * If no settings are found, returns a default set.
 * This function is wrapped in React's `cache` to prevent duplicate database calls
 * during a single request-response lifecycle (e.g., in layout and page).
 */
export const fetchSettings = cache(async (): Promise<Settings> => {
    if (!settingsDocRef) {
        return defaultSettings;
    }
    try {
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            // Ensure all fields are present, providing defaults for any that might be missing
            return {
                ...defaultSettings,
                ...data,
                socialLinks: data.socialLinks || [],
                teamMembers: data.teamMembers || [],
            };
        }
    } catch (error) {
        // console.error("Error fetching settings:", error);
    }
    // Return default settings if document doesn't exist or on error
    return defaultSettings;
});

/**
 * Updates the global application settings.
 * @param data The new settings data to save.
 */
export async function updateSettings(data: Partial<Settings>) {
    if (!settingsDocRef) {
        throw new Error("Firebase is not configured. Cannot update settings.");
    }
    await setDoc(settingsDocRef, data, { merge: true });
}
