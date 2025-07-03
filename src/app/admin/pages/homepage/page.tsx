
"use client";

import { useForm } from "react-hook-form";
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
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UploadCloud } from "lucide-react";
import React, { useState, useEffect } from "react";
import { fetchSettings, updateSettings } from "@/lib/settings-service";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";
import { cn } from "@/lib/utils";

const homepageFormSchema = z.object({
  heroTitlePrefix: z.string().optional(),
  heroTitleHighlight: z.string().optional(),
  heroTitleSuffix: z.string().optional(),
  heroSubtitle: z.string().optional(),
  heroButton1Text: z.string().optional(),
  heroButton1Link: z.string().optional(),
  heroButton2Text: z.string().optional(),
  heroButton2Link: z.string().optional(),
  heroImage: z.string().or(z.literal("")).optional(),
});

type HomepageFormValues = z.infer<typeof homepageFormSchema>;

export default function HomepageSettingsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const MAX_IMAGE_SIZE_KB = 150;
    const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_KB * 1024;

    const form = useForm<HomepageFormValues>({
        resolver: zodResolver(homepageFormSchema),
        defaultValues: {}
    });

    useEffect(() => {
        const loadSettings = async () => {
            setLoading(true);
            try {
                const settings = await fetchSettings();
                form.reset(settings);
                if (settings.heroImage) {
                    setImagePreview(settings.heroImage);
                }
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

    async function onSubmit(data: HomepageFormValues) {
        setIsSubmitting(true);
        try {
            let finalData = { ...data };

            if (fileToUpload) {
                const dataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = (error) => reject(error);
                    reader.readAsDataURL(fileToUpload);
                });
                finalData.heroImage = dataUrl;
            }
            
            await updateSettings(finalData);
            
            toast({
                title: "Settings Saved",
                description: "Your homepage settings have been updated.",
            });
            
            setFileToUpload(null);
            if (finalData.heroImage) {
                form.setValue('heroImage', finalData.heroImage);
                setImagePreview(finalData.heroImage);
            }

        } catch (error: any) {
            console.error("Error saving settings:", error);
            toast({
                title: "Save Failed",
                description: "Failed to save settings. If you uploaded an image, it is likely too large for the database. Please use a compressed image under 150KB.",
                variant: "destructive",
                duration: 8000
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > MAX_IMAGE_SIZE_BYTES) {
                toast({
                    title: "Image is too large",
                    description: `Please select an image smaller than ${MAX_IMAGE_SIZE_KB}KB.`,
                    variant: "destructive"
                });
                e.target.value = ''; // Clear the input
                return;
            }
            setFileToUpload(file);
            setImagePreview(URL.createObjectURL(file));
            form.setValue('heroImage', ''); // Clear URL field if file is chosen
        }
    }

    const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const url = e.target.value;
        form.setValue('heroImage', url);
        setFileToUpload(null);
        setImagePreview(url);
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
                <h1 className="text-3xl font-bold">Page Content: Homepage</h1>
                <p className="text-muted-foreground">Manage the content of the homepage hero section.</p>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-4xl">
                     <Card>
                        <CardHeader><CardTitle>Homepage Hero Section</CardTitle><CardDescription>Customize the content of the main hero section on your homepage.</CardDescription></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField control={form.control} name="heroTitlePrefix" render={({ field }) => (<FormItem className="md:col-span-1"><FormLabel>Title Prefix</FormLabel><FormControl><Input {...field} value={field.value || ''} disabled={isSubmitting} /></FormControl></FormItem>)} />
                                <FormField control={form.control} name="heroTitleHighlight" render={({ field }) => (<FormItem className="md:col-span-1"><FormLabel>Highlighted Title</FormLabel><FormControl><Input {...field} value={field.value || ''} disabled={isSubmitting} /></FormControl></FormItem>)} />
                                <FormField control={form.control} name="heroTitleSuffix" render={({ field }) => (<FormItem className="md:col-span-1"><FormLabel>Title Suffix</FormLabel><FormControl><Input {...field} value={field.value || ''} disabled={isSubmitting} /></FormControl></FormItem>)} />
                            </div>
                            <FormField control={form.control} name="heroSubtitle" render={({ field }) => (<FormItem><FormLabel>Subtitle</FormLabel><FormControl><Textarea {...field} value={field.value || ''} disabled={isSubmitting} /></FormControl></FormItem>)} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="heroButton1Text" render={({ field }) => (<FormItem><FormLabel>Button 1 Text</FormLabel><FormControl><Input {...field} value={field.value || ''} disabled={isSubmitting} /></FormControl></FormItem>)} />
                                <FormField control={form.control} name="heroButton1Link" render={({ field }) => (<FormItem><FormLabel>Button 1 Link</FormLabel><FormControl><Input {...field} value={field.value || ''} placeholder="/papers" disabled={isSubmitting} /></FormControl></FormItem>)} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="heroButton2Text" render={({ field }) => (<FormItem><FormLabel>Button 2 Text</FormLabel><FormControl><Input {...field} value={field.value || ''} disabled={isSubmitting} /></FormControl></FormItem>)} />
                                <FormField control={form.control} name="heroButton2Link" render={({ field }) => (<FormItem><FormLabel>Button 2 Link</FormLabel><FormControl><Input {...field} value={field.value || ''} placeholder="/signup" disabled={isSubmitting} /></FormControl></FormItem>)} />
                            </div>
                            <FormItem>
                                <FormLabel>Hero Image</FormLabel>
                                <Card><CardContent className="p-4 space-y-4">
                                {imagePreview && (<div className="relative aspect-video w-full max-w-sm mx-auto rounded-md overflow-hidden border"><Image src={imagePreview} alt="Hero image preview" fill style={{ objectFit: 'cover' }} /></div>)}
                                <div className="space-y-2">
                                    <Label htmlFor="hero-image-upload" className={cn("w-full border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors", fileToUpload && "border-primary bg-primary/10")}>
                                    <UploadCloud className="w-8 h-8 text-muted-foreground mb-2" />
                                    <span className="font-semibold">{fileToUpload ? fileToUpload.name : "Click to upload a file"}</span>
                                    <span className="text-xs text-muted-foreground">PNG, JPG, WEBP (MAX. {MAX_IMAGE_SIZE_KB}KB)</span>
                                    </Label>
                                    <Input id="hero-image-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageFileChange} />
                                </div>
                                <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or</span></div></div>
                                <FormField control={form.control} name="heroImage" render={({ field }) => (<FormItem className="space-y-2"><FormLabel htmlFor="hero-image-url">Paste image URL</FormLabel><FormControl><Input id="hero-image-url" type="text" placeholder="https://..." value={field.value || ''} onChange={handleImageUrlChange} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
                                </CardContent></Card>
                            </FormItem>
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
