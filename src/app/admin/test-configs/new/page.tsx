
"use client";

import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, PlusCircle, Trash2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addTestConfig } from "@/lib/test-config-service";
import { fetchQuestionCategories } from "@/lib/question-category-service";
import type { QuestionCategory } from "@/types";
import { getFlattenedQuestionCategories } from "@/lib/question-category-helpers";

const compositionRuleSchema = z.object({
  questionCategoryId: z.string().min(1, "Please select a category."),
  percentage: z.coerce.number().min(1, "Percentage must be at least 1.").max(100, "Percentage cannot exceed 100."),
});

const testConfigSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  description: z.string().min(10, "Description is required."),
  duration: z.coerce.number().int().min(1, "Duration must be at least 1 minute."),
  passingMarks: z.coerce.number().min(0).max(100, "Passing marks must be between 0 and 100."),
  marksPerQuestion: z.coerce.number().min(0, "Marks must be a non-negative number."),
  totalQuestions: z.coerce.number().int().min(1, "Total questions must be at least 1."),
  hasNegativeMarking: z.boolean().default(false),
  negativeMarkValue: z.coerce.number().min(0).optional(),
  published: z.boolean().default(false),
  composition: z.array(compositionRuleSchema).min(1, "At least one question rule is required."),
}).refine(data => {
    if (data.hasNegativeMarking) {
        return data.negativeMarkValue !== undefined && data.negativeMarkValue > 0;
    }
    return true;
}, {
    message: "Negative mark value is required and must be positive if negative marking is enabled.",
    path: ["negativeMarkValue"],
}).refine(data => {
    const totalPercentage = data.composition.reduce((sum, rule) => sum + (rule.percentage || 0), 0);
    return totalPercentage === 100;
}, {
    message: "The sum of all category percentages must be exactly 100.",
    path: ["composition"],
});


type TestConfigFormValues = z.infer<typeof testConfigSchema>;

export default function NewTestConfigPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionCategories, setQuestionCategories] = useState<QuestionCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const form = useForm<TestConfigFormValues>({
    resolver: zodResolver(testConfigSchema),
    defaultValues: {
      name: "",
      description: "",
      duration: 120,
      passingMarks: 50,
      marksPerQuestion: 1,
      totalQuestions: 100,
      hasNegativeMarking: false,
      negativeMarkValue: 0.25,
      published: false,
      composition: [{ questionCategoryId: "", percentage: 100 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "composition",
  });
  
  const hasNegativeMarking = useWatch({
    control: form.control,
    name: "hasNegativeMarking"
  });

  useEffect(() => {
    const loadCategories = async () => {
      setLoading(true);
      try {
        const cats = await fetchQuestionCategories();
        setQuestionCategories(cats);
      } catch (error) {
        toast({ title: "Error", description: "Could not load question categories.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    loadCategories();
  }, [toast]);

  async function onSubmit(data: TestConfigFormValues) {
    setIsSubmitting(true);
    const finalData = {
        ...data,
        negativeMarkValue: data.hasNegativeMarking ? data.negativeMarkValue : 0,
    };

    try {
      await addTestConfig(finalData);
      toast({ title: "Success", description: "New test configuration has been created." });
      router.push("/admin/test-configs");
      router.refresh();
    } catch (error) {
      toast({ title: "Error", description: "Failed to create configuration.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  const flatQuestionCategories = useMemo(() => getFlattenedQuestionCategories(questionCategories), [questionCategories]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Test Configs
        </Button>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader><CardTitle>New Test Configuration</CardTitle><CardDescription>Create a blueprint for generating dynamic tests for users.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Configuration Name</FormLabel><FormControl><Input {...field} placeholder="e.g., GAT-A Full Length Test" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} placeholder="A brief description of this test." /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="published" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel>Published</FormLabel><FormDescription>Published tests will be available for users to take.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Marking & Duration</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FormField control={form.control} name="totalQuestions" render={({ field }) => (<FormItem><FormLabel>Total Number of Questions</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="duration" render={({ field }) => (<FormItem><FormLabel>Duration (minutes)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="passingMarks" render={({ field }) => (<FormItem><FormLabel>Passing Marks (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="marksPerQuestion" render={({ field }) => (<FormItem><FormLabel>Marks per Question</FormLabel><FormControl><Input type="number" step="0.5" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </CardContent>
             <CardContent>
                <FormField control={form.control} name="hasNegativeMarking" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel>Enable Negative Marking</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                {hasNegativeMarking && (<div className="p-4 border-t"><FormField control={form.control} name="negativeMarkValue" render={({ field }) => (<FormItem><FormLabel>Negative Marks per Question</FormLabel><FormControl><Input type="number" step="0.25" {...field} /></FormControl><FormMessage /></FormItem>)} /></div>)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Question Composition</CardTitle><CardDescription>Define what percentage of the total questions to pull from each category. The sum must be 100%.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-4 p-4 border rounded-lg">
                  <FormField control={form.control} name={`composition.${index}.questionCategoryId`} render={({ field }) => (<FormItem className="flex-grow"><FormLabel>Question Category</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}><FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl><SelectContent>{flatQuestionCategories.map(cat => (<SelectItem key={cat.id} value={cat.id} style={{ paddingLeft: `${1 + cat.level * 1.5}rem` }}>{cat.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name={`composition.${index}.percentage`} render={({ field }) => (<FormItem className="w-32"><FormLabel>Percentage (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => append({ questionCategoryId: '', percentage: 10 })}><PlusCircle className="mr-2 h-4 w-4" />Add Rule</Button>
              <FormMessage>{form.formState.errors.composition?.message || form.formState.errors.composition?.root?.message}</FormMessage>
            </CardContent>
          </Card>
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.push('/admin/test-configs')} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || loading}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Configuration</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
