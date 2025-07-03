
"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, PlusCircle, Trash2, Loader2 } from "lucide-react";
import { getPaperById } from "@/lib/paper-service";
import { addQuestionToPaper, fetchQuestionsForPaper, findQuestionByText } from "@/lib/question-service";
import type { Paper, Question, QuestionCategory } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import React, { useState, useEffect, useMemo } from "react";
import { fetchQuestionCategories } from "@/lib/question-category-service";
import { getFlattenedQuestionCategories } from "@/lib/question-category-helpers";

const baseSchema = z.object({
  order: z.coerce.number().int().min(1, { message: "Order must be a positive number." }),
  questionText: z.string().min(10, { message: "Question text must be at least 10 characters." }),
  explanation: z.string().optional(),
  questionCategoryId: z.string().optional(),
});

const mcqSchema = baseSchema.extend({
    type: z.literal('mcq'),
    options: z.array(z.object({ text: z.string().min(1, { message: "Option text cannot be empty." }) })).min(2, "MCQ questions must have at least 2 options."),
    correctAnswers: z.array(z.string()).min(1, { message: "At least one correct answer must be selected." }),
});

const shortAnswerSchema = baseSchema.extend({
    type: z.literal('short_answer'),
    correctAnswer: z.string().min(1, { message: "A correct answer must be provided." }),
});

const questionFormSchema = z.discriminatedUnion("type", [mcqSchema, shortAnswerSchema])
  .refine(data => {
    if (data.type === 'mcq') {
        const optionTexts = data.options.map(opt => opt.text);
        return data.correctAnswers.every(answer => optionTexts.includes(answer));
    }
    return true;
  }, {
      message: "Correct answers must match one of the options.",
      path: ["correctAnswers"],
  });

type QuestionFormValues = z.infer<typeof questionFormSchema>;

export default function NewQuestionPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const paperId = params.paperId as string;

  const [paper, setPaper] = useState<Paper | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextOrder, setNextOrder] = useState(1);
  const [questionCategories, setQuestionCategories] = useState<QuestionCategory[]>([]);

  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionFormSchema),
  });

  useEffect(() => {
      if (!paperId) return;
      const loadData = async () => {
          setLoading(true);
          try {
            const [fetchedPaper, fetchedQuestions, fetchedQuestionCats] = await Promise.all([
              getPaperById(paperId),
              fetchQuestionsForPaper(paperId),
              fetchQuestionCategories()
            ]);
            setPaper(fetchedPaper);
            setQuestionCategories(fetchedQuestionCats);

            if(fetchedPaper) {
                const nextOrderNumber = fetchedQuestions.length > 0 ? Math.max(...fetchedQuestions.map(q => q.order)) + 1 : 1;
                setNextOrder(nextOrderNumber);
                form.reset({
                    type: 'mcq',
                    order: nextOrderNumber,
                    questionText: '',
                    options: [{ text: "" }, { text: "" }],
                    correctAnswers: [],
                    explanation: '',
                    questionCategoryId: '',
                });
            } else {
                 toast({ title: "Error", description: "Could not load paper data.", variant: "destructive" });
            }
          } catch(e) {
            console.error(e);
            toast({ title: "Error", description: "Could not load initial question data. Please try again.", variant: "destructive" });
          } finally {
            setLoading(false);
          }
      };
      loadData();
  }, [paperId, toast, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options" as 'options',
  });

  const questionType = form.watch("type");
  const flatQuestionCategories = useMemo(() => getFlattenedQuestionCategories(questionCategories), [questionCategories]);

  async function onSubmit(data: QuestionFormValues) {
    setIsSubmitting(true);
    try {
        const existingQuestionId = await findQuestionByText(data.questionText);
        if (existingQuestionId) {
            toast({
                title: "Duplicate Question",
                description: "A question with this exact text already exists. Please import it from the question bank instead of creating a new one.",
                variant: "destructive",
                duration: 8000
            });
            setIsSubmitting(false);
            return;
        }

        const { order, ...restOfData } = data;
        
        const questionData: Omit<Question, 'id'> = {
            type: restOfData.type,
            questionText: restOfData.questionText,
            explanation: restOfData.explanation || "",
            options: restOfData.type === 'mcq' ? restOfData.options.map(o => o.text) : [],
            correctAnswer: restOfData.type === 'mcq' ? restOfData.correctAnswers : restOfData.correctAnswer,
            questionCategoryId: restOfData.questionCategoryId || undefined,
        };

        await addQuestionToPaper(paperId, questionData, order);

        toast({
            title: "Question Created",
            description: "The new question has been saved successfully.",
        });
        router.push(`/admin/papers/${paperId}/questions`);
        router.refresh();
    } catch (error) {
        console.error("Error creating question:", error);
        toast({ title: "Error", description: "Failed to create question.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  if (loading) {
    return (
        <div className="flex justify-center items-center h-full min-h-[calc(100vh-20rem)]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
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
    <div className="space-y-6">
       <div>
        <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Questions
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Add New Question</CardTitle>
          <CardDescription>Add a new question to the paper: {paper.title}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <FormField
                  control={form.control}
                  name="order"
                  render={({ field }) => (
                    <FormItem className="md:col-span-1">
                      <FormLabel>Question Order</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormDescription>
                        The position of this question.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                    <FormItem className="md:col-span-3">
                        <FormLabel>Question Type</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value);
                          if (value === 'mcq' && fields.length === 0) {
                            append({ text: '' });
                            append({ text: '' });
                          } else if (value === 'short_answer') {
                            form.setValue('options', undefined as any);
                            form.setValue('correctAnswers', undefined as any);
                          }
                        }} defaultValue={field.value}
                        disabled={isSubmitting}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a question type" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="mcq">Multiple Choice (MCQ)</SelectItem>
                                <SelectItem value="short_answer">Short Answer</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>

              <FormField
                control={form.control}
                name="questionText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question Text</FormLabel>
                    <FormControl>
                      <Textarea placeholder="What is the capital of France?" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="questionCategoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question Category (Optional)</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category for this question" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                         <SelectItem value="none">None</SelectItem>
                        {flatQuestionCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id} style={{ paddingLeft: `${1 + cat.level * 1.5}rem` }}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Organize questions by topic.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {questionType === 'mcq' && (
                <div className="space-y-4 rounded-md border p-4">
                  <FormLabel>Options & Correct Answers</FormLabel>
                  <FormDescription>
                    Add your options below and check the box for each correct answer.
                  </FormDescription>

                  <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-2">
                    {/* Grid Header */}
                    <Label className="text-sm font-medium text-muted-foreground justify-self-center">Correct Option(s)</Label>
                    <Label className="text-sm font-medium text-muted-foreground">Option Text</Label>
                    <span />

                    {/* Grid Rows */}
                    {fields.map((item, index) => (
                      <React.Fragment key={item.id}>
                        <FormField
                            control={form.control}
                            name="correctAnswers"
                            render={({ field }) => (
                                <div className="flex justify-center">
                                <Checkbox
                                    disabled={isSubmitting}
                                    checked={field.value?.includes(form.getValues(`options.${index}.text`))}
                                    onCheckedChange={(checked) => {
                                        const optionText = form.getValues(`options.${index}.text`);
                                        if (!optionText) return;
                                        const currentAnswers = field.value || [];
                                        if (checked) {
                                            field.onChange([...currentAnswers, optionText]);
                                        } else {
                                            field.onChange(currentAnswers.filter((val: string) => val !== optionText));
                                        }
                                    }}
                                />
                                </div>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name={`options.${index}.text` as any}
                            render={({ field }) => (
                                <Input
                                    {...field}
                                    disabled={isSubmitting}
                                    placeholder={`Option ${index + 1}`}
                                    onChange={(e) => {
                                        const oldValue = field.value;
                                        const newValue = e.target.value;
                                        field.onChange(newValue);
                                        const correctAnswers = form.getValues("correctAnswers") || [];
                                        if (correctAnswers.includes(oldValue)) {
                                            form.setValue("correctAnswers", correctAnswers.map((ans: string) => ans === oldValue ? newValue : ans), { shouldValidate: true });
                                        }
                                    }}
                                />
                            )}
                        />
                         <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            disabled={fields.length <= 2 || isSubmitting}
                            >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remove option</span>
                        </Button>
                      </React.Fragment>
                    ))}
                  </div>
                  
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ text: "" })} disabled={isSubmitting}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Option
                  </Button>
                  <FormMessage>{form.formState.errors.correctAnswers?.message || (form.formState.errors.options as any)?.message}</FormMessage>
                </div>
              )}

              {questionType === 'short_answer' && (
                <FormField
                  control={form.control}
                  name="correctAnswer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correct Answer</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter the exact correct answer..." {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

               <FormField
                control={form.control}
                name="explanation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Explanation (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Provide a detailed explanation for the correct answer..." {...field} value={field.value || ''} disabled={isSubmitting}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                 <Button type="button" variant="outline" onClick={() => router.push(`/admin/papers/${paperId}/questions`)} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Question
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
