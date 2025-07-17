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
import { Loader2, UploadCloud, X, Eye, Save, RefreshCw, ImageIcon, LinkIcon, Type, Palette } from "lucide-react";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { fetchSettings, updateSettings } from "@/lib/settings-service";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

const homepageFormSchema = z.object({
  heroTitlePrefix: z.string().optional(),
  heroTitleHighlight: z.string().optional(),
  heroTitleSuffix: z.string().optional(),
  heroSubtitle: z.string().max(200, "Subtitle must be less than 200 characters").optional(),
  heroButton1Text: z.string().max(30, "Button text must be less than 30 characters").optional(),
  heroButton1Link: z.string().url("Must be a valid URL").or(z.string().regex(/^\//, "Must start with / for relative paths")).optional().or(z.literal("")),
  heroButton2Text: z.string().max(30, "Button text must be less than 30 characters").optional(),
  heroButton2Link: z.string().url("Must be a valid URL").or(z.string().regex(/^\//, "Must start with / for relative paths")).optional().or(z.literal("")),
  heroImage: z.string().or(z.literal("")).optional(),
});

type HomepageFormValues = z.infer<typeof homepageFormSchema>;

const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_SIZE_KB = 150;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_KB * 1024;

export default function HomepageSettingsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageError, setImageError] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    const form = useForm<HomepageFormValues>({
        resolver: zodResolver(homepageFormSchema),
        defaultValues: {},
        mode: "onChange"
    });

    const watchedValues = form.watch();

    // Track unsaved changes
    useEffect(() => {
        const subscription = form.watch(() => {
            setHasUnsavedChanges(true);
        });
        return () => subscription.unsubscribe();
    }, [form]);

    // Optimized image validation
    const validateImage = useCallback((file: File): string | null => {
        if (!SUPPORTED_FORMATS.includes(file.type)) {
            return `Unsupported format. Please use: ${SUPPORTED_FORMATS.map(f => f.split('/')[1].toUpperCase()).join(', ')}`;
        }
        
        if (file.size > MAX_IMAGE_SIZE_BYTES) {
            return `Image too large. Maximum size: ${MAX_IMAGE_SIZE_KB}KB (current: ${Math.round(file.size / 1024)}KB)`;
        }
        
        return null;
    }, []);

    // Optimized settings loading
    const loadSettings = useCallback(async () => {
        setLoading(true);
        try {
            const settings = await fetchSettings();
            form.reset(settings);
            if (settings.heroImage) {
                setImagePreview(settings.heroImage);
            }
            setHasUnsavedChanges(false);
        } catch (error) {
            toast({
                title: "Error Loading Settings",
                description: "Could not load settings. Please refresh the page and try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [form, toast]);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    // Optimized form submission
    const onSubmit = useCallback(async (data: HomepageFormValues) => {
        setIsSubmitting(true);
        try {
            let finalData = { ...data };

            if (fileToUpload) {
                const dataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(fileToUpload);
                });
                finalData.heroImage = dataUrl;
            }
            
            await updateSettings(finalData);
            
            toast({
                title: "Settings Saved Successfully",
                description: "Your homepage settings have been updated and are now live.",
            });
            
            setFileToUpload(null);
            setHasUnsavedChanges(false);
            if (finalData.heroImage) {
                form.setValue('heroImage', finalData.heroImage);
                setImagePreview(finalData.heroImage);
            }

        } catch (error: any) {
            console.error("Error saving settings:", error);
            toast({
                title: "Save Failed",
                description: error.message || "Failed to save settings. Please try again.",
                variant: "destructive",
                duration: 8000
            });
        } finally {
            setIsSubmitting(false);
        }
    }, [fileToUpload, form, toast]);

    // Enhanced image file handling
    const handleImageFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validationError = validateImage(file);
        if (validationError) {
            setImageError(validationError);
            toast({
                title: "Invalid Image",
                description: validationError,
                variant: "destructive"
            });
            e.target.value = '';
            return;
        }

        setImageError(null);
        setFileToUpload(file);
        setImagePreview(URL.createObjectURL(file));
        form.setValue('heroImage', '');
    }, [validateImage, form, toast]);

    // Enhanced URL handling with validation
    const handleImageUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const url = e.target.value;
        form.setValue('heroImage', url);
        setFileToUpload(null);
        setImageError(null);
        
        if (url) {
            // Basic URL validation
            try {
                new URL(url);
                setImagePreview(url);
            } catch {
                if (url.startsWith('/')) {
                    setImagePreview(url);
                } else {
                    setImageError("Please enter a valid URL");
                }
            }
        } else {
            setImagePreview(null);
        }
    }, [form]);

    // Clear image handler
    const clearImage = useCallback(() => {
        setFileToUpload(null);
        setImagePreview(null);
        setImageError(null);
        form.setValue('heroImage', '');
        const fileInput = document.getElementById('hero-image-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    }, [form]);

    // Preview component
    const PreviewSection = useMemo(() => {
        if (!showPreview) return null;

        return (
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        Live Preview
                    </CardTitle>
                    <CardDescription>
                        See how your hero section will look on the homepage
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-8 rounded-lg">
                        <div className="text-center space-y-4">
                            <h1 className="text-3xl font-bold">
                                {watchedValues.heroTitlePrefix && (
                                    <span className="text-muted-foreground">{watchedValues.heroTitlePrefix} </span>
                                )}
                                {watchedValues.heroTitleHighlight && (
                                    <span className="text-primary">{watchedValues.heroTitleHighlight}</span>
                                )}
                                {watchedValues.heroTitleSuffix && (
                                    <span className="text-muted-foreground"> {watchedValues.heroTitleSuffix}</span>
                                )}
                            </h1>
                            {watchedValues.heroSubtitle && (
                                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                                    {watchedValues.heroSubtitle}
                                </p>
                            )}
                            <div className="flex gap-4 justify-center">
                                {watchedValues.heroButton1Text && (
                                    <Button>{watchedValues.heroButton1Text}</Button>
                                )}
                                {watchedValues.heroButton2Text && (
                                    <Button variant="outline">{watchedValues.heroButton2Text}</Button>
                                )}
                            </div>
                            {imagePreview && (
                                <div className="relative aspect-video w-full max-w-md mx-auto rounded-lg overflow-hidden border">
                                    <Image 
                                        src={imagePreview} 
                                        alt="Hero preview" 
                                        fill 
                                        style={{ objectFit: 'cover' }}
                                        className="rounded-lg"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }, [showPreview, watchedValues, imagePreview]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[50vh]">
                <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <p className="text-muted-foreground">Loading settings...</p>
                </div>
            </div>
        );
    }
  
    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Homepage Settings</h1>
                    <p className="text-muted-foreground mt-2">
                        Customize your homepage hero section content and appearance
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowPreview(!showPreview)}
                        className="flex items-center gap-2"
                    >
                        <Eye className="h-4 w-4" />
                        {showPreview ? 'Hide' : 'Show'} Preview
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={loadSettings}
                        disabled={loading}
                        className="flex items-center gap-2"
                    >
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Unsaved changes alert */}
            {hasUnsavedChanges && (
                <Alert className="border-amber-200 bg-amber-50/50">
                    <AlertDescription className="text-amber-800">
                        You have unsaved changes. Don't forget to save your settings.
                    </AlertDescription>
                </Alert>
            )}

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    {/* Hero Content Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Type className="h-5 w-5" />
                                Hero Content
                            </CardTitle>
                            <CardDescription>
                                Configure the main heading and subtitle text for your homepage
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Title Fields */}
                            <div className="space-y-4">
                                <Label className="text-base font-semibold">Main Title</Label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField 
                                        control={form.control} 
                                        name="heroTitlePrefix" 
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Prefix</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        {...field} 
                                                        value={field.value || ''} 
                                                        disabled={isSubmitting}
                                                        placeholder="Welcome to"
                                                    />
                                                </FormControl>
                                                <FormDescription>Text before highlight</FormDescription>
                                            </FormItem>
                                        )} 
                                    />
                                    <FormField 
                                        control={form.control} 
                                        name="heroTitleHighlight" 
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Highlight</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        {...field} 
                                                        value={field.value || ''} 
                                                        disabled={isSubmitting}
                                                        placeholder="Your Brand"
                                                        className="border-primary/50"
                                                    />
                                                </FormControl>
                                                <FormDescription>Highlighted text</FormDescription>
                                            </FormItem>
                                        )} 
                                    />
                                    <FormField 
                                        control={form.control} 
                                        name="heroTitleSuffix" 
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Suffix</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        {...field} 
                                                        value={field.value || ''} 
                                                        disabled={isSubmitting}
                                                        placeholder="Platform"
                                                    />
                                                </FormControl>
                                                <FormDescription>Text after highlight</FormDescription>
                                            </FormItem>
                                        )} 
                                    />
                                </div>
                            </div>

                            <Separator />

                            {/* Subtitle */}
                            <FormField 
                                control={form.control} 
                                name="heroSubtitle" 
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Subtitle</FormLabel>
                                        <FormControl>
                                            <Textarea 
                                                {...field} 
                                                value={field.value || ''} 
                                                disabled={isSubmitting}
                                                placeholder="Describe what your platform offers..."
                                                className="min-h-[80px]"
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Supporting text that appears below the main title
                                            {field.value && (
                                                <Badge variant="outline" className="ml-2">
                                                    {field.value.length}/200
                                                </Badge>
                                            )}
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )} 
                            />
                        </CardContent>
                    </Card>

                    {/* Call-to-Action Buttons */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <LinkIcon className="h-5 w-5" />
                                Call-to-Action Buttons
                            </CardTitle>
                            <CardDescription>
                                Configure the action buttons that appear in your hero section
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Button 1 */}
                            <div className="space-y-4">
                                <Label className="text-base font-semibold">Primary Button</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField 
                                        control={form.control} 
                                        name="heroButton1Text" 
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Button Text</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        {...field} 
                                                        value={field.value || ''} 
                                                        disabled={isSubmitting}
                                                        placeholder="Get Started"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} 
                                    />
                                    <FormField 
                                        control={form.control} 
                                        name="heroButton1Link" 
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Link</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        {...field} 
                                                        value={field.value || ''} 
                                                        placeholder="/signup or https://example.com"
                                                        disabled={isSubmitting}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} 
                                    />
                                </div>
                            </div>

                            <Separator />

                            {/* Button 2 */}
                            <div className="space-y-4">
                                <Label className="text-base font-semibold">Secondary Button</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField 
                                        control={form.control} 
                                        name="heroButton2Text" 
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Button Text</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        {...field} 
                                                        value={field.value || ''} 
                                                        disabled={isSubmitting}
                                                        placeholder="Learn More"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} 
                                    />
                                    <FormField 
                                        control={form.control} 
                                        name="heroButton2Link" 
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Link</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        {...field} 
                                                        value={field.value || ''} 
                                                        placeholder="/about or https://example.com"
                                                        disabled={isSubmitting}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} 
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Hero Image */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ImageIcon className="h-5 w-5" />
                                Hero Image
                            </CardTitle>
                            <CardDescription>
                                Upload an image or provide a URL for your hero section
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Image Preview */}
                            {imagePreview && (
                                <div className="relative">
                                    <div className="relative aspect-video w-full max-w-md mx-auto rounded-lg overflow-hidden border-2 border-dashed border-muted-foreground/25">
                                        <Image 
                                            src={imagePreview} 
                                            alt="Hero image preview" 
                                            fill 
                                            style={{ objectFit: 'cover' }}
                                            className="rounded-lg"
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        onClick={clearImage}
                                        className="absolute top-2 right-2"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}

                            {/* Upload Section */}
                            <div className="space-y-4">
                                <Label 
                                    htmlFor="hero-image-upload" 
                                    className={cn(
                                        "w-full border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200",
                                        "hover:border-primary hover:bg-primary/5",
                                        fileToUpload && "border-primary bg-primary/10",
                                        imageError && "border-destructive bg-destructive/5"
                                    )}
                                >
                                    <UploadCloud className={cn(
                                        "w-10 h-10 mb-3",
                                        fileToUpload ? "text-primary" : "text-muted-foreground"
                                    )} />
                                    <span className="font-semibold text-lg">
                                        {fileToUpload ? fileToUpload.name : "Click to upload image"}
                                    </span>
                                    <span className="text-sm text-muted-foreground mt-1">
                                        Supports PNG, JPG, WEBP, GIF (max {MAX_IMAGE_SIZE_KB}KB)
                                    </span>
                                </Label>
                                <Input 
                                    id="hero-image-upload" 
                                    type="file" 
                                    className="sr-only" 
                                    accept="image/*" 
                                    onChange={handleImageFileChange} 
                                />
                            </div>

                            {/* Error Display */}
                            {imageError && (
                                <Alert variant="destructive">
                                    <AlertDescription>{imageError}</AlertDescription>
                                </Alert>
                            )}

                            {/* URL Input */}
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <Separator />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-4 text-muted-foreground font-medium">
                                        Or use URL
                                    </span>
                                </div>
                            </div>

                            <FormField 
                                control={form.control} 
                                name="heroImage" 
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Image URL</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="url" 
                                                placeholder="https://example.com/image.jpg"
                                                value={field.value || ''} 
                                                onChange={handleImageUrlChange} 
                                                disabled={isSubmitting}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Paste a direct link to your image
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )} 
                            />
                        </CardContent>
                    </Card>

                    {/* Preview Section */}
                    {PreviewSection}

                    {/* Save Button */}
                    <div className="flex justify-between items-center pt-6">
                        <div className="text-sm text-muted-foreground">
                            {hasUnsavedChanges && (
                                <span className="text-amber-600">• Unsaved changes</span>
                            )}
                        </div>
                        <Button 
                            type="submit" 
                            disabled={isSubmitting || loading}
                            className="min-w-[140px]"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Settings
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}