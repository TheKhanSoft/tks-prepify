
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import React, { useState, useEffect } from "react";
import { getPageBySlug, updatePage } from "@/lib/page-service";
import { Textarea } from "@/components/ui/textarea";
import type { Page } from "@/types";

const pageFormSchema = z.object({
  title: z.string().min(1, "Title is required."),
  content: z.string().min(1, "Content cannot be empty."),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

type PageFormValues = z.infer<typeof pageFormSchema>;

const PAGE_SLUG = "terms-of-service";
const PAGE_TITLE = "Terms of Service";

export default function TermsSettingsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<PageFormValues>({
        resolver: zodResolver(pageFormSchema),
        defaultValues: {
            title: PAGE_TITLE,
            content: "",
            metaTitle: "",
            metaDescription: "",
        }
    });

    useEffect(() => {
        const loadPage = async () => {
            setLoading(true);
            try {
                const pageData = await getPageBySlug(PAGE_SLUG);
                form.reset(pageData);
            } catch (error) {
                toast({
                    title: "Error",
                    description: "Could not load page content. Please try again.",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };
        loadPage();
    }, [form, toast]);

    async function onSubmit(data: PageFormValues) {
        setIsSubmitting(true);
        try {
            await updatePage(PAGE_SLUG, data);
            toast({
                title: "Page Saved",
                description: `Your ${PAGE_TITLE} page has been updated.`,
            });
        } catch (error: any) {
            console.error("Error saving page:", error);
            toast({
                title: "Save Failed",
                description: "Failed to save page content. Please try again.",
                variant: "destructive"
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

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Page Content: {PAGE_TITLE}</h1>
                <p className="text-muted-foreground">Manage the content displayed on your {PAGE_TITLE} page.</p>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                     <Card>
                        <CardHeader>
                            <CardTitle>{PAGE_TITLE} Content</CardTitle>
                            <CardDescription>Use markdown for formatting.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Page Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="content" render={({ field }) => (<FormItem><FormLabel>Page Content</FormLabel><FormControl><Textarea {...field} rows={20} /></FormControl><FormMessage /></FormItem>)} />
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>SEO Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                             <FormField control={form.control} name="metaTitle" render={({ field }) => (<FormItem><FormLabel>Meta Title</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                             <FormField control={form.control} name="metaDescription" render={({ field }) => (<FormItem><FormLabel>Meta Description</FormLabel><FormControl><Textarea {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                        </CardContent>
                    </Card>
                    <div className="flex justify-end">
                        <Button type="submit" disabled={isSubmitting || loading}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Page
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
