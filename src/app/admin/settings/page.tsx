
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
import { Loader2, PlusCircle, Trash2, Link as LinkIcon, Facebook, Github, Instagram, Linkedin, Twitter, Youtube, MessageSquare, MessageCircle, Twitch, Ghost, Send } from "lucide-react";
import React, { useState, useEffect } from "react";
import { fetchSettings, updateSettings } from "@/lib/settings-service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { socialPlatforms } from "@/lib/social-platforms";
import { fetchPlans } from "@/lib/plan-service";
import type { Plan, Settings } from "@/types";
import { Switch } from "@/components/ui/switch";

const settingsFormSchema = z.object({
  siteName: z.string().min(1, "Site name is required."),
  siteDescription: z.string().optional(),
  defaultPlanId: z.string().optional(),
  defaultQuestionCount: z.coerce.number().int().min(1, "Must be at least 1."),
  defaultDuration: z.coerce.number().int().min(1, "Must be at least 1 minute."),
  defaultQuestionsPerPage: z.coerce.number().int().min(1, "Must be at least 1."),
  socialLinks: z.array(z.object({
    platform: z.string().min(1, "Please select a platform."),
    url: z.string().url({ message: "Please enter a valid URL." }).or(z.literal("")),
  })).optional(),
  pdfWatermarkEnabled: z.boolean().optional(),
  pdfWatermarkText: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

const iconMap: { [key: string]: React.ComponentType<{ className?: string }> } = {
    Facebook, Github, Instagram, Linkedin, Twitter, Youtube, MessageSquare, MessageCircle, Twitch, Ghost, Send, Link: LinkIcon
};

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      socialLinks: [],
    }
  });

  const { fields: socialFields, append: appendSocial, remove: removeSocial } = useFieldArray({
    control: form.control,
    name: "socialLinks",
  });

  const pdfWatermarkEnabled = form.watch("pdfWatermarkEnabled");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [fetchedSettings, fetchedPlans] = await Promise.all([
          fetchSettings(),
          fetchPlans(),
        ]);
        form.reset(fetchedSettings);
        setSettings(fetchedSettings);
        setPlans(fetchedPlans);
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
    loadData();
  }, [form, toast]);

  async function onSubmit(data: SettingsFormValues) {
    setIsSubmitting(true);
    try {
      const settingsData = {
        ...data,
        socialLinks: data.socialLinks?.filter(link => link.url) || [],
      };
      
      await updateSettings(settingsData);
      
      toast({
        title: "Settings Saved",
        description: "Your global settings have been updated.",
      });
      
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save settings.",
        variant: "destructive",
        duration: 8000
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
        <h1 className="text-3xl font-bold">Global Settings</h1>
        <p className="text-muted-foreground">Manage application-wide settings and default values.</p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-4xl">
          <Tabs defaultValue="site" className="space-y-6">
            <TabsList>
              <TabsTrigger value="site">Site</TabsTrigger>
              <TabsTrigger value="social">Social</TabsTrigger>
              <TabsTrigger value="defaults">Defaults</TabsTrigger>
              <TabsTrigger value="downloads">Downloads</TabsTrigger>
            </TabsList>

            <TabsContent value="site">
              <Card>
                <CardHeader>
                  <CardTitle>Site Settings</CardTitle>
                  <CardDescription>Manage general site information and branding.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField control={form.control} name="siteName" render={({ field }) => (<FormItem><FormLabel>Site Name</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormDescription>The name of your application, displayed in the header and titles.</FormDescription><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="siteDescription" render={({ field }) => (<FormItem><FormLabel>Site Description / Tagline</FormLabel><FormControl><Textarea {...field} value={field.value || ''} disabled={isSubmitting} /></FormControl><FormDescription>A short description or tagline for your site.</FormDescription><FormMessage /></FormItem>)} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="social">
              <Card>
                <CardHeader><CardTitle>Social Media Links</CardTitle><CardDescription>Add and manage links to your social media profiles. They will appear in the site footer.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  {socialFields.map((item, index) => {
                    const selectedPlatform = socialPlatforms.find(p => p.value === form.watch(`socialLinks.${index}.platform`));
                    const Icon = selectedPlatform ? (iconMap[selectedPlatform.iconName] || LinkIcon) : LinkIcon;
                    return (
                        <div key={item.id} className="flex items-end gap-4 p-4 border rounded-lg">
                            <FormField control={form.control} name={`socialLinks.${index}.platform`} render={({ field }) => (<FormItem className="w-48"><FormLabel>Platform</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select platform..." /></SelectTrigger></FormControl><SelectContent>{socialPlatforms.map(p => (<SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name={`socialLinks.${index}.url`} render={({ field }) => (<FormItem className="flex-grow"><FormLabel>URL</FormLabel><FormControl><div className="relative"><Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input {...field} value={field.value || ''} placeholder="https://..." className="pl-9" /></div></FormControl><FormMessage /></FormItem>)} />
                             <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeSocial(index)}><Trash2 className="h-4 w-4" /><span className="sr-only">Remove link</span></Button>
                        </div>
                    )
                  })}
                  <Button type="button" variant="outline" onClick={() => appendSocial({ platform: 'other', url: '' })}><PlusCircle className="mr-2 h-4 w-4" />Add Social Link</Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="defaults">
              <div className="space-y-6">
                 <Card>
                  <CardHeader><CardTitle>New Paper Defaults</CardTitle><CardDescription>These values will be used as defaults when creating a new paper.</CardDescription></CardHeader>
                  <CardContent className="space-y-6">
                    <FormField control={form.control} name="defaultQuestionCount" render={({ field }) => (<FormItem><FormLabel>Default Number of Questions</FormLabel><FormControl><Input type="number" {...field} disabled={isSubmitting} /></FormControl><FormDescription>The default number of questions for a new paper.</FormDescription><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="defaultDuration" render={({ field }) => (<FormItem><FormLabel>Default Duration (in minutes)</FormLabel><FormControl><Input type="number" {...field} disabled={isSubmitting} /></FormControl><FormDescription>The default duration for a new paper.</FormDescription><FormMessage /></FormItem>)} />
                  </CardContent>
                </Card>
                 <Card>
                  <CardHeader><CardTitle>User & Test Defaults</CardTitle><CardDescription>Settings that affect new users and the public test-taking experience.</CardDescription></CardHeader>
                  <CardContent className="space-y-6">
                     <FormField
                        control={form.control}
                        name="defaultPlanId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Default Plan for New Users</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a default plan..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {plans.map((plan) => (
                                  <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>This plan will be automatically assigned to all new users upon registration.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    <FormField control={form.control} name="defaultQuestionsPerPage" render={({ field }) => (<FormItem><FormLabel>Default Questions Per Page</FormLabel><FormControl><Input type="number" {...field} disabled={isSubmitting} /></FormControl><FormDescription>The global number of questions to show on a page if a paper doesn't have a specific value.</FormDescription><FormMessage /></FormItem>)} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="downloads">
               <Card>
                  <CardHeader><CardTitle>PDF Download Settings</CardTitle><CardDescription>Customize the options for downloaded PDF papers.</CardDescription></CardHeader>
                  <CardContent className="space-y-6">
                     <FormField
                        control={form.control}
                        name="pdfWatermarkEnabled"
                        render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">Enable Watermark</FormLabel>
                                <FormDescription>Add a watermark to each page of the downloaded PDF.</FormDescription>
                            </div>
                            <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} />
                            </FormControl>
                        </FormItem>
                        )}
                    />
                    {pdfWatermarkEnabled && (
                        <FormField
                            control={form.control}
                            name="pdfWatermarkText"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Watermark Text</FormLabel>
                                <FormControl>
                                    <Input {...field} value={field.value || ''} disabled={isSubmitting} />
                                </FormControl>
                                <FormDescription>
                                    The text to display as the watermark. Use `"{siteName}"` as a placeholder for your site name.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    )}
                  </CardContent>
                </Card>
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
