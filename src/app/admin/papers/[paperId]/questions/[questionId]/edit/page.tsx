
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
import { ArrowLeft, Loader2, PlusCircle, Trash2 } from "lucide-react";
import { getPaperById } from "@/lib/paper-service";
import { getQuestionById, updateQuestion, getQuestionLink, updateQuestionOrderForPaper } from "@/lib/question-service";
import type { Paper, QuestionCategory } from "@/types";
import React, { useEffect, useState, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { fetchQuestionCategories, getFlattenedQuestionCategories } from "@/lib/question-category-service";

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

export default function EditQuestionPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const paperId = params.paperId as string;
  const questionId = params.questionId as string;
  
  const [paper, setPaper] = useState<Paper | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkId, setLinkId] = useState<string | null>(null);
  const [questionCategories, setQuestionCategories] = useState<QuestionCategory[]>([]);

  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionFormSchema),
  });

  useEffect(() => {
    if (!paperId || !questionId) return;
    const loadData = async () => {
        setLoading(true);
        try {
            const [fetchedPaper, fetchedQuestion, fetchedLink, fetchedQuestionCats] = await Promise.all([
                getPaperById(paperId),
                getQuestionById(questionId),
                getQuestionLink(paperId, questionId),
                fetchQuestionCategories()
            ]);
            setPaper(fetchedPaper);
            setLinkId(fetchedLink?.id || null);
            setQuestionCategories(fetchedQuestionCats);

            if (fetchedQuestion && fetchedLink) {
                if (fetchedQuestion.type === 'mcq') {
                    form.reset({
                        type: 'mcq',
                        order: fetchedLink.order,
                        questionText: fetchedQuestion.questionText,
                        options: fetchedQuestion.options?.map(opt => ({ text: opt })) || [],
                        correctAnswers: Array.isArray(fetchedQuestion.correctAnswer) ? fetchedQuestion.correctAnswer : [fetchedQuestion.correctAnswer],
                        explanation: fetchedQuestion.explanation || '',
                        questionCategoryId: fetchedQuestion.questionCategoryId || '',
                    });
                } else {
                     form.reset({
                        type: 'short_answer',
                        order: fetchedLink.order,
                        questionText: fetchedQuestion.questionText,
                        correctAnswer: fetchedQuestion.correctAnswer as string,
                        explanation: fetchedQuestion.explanation || '',
                        questionCategoryId: fetchedQuestion.questionCategoryId || '',
                    });
                }
            } else {
                 toast({ title: "Error", description: "Question or its link to the paper not found.", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to load data.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, [paperId, questionId, toast, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options" as 'options',
  });

  const questionType = form.watch("type");
  const flatQuestionCategories = useMemo(() => getFlattenedQuestionCategories(questionCategories), [questionCategories]);

  async function onSubmit(data: QuestionFormValues) {
    setIsSubmitting(true);
    try {
        const { order, ...questionFields } = data;

        let questionData: Partial<any> = { ...questionFields };
        
        if (questionData.type === 'mcq') {
            questionData.options = (questionData as any).options.map((o: any) => o.text);
        } else {
            delete questionData.options;
            delete questionData.correctAnswers;
        }

        if (questionData.questionCategoryId === 'none') {
            questionData.questionCategoryId = null;
        }

        await updateQuestion(questionId, questionData);
        if (linkId) {
            await updateQuestionOrderForPaper(linkId, order);
        }

        toast({
            title: "Question Updated",
            description: "The question has been updated successfully.",
        });
        router.push(`/admin/papers/${paperId}/questions`);
        router.refresh();
    } catch (error) {
        console.error("Error updating question:", error);
        toast({ title: "Error", description: "Failed to update question.", variant: "destructive" });
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
            <h1 className="text-2xl font-bold">Paper or Question Not Found</h1>
            <p>The requested resource could not be found.</p>
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
          <CardTitle>Edit Question</CardTitle>
          <CardDescription>Update the question for the paper: {paper.title}</CardDescription>
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
                          }
                        }} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger disabled={isSubmitting}>
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
                     <Select onValueChange={field.onChange} value={field.value || ''} disabled={isSubmitting}>
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
                    <Label className="text-sm font-medium text-muted-foreground justify-self-center">Correct Option(s)</Label>
                    <Label className="text-sm font-medium text-muted-foreground">Option Text</Label>
                    <span />

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
                        <Input placeholder="Enter the exact correct answer..." {...field} disabled={isSubmitting}/>
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
                    Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
