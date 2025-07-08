
'use server';

import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import type { Category } from '@/types';
import { Atom, Calculator, Briefcase, Languages } from 'lucide-react';
import { slugify } from './utils';

// NOTE: Caching is now handled by Next.js's data caching features.
// The previous in-memory cache caused inconsistencies between server and client environments.

export async function clearCategoriesCache() {
  // This is now a no-op as we are not using in-memory cache.
  // Kept for compatibility to avoid breaking calls to it.
}

const iconMap: { [key: string]: React.ComponentType<{ className?: string }> } = {
  Atom,
  Calculator,
  Briefcase,
  Languages,
};

type FirestoreCategory = Omit<Category, 'icon' | 'subcategories'> & {
    icon?: string;
    parentId?: string | null;
}

/**
* Fetches all categories from Firestore and builds a nested tree structure.
* It dynamically generates the full slug path for each category.
*/
export async function fetchCategories(): Promise<Category[]> {
  try {
    const categoriesCol = collection(db, 'categories');
    const categorySnapshot = await getDocs(categoriesCol);
    const categoryList: (Category & { parentId?: string | null })[] = categorySnapshot.docs.map(doc => {
      const data = doc.data() as FirestoreCategory;
      return {
        id: doc.id,
        name: data.name,
        // Fallback to slugifying the name for any old data that might not have a slug field.
        slug: data.slug || slugify(data.name),
        description: data.description,
        icon: data.icon ? iconMap[data.icon] : undefined,
        parentId: data.parentId || null,
        featured: data.featured || false,
        keywords: data.keywords,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
      };
    });

    const categoryMap = new Map(categoryList.map(c => [c.id, { ...c, subcategories: [] as Category[] }]));
    const tree: Category[] = [];

    // First pass: build the tree structure
    for (const category of categoryList) {
        const mappedCategory = categoryMap.get(category.id)!;
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          parent.subcategories.push(mappedCategory);
        }
      } else {
        tree.push(mappedCategory);
      }
    }

    // Second pass: recursively build the full, correct slug path for each category
    function buildFullSlugs(categories: Category[], parentSlug: string) {
      for (const category of categories) {
          const currentSlug = category.slug;
          category.slug = parentSlug ? `${parentSlug}/${currentSlug}` : currentSlug;
          if (category.subcategories && category.subcategories.length > 0) {
              buildFullSlugs(category.subcategories, category.slug);
          }
      }
    }
    buildFullSlugs(tree, '');


    // Sort top-level categories, featured first
    tree.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return a.name.localeCompare(b.name);
    });
    
    // Sort sub-categories by name
    categoryMap.forEach(cat => {
      if(cat.subcategories) {
        cat.subcategories.sort((a,b) => a.name.localeCompare(b.name));
      }
    });

    return tree;
  } catch (error) {
      // Return empty array on error to prevent page crash
      return [];
  }
}
