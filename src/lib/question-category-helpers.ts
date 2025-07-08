import type { QuestionCategory } from '@/types';

// Recursive helper to find a category by its ID in a tree
function findCategoryById(categories: QuestionCategory[], id: string): QuestionCategory | undefined {
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
* Finds a question category by its ID from a given category tree.
*/
export function getQuestionCategoryById(id: string, allCategories: QuestionCategory[]): QuestionCategory | undefined {
  if (!id || !allCategories) return undefined;
  return findCategoryById(allCategories, id);
}

/**
* Creates a flattened list of categories suitable for UI elements like select dropdowns.
*/
export function getFlattenedQuestionCategories(cats: QuestionCategory[]): { id:string; name: string; level: number }[] {
  const flat: { id: string; name: string; level: number }[] = [];
  function recurse(categories: QuestionCategory[], level: number) {
    for (const category of categories) {
      flat.push({ id: category.id, name: category.name, level });
      if (category.subcategories && category.subcategories.length > 0) {
        recurse(category.subcategories, level + 1);
      }
    }
  }
  recurse(cats, 0);
  return flat;
}

// Recursive helper to get all descendant IDs
function getDescendantIds(categories: QuestionCategory[], startId: string): string[] {
  const allIds: string[] = [];
  const startCategory = findCategoryById(categories, startId);

  if (!startCategory) return [];

  const queue: QuestionCategory[] = [startCategory];
  while (queue.length > 0) {
    const current = queue.shift()!;
    allIds.push(current.id);
    if (current.subcategories) {
      queue.push(...current.subcategories);
    }
  }
  return allIds;
}

/**
* Gets all descendant category IDs for a given category, including the starting category.
*/
export function getDescendantQuestionCategoryIds(startId: string, allCategories: QuestionCategory[]): string[] {
    return getDescendantIds(allCategories, startId);
}
