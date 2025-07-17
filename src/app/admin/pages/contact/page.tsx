
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
import { Loader2, BookText, Contact, Eye, RefreshCw, Save, Mail, Phone, MapPin } from "lucide-react";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { fetchSettings, updateSettings } from "@/lib/settings-service";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ReactMarkdown from 'react-markdown';
import { cn } from "@/lib/utils";

const contactFormSchema = z.object({
  contactTitle: z.string().optional(),
  contactSubtitle: z.string().optional(),
  contactEmail: z.string().email("Must be a valid email").or(z.literal("")).optional(),
  contactPhone: z.string().optional(),
  contactAddress: z.string().optional(),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

export default function ContactSettingsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    const form = useForm<ContactFormValues>({
        resolver: zodResolver(contactFormSchema),
        defaultValues: {}
    });

    const watchedValues = form.watch();

    useEffect(() => {
        const subscription = form.watch(() => setHasUnsavedChanges(true));
        return () => subscription.unsubscribe();
    }, [form]);

    const loadSettings = useCallback(async () => {
        setLoading(true);
        try {
            const settings = await fetchSettings();
            form.reset(settings);
            setHasUnsavedChanges(false);
        } catch (error) {
            toast({ title: "Error", description: "Could not load settings.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [form, toast]);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    async function onSubmit(data: ContactFormValues) {
        setIsSubmitting(true);
        try {
            await updateSettings(data);
            setHasUnsavedChanges(false);
            toast({ title: "Settings Saved", description: "Your Contact page settings have been updated." });
        } catch (error: any) {
            toast({ title: "Save Failed", description: "Failed to save settings.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    }

    const PreviewSection = useMemo(() => {
        if (!showPreview) return null;

        return (
            <Card className="mt-6 border-dashed">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary">
                        <Eye className="h-5 w-5" /> Live Preview
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="bg-background rounded-lg p-4 sm:p-8">
                       <div className="container mx-auto px-6 sm:px-10 lg:px-16 py-12 md:py-16">
                            <div className="text-center mb-16">
                                <h1 className="text-4xl md:text-5xl font-bold font-headline">{watchedValues.contactTitle}</h1>
                                <div className="prose prose-lg dark:prose-invert text-muted-foreground mt-4 max-w-3xl mx-auto">
                                <ReactMarkdown>{watchedValues.contactSubtitle || ''}</ReactMarkdown>
                                </div>
                            </div>
                            <div className="md:col-span-2 space-y-6">
                                <h3 className="text-2xl font-bold">Our Contact Information</h3>
                                <div className="space-y-4">
                                    {watchedValues.contactEmail && (
                                        <div className="flex items-start gap-4 rounded-lg border p-4"><div className="flex-shrink-0 rounded-full bg-primary/10 p-3"><Mail className="h-6 w-6 text-primary" /></div><div><h4 className="font-semibold">Email</h4><p className="text-muted-foreground break-all">{watchedValues.contactEmail}</p></div></div>
                                    )}
                                    {watchedValues.contactPhone && (
                                        <div className="flex items-start gap-4 rounded-lg border p-4"><div className="flex-shrink-0 rounded-full bg-primary/10 p-3"><Phone className="h-6 w-6 text-primary" /></div><div><h4 className="font-semibold">Phone</h4><p className="text-muted-foreground">{watchedValues.contactPhone}</p></div></div>
                                    )}
                                    {watchedValues.contactAddress && (
                                        <div className="flex items-start gap-4 rounded-lg border p-4"><div className="flex-shrink-0 rounded-full bg-primary/10 p-3"><MapPin className="h-6 w-6 text-primary" /></div><div><h4 className="font-semibold">Address</h4><p className="text-muted-foreground">{watchedValues.contactAddress}</p></div></div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }, [showPreview, watchedValues]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[calc(100vh-20rem)]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Page Content: Contact Us</h1>
                    <p className="text-muted-foreground">Manage the content displayed on your Contact Us page.</p>
                </div>
                 <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)} className="gap-2"><Eye className="h-4 w-4" />{showPreview ? 'Hide' : 'Show'} Preview</Button>
                    <Button variant="outline" size="sm" onClick={loadSettings} disabled={loading} className="gap-2"><RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />Refresh</Button>
                </div>
            </div>
            {hasUnsavedChanges && (
                <Alert className="border-amber-200 bg-amber-50/50 text-amber-800">
                    <AlertDescription>You have unsaved changes. Don't forget to save before leaving.</AlertDescription>
                </Alert>
            )}
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><BookText className="h-5 w-5" /> Page Content</CardTitle>
                            <CardDescription>Manage the title and subtitle on your Contact Us page.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormField control={form.control} name="contactTitle" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="contactSubtitle" render={({ field }) => (<FormItem><FormLabel>Subtitle</FormLabel><FormControl><Textarea {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                           <CardTitle className="flex items-center gap-2"><Contact className="h-5 w-5" /> Contact Information</CardTitle>
                           <CardDescription>This information will be displayed alongside the contact form.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormField control={form.control} name="contactEmail" render={({ field }) => (<FormItem><FormLabel>Contact Email</FormLabel><FormControl><Input type="email" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="contactPhone" render={({ field }) => (<FormItem><FormLabel>Contact Phone</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="contactAddress" render={({ field }) => (<FormItem><FormLabel>Contact Address</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                        </CardContent>
                    </Card>

                    {PreviewSection}

                    <div className="flex justify-end pt-6">
                        <Button type="submit" disabled={isSubmitting || loading} className="min-w-[140px]">
                        {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Settings</>}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
