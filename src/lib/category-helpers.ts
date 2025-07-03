import type { Category } from '@/types';

// Recursive helper to find a category by its ID in a tree
function findCategoryById(categories: Category[], id: string): Category | undefined {
  for (const category of categories) {
    if (category.id === id) return category;
    if (category.subcategories) {
      const found = findCategoryById(category.subcategories, id);
      if (found) return found;
    }
  }
  return undefined;
}

/**
* Finds a category by its ID from a given category tree.
*/
export function getCategoryById(id: string, allCategories: Category[]): Category | undefined {
  return findCategoryById(allCategories, id);
}

// Recursive helper to find a category by its slug in a tree
function findCategoryBySlug(categories: Category[], slug: string): Category | undefined {
  for (const category of categories) {
    if (category.slug === slug) return category;
    if (category.subcategories) {
      const found = findCategoryBySlug(category.subcategories, slug);
      if (found) return found;
    }
  }
  return undefined;
}

/**
* Finds a category by its slug from a given category tree.
*/
export function getCategoryBySlug(slug: string, allCategories: Category[]): Category | undefined {
  return findCategoryBySlug(allCategories, slug);
}


/**
* Gets all descendant category IDs for a given category, including the starting category.
*/
export function getDescendantCategoryIds(startId: string, allCategories: Category[]): string[] {
  const ids: string[] = [];
  const startCategory = findCategoryById(allCategories, startId);
  if (!startCategory) return [];

  const queue: Category[] = [startCategory];
  while (queue.length > 0) {
    const current = queue.shift()!;
    ids.push(current.id);
    if (current.subcategories) {
      queue.push(...current.subcategories);
    }
  }
  return ids;
}

/**
* Creates a flattened list of categories suitable for UI elements like select dropdowns.
*/
export function getFlattenedCategories(cats: Category[]): { id:string; name: string; level: number; isParent: boolean }[] {
  const flat: { id: string; name: string; level: number; isParent: boolean }[] = [];
  function recurse(categories: Category[], level: number) {
    for (const category of categories) {
      const hasSubcategories = !!category.subcategories && category.subcategories.length > 0;
      flat.push({ id: category.id, name: category.name, level, isParent: hasSubcategories });
      if (hasSubcategories) {
        recurse(category.subcategories, level + 1);
      }
    }
  }
  recurse(cats, 0);
  return flat;
}


/**
* Gets the hierarchical path (breadcrumbs) for a given category ID.
*/
export function getCategoryPath(id: string, allCategories: Category[]): Category[] | null {
  function findPath(cats: Category[], id: string, path: Category[]): Category[] | null {
    for (const category of cats) {
      const newPath = [...path, { ...category, subcategories: undefined }];
      if (category.id === id) return newPath;
      if (category.subcategories) {
        const found = findPath(category.subcategories, id, newPath);
        if (found) return found;
      }
    }
    return null;
  }
  return findPath(allCategories, id, []);
}
