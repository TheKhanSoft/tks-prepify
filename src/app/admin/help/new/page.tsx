
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addHelpArticle, fetchHelpCategories } from "@/lib/help-service";
import type { HelpCategory } from "@/types";

const articleFormSchema = z.object({
  question: z.string().min(3, { message: "Question must be at least 3 characters." }),
  answer: z.string().min(10, { message: "Answer must be at least 10 characters." }),
  categoryId: z.string({ required_error: "Please select a category." }),
  order: z.coerce.number().int().min(0, { message: "Order must be a non-negative number." }).default(0),
});

type ArticleFormValues = z.infer<typeof articleFormSchema>;

export default function NewHelpArticlePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleFormSchema),
  });

  useEffect(() => {
    const loadCategories = async () => {
      setLoading(true);
      try {
        const cats = await fetchHelpCategories();
        setCategories(cats);
        if (cats.length > 0) {
          form.setValue('categoryId', cats[0].id);
        }
      } catch (error) {
        toast({ title: "Error", description: "Could not load categories.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    loadCategories();
  }, [toast, form]);

  async function onSubmit(data: ArticleFormValues) {
    setIsSubmitting(true);
    try {
      await addHelpArticle(data);
      toast({ title: "Article Created", description: "The new help article has been saved." });
      router.push("/admin/help");
      router.refresh(); 
    } catch (error) {
      toast({ title: "Error", description: "Failed to create article.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Help Center
        </Button>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Add New Help Article</CardTitle>
              <CardDescription>Fill out the form below to create a new support article.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField control={form.control} name="question" render={({ field }) => (<FormItem><FormLabel>Question / Title</FormLabel><FormControl><Input placeholder="e.g., How do I reset my password?" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="answer" render={({ field }) => (<FormItem><FormLabel>Answer</FormLabel><FormControl><Textarea placeholder="Provide a detailed answer..." rows={10} {...field} /></FormControl><FormDescription>This field supports Markdown for formatting.</FormDescription><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="categoryId" render={({ field }) => (<FormItem><FormLabel>Category</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}><FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl><SelectContent>{categories.map(cat => (<SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="order" render={({ field }) => (<FormItem><FormLabel>Display Order</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormDescription>A lower number will appear higher in the list.</FormDescription><FormMessage /></FormItem>)} />
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.push('/admin/help')} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || loading}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Article</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
