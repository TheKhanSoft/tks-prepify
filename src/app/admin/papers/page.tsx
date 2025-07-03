
"use client"

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
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Edit, Trash2, Plus, Search, Loader2, Copy } from "lucide-react";
import { fetchPapers } from "@/lib/paper-service";
import { fetchAllPaperQuestionLinks } from "@/lib/question-service";
import { fetchCategories } from "@/lib/category-service";
import { getCategoryPath, getFlattenedCategories } from "@/lib/category-helpers";
import type { Category, Paper } from "@/types";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";


export default function AdminPapersPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [allPapers, setAllPapers] = useState<Paper[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState<{ [key: string]: boolean }>({});
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [paperToDelete, setPaperToDelete] = useState<Paper | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
        const [papers, cats, links] = await Promise.all([
          fetchPapers(), 
          fetchCategories(),
          fetchAllPaperQuestionLinks()
        ]);
        setAllPapers(papers);
        setAllCategories(cats);

        const counts = links.reduce((acc, link) => {
            if (link.paperId) {
                acc[link.paperId] = (acc[link.paperId] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
        setQuestionCounts(counts);

    } catch (error) {
        console.error("Failed to load data:", error);
        toast({ title: "Error", description: "Could not load papers or categories.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const flatCategories = useMemo(() => getFlattenedCategories(allCategories), [allCategories]);

  const papers = useMemo(() => allPapers.filter(paper => {
      const matchesSearch = paper.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "all" || paper.categoryId.startsWith(selectedCategory);
      return matchesSearch && matchesCategory;
  }), [allPapers, searchTerm, selectedCategory]);

  const openDeleteDialog = (paper: Paper) => {
    setPaperToDelete(paper);
    setDeleteAlertOpen(true);
  }

  const handleStatusToggle = async (paperId: string, field: 'published' | 'featured', newStatus: boolean) => {
    setIsUpdating(prev => ({ ...prev, [paperId]: true }));
    try {
        const paperRef = doc(db, "papers", paperId);
        await updateDoc(paperRef, { [field]: newStatus });
        
        toast({
            title: "Paper Updated",
            description: `The ${field} status has been updated.`,
        });

        setAllPapers(prevPapers => prevPapers.map(p => 
            p.id === paperId ? { ...p, [field]: newStatus } : p
        ));
        
        router.refresh();

    } catch (error) {
        console.error(`Failed to update ${field} status:`, error);
        toast({
            title: "Error",
            description: "Failed to update paper. Please try again.",
            variant: "destructive",
        });
    } finally {
        setIsUpdating(prev => ({ ...prev, [paperId]: false }));
    }
  };


  const handleDeletePaper = async () => {
    if (!paperToDelete) return;
    setIsDeleting(true);
    try {
        await deleteDoc(doc(db, "papers", paperToDelete.id));
        toast({
            title: "Paper Deleted",
            description: `"${paperToDelete.title}" has been successfully deleted.`
        });
        await loadData(); // Refetch data
        router.refresh();
    } catch (error) {
        console.error("Error deleting paper:", error);
        toast({
            title: "Error",
            description: "Failed to delete the paper. Please try again.",
            variant: "destructive"
        });
    } finally {
        setIsDeleting(false);
        setDeleteAlertOpen(false);
    }
  }

  return (
    <>
    <div>
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
            <h1 className="text-3xl font-bold">Manage Papers</h1>
            <p className="text-muted-foreground">A list of all question papers in the system.</p>
        </div>
        <Button asChild>
          <Link href="/admin/papers/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New Paper
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
           <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={loading}>
              <SelectTrigger className="md:w-[280px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {flatCategories.map(cat => (
                  <SelectItem
                    key={cat.id}
                    value={cat.id}
                    style={{ paddingLeft: `${1 + cat.level * 1.5}rem` }}
                  >
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="flex justify-center items-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
                <TableHeader>
                  <TableRow>
                      <TableHead className="w-[35%]">Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Year & Session</TableHead>
                      <TableHead className="text-center">Published</TableHead>
                      <TableHead className="text-center">Featured</TableHead>
                      <TableHead>
                          <span className="sr-only">Actions</span>
                      </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {papers.length > 0 ? papers.map((paper) => {
                    const categoryPath = getCategoryPath(paper.categoryId, allCategories);
                    const categoryName = categoryPath?.map(c => c.name).join(' / ') || 'N/A';
                    const isPaperUpdating = isUpdating[paper.id] || isDeleting;
                    const addedQuestions = questionCounts[paper.id] || 0;
                    const isComplete = addedQuestions >= paper.questionCount;
                    return (
                    <TableRow key={paper.id}>
                        <TableCell>
                          <div className="font-medium">{paper.title}</div>
                          <div className="text-sm text-muted-foreground font-mono">{paper.slug}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{categoryName}</Badge>
                        </TableCell>
                         <TableCell className="text-muted-foreground text-sm">
                            <div>
                                <span className={cn("font-semibold", isComplete ? "text-green-600" : "text-destructive")}>
                                    {addedQuestions}
                                </span> / {paper.questionCount} questions
                            </div>
                            <div>{paper.duration} min</div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                            {paper.year && <div>{paper.year}</div>}
                            {paper.session && <div>{paper.session}</div>}
                        </TableCell>
                        <TableCell className="text-center">
                            <Switch
                                checked={paper.published}
                                onCheckedChange={(status) => handleStatusToggle(paper.id, 'published', status)}
                                disabled={isPaperUpdating}
                                aria-label="Toggle published status"
                            />
                        </TableCell>
                        <TableCell className="text-center">
                            <Switch
                                checked={paper.featured}
                                onCheckedChange={(status) => handleStatusToggle(paper.id, 'featured', status)}
                                disabled={isPaperUpdating}
                                aria-label="Toggle featured status"
                            />
                        </TableCell>
                        <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost" disabled={isPaperUpdating}>
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Toggle menu</span>
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                                <Link href={`/admin/papers/${paper.id}/questions`}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add/Edit Questions
                                </Link>
                                </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href={`/admin/papers/${paper.id}/edit`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Details
                                </Link>
                            </DropdownMenuItem>
                             <DropdownMenuItem asChild>
                                <Link href={`/admin/papers/copy/${paper.id}`}>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copy Paper
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                                className="text-destructive"
                                onSelect={() => openDeleteDialog(paper)}
                                disabled={isPaperUpdating}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        </TableCell>
                    </TableRow>
                    )
                }) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        No papers found. Try adjusting your filters.
                      </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
    <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                paper "{paperToDelete?.title}".
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePaper} disabled={isDeleting}>
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
    
