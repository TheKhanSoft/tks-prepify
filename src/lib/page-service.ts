
'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Page } from '@/types';
import { cache } from 'react';

const defaultPages: { [slug: string]: Omit<Page, 'id'> } = {
  'terms-of-service': {
    title: 'Terms of Service',
    content: 'Please add your terms of service here.',
    metaTitle: 'Terms of Service',
    metaDescription: 'Read our terms of service.',
  },
  'privacy-policy': {
    title: 'Privacy Policy',
    content: 'Please add your privacy policy here.',
    metaTitle: 'Privacy Policy',
    metaDescription: 'Read our privacy policy.',
  },
};

/**
 * Fetches a single page's content by its slug.
 * If the page doesn't exist in Firestore, it creates it with default content.
 */
export const getPageBySlug = cache(async (slug: string): Promise<Page> => {
  const pageDocRef = doc(db, 'pages', slug);
  try {
    const docSnap = await getDoc(pageDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        title: data.title,
        content: data.content,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
      };
    } else {
      // If page doesn't exist, create it with default content
      const defaultContent = defaultPages[slug];
      if (defaultContent) {
        await setDoc(pageDocRef, defaultContent);
        return { id: slug, ...defaultContent };
      }
    }
  } catch (error) {
    console.error(`Error fetching page with slug "${slug}":`, error);
  }
  // Fallback to default if something goes wrong or slug is invalid
  return { id: slug, ...(defaultPages[slug] || { title: 'Page Not Found', content: '' }) };
});

/**
 * Updates a page's content in Firestore.
 */
export async function updatePage(slug: string, data: Partial<Omit<Page, 'id'>>) {
  const pageDocRef = doc(db, 'pages', slug);
  await setDoc(pageDocRef, data, { merge: true });
}
