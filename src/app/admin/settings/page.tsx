
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
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Facebook, Github, Instagram, Linkedin, Loader2, PlusCircle, Trash2, Twitter, Youtube, Link as LinkIcon, MessageSquare, MessageCircle, HelpCircle, Twitch, Ghost, UploadCloud } from "lucide-react";
import React, { useState, useEffect } from "react";
import { fetchSettings, updateSettings } from "@/lib/settings-service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from "next/image";
import { cn } from "@/lib/utils";

// A simple Send icon as a fallback if specific ones aren't available
const Send = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
);


const settingsFormSchema = z.object({
  siteName: z.string().min(1, "Site name is required."),
  siteDescription: z.string().optional(),
  defaultQuestionCount: z.coerce.number().int().min(1, "Must be at least 1."),
  defaultDuration: z.coerce.number().int().min(1, "Must be at least 1 minute."),
  defaultQuestionsPerPage: z.coerce.number().int().min(1, "Must be at least 1."),
  heroTitlePrefix: z.string().optional(),
  heroTitleHighlight: z.string().optional(),
  heroTitleSuffix: z.string().optional(),
  heroSubtitle: z.string().optional(),
  heroButton1Text: z.string().optional(),
  heroButton1Link: z.string().optional(),
  heroButton2Text: z.string().optional(),
  heroButton2Link: z.string().optional(),
  heroImage: z.string().or(z.literal("")).optional(),
  socialLinks: z.array(z.object({
    platform: z.string().min(1, "Please select a platform."),
    url: z.string().url({ message: "Please enter a valid URL." }).or(z.literal("")),
  })).optional(),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

const socialPlatforms = [
  { value: 'facebook', label: 'Facebook', icon: Facebook },
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'twitter', label: 'Twitter / X', icon: Twitter },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { value: 'youtube', label: 'YouTube', icon: Youtube },
  { value: 'github', label: 'GitHub', icon: Github },
  { value: 'discord', label: 'Discord', icon: MessageSquare },
  { value: 'threads', label: 'Threads', icon: MessageCircle },
  { value: 'twitch', label: 'Twitch', icon: Twitch },
  { value: 'telegram', label: 'Telegram', icon: Send }, // Using a fallback
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { value: 'snapchat', label: 'Snapchat', icon: Ghost },
  { value: 'other', label: 'Other', icon: LinkIcon },
];

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const MAX_IMAGE_SIZE_KB = 150;
  const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_KB * 1024;

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      socialLinks: [],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "socialLinks",
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

  async function onSubmit(data: SettingsFormValues) {
    setIsSubmitting(true);
    try {
      let finalData = { ...data };

      if (fileToUpload) {
        if (fileToUpload.size > MAX_IMAGE_SIZE_BYTES) {
            toast({
                title: "Image Too Large",
                description: `The selected image must be smaller than ${MAX_IMAGE_SIZE_KB}KB. Please upload a compressed image.`,
                variant: "destructive",
                duration: 8000
            });
            setIsSubmitting(false);
            return;
        }
        
        const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(fileToUpload);
        });
        finalData.heroImage = dataUrl;
      }

      const settingsData = {
        ...finalData,
        socialLinks: finalData.socialLinks?.filter(link => link.url) || []
      };
      
      await updateSettings(settingsData);
      
      toast({
        title: "Settings Saved",
        description: "Your global settings have been updated.",
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
        <h1 className="text-3xl font-bold">Global Settings</h1>
        <p className="text-muted-foreground">Manage default values for the application.</p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-4xl">
          <Tabs defaultValue="site" className="space-y-6">
            <TabsList>
              <TabsTrigger value="site">Site</TabsTrigger>
              <TabsTrigger value="homepage">Homepage</TabsTrigger>
              <TabsTrigger value="social">Social Links</TabsTrigger>
              <TabsTrigger value="defaults">Defaults</TabsTrigger>
            </TabsList>
            <TabsContent value="site">
              <Card>
                <CardHeader>
                  <CardTitle>Site Settings</CardTitle>
                  <CardDescription>
                    Manage general site information and branding.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="siteName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Site Name</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormDescription>The name of your application, displayed in the header and titles.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="siteDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Site Description / Tagline</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value || ''} disabled={isSubmitting} />
                        </FormControl>
                        <FormDescription>A short description or tagline for your site.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
             <TabsContent value="homepage">
              <Card>
                <CardHeader>
                  <CardTitle>Homepage Hero Section</CardTitle>
                  <CardDescription>
                    Customize the content of the main hero section on your homepage.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="heroTitlePrefix"
                      render={({ field }) => (
                        <FormItem className="md:col-span-1">
                          <FormLabel>Title Prefix</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} disabled={isSubmitting} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="heroTitleHighlight"
                      render={({ field }) => (
                        <FormItem className="md:col-span-1">
                          <FormLabel>Highlighted Title</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} disabled={isSubmitting} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="heroTitleSuffix"
                      render={({ field }) => (
                        <FormItem className="md:col-span-1">
                          <FormLabel>Title Suffix</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} disabled={isSubmitting} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="heroSubtitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subtitle</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value || ''} disabled={isSubmitting} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="heroButton1Text"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Button 1 Text</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} disabled={isSubmitting} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="heroButton1Link"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Button 1 Link</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} placeholder="/papers" disabled={isSubmitting} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="heroButton2Text"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Button 2 Text</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} disabled={isSubmitting} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="heroButton2Link"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Button 2 Link</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} placeholder="/signup" disabled={isSubmitting} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormItem>
                        <FormLabel>Hero Image</FormLabel>
                        <Card>
                            <CardContent className="p-4 space-y-4">
                                {imagePreview && (
                                <div className="relative aspect-video w-full max-w-sm mx-auto rounded-md overflow-hidden border">
                                    <Image src={imagePreview} alt="Hero image preview" fill style={{ objectFit: 'cover' }} />
                                </div>
                                )}
                                <div className="space-y-2">
                                <Label
                                    htmlFor="hero-image-upload"
                                    className={cn(
                                        "w-full border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors",
                                        fileToUpload && "border-primary bg-primary/10"
                                    )}
                                    >
                                    <UploadCloud className="w-8 h-8 text-muted-foreground mb-2" />
                                    <span className="font-semibold">{fileToUpload ? fileToUpload.name : "Click to upload a file"}</span>
                                    <span className="text-xs text-muted-foreground">PNG, JPG, WEBP (MAX. {MAX_IMAGE_SIZE_KB}KB)</span>
                                </Label>
                                <Input id="hero-image-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageFileChange} />
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or</span></div>
                                </div>
                                <FormField
                                    control={form.control}
                                    name="heroImage"
                                    render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <FormLabel htmlFor="hero-image-url">Paste image URL</FormLabel>
                                        <FormControl>
                                            <Input
                                                id="hero-image-url"
                                                type="text"
                                                placeholder="https://..."
                                                value={field.value || ''}
                                                onChange={handleImageUrlChange}
                                                disabled={isSubmitting}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>
                    </FormItem>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="social">
              <Card>
                <CardHeader>
                  <CardTitle>Social Media Links</CardTitle>
                  <CardDescription>
                    Add and manage links to your social media profiles. They will appear in the site footer.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fields.map((item, index) => {
                    const selectedPlatform = socialPlatforms.find(p => p.value === form.watch(`socialLinks.${index}.platform`));
                    const Icon = selectedPlatform?.icon || LinkIcon;
                    return (
                        <div key={item.id} className="flex items-end gap-4 p-4 border rounded-lg">
                            <FormField
                                control={form.control}
                                name={`socialLinks.${index}.platform`}
                                render={({ field }) => (
                                    <FormItem className="w-48">
                                        <FormLabel>Platform</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select platform..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {socialPlatforms.map(p => (
                                                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`socialLinks.${index}.url`}
                                render={({ field }) => (
                                    <FormItem className="flex-grow">
                                        <FormLabel>URL</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input {...field} value={field.value || ''} placeholder="https://..." className="pl-9" />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => remove(index)}
                            >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Remove link</span>
                            </Button>
                        </div>
                    )
                  })}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => append({ platform: 'other', url: '' })}
                    >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Social Link
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="defaults">
              <div className="space-y-6">
                 <Card>
                  <CardHeader>
                    <CardTitle>New Paper Defaults</CardTitle>
                    <CardDescription>
                      These values will be used as defaults when creating a new paper.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="defaultQuestionCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Number of Questions</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} disabled={isSubmitting} />
                          </FormControl>
                          <FormDescription>The default number of questions for a new paper.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="defaultDuration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Duration (in minutes)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} disabled={isSubmitting} />
                          </FormControl>
                          <FormDescription>The default duration for a new paper.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Test Taking Defaults</CardTitle>
                    <CardDescription>
                      Settings that affect the public test-taking experience.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="defaultQuestionsPerPage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Questions Per Page</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} disabled={isSubmitting} />
                          </FormControl>
                          <FormDescription>
                            The global number of questions to show on a page if a paper doesn't have a specific value.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

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
