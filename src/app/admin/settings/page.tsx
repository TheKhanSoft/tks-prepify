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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import React, { useState, useEffect } from "react";
import { fetchSettings, updateSettings } from "@/lib/settings-service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const settingsFormSchema = z.object({
  siteName: z.string().min(1, "Site name is required."),
  siteDescription: z.string().optional(),
  defaultQuestionCount: z.coerce.number().int().min(1, "Must be at least 1."),
  defaultDuration: z.coerce.number().int().min(1, "Must be at least 1 minute."),
  defaultQuestionsPerPage: z.coerce.number().int().min(1, "Must be at least 1."),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
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

  async function onSubmit(data: SettingsFormValues) {
    setIsSubmitting(true);
    try {
      await updateSettings(data);
      toast({
        title: "Settings Saved",
        description: "Your global settings have been updated.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
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
        <p className="text-muted-foreground">Manage default values for the application.</p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
          <Tabs defaultValue="site" className="space-y-6">
            <TabsList>
              <TabsTrigger value="site">Site</TabsTrigger>
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
