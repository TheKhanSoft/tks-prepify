
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import React, { useState, useEffect, useMemo } from "react";
import { fetchQuestionCategories } from "@/lib/question-category-service";
import { getFlattenedQuestionCategories } from "@/lib/question-category-helpers";
import type { QuestionCategory } from "@/types";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";

const categoryFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  parentId: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;


function NewQuestionCategoryPageComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [allCategories, setAllCategories] = useState<QuestionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
        const cats = await fetchQuestionCategories();
        setAllCategories(cats);
        setLoading(false);
    };
    loadData();
  }, []);

  const flatCategories = useMemo(() => getFlattenedQuestionCategories(allCategories), [allCategories]);

  const parentIdParam = searchParams.get("parentId") || undefined;
  
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      parentId: parentIdParam === "none" ? undefined : parentIdParam,
    },
  });

  async function onSubmit(data: CategoryFormValues) {
    setIsSubmitting(true);
    try {
      const parentId = data.parentId === 'none' || !data.parentId ? null : data.parentId;

      const categoryData = {
        name: data.name,
        parentId: parentId,
      };

      await addDoc(collection(db, "question_categories"), categoryData);
      
      toast({
        title: "Category Created",
        description: "The new question category has been saved successfully.",
      });
      router.push("/admin/question-categories");
      router.refresh(); 
    } catch (error) {
      console.error("Error creating category: ", error);
      toast({
        title: "Error",
        description: "Failed to create the category. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
        <div className="flex justify-center items-center h-full min-h-[calc(100vh-20rem)]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Question Categories
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Add New Question Category</CardTitle>
          <CardDescription>Fill out the form below to create a new category for questions.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Analytical Reasoning" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Category (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a parent category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None (Top-level category)</SelectItem>
                        {flatCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id} style={{ paddingLeft: `${1 + cat.level * 1.5}rem` }}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Assign this as a subcategory to an existing category.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => router.push('/admin/question-categories')} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                   {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Category
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewQuestionCategoryPage() {
    return (
        <React.Suspense fallback={
            <div className="flex justify-center items-center h-full min-h-[calc(100vh-20rem)]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <NewQuestionCategoryPageComponent />
        </React.Suspense>
    )
}
