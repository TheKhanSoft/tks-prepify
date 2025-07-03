
"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from 'next/navigation';
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
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { ArrowLeft, PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, FileUp } from "lucide-react";
import { getPaperById } from "@/lib/paper-service";
import { fetchQuestionsForPaper, deleteQuestion, addQuestionsBatch } from "@/lib/question-service";
import type { Paper, Question } from "@/types";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import Papa from "papaparse";

export default function AdminPaperQuestionsPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const paperId = params.paperId as string;
    
    const [paper, setPaper] = useState<Paper | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);

    // Import states
    const [isImporting, setIsImporting] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

    const loadData = useCallback(async () => {
        // Don't set loading to true here to avoid flicker on re-fetches
        if (!paperId) {
            setLoading(false);
            return;
        }
        try {
            const [fetchedPaper, fetchedQuestions] = await Promise.all([
                getPaperById(paperId),
                fetchQuestionsForPaper(paperId),
            ]);
            setPaper(fetchedPaper);
            setQuestions(fetchedQuestions);
        } catch(e) {
            console.error(e);
            toast({ title: "Error", description: "Failed to load paper data.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [paperId, toast]);

    useEffect(() => {
        setLoading(true);
        loadData();
    }, [loadData]);

    const openDeleteDialog = (question: Question) => {
        setQuestionToDelete(question);
    }

    const handleDeleteQuestion = async () => {
        if (!questionToDelete) return;
        setIsDeleting(true);
        try {
            await deleteQuestion(questionToDelete.id, paperId);
            toast({
                title: "Question Deleted",
                description: "The question has been successfully deleted."
            });
            await loadData();
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete question.", variant: "destructive"});
        } finally {
            setIsDeleting(false);
            setQuestionToDelete(null);
        }
    }
    
    const handleDownloadSample = () => {
        const csvContent = "data:text/csv;charset=utf-8," +
            "order,type,questionText,options,correctAnswer,explanation\n" +
            '1,mcq,"What is 2+2?","1|2|3|4","4","Basic addition."\n' +
            '2,mcq,"Which of these are prime numbers?","2|4|7|9","2|7","A prime number is only divisible by 1 and itself."\n' +
            '3,short_answer,"What is the capital of France?","","Paris","Paris is the capital and most populous city of France."';

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "sample_questions.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImport = async () => {
        if (!importFile) {
            toast({ title: "No file selected", description: "Please select a CSV file to import.", variant: "destructive" });
            return;
        }
        setIsImporting(true);

        Papa.parse(importFile, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const requiredHeaders = ["type", "questionText", "correctAnswer"];
                const headers = results.meta.fields || [];
                const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

                if (missingHeaders.length > 0) {
                    toast({ title: "Import Failed", description: `Missing required headers: ${missingHeaders.join(', ')}`, variant: "destructive" });
                    setIsImporting(false);
                    return;
                }

                try {
                    const existingQuestions = await fetchQuestionsForPaper(paperId);
                    let nextOrder = existingQuestions.length > 0 ? Math.max(...existingQuestions.map(q => q.order)) + 1 : 1;

                    const newQuestions = results.data.map((row: any) => {
                        if (!row.type || !row.questionText || !row.correctAnswer) {
                            throw new Error("Each row must have type, questionText, and correctAnswer.");
                        }
                        const order = row.order && !isNaN(parseInt(row.order, 10)) ? parseInt(row.order, 10) : nextOrder++;

                        const question: Omit<Question, 'id'> = {
                            paperId: paperId,
                            order: order,
                            type: row.type.trim() as 'mcq' | 'short_answer',
                            questionText: row.questionText.trim(),
                            options: row.options ? row.options.split('|').map((s: string) => s.trim()) : [],
                            correctAnswer: row.type.trim() === 'mcq' && row.correctAnswer.includes('|') ? row.correctAnswer.split('|').map((s: string) => s.trim()) : row.correctAnswer.trim(),
                            explanation: row.explanation ? row.explanation.trim() : "",
                        };
                        return question;
                    });
                    
                    if (newQuestions.length > 0) {
                        await addQuestionsBatch(paperId, newQuestions);
                        toast({ title: "Import Successful", description: `${newQuestions.length} questions have been added.` });
                        await loadData();
                    } else {
                         toast({ title: "Nothing to import", description: "The selected file was empty or invalid.", variant: "destructive" });
                    }
                    
                    setIsImportDialogOpen(false);
                    setImportFile(null);
                } catch (error: any) {
                    toast({ title: "Import Error", description: error.message || "An error occurred during import.", variant: "destructive" });
                } finally {
                    setIsImporting(false);
                }
            },
            error: (error: any) => {
                toast({ title: "Parsing Error", description: error.message, variant: "destructive" });
                setIsImporting(false);
            }
        });
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full min-h-[calc(100vh-20rem)]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }
    if (!paper) {
        return (
            <div className="container mx-auto text-center py-20">
                <h1 className="text-2xl font-bold">Paper Not Found</h1>
                <p>This question paper could not be found or is not available.</p>
                <Button onClick={() => router.push('/admin/papers')} className="mt-4">Go to Papers</Button>
            </div>
        );
    }

    return (
        <>
        <div className="space-y-6">
            <div>
                <Button variant="outline" onClick={() => router.push('/admin/papers')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Papers
                </Button>
            </div>
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Questions for: {paper.title}</h1>
                    <p className="text-muted-foreground">Manage the questions for this paper.</p>
                </div>
                <div className="flex gap-2">
                    <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline"><FileUp className="mr-2 h-4 w-4" /> Import Questions</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Import Questions from CSV</DialogTitle>
                                <DialogDescription>
                                    Select a CSV file with questions to import. Make sure the file follows the required format.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <Button variant="link" onClick={handleDownloadSample} className="p-0 h-auto">Download sample template</Button>
                                <Input type="file" accept=".csv" onChange={e => setImportFile(e.target.files ? e.target.files[0] : null)} />
                            </div>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setIsImportDialogOpen(false)} disabled={isImporting}>Cancel</Button>
                                <Button onClick={handleImport} disabled={isImporting || !importFile}>
                                    {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Import
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Button asChild>
                        <Link href={`/admin/papers/${paper.id}/questions/new`}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add New Question
                        </Link>
                    </Button>
                </div>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Questions</CardTitle>
                    <CardDescription>A list of all questions in this paper. Total: {questions.length}</CardDescription>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead className="w-[50%]">Question</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Answer</TableHead>
                        <TableHead><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {questions.length > 0 ? questions.map((question) => (
                        <TableRow key={question.id}>
                            <TableCell>{question.order}</TableCell>
                            <TableCell className="font-medium">{question.questionText}</TableCell>
                            <TableCell><Badge variant="secondary">{question.type.toUpperCase()}</Badge></TableCell>
                            <TableCell className="truncate max-w-xs">{Array.isArray(question.correctAnswer) ? question.correctAnswer.join(', ') : question.correctAnswer}</TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem asChild><Link href={`/admin/papers/${paperId}/questions/${question.id}/edit`}><Edit className="mr-2 h-4 w-4" />Edit</Link></DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onSelect={() => openDeleteDialog(question)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow><TableCell colSpan={5} className="h-24 text-center">No questions found for this paper yet.</TableCell></TableRow>
                    )}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
        </div>
        <AlertDialog open={!!questionToDelete} onOpenChange={(open) => !open && setQuestionToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone. This will permanently delete the question.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteQuestion} disabled={isDeleting}>
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </>
    )
}
