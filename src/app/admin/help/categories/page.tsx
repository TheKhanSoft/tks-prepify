
"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, ArrowLeft, BookPlus, Sparkles } from "lucide-react";
import { fetchHelpCategories, deleteHelpCategory, addMultipleHelpArticles, fetchHelpArticles } from "@/lib/help-service";
import type { HelpCategory, HelpArticle } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { generateHelpArticles } from "@/ai/flows/generate-help-articles-flow";

export default function AdminHelpCategoriesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [deleteAlert, setDeleteAlert] = useState<{ open: boolean, category?: HelpCategory }>({ open: false });
  const [generationDialog, setGenerationDialog] = useState<{ open: boolean, category?: HelpCategory }>({ open: false });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, arts] = await Promise.all([
          fetchHelpCategories(),
          fetchHelpArticles()
      ]);
      setCategories(cats);
      setArticles(arts);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load categories or articles.", variant: "destructive" });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async () => {
    if (!deleteAlert.category) return;
    setIsDeleting(true);
    try {
      await deleteHelpCategory(deleteAlert.category.id);
      toast({ title: "Category Deleted", description: `"${deleteAlert.category.name}" has been deleted.` });
      await loadData();
    } catch (error: any) {
      toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setDeleteAlert({ open: false });
    }
  };

  const handleGenerateClick = (category: HelpCategory) => {
    setGenerationDialog({ open: true, category });
  };

  const handleGenerateArticles = async () => {
    if (!generationDialog.category) return;
    setIsGenerating(true);
    try {
      const existingArticlesForCategory = articles.filter(a => a.categoryId === generationDialog.category!.id);
      const existingQuestions = existingArticlesForCategory.map(a => a.question);

      const result = await generateHelpArticles({
        categoryName: generationDialog.category.name,
        existingQuestions,
      });

      if (result && result.articles && result.articles.length > 0) {
        await addMultipleHelpArticles(result.articles, generationDialog.category.id);
        toast({
          title: "Articles Generated",
          description: `${result.articles.length} new articles created for "${generationDialog.category.name}".`,
        });
        router.push('/admin/help');
      } else {
        throw new Error("AI did not return any new articles.");
      }
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Generation Failed",
        description: error.message || "Could not generate articles for this category.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setGenerationDialog({ open: false });
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Manage Help Categories</h1>
            <p className="text-muted-foreground">Add or edit categories for your help articles.</p>
          </div>
           <div className="flex gap-2">
                <Button variant="outline" onClick={() => router.push('/admin/help')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Articles
                </Button>
                <Button asChild>
                    <Link href="/admin/help/categories/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Category
                    </Link>
                </Button>
            </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>All Categories</CardTitle>
            <CardDescription>A list of all categories for organizing help articles.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
                <div className="flex justify-center items-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
                <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead className="text-right w-24">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                    {categories.length > 0 ? categories.map((cat) => (
                    <TableRow key={cat.id}>
                        <TableCell className="font-medium">{cat.name}</TableCell>
                        <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild><Link href={`/admin/help/categories/${cat.id}/edit`}><Edit className="mr-2 h-4 w-4" />Edit</Link></DropdownMenuItem>
                              <DropdownMenuItem asChild><Link href={`/admin/help/new?categoryId=${cat.id}`}><BookPlus className="mr-2 h-4 w-4" />Add Article</Link></DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleGenerateClick(cat)}>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Generate Articles (AI)
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onSelect={() => setDeleteAlert({ open: true, category: cat })}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        </TableCell>
                    </TableRow>
                    )) : (
                    <TableRow><TableCell colSpan={2} className="h-24 text-center">No categories found.</TableCell></TableRow>
                    )}
                </TableBody>
                </Table>
            )}
          </CardContent>
        </Card>
      </div>
      <AlertDialog open={deleteAlert.open} onOpenChange={(open) => !open && setDeleteAlert({ open: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the category "{deleteAlert.category?.name}". Any articles in this category will become uncategorized. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
       <AlertDialog open={generationDialog.open} onOpenChange={(open) => !open && setGenerationDialog({ open: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate AI Content?</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate new help articles for the category "{generationDialog.category?.name}".
              The new articles will be added to the help center. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isGenerating}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleGenerateArticles} disabled={isGenerating}>
              {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
