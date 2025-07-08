
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getHelpArticleById, updateHelpArticle, fetchHelpCategories } from "@/lib/help-service";
import type { HelpCategory } from "@/types";

const articleFormSchema = z.object({
  question: z.string().min(3, { message: "Question must be at least 3 characters." }),
  answer: z.string().min(10, { message: "Answer must be at least 10 characters." }),
  categoryId: z.string({ required_error: "Please select a category." }),
  order: z.coerce.number().int().min(0, { message: "Order must be a non-negative number." }),
});

type ArticleFormValues = z.infer<typeof articleFormSchema>;

export default function EditHelpArticlePage() {
  const router = useRouter();
  const params = useParams();
  const articleId = params.articleId as string;
  const { toast } = useToast();

  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleFormSchema),
  });

  useEffect(() => {
    if (!articleId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [articleData, categoriesData] = await Promise.all([
          getHelpArticleById(articleId),
          fetchHelpCategories(),
        ]);

        if (articleData) {
          form.reset(articleData);
        } else {
          toast({ title: "Error", description: "Help article not found.", variant: "destructive" });
          router.push('/admin/help');
        }
        setCategories(categoriesData);
      } catch (error) {
        toast({ title: "Error", description: "Failed to load data.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [articleId, form, router, toast]);

  async function onSubmit(data: ArticleFormValues) {
    setIsSubmitting(true);
    try {
      await updateHelpArticle(articleId, data);
      toast({ title: "Article Updated", description: "The help article has been updated successfully." });
      router.push("/admin/help");
      router.refresh();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update the article.", variant: "destructive" });
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
  
  const currentQuestion = form.getValues('question');

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
              <CardTitle>Edit Article: {currentQuestion}</CardTitle>
              <CardDescription>Update the details for this help article.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField control={form.control} name="question" render={({ field }) => (<FormItem><FormLabel>Question / Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="answer" render={({ field }) => (<FormItem><FormLabel>Answer</FormLabel><FormControl><Textarea {...field} rows={10} /></FormControl><FormDescription>This field supports Markdown for formatting.</FormDescription><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="categoryId" render={({ field }) => (<FormItem><FormLabel>Category</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl><SelectContent>{categories.map(cat => (<SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="order" render={({ field }) => (<FormItem><FormLabel>Display Order</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormDescription>A lower number will appear higher in the list.</FormDescription><FormMessage /></FormItem>)} />
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.push('/admin/help')} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
