
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
import { ArrowLeft, PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, FileUp, Save, FileDown, ChevronDown } from "lucide-react";
import { getPaperById } from "@/lib/paper-service";
import { fetchQuestionsForPaper, removeQuestionsFromPaper, addQuestionsBatch, PaperQuestion, batchUpdateQuestionOrder } from "@/lib/question-service";
import type { Paper } from "@/types";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import Papa from "papaparse";
import { Checkbox } from "@/components/ui/checkbox";

export default function AdminPaperQuestionsPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const paperId = params.paperId as string;
    
    const [paper, setPaper] = useState<Paper | null>(null);
    const [questions, setQuestions] = useState<PaperQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    
    const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
    const [deleteAlert, setDeleteAlert] = useState<{ open: boolean; type: 'single' | 'selected' | 'all'; question?: PaperQuestion }>({ open: false, type: 'single' });

    // Import states
    const [isImporting, setIsImporting] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

    // Reorder states
    const [orderChanges, setOrderChanges] = useState<{ [linkId: string]: number }>({});
    const [isSavingOrder, setIsSavingOrder] = useState(false);

    const loadData = useCallback(async () => {
        if (!paperId) return;
        setLoading(true);
        try {
            const fetchedPaper = await getPaperById(paperId);
            setPaper(fetchedPaper);

            if (fetchedPaper) {
                const fetchedQuestions = await fetchQuestionsForPaper(paperId);
                setQuestions(fetchedQuestions);
            }
        } catch(e) {
            console.error(e);
            if (e instanceof Error && e.message.includes('permission-denied')) {
                 toast({ 
                    title: "A database index might be missing", 
                    description: "Please check your browser's developer console for a link to create the required Firestore index.",
                    variant: "destructive",
                    duration: 10000,
                });
            } else {
                 toast({ 
                    title: "Error loading questions", 
                    description: "Could not load the questions. Please try again later.",
                    variant: "destructive",
                });
            }
        } finally {
            setLoading(false);
        }
    }, [paperId, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const openDeleteDialog = (type: 'single' | 'selected' | 'all', question?: PaperQuestion) => {
        if ((type === 'selected' && selectedQuestions.length === 0) || (type === 'all' && questions.length === 0)) {
            toast({
                title: "No questions to remove",
                description: type === 'selected' ? "Please select at least one question." : "There are no questions in this paper.",
                variant: "destructive"
            });
            return;
        }
        setDeleteAlert({ open: true, type, question });
    }

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            if (deleteAlert.type === 'single' && deleteAlert.question) {
                await removeQuestionsFromPaper(paperId, [deleteAlert.question.linkId]);
                toast({ title: "Question Removed", description: "The question has been removed from this paper." });
            } else if (deleteAlert.type === 'selected') {
                await removeQuestionsFromPaper(paperId, selectedQuestions);
                toast({ title: "Questions Removed", description: `${selectedQuestions.length} questions have been removed.` });
                setSelectedQuestions([]);
            } else if (deleteAlert.type === 'all') {
                const allLinkIds = questions.map(q => q.linkId);
                await removeQuestionsFromPaper(paperId, allLinkIds);
                toast({ title: "All Questions Removed", description: "All questions have been removed from this paper." });
                setSelectedQuestions([]);
            }
            await loadData();
        } catch (error) {
            toast({ title: "Error", description: "Failed to remove questions.", variant: "destructive"});
        } finally {
            setIsDeleting(false);
            setDeleteAlert({ open: false, type: 'single' });
        }
    }

    const handleOrderChange = (linkId: string, newOrder: string) => {
        const orderValue = parseInt(newOrder, 10);
        setOrderChanges(prev => ({ ...prev, [linkId]: orderValue }));
    };

    const handleSaveOrder = async () => {
        setIsSavingOrder(true);
        const updates = Object.entries(orderChanges)
          .map(([linkId, order]) => ({ linkId, order }))
          .filter(u => !isNaN(u.order));

        if (updates.length === 0) {
            toast({ title: "No changes", description: "No new order values to save." });
            setIsSavingOrder(false);
            return;
        }

        try {
            await batchUpdateQuestionOrder(updates);
            toast({ title: "Success", description: "Question order has been updated." });
            setOrderChanges({});
            await loadData(); 
        } catch (error) {
            console.error("Failed to save order:", error);
            toast({ title: "Error", description: "Could not save the new order.", variant: "destructive" });
        } finally {
            setIsSavingOrder(false);
        }
    };
    
    const handleDownloadSample = () => {
        const csvContent = "data:text/csv;charset=utf-8," +
            'order,questionId,type,questionText,options,correctAnswer,explanation,questionCategoryId\n' +
            '1,,mcq,"What is the chemical symbol for Helium?","He|H|Hl|Hm","He","Creates a new MCQ question. Leave questionId blank.","your-category-id-here"\n' +
            '2,,short_answer,"What planet is known as the Red Planet?","","Mars","Creates a new short answer question.","another-category-id"\n' +
            '3,some_existing_question_id,,,,,,,';

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "sample_questions_import.csv");
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
                try {
                    const questionsToProcess = results.data.map((row: any, index: number) => {
                        const order = parseInt(row.order, 10);
                        if(isNaN(order)) {
                            throw new Error(`Row ${index + 2} has an invalid or missing 'order' value.`);
                        }

                        if (row.questionId && row.questionId.trim()) {
                            return { questionId: row.questionId.trim(), order: order };
                        } else {
                            if (!row.type || !row.questionText || !row.correctAnswer) {
                                throw new Error(`Row ${index + 2} is for a new question but is missing a required field (type, questionText, correctAnswer).`);
                            }
                            return {
                                order: order,
                                type: row.type.trim() as 'mcq' | 'short_answer',
                                questionText: row.questionText.trim(),
                                options: row.options ? row.options.split('|').map((s: string) => s.trim()) : [],
                                correctAnswer: row.type.trim() === 'mcq' && row.correctAnswer.includes('|') ? row.correctAnswer.split('|').map((s: string) => s.trim()) : row.correctAnswer.trim(),
                                explanation: row.explanation ? row.explanation.trim() : "",
                                questionCategoryId: row.questionCategoryId ? row.questionCategoryId.trim() : undefined,
                            };
                        }
                    });
                    
                    if (questionsToProcess.length > 0) {
                        await addQuestionsBatch(paperId, questionsToProcess);
                        toast({ title: "Import Successful", description: `${questionsToProcess.length} questions have been processed.` });
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

    const handleExportQuestions = () => {
        if (!paper || questions.length === 0) {
            toast({ title: "Nothing to Export", description: "There are no questions in this paper to export.", variant: "destructive" });
            return;
        }
        const dataToExport = questions.map(q => ({
            order: q.order, questionId: q.id, type: q.type, questionText: q.questionText,
            options: q.options?.join('|') || '',
            correctAnswer: Array.isArray(q.correctAnswer) ? q.correctAnswer.join('|') : q.correctAnswer,
            explanation: q.explanation || ''
        }));
        const csv = Papa.unparse(dataToExport);
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${paper.slug}-questions.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Export Started", description: "Your questions CSV file is downloading." });
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

    const hasOrderChanges = Object.keys(orderChanges).length > 0;
    const isAllSelected = selectedQuestions.length === questions.length && questions.length > 0;
    const isSomeSelected = selectedQuestions.length > 0 && selectedQuestions.length < questions.length;

    const getAlertDialogDescription = () => {
        switch (deleteAlert.type) {
            case 'single':
                return `This will remove the question "${deleteAlert.question?.questionText.substring(0, 30)}..." from this paper, but it will not delete it from the question bank.`;
            case 'selected':
                return `This action cannot be undone. This will remove the ${selectedQuestions.length} selected questions from this paper.`;
            case 'all':
                return `This action cannot be undone. This will remove all ${questions.length} questions from this paper.`;
            default: return 'This action cannot be undone.';
        }
    };
    
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
                    {hasOrderChanges && (
                         <Button onClick={handleSaveOrder} disabled={isSavingOrder}>
                            {isSavingOrder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Order
                        </Button>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">Actions <ChevronDown className="ml-2 h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => openDeleteDialog('selected', undefined)} disabled={selectedQuestions.length === 0}>
                                <Trash2 className="mr-2 h-4 w-4" /> Remove Selected
                            </DropdownMenuItem>
                             <DropdownMenuItem onSelect={() => openDeleteDialog('all', undefined)} disabled={questions.length === 0} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Remove All
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                             <DropdownMenuItem onSelect={handleExportQuestions}><FileDown className="mr-2 h-4 w-4" /> Export Questions</DropdownMenuItem>
                             <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                                <DialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}><FileUp className="mr-2 h-4 w-4" /> Import Questions</DropdownMenuItem>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Import Questions from CSV</DialogTitle>
                                        <DialogDescription>
                                            Select a CSV file to create new questions or link existing ones. The CSV must have headers: `order`, `questionId`, `type`, `questionText`, `options`, `correctAnswer`, `explanation`, and `questionCategoryId`.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4"><Button variant="link" onClick={handleDownloadSample} className="p-0 h-auto">Download sample template</Button><Input type="file" accept=".csv" onChange={e => setImportFile(e.target.files ? e.target.files[0] : null)} /></div>
                                    <DialogFooter><Button variant="ghost" onClick={() => setIsImportDialogOpen(false)} disabled={isImporting}>Cancel</Button><Button onClick={handleImport} disabled={isImporting || !importFile}>{isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Import</Button></DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </DropdownMenuContent>
                    </DropdownMenu>
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
                            <TableHead className="w-12"><Checkbox onCheckedChange={(checked) => setSelectedQuestions(checked ? questions.map(q => q.linkId) : [])} checked={isAllSelected} aria-label="Select all" /></TableHead>
                            <TableHead className="w-[100px]">Order</TableHead>
                            <TableHead className="w-[45%]">Question</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Answer</TableHead>
                            <TableHead><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {questions.length > 0 ? questions.map((question) => (
                        <TableRow key={question.linkId}>
                            <TableCell><Checkbox onCheckedChange={(checked) => setSelectedQuestions(prev => checked ? [...prev, question.linkId] : prev.filter(id => id !== question.linkId))} checked={selectedQuestions.includes(question.linkId)} aria-label="Select row" /></TableCell>
                            <TableCell><Input type="number" value={orderChanges[question.linkId] ?? question.order} onChange={(e) => handleOrderChange(question.linkId, e.target.value)} className="w-16 h-8" /></TableCell>
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
                                    <DropdownMenuItem className="text-destructive" onSelect={() => openDeleteDialog('single', question)}><Trash2 className="mr-2 h-4 w-4" />Remove from Paper</DropdownMenuItem>
                                </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow><TableCell colSpan={6} className="h-24 text-center">No questions found for this paper yet.</TableCell></TableRow>
                    )}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
        </div>
        <AlertDialog open={deleteAlert.open} onOpenChange={(open) => !open && setDeleteAlert({ open: false, type: 'single' })}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>{getAlertDialogDescription()}</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Remove
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </>
    )
}
