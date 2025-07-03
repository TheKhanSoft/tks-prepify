
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Edit, Trash2, Plus, Loader2 } from "lucide-react";
import { papers } from "@/lib/data";
import { fetchCategories, clearCategoriesCache } from "@/lib/category-service";
import { getFlattenedCategories, getDescendantCategoryIds, getCategoryById } from "@/lib/category-helpers";
import type { Category } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

type FlatCategory = ReturnType<typeof getFlattenedCategories>[0] & { raw: Category };

function filterTree(categories: Category[], term: string): Category[] {
  const lowercasedTerm = term.toLowerCase();

  return categories.map(category => {
    // If the category has subcategories, filter them recursively
    const filteredSubcategories = category.subcategories 
      ? filterTree(category.subcategories, term) 
      : [];

    const nameMatches = category.name.toLowerCase().includes(lowercasedTerm);
    
    // Include the category if its name matches or if it has any matching subcategories
    if (nameMatches || filteredSubcategories.length > 0) {
      return { ...category, subcategories: filteredSubcategories };
    }
    
    return null;
  }).filter((category): category is Category => category !== null);
}

export default function AdminCategoriesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState<{ [key: string]: boolean }>({});
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<FlatCategory | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    const cats = await fetchCategories();
    setAllCategories(cats);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const filteredTree = useMemo(() => {
    if (!searchTerm.trim()) {
      return allCategories;
    }
    return filterTree(allCategories, searchTerm);
  }, [allCategories, searchTerm]);

  const flatCategories: FlatCategory[] = useMemo(() => {
    const flattened = getFlattenedCategories(filteredTree);
    return flattened.map(flatCat => {
        // We get the raw category from `allCategories` to ensure we have the full, unfiltered subcategory data for counts.
        const rawCategory = getCategoryById(flatCat.id, allCategories);
        return {
            ...flatCat,
            raw: rawCategory!
        };
    });
  }, [filteredTree, allCategories]);

  const getPaperCount = (categoryId: string) => {
    const descendantIds = getDescendantCategoryIds(categoryId, allCategories);
    return papers.filter(paper => descendantIds.includes(paper.categoryId)).length;
  }

  const openDeleteDialog = (category: FlatCategory) => {
    setCategoryToDelete(category);
    setDeleteAlertOpen(true);
  }

  const handleFeatureToggle = async (categoryId: string, featured: boolean) => {
    setIsUpdating(prev => ({ ...prev, [categoryId]: true }));
    try {
      const categoryRef = doc(db, "categories", categoryId);
      await updateDoc(categoryRef, { featured });
      
      toast({
        title: "Category Updated",
        description: `Featured status has been updated.`,
      });
      
      // Optimistic UI update
      setAllCategories(prev => {
        const updateInTree = (categories: Category[], id: string, feat: boolean): Category[] => {
            return categories.map(cat => {
                if (cat.id === id) {
                    return { ...cat, featured: feat };
                }
                if (cat.subcategories && cat.subcategories.length > 0) {
                    return { ...cat, subcategories: updateInTree(cat.subcategories, id, feat) };
                }
                return cat;
            });
        };
        return updateInTree(prev, categoryId, featured);
      });

      await clearCategoriesCache();
      router.refresh();

    } catch (error) {
      console.error("Failed to update category:", error);
      toast({
        title: "Error",
        description: "Failed to update category. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(prev => ({ ...prev, [categoryId]: false }));
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    setIsDeleting(true);

    const hasSubcategories = categoryToDelete.raw.subcategories && categoryToDelete.raw.subcategories.length > 0;
    const hasPapers = getPaperCount(categoryToDelete.id) > 0;

    if (hasSubcategories || hasPapers) {
        let errorMessage = "This category cannot be deleted because it contains ";
        if (hasSubcategories && hasPapers) {
            errorMessage += "sub-categories and papers.";
        } else if (hasSubcategories) {
            errorMessage += "sub-categories.";
        } else {
            errorMessage += "papers.";
        }
        
        toast({
            title: "Deletion Failed",
            description: errorMessage,
            variant: "destructive"
        });
        setIsDeleting(false);
        setDeleteAlertOpen(false);
        return;
    }

    try {
        await deleteDoc(doc(db, "categories", categoryToDelete.id));
        toast({
            title: "Category Deleted",
            description: `"${categoryToDelete.name}" has been successfully deleted.`
        });
        
        await clearCategoriesCache();
        await loadCategories(); // Refetch data
        router.refresh();

    } catch (error) {
        console.error("Error deleting category:", error);
        toast({
            title: "Error",
            description: "Failed to delete the category. Please try again.",
            variant: "destructive"
        });
    } finally {
        setIsDeleting(false);
        setDeleteAlertOpen(false);
    }
  }
  
  if (loading) {
    return (
        <div className="flex justify-center items-center h-full min-h-[calc(100vh-20rem)]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Manage Categories</h1>
          <Button asChild>
            <Link href="/admin/categories/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Category
            </Link>
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
            <CardDescription>A list of all categories and subcategories. Use the filter to search.</CardDescription>
             <div className="pt-4">
              <Input 
                placeholder="Filter by name..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Subcategories</TableHead>
                  <TableHead>Papers</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flatCategories.length > 0 ? flatCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell 
                      className="font-medium"
                      style={{ paddingLeft: `${1 + category.level * 2}rem` }}
                    >
                      {category.name}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-xs">
                        {category.raw.slug}
                    </TableCell>
                    <TableCell>
                      {category.raw.subcategories?.length || 0}
                    </TableCell>
                    <TableCell>
                      {getPaperCount(category.id)}
                    </TableCell>
                     <TableCell>
                        <Switch
                            checked={category.raw.featured || false}
                            onCheckedChange={(newStatus) => handleFeatureToggle(category.id, newStatus)}
                            disabled={isUpdating[category.id] || isDeleting}
                            aria-label="Toggle featured status"
                        />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost" disabled={isUpdating[category.id]}>
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuLabel>Actions</DropdownMenuLabel>
                           <DropdownMenuItem asChild>
                            <Link href={`/admin/categories/new?parentId=${category.id}`}>
                              <Plus className="mr-2 h-4 w-4" />
                              Add Subcategory
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/categories/${category.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive" 
                            onSelect={() => openDeleteDialog(category)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )) : (
                   <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No categories found.
                      </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                category "{categoryToDelete?.name}".
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} disabled={isDeleting}>
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
  </>
  )
}
