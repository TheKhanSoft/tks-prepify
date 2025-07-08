
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, GripVertical } from "lucide-react";
import { fetchHelpArticles, deleteHelpArticle, fetchHelpCategories } from "@/lib/help-service";
import type { HelpArticle, HelpCategory } from "@/types";
import { useToast } from "@/hooks/use-toast";

export default function AdminHelpCenterPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteAlert, setDeleteAlert] = useState<{ open: boolean, article?: HelpArticle }>({ open: false });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
        const [articlesData, categoriesData] = await Promise.all([
            fetchHelpArticles(),
            fetchHelpCategories()
        ]);
        setArticles(articlesData);
        setCategories(categoriesData);
    } catch (error) {
        toast({ title: "Error", description: "Could not load help articles or categories.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const articlesByCategory = useMemo(() => {
    const grouped: { [key: string]: HelpArticle[] } = {};
    const uncategorized: HelpArticle[] = [];

    articles.forEach(article => {
      if (article.categoryId && categories.some(c => c.id === article.categoryId)) {
        if (!grouped[article.categoryId]) {
          grouped[article.categoryId] = [];
        }
        grouped[article.categoryId].push(article);
      } else {
        uncategorized.push(article);
      }
    });
    
    // Sort articles within each category by order
    for (const catId in grouped) {
        grouped[catId].sort((a,b) => a.order - b.order);
    }
    uncategorized.sort((a,b) => a.order - b.order);

    return { grouped, uncategorized };
  }, [articles, categories]);

  const handleDelete = async () => {
    if (!deleteAlert.article) return;
    setIsDeleting(true);
    try {
      await deleteHelpArticle(deleteAlert.article.id);
      toast({ title: "Article Deleted", description: `"${deleteAlert.article.question}" has been deleted.` });
      await loadData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete article.", variant: "destructive"});
    } finally {
      setIsDeleting(false);
      setDeleteAlert({ open: false });
    }
  };
  
  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold">Help Center Management</h1>
                <p className="text-muted-foreground">Manage your FAQs and support articles.</p>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" asChild>
                    <Link href="/admin/help/categories">Manage Categories</Link>
                </Button>
                <Button asChild>
                    <Link href="/admin/help/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add New Article
                    </Link>
                </Button>
            </div>
        </div>
        <Card>
            <CardHeader><CardTitle>All Articles</CardTitle><CardDescription>A list of all help articles, grouped by category.</CardDescription></CardHeader>
            <CardContent>
            {loading ? (
                <div className="flex justify-center items-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
                <Accordion type="multiple" className="w-full">
                    {[...categories, { id: 'uncategorized', name: 'Uncategorized' }].map(category => {
                        const currentArticles = category.id === 'uncategorized'
                            ? articlesByCategory.uncategorized
                            : articlesByCategory.grouped[category.id] || [];
                        
                        if (currentArticles.length === 0) return null;

                        return (
                            <AccordionItem key={category.id} value={category.id}>
                                <AccordionTrigger className="text-lg font-semibold">{category.name} ({currentArticles.length})</AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-2 pl-4">
                                        {currentArticles.map(article => (
                                            <div key={article.id} className="flex items-center justify-between p-3 rounded-md border group">
                                                <div className="flex items-center gap-2">
                                                     <GripVertical className="h-5 w-5 text-muted-foreground" />
                                                    <span className="font-medium">{article.question}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="ghost" size="sm" asChild>
                                                        <Link href={`/admin/help/${article.id}/edit`}><Edit className="h-4 w-4" /></Link>
                                                    </Button>
                                                     <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteAlert({ open: true, article })}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        );
                    })}
                </Accordion>
            )}
            </CardContent>
        </Card>
      </div>
      <AlertDialog open={deleteAlert.open} onOpenChange={(open) => !open && setDeleteAlert({ open: false })}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete the article "{deleteAlert.article?.question}". This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
