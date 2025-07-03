
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
import { fetchSettings, updateSettings } from "@/lib/settings-service";
import { Textarea } from "@/components/ui/textarea";

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

    const form = useForm<ContactFormValues>({
        resolver: zodResolver(contactFormSchema),
        defaultValues: {}
    });

    useEffect(() => {
        const loadSettings = async () => {
            setLoading(true);
            try {
                const settings = await fetchSettings();
                form.reset(settings);
            } catch (error) {
                toast({
                    title: "Error",
                    description: "Could not load settings. Please try again.",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };
        loadSettings();
    }, [form, toast]);

    async function onSubmit(data: ContactFormValues) {
        setIsSubmitting(true);
        try {
            await updateSettings(data);
            toast({
                title: "Settings Saved",
                description: "Your Contact page settings have been updated.",
            });
        } catch (error: any) {
            console.error("Error saving settings:", error);
            toast({
                title: "Save Failed",
                description: "Failed to save settings. Please try again.",
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
                <h1 className="text-3xl font-bold">Page Content: Contact Us</h1>
                <p className="text-muted-foreground">Manage the content displayed on your Contact Us page.</p>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-4xl">
                     <Card>
                        <CardHeader><CardTitle>Contact Page Content</CardTitle><CardDescription>Manage the contact information on your Contact Us page.</CardDescription></CardHeader>
                        <CardContent className="space-y-6">
                            <FormField control={form.control} name="contactTitle" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="contactSubtitle" render={({ field }) => (<FormItem><FormLabel>Subtitle</FormLabel><FormControl><Textarea {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="contactEmail" render={({ field }) => (<FormItem><FormLabel>Contact Email</FormLabel><FormControl><Input type="email" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="contactPhone" render={({ field }) => (<FormItem><FormLabel>Contact Phone</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="contactAddress" render={({ field }) => (<FormItem><FormLabel>Contact Address</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                        </CardContent>
                    </Card>
                    <div className="flex justify-end">
                        <Button type="submit" disabled={isSubmitting || loading}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Settings
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
