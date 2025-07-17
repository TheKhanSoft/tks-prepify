
"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Trash2, BookText, Mountain, Users, Eye, RefreshCw, Save } from "lucide-react";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { fetchSettings, updateSettings } from "@/lib/settings-service";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ReactMarkdown from 'react-markdown';
import { cn } from "@/lib/utils";


const aboutFormSchema = z.object({
  aboutTitle: z.string().optional(),
  aboutSubtitle: z.string().optional(),
  aboutMission: z.string().optional(),
  aboutVision: z.string().optional(),
  aboutTeamTitle: z.string().optional(),
  teamMembers: z.array(z.object({
      name: z.string().min(1, "Name is required."),
      role: z.string().min(1, "Role is required."),
      avatar: z.string().url("Must be a valid URL").or(z.literal("")),
      hint: z.string().optional(),
  })).optional(),
});

type AboutFormValues = z.infer<typeof aboutFormSchema>;

export default function AboutSettingsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    const form = useForm<AboutFormValues>({
        resolver: zodResolver(aboutFormSchema),
        defaultValues: {
            teamMembers: [],
        }
    });

    const watchedValues = form.watch();

    const { fields: teamFields, append: appendTeam, remove: removeTeam } = useFieldArray({
        control: form.control,
        name: "teamMembers",
    });

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

    async function onSubmit(data: AboutFormValues) {
        setIsSubmitting(true);
        try {
            const settingsData = {
                ...data,
                teamMembers: data.teamMembers?.filter(member => member.name && member.role) || [],
            };
            
            await updateSettings(settingsData);
            setHasUnsavedChanges(false);
            toast({ title: "Settings Saved", description: "Your About page settings have been updated." });
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
                                <h1 className="text-4xl md:text-5xl font-bold font-headline">{watchedValues.aboutTitle}</h1>
                                <div className="prose prose-lg dark:prose-invert text-muted-foreground mt-4 max-w-3xl mx-auto">
                                <ReactMarkdown>{watchedValues.aboutSubtitle || ''}</ReactMarkdown>
                                </div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
                                <div className="prose dark:prose-invert">
                                <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
                                <ReactMarkdown className="text-muted-foreground leading-relaxed">
                                    {watchedValues.aboutMission || ''}
                                </ReactMarkdown>
                                </div>
                                <div className="prose dark:prose-invert">
                                <h2 className="text-3xl font-bold mb-4">Our Vision</h2>
                                <ReactMarkdown className="text-muted-foreground leading-relaxed">
                                    {watchedValues.aboutVision || ''}
                                </ReactMarkdown>
                                </div>
                            </div>

                            {watchedValues.teamMembers && watchedValues.teamMembers.length > 0 && (
                                <div className="text-center">
                                    <h2 className="text-3xl font-bold font-headline mb-12">{watchedValues.aboutTeamTitle}</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                                    {watchedValues.teamMembers.map((member, index) => (
                                        <Card key={index} className="text-center">
                                        <CardContent className="p-6">
                                            <Avatar className="h-24 w-24 mx-auto mb-4">
                                            <AvatarImage src={member.avatar} alt={member.name} data-ai-hint={member.hint} />
                                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <h3 className="text-xl font-semibold">{member.name}</h3>
                                            <p className="text-primary">{member.role}</p>
                                        </CardContent>
                                        </Card>
                                    ))}
                                    </div>
                                </div>
                            )}
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
                    <h1 className="text-3xl font-bold">Page Content: About Us</h1>
                    <p className="text-muted-foreground">Manage the content displayed on your About Us page.</p>
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
                            <CardDescription>Manage the main title and subtitle of the page.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormField control={form.control} name="aboutTitle" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="aboutSubtitle" render={({ field }) => (<FormItem><FormLabel>Subtitle</FormLabel><FormControl><Textarea {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                             <CardTitle className="flex items-center gap-2"><Mountain className="h-5 w-5" /> Our Story</CardTitle>
                             <CardDescription>Share your mission and vision with your users.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormField control={form.control} name="aboutMission" render={({ field }) => (<FormItem><FormLabel>Our Mission</FormLabel><FormControl><Textarea {...field} value={field.value || ''} rows={4} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="aboutVision" render={({ field }) => (<FormItem><FormLabel>Our Vision</FormLabel><FormControl><Textarea {...field} value={field.value || ''} rows={4} /></FormControl></FormItem>)} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                           <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Team Section</CardTitle>
                           <CardDescription>Introduce the people behind your platform.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormField control={form.control} name="aboutTeamTitle" render={({ field }) => (<FormItem><FormLabel>Section Title</FormLabel><FormControl><Input {...field} value={field.value || ''} placeholder="e.g., Meet the Team" /></FormControl></FormItem>)} />
                            <div className="space-y-4">
                                {teamFields.map((item, index) => (
                                    <div key={item.id} className="flex flex-col gap-4 p-4 border rounded-lg relative">
                                        <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeTeam(index)}><Trash2 className="h-4 w-4" /><span className="sr-only">Remove Member</span></Button>
                                        <FormField control={form.control} name={`teamMembers.${index}.name`} render={({ field }) => (<FormItem><FormLabel>Member Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name={`teamMembers.${index}.role`} render={({ field }) => (<FormItem><FormLabel>Member Role</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name={`teamMembers.${index}.avatar`} render={({ field }) => (<FormItem><FormLabel>Avatar Image URL</FormLabel><FormControl><Input {...field} placeholder="https://..." /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name={`teamMembers.${index}.hint`} render={({ field }) => (<FormItem><FormLabel>Avatar AI Hint</FormLabel><FormControl><Input {...field} /></FormControl><FormDescription>One or two keywords for AI image search (e.g., 'male portrait').</FormDescription><FormMessage /></FormItem>)} />
                                    </div>
                                ))}
                                <Button type="button" variant="outline" onClick={() => appendTeam({ name: '', role: '', avatar: '', hint: '' })}><PlusCircle className="mr-2 h-4 w-4" />Add Team Member</Button>
                            </div>
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
