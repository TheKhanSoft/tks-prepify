
"use client";

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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { fetchCategories, getFlattenedCategories, getCategoryPath } from "@/lib/category-service";
import { getPaperById } from "@/lib/paper-service";
import type { Category, Paper } from "@/types";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { slugify } from "@/lib/utils";
import { generatePaperDescription } from "@/ai/flows/generate-paper-description-flow";
import { generatePaperSeoDetails } from "@/ai/flows/generate-paper-seo-flow";
import { Switch } from "@/components/ui/switch";

const paperFormSchema = z.object({
  title: z.string().min(3, {
    message: "Title must be at least 3 characters.",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
  categoryId: z.string({
    required_error: "Please select a category for this paper.",
  }),
  slug: z.string().optional(),
  published: z.boolean().default(false),
  featured: z.boolean().default(false),
  questionCount: z.coerce.number().int().min(0, {
    message: "Number of questions cannot be negative.",
  }).default(0),
  duration: z.coerce.number().int().positive({
    message: "Please enter a positive duration in minutes.",
  }),
  year: z.coerce.number().int().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  keywords: z.string().optional(),
});

type PaperFormValues = z.infer<typeof paperFormSchema>;

export default function EditPaperPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const paperId = params.paperId as string;
  
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);

  const form = useForm<PaperFormValues>({
    resolver: zodResolver(paperFormSchema),
  });

  useEffect(() => {
    if (!paperId) return;
    const loadData = async () => {
        setLoading(true);
        try {
            const [cats, paper] = await Promise.all([
                fetchCategories(),
                getPaperById(paperId),
            ]);
            
            setAllCategories(cats);

            if (paper) {
                form.reset({
                    ...paper,
                    year: paper.year || undefined,
                    published: paper.published || false,
                });
            } else {
                toast({ title: "Error", description: "Paper not found.", variant: "destructive" });
                router.push('/admin/papers');
            }
        } catch (error) {
            console.error("Error loading data:", error);
            toast({ title: "Error", description: "Failed to load data.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, [paperId, form, router, toast]);

  const flatCategories = useMemo(() => getFlattenedCategories(allCategories), [allCategories]);
  
  async function handleGenerateDescription() {
    const title = form.getValues("title");
    const categoryId = form.getValues("categoryId");

    if (!title || !categoryId) {
        toast({ title: "Title & Category Required", description: "Please enter a title and select a category to generate a description.", variant: "destructive" });
        return;
    }
    const categoryPath = getCategoryPath(categoryId, allCategories);
    const categoryName = categoryPath?.map(c => c.name).join(' / ') || '';

    setIsGeneratingDesc(true);
    try {
        const result = await generatePaperDescription({ title, categoryName });
        form.setValue("description", result.description, { shouldValidate: true });
        toast({ title: "Description Generated", description: "AI has created a description for you." });
    } catch (error) {
        console.error("Error generating description:", error);
        toast({ title: "Generation Failed", description: "Could not generate a description.", variant: "destructive" });
    } finally {
        setIsGeneratingDesc(false);
    }
  }
  
  async function handleGenerateSeo() {
    const title = form.getValues("title");
    const description = form.getValues("description");
    const categoryId = form.getValues("categoryId");

    if (!title || !description || !categoryId) {
        toast({ title: "Title, Description & Category Required", description: "Please provide all details to generate SEO content.", variant: "destructive" });
        return;
    }
    const categoryPath = getCategoryPath(categoryId, allCategories);
    const categoryName = categoryPath?.map(c => c.name).join(' / ') || '';

    setIsGeneratingSeo(true);
    try {
        const result = await generatePaperSeoDetails({ title, description, categoryName });
        form.setValue("keywords", result.keywords, { shouldValidate: true });
        form.setValue("metaTitle", result.metaTitle, { shouldValidate: true });
        form.setValue("metaDescription", result.metaDescription, { shouldValidate: true });
        toast({ title: "SEO Details Generated", description: "AI has filled in the SEO fields for you." });
    } catch (error) {
        console.error("Error generating SEO details:", error);
        toast({ title: "Generation Failed", description: "Could not generate SEO details.", variant: "destructive" });
    } finally {
        setIsGeneratingSeo(false);
    }
  }

  async function onSubmit(data: PaperFormValues) {
    setIsSubmitting(true);
    try {
      const paperRef = doc(db, "papers", paperId);
      const paperData = {
          ...data,
          slug: slugify(data.slug || data.title),
          published: data.published || false,
      };
      await updateDoc(paperRef, paperData);
      toast({
        title: "Paper Updated",
        description: "The paper has been updated successfully.",
      });
      router.push("/admin/papers");
      router.refresh();
    } catch (error) {
      console.error("Error updating paper: ", error);
      toast({ title: "Error", description: "Failed to update the paper.", variant: "destructive" });
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

  const currentPaperTitle = form.getValues('title');

  return (
    <div className="space-y-6">
       <div>
        <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Papers
        </Button>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Edit Paper: {currentPaperTitle}</CardTitle>
                    <CardDescription>Update the details for this question paper.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Paper Title</FormLabel>
                            <FormControl>
                            <Input {...field} disabled={isSubmitting} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="slug"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>URL Slug (Optional)</FormLabel>
                            <FormControl>
                            <Input {...field} disabled={isSubmitting} />
                            </FormControl>
                            <FormDescription>If left blank, the slug will be generated from the title.</FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center justify-between">
                                <FormLabel>Description</FormLabel>
                                <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={handleGenerateDescription} disabled={isGeneratingDesc || isSubmitting}>
                                    {isGeneratingDesc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate
                                </Button>
                            </div>
                            <FormControl>
                            <Textarea {...field} disabled={isSubmitting} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="categoryId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {flatCategories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id} style={{ paddingLeft: `${1 + cat.level * 1.5}rem` }} disabled={cat.isParent}>
                                    {cat.name}
                                </SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                             <FormDescription>
                                You can only assign papers to subcategories that don't have their own children.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="published"
                        render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">Published</FormLabel>
                                <FormDescription>Published papers will be visible on the public website.</FormDescription>
                            </div>
                            <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} />
                            </FormControl>
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="featured"
                        render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">Featured Paper</FormLabel>
                                <FormDescription>Featured papers will be highlighted on the homepage.</FormDescription>
                            </div>
                            <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} />
                            </FormControl>
                        </FormItem>
                        )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <FormField
                            control={form.control}
                            name="questionCount"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Number of Questions</FormLabel>
                                <FormControl>
                                <Input type="number" {...field} disabled={isSubmitting} />
                                </FormControl>
                                <FormDescription>Note: This is a static count for display. Questions are added separately.</FormDescription>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="duration"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Duration (minutes)</FormLabel>
                                <FormControl>
                                <Input type="number" {...field} disabled={isSubmitting} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="year"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Year (Optional)</FormLabel>
                                <FormControl>
                                <Input type="number" {...field} value={field.value ?? ''} disabled={isSubmitting} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>SEO Details</CardTitle>
                            <CardDescription>Optimize this paper for search engines.</CardDescription>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={handleGenerateSeo} disabled={isGeneratingSeo || isSubmitting}>
                            {isGeneratingSeo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            Generate with AI
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <FormField
                        control={form.control}
                        name="metaTitle"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Meta Title (Optional)</FormLabel>
                            <FormControl>
                            <Input {...field} value={field.value ?? ''} disabled={isSubmitting} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="metaDescription"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Meta Description (Optional)</FormLabel>
                            <FormControl>
                            <Textarea {...field} value={field.value ?? ''} disabled={isSubmitting} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="keywords"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Keywords (Optional)</FormLabel>
                            <FormControl>
                            <Input {...field} value={field.value ?? ''} disabled={isSubmitting} />
                            </FormControl>
                             <FormDescription>Comma-separated keywords.</FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </CardContent>
            </Card>
            <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => router.push('/admin/papers')} disabled={isSubmitting}>
                Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </div>
        </form>
      </Form>
    </div>
  );
}
