
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
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import React, { useState, useEffect } from "react";
import { fetchSettings, updateSettings } from "@/lib/settings-service";
import { Textarea } from "@/components/ui/textarea";

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

    const form = useForm<AboutFormValues>({
        resolver: zodResolver(aboutFormSchema),
        defaultValues: {
            teamMembers: [],
        }
    });

    const { fields: teamFields, append: appendTeam, remove: removeTeam } = useFieldArray({
        control: form.control,
        name: "teamMembers",
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

    async function onSubmit(data: AboutFormValues) {
        setIsSubmitting(true);
        try {
            const settingsData = {
                ...data,
                teamMembers: data.teamMembers?.filter(member => member.name && member.role) || [],
            };
            
            await updateSettings(settingsData);
            
            toast({
                title: "Settings Saved",
                description: "Your About page settings have been updated.",
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
                <h1 className="text-3xl font-bold">Page Content: About Us</h1>
                <p className="text-muted-foreground">Manage the content displayed on your About Us page.</p>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                        <Card>
                            <CardHeader><CardTitle>About Page Content</CardTitle><CardDescription>Manage the content displayed on your About Us page.</CardDescription></CardHeader>
                            <CardContent className="space-y-6">
                                <FormField control={form.control} name="aboutTitle" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                                <FormField control={form.control} name="aboutSubtitle" render={({ field }) => (<FormItem><FormLabel>Subtitle</FormLabel><FormControl><Textarea {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                                <FormField control={form.control} name="aboutMission" render={({ field }) => (<FormItem><FormLabel>Our Mission</FormLabel><FormControl><Textarea {...field} value={field.value || ''} rows={4} /></FormControl></FormItem>)} />
                                <FormField control={form.control} name="aboutVision" render={({ field }) => (<FormItem><FormLabel>Our Vision</FormLabel><FormControl><Textarea {...field} value={field.value || ''} rows={4} /></FormControl></FormItem>)} />
                                
                                <div className="space-y-4 pt-4 border-t">
                                    <FormField control={form.control} name="aboutTeamTitle" render={({ field }) => (<FormItem><FormLabel>Team Section Title</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>)} />
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
                        <div className="flex justify-end">
                            <Button type="submit" disabled={isSubmitting || loading}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Settings
                            </Button>
                        </div>
                    </div>
                </form>
            </Form>
        </div>
    );
}
