
"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getHelpCategoryById, updateHelpCategory } from "@/lib/help-service";

const categoryFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export default function EditHelpCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const categoryId = params.categoryId as string;
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentCategoryName, setCurrentCategoryName] = useState('');

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (!categoryId) return;
    const loadData = async () => {
        setLoading(true);
        try {
            const categoryData = await getHelpCategoryById(categoryId);
            if (categoryData) {
                form.reset(categoryData);
                setCurrentCategoryName(categoryData.name);
            } else {
                toast({ title: "Error", description: "Category not found.", variant: "destructive" });
                router.push('/admin/help/categories');
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to load category data.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, [categoryId, form, router, toast]);

  async function onSubmit(data: CategoryFormValues) {
    setIsSubmitting(true);
    try {
      await updateHelpCategory(categoryId, data.name);
      toast({ title: "Category Updated", description: "The category has been updated successfully." });
      router.push("/admin/help/categories");
      router.refresh();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update the category.", variant: "destructive" });
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

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Categories
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Edit Category: {currentCategoryName}</CardTitle>
          <CardDescription>Update the name for this help center category.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Category Name</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => router.push('/admin/help/categories')} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
