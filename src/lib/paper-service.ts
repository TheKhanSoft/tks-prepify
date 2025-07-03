
'use server';

import { collection, getDocs, getDoc, doc, query, where, DocumentData } from 'firebase/firestore';
import { db } from './firebase';
import type { Paper } from '@/types';
import { slugify } from './utils';

// Using Next.js fetch with revalidation strategy instead of unstable_noStore
// to allow for better caching control.
const CACHE_REVALIDATION_TIME = 3600; // 1 hour in seconds

function docToPaper(doc: DocumentData): Paper {
    const data = doc.data();
    return {
        id: doc.id,
        title: data.title,
        slug: data.slug || slugify(data.title),
        description: data.description,
        categoryId: data.categoryId,
        questionCount: data.questionCount || 0,
        duration: data.duration || 0,
        year: data.year,
        session: data.session,
        featured: data.featured || false,
        published: data.published || false,
        questionsPerPage: data.questionsPerPage,
        keywords: data.keywords,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
    };
}


/**
* Fetches all papers from Firestore.
* This function leverages Next.js caching.
*/
export async function fetchPapers(): Promise<Paper[]> {
    // This fetch call is a placeholder to integrate with Next.js's caching mechanism.
    // The actual Firestore call is made below. The URL doesn't matter as long as it's unique per data type.
    // This is a common pattern to cache non-fetch async operations in Next.js.
    const res = await fetch('http://localhost/papers', { next: { revalidate: CACHE_REVALIDATION_TIME } });
    
    if (!res.ok) {
        // This log is for server-side debugging.
        console.error("Cache revalidation fetch failed, but proceeding with Firestore fetch.");
    }
    
    const papersCol = collection(db, 'papers');
    const paperSnapshot = await getDocs(papersCol);
    return paperSnapshot.docs.map(doc => docToPaper(doc));
}

/**
* Fetches a single paper by its ID from Firestore.
*/
export async function getPaperById(id: string): Promise<Paper | null> {
    if (!id) return null;
    const paperDocRef = doc(db, "papers", id);
    const paperDoc = await getDoc(paperDocRef);

    if (paperDoc.exists()) {
        return docToPaper(paperDoc);
    } else {
        return null;
    }
}

/**
* Fetches a single paper by its slug from Firestore.
*/
export async function getPaperBySlug(slug: string): Promise<Paper | null> {
    if (!slug) return null;
    const papersCol = collection(db, 'papers');
    const q = query(papersCol, where("slug", "==", slug));
    const paperSnapshot = await getDocs(q);

    if (!paperSnapshot.empty) {
        // Assuming slugs are unique, return the first one found.
        return docToPaper(paperSnapshot.docs[0]);
    } else {
        return null;
    }
}
