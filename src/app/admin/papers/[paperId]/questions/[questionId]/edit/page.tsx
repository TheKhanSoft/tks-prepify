
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
import { getQuestionById } from "@/lib/data";
import { getPaperById } from "@/lib/category-service";
import React, { useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const mcqSchema = z.object({
    type: z.literal('mcq'),
    questionText: z.string().min(10, { message: "Question text must be at least 10 characters." }),
    options: z.array(z.object({ text: z.string().min(1, { message: "Option text cannot be empty." }) })).min(2, "MCQ questions must have at least 2 options."),
    correctAnswers: z.array(z.string()).min(1, { message: "At least one correct answer must be selected." }),
    explanation: z.string().optional(),
});

const shortAnswerSchema = z.object({
    type: z.literal('short_answer'),
    questionText: z.string().min(10, { message: "Question text must be at least 10 characters." }),
    correctAnswer: z.string().min(1, { message: "A correct answer must be provided." }),
    explanation: z.string().optional(),
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
  
  const paper = getPaperById(paperId);
  const question = getQuestionById(questionId);

  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionFormSchema),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    // @ts-ignore
    name: "options"
  });

  useEffect(() => {
    if (question) {
        if (question.type === 'mcq') {
            form.reset({
                type: 'mcq',
                questionText: question.questionText,
                options: question.options?.map(opt => ({ text: opt })) || [],
                correctAnswers: Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer],
                explanation: question.explanation || '',
            })
        } else {
            form.reset({
                type: 'short_answer',
                questionText: question.questionText,
                correctAnswer: question.correctAnswer as string,
                explanation: question.explanation || '',
            })
        }
    }
  }, [question, form]);

  const questionType = form.watch("type");

  function onSubmit(data: QuestionFormValues) {
    console.log(data);
    toast({
      title: "Question Updated",
      description: "The question has been updated (console only).",
    });
    router.push(`/admin/papers/${paperId}/questions`);
  }
  
  if (!paper || !question) return (
    <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
       <div>
        <Button variant="outline" onClick={() => router.back()}>
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
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question Type</FormLabel>
                    <Select onValueChange={(value) => {
                      // @ts-ignore
                      field.onChange(value);
                      if (value === 'mcq' && fields.length === 0) {
                        append({ text: '' });
                        append({ text: '' });
                      }
                    }} defaultValue={field.value}>
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

              <FormField
                control={form.control}
                name="questionText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question Text</FormLabel>
                    <FormControl>
                      <Textarea placeholder="What is the capital of France?" {...field} />
                    </FormControl>
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
                            // @ts-ignore
                            name="correctAnswers"
                            render={({ field }) => (
                                <div className="flex justify-center">
                                <Checkbox
                                    // @ts-ignore
                                    checked={field.value?.includes(form.getValues(`options.${index}.text`))}
                                    onCheckedChange={(checked) => {
                                        // @ts-ignore
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
                            // @ts-ignore
                            name={`options.${index}.text`}
                            render={({ field }) => (
                                <Input
                                    {...field}
                                    placeholder={`Option ${index + 1}`}
                                    onChange={(e) => {
                                        const oldValue = field.value;
                                        const newValue = e.target.value;
                                        field.onChange(newValue);
                                        // @ts-ignore
                                        const correctAnswers = form.getValues("correctAnswers") || [];
                                        if (correctAnswers.includes(oldValue)) {
                                            // @ts-ignore
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
                            disabled={fields.length <= 2}
                            >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remove option</span>
                        </Button>
                      </React.Fragment>
                    ))}
                  </div>

                  <Button type="button" variant="outline" size="sm" onClick={() => append({ text: "" })}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Option
                  </Button>
                  {/* @ts-ignore */}
                  <FormMessage>{form.formState.errors.correctAnswers?.message || form.formState.errors.options?.message}</FormMessage>
                </div>
              )}

              {questionType === 'short_answer' && (
                <FormField
                  control={form.control}
                  // @ts-ignore
                  name="correctAnswer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correct Answer</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter the exact correct answer..." {...field} />
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
                      <Textarea placeholder="Provide a detailed explanation for the correct answer..." {...field} value={field.value || ''}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                 <Button type="button" variant="outline" onClick={() => router.push(`/admin/papers/${paperId}/questions`)}>
                    Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
