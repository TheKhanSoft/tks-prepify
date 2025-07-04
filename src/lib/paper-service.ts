
'use server';

import { collection, getDocs, getDoc, doc, query, where, DocumentData } from 'firebase/firestore';
import { db } from './firebase';
import type { Paper } from '@/types';
import { slugify } from './utils';

export async function docToPaper(doc: DocumentData): Promise<Paper> {
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
*/
export async function fetchPapers(): Promise<Paper[]> {
    try {
        const papersCol = collection(db, 'papers');
        const paperSnapshot = await getDocs(papersCol);
        const papers = await Promise.all(paperSnapshot.docs.map(doc => docToPaper(doc)));
        return papers;
    } catch (error) {
        console.error("Error fetching papers:", error);
        // Return empty array on error to prevent page crash
        return [];
    }
}

/**
* Fetches a single paper by its ID from Firestore.
*/
export async function getPaperById(id: string): Promise<Paper | null> {
    if (!id) return null;
    try {
        const paperDocRef = doc(db, "papers", id);
        const paperDoc = await getDoc(paperDocRef);

        if (paperDoc.exists()) {
            return await docToPaper(paperDoc);
        } else {
            return null;
        }
    } catch (error) {
        console.error(`Error fetching paper by ID (${id}):`, error);
        return null;
    }
}

/**
* Fetches a single paper by its slug from Firestore.
*/
export async function getPaperBySlug(slug: string): Promise<Paper | null> {
    if (!slug) return null;
    try {
        const papersCol = collection(db, 'papers');
        const q = query(papersCol, where("slug", "==", slug));
        const paperSnapshot = await getDocs(q);

        if (!paperSnapshot.empty) {
            // Assuming slugs are unique, return the first one found.
            return await docToPaper(paperSnapshot.docs[0]);
        } else {
            return null;
        }
    } catch (error) {
        console.error(`Error fetching paper by slug (${slug}):`, error);
        return null;
    }
}
