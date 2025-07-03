
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import { MoreHorizontal, Trash2, Loader2, Edit, ChevronDown } from "lucide-react";
import { fetchAllQuestions, deleteQuestionsFromBank, getUsageCountForQuestions } from "@/lib/question-service";
import type { Question, QuestionCategory } from "@/types";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchQuestionCategories, getFlattenedQuestionCategories, getDescendantQuestionCategoryIds } from "@/lib/question-category-service";
import { Checkbox } from "@/components/ui/checkbox";

export default function AllQuestionsPage() {
    const router = useRouter();
    const { toast } = useToast();
    
    const [questions, setQuestions] = useState<Question[]>([]);
    const [questionCategories, setQuestionCategories] = useState<QuestionCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
    const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
    const [questionsToDelete, setQuestionsToDelete] = useState<string[]>([]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [fetchedQuestions, fetchedCategories] = await Promise.all([
                fetchAllQuestions(),
                fetchQuestionCategories()
            ]);
            setQuestions(fetchedQuestions);
            setQuestionCategories(fetchedCategories);
        } catch(e) {
            console.error(e);
            toast({ 
                title: "Error loading data", 
                description: "Could not load the question bank or categories.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const flatQuestionCategories = useMemo(() => getFlattenedQuestionCategories(questionCategories), [questionCategories]);

    const filteredQuestions = useMemo(() => {
        return questions.filter(q => {
            const matchesSearch = q.questionText.toLowerCase().includes(searchTerm.toLowerCase());
            
            let matchesCategory = true;
            if (selectedCategory !== 'all') {
                if (!q.questionCategoryId) {
                    matchesCategory = false;
                } else {
                    const descendantIds = getDescendantQuestionCategoryIds(selectedCategory, questionCategories);
                    matchesCategory = descendantIds.includes(q.questionCategoryId);
                }
            }
            return matchesSearch && matchesCategory;
        });
    }, [searchTerm, selectedCategory, questions, questionCategories]);

    const openDeleteDialog = (questionIds: string[]) => {
        if (questionIds.length === 0) {
            toast({ title: "No questions selected", description: "Please select questions to delete.", variant: "destructive" });
            return;
        }
        setQuestionsToDelete(questionIds);
        setDeleteAlertOpen(true);
    }

    const handleDelete = async () => {
        if (questionsToDelete.length === 0) return;

        setIsDeleting(true);
        try {
            const usageCounts = await getUsageCountForQuestions(questionsToDelete);
            
            const deletableIds = questionsToDelete.filter(id => (usageCounts[id] || 0) === 0);
            const usedIds = questionsToDelete.filter(id => (usageCounts[id] || 0) > 0);

            if (usedIds.length > 0) {
                toast({
                    title: "Some Questions in Use",
                    description: `${usedIds.length} question(s) are in use and were not deleted. Please remove them from all papers first.`,
                    variant: "destructive",
                    duration: 8000
                });
            }

            if (deletableIds.length > 0) {
                await deleteQuestionsFromBank(deletableIds);
                toast({
                    title: "Questions Deleted",
                    description: `${deletableIds.length} question(s) have been permanently deleted.`
                });
            }

            if (deletableIds.length > 0) {
                setSelectedQuestions([]);
                await loadData();
            }

        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to delete questions.", variant: "destructive"});
        } finally {
            setIsDeleting(false);
            setDeleteAlertOpen(false);
            setQuestionsToDelete([]);
        }
    }
    
    const isAllSelected = selectedQuestions.length === filteredQuestions.length && filteredQuestions.length > 0;

    return (
        <>
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">All Questions</h1>
                    <p className="text-muted-foreground">Manage the central question bank.</p>
                </div>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">Actions <ChevronDown className="ml-2 h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => openDeleteDialog(selectedQuestions)} disabled={selectedQuestions.length === 0} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Selected
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Question Bank</CardTitle>
                    <CardDescription>A list of all questions in the system. Total: {questions.length}</CardDescription>
                    <div className="pt-4 flex flex-col md:flex-row gap-4">
                        <Input 
                            placeholder="Filter by question text..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                         <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={loading}>
                            <SelectTrigger className="md:w-[280px]">
                                <SelectValue placeholder="Filter by category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {flatQuestionCategories.map(cat => (
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
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">
                                <Checkbox
                                    checked={isAllSelected}
                                    onCheckedChange={(checked) => setSelectedQuestions(checked ? filteredQuestions.map(q => q.id) : [])}
                                    aria-label="Select all"
                                />
                            </TableHead>
                            <TableHead className="w-[45%]">Question</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Answer</TableHead>
                            <TableHead><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {filteredQuestions.length > 0 ? filteredQuestions.map((question) => {
                        const category = question.questionCategoryId ? questionCategories.flatMap(c => getFlattenedQuestionCategories([c])).find(fc => fc.id === question.questionCategoryId) : null;
                        const isSelected = selectedQuestions.includes(question.id);

                        return (
                        <TableRow key={question.id} data-state={isSelected ? "selected" : ""}>
                            <TableCell>
                                <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={(checked) => {
                                        setSelectedQuestions(prev => checked ? [...prev, question.id] : prev.filter(id => id !== question.id));
                                    }}
                                    aria-label="Select row"
                                />
                            </TableCell>
                            <TableCell className="font-medium">{question.questionText}</TableCell>
                            <TableCell>{category ? <Badge variant="outline">{category.name}</Badge> : <span className="text-muted-foreground">-</span>}</TableCell>
                            <TableCell><Badge variant="secondary">{question.type.toUpperCase()}</Badge></TableCell>
                            <TableCell className="truncate max-w-xs">{Array.isArray(question.correctAnswer) ? question.correctAnswer.join(', ') : question.correctAnswer}</TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem asChild>
                                        <Link href={`/admin/questions/${question.id}/edit`}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onSelect={() => openDeleteDialog([question.id])}><Trash2 className="mr-2 h-4 w-4" />Delete from Bank</DropdownMenuItem>
                                </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                        );
                    }) : (
                        <TableRow><TableCell colSpan={6} className="h-24 text-center">No questions found.</TableCell></TableRow>
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
                       This action will attempt to permanently delete {questionsToDelete.length} question(s) from the question bank. This cannot be undone. Questions currently in use in any paper will not be deleted.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Delete Permanently
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </>
    )
}
