
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
import { fetchQuestionCategories, getFlattenedQuestionCategories, getQuestionCategoryById } from "@/lib/question-category-service";
import type { QuestionCategory } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { doc, deleteDoc, query, collection, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Input } from "@/components/ui/input";

type FlatCategory = ReturnType<typeof getFlattenedQuestionCategories>[0] & { raw: QuestionCategory };

function filterTree(categories: QuestionCategory[], term: string): QuestionCategory[] {
  const lowercasedTerm = term.toLowerCase();

  return categories.map(category => {
    const filteredSubcategories = category.subcategories 
      ? filterTree(category.subcategories, term) 
      : [];

    const nameMatches = category.name.toLowerCase().includes(lowercasedTerm);
    
    if (nameMatches || filteredSubcategories.length > 0) {
      return { ...category, subcategories: filteredSubcategories };
    }
    
    return null;
  }).filter((category): category is QuestionCategory => category !== null);
}

export default function AdminQuestionCategoriesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [allCategories, setAllCategories] = useState<QuestionCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<FlatCategory | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    const cats = await fetchQuestionCategories();
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
    const flattened = getFlattenedQuestionCategories(filteredTree);
    return flattened.map(flatCat => {
        const rawCategory = getQuestionCategoryById(flatCat.id, allCategories);
        return {
            ...flatCat,
            raw: rawCategory!
        };
    });
  }, [filteredTree, allCategories]);

  const openDeleteDialog = (category: FlatCategory) => {
    setCategoryToDelete(category);
    setDeleteAlertOpen(true);
  }

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    setIsDeleting(true);

    const hasSubcategories = categoryToDelete.raw.subcategories && categoryToDelete.raw.subcategories.length > 0;
    
    const questionsQuery = query(collection(db, 'questions'), where('questionCategoryId', '==', categoryToDelete.id), limit(1));
    const questionsSnapshot = await getDocs(questionsQuery);
    const hasQuestions = !questionsSnapshot.empty;

    if (hasSubcategories || hasQuestions) {
        let errorMessage = "This category cannot be deleted because it contains ";
        if (hasSubcategories && hasQuestions) {
            errorMessage += "sub-categories and is assigned to questions.";
        } else if (hasSubcategories) {
            errorMessage += "sub-categories.";
        } else {
            errorMessage += "is assigned to questions.";
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
        await deleteDoc(doc(db, "question_categories", categoryToDelete.id));
        toast({
            title: "Category Deleted",
            description: `"${categoryToDelete.name}" has been successfully deleted.`
        });
        
        await loadCategories();
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
          <h1 className="text-3xl font-bold">Manage Question Categories</h1>
          <Button asChild>
            <Link href="/admin/question-categories/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Category
            </Link>
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Question Categories</CardTitle>
            <CardDescription>A list of all categories for organizing questions.</CardDescription>
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
                  <TableHead className="w-[60%]">Name</TableHead>
                  <TableHead>Subcategories</TableHead>
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
                    <TableCell>
                      {category.raw.subcategories?.length || 0}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuLabel>Actions</DropdownMenuLabel>
                           <DropdownMenuItem asChild>
                            <Link href={`/admin/question-categories/new?parentId=${category.id}`}>
                              <Plus className="mr-2 h-4 w-4" />
                              Add Subcategory
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/question-categories/${category.id}/edit`}>
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
                      <TableCell colSpan={3} className="h-24 text-center">
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
