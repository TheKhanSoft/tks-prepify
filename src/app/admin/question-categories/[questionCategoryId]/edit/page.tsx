
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { fetchQuestionCategories, getFlattenedQuestionCategories, getDescendantQuestionCategoryIds } from "@/lib/question-category-service";
import type { QuestionCategory } from "@/types";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const categoryFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  parentId: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export default function EditQuestionCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const categoryId = params.questionCategoryId as string;
  
  const [allCategories, setAllCategories] = useState<QuestionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (!categoryId) return;
    const loadData = async () => {
        setLoading(true);
        try {
            const [cats, categoryDoc] = await Promise.all([
                fetchQuestionCategories(),
                getDoc(doc(db, "question_categories", categoryId)),
            ]);
            
            setAllCategories(cats);

            if (categoryDoc.exists()) {
                const categoryData = categoryDoc.data();
                form.reset({
                    name: categoryData.name,
                    parentId: categoryData.parentId || undefined,
                });
            } else {
                toast({ title: "Error", description: "Category not found.", variant: "destructive" });
                router.push('/admin/question-categories');
            }
        } catch (error) {
            console.error("Error loading data:", error);
            toast({ title: "Error", description: "Failed to load category data.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, [categoryId, form, router, toast]);

  const flatCategories = useMemo(() => getFlattenedQuestionCategories(allCategories), [allCategories]);
  const descendantIds = useMemo(() => getDescendantQuestionCategoryIds(categoryId, allCategories), [categoryId, allCategories]);

  async function onSubmit(data: CategoryFormValues) {
    setIsSubmitting(true);
    try {
      const categoryRef = doc(db, "question_categories", categoryId);
      
      const newParentId = data.parentId === 'none' || !data.parentId ? null : data.parentId;

      const updatedData = {
        name: data.name,
        parentId: newParentId,
      };
      
      await updateDoc(categoryRef, updatedData);

      toast({
        title: "Category Updated",
        description: "The category has been updated successfully.",
      });
      router.push("/admin/question-categories");
      router.refresh();
    } catch (error) {
      console.error("Error updating category: ", error);
      toast({
        title: "Error",
        description: "Failed to update the category. Please try again.",
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
    );
  }

  const currentCategoryName = form.getValues('name');

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
          <CardTitle>Edit Question Category: {currentCategoryName}</CardTitle>
          <CardDescription>Update the details for this category.</CardDescription>
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
                      <Input {...field} disabled={isSubmitting} />
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
                          <SelectItem 
                            key={cat.id} 
                            value={cat.id} 
                            style={{ paddingLeft: `${1 + cat.level * 1.5}rem` }}
                            disabled={descendantIds.includes(cat.id)}
                          >
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>You cannot move a category into itself or one of its own subcategories.</FormDescription>
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
