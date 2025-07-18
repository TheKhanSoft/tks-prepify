
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, Save, Code, AlertCircle, RefreshCw } from "lucide-react";
import { getEmailTemplate, updateEmailTemplate, emailTemplatePlaceholders, TemplateDetails } from "@/lib/email-service";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { fetchSettings } from "@/lib/settings-service";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const emailTemplateSchema = z.object({
  subject: z.string().min(1, "Subject is required."),
  body: z.string().min(1, "Body is required."),
  isEnabled: z.boolean().default(true),
});

type EmailTemplateFormValues = z.infer<typeof emailTemplateSchema>;

export default function EmailTemplatesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<keyof typeof emailTemplatePlaceholders>("order-confirmation");
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [settings, setSettings] = useState<{ siteName: string; contactEmail: string } | null>(null);
  
  const form = useForm<EmailTemplateFormValues>({
    resolver: zodResolver(emailTemplateSchema),
    defaultValues: { subject: "", body: "", isEnabled: true },
  });

  const watchedBody = form.watch("body");

  // Load template and settings
  const loadTemplate = useCallback(async (templateId: keyof typeof emailTemplatePlaceholders) => {
    setLoading(true);
    try {
      const [template, appSettings] = await Promise.all([
        getEmailTemplate(templateId),
        fetchSettings()
      ]);
      if (template) {
        form.reset(template);
      }
      setSettings({
        siteName: appSettings.siteName || 'TKS Prepify',
        contactEmail: appSettings.contactEmail || 'support@example.com'
      });
    } catch (error) {
      toast({ title: "Error", description: "Could not load the email template.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [form, toast]);

  useEffect(() => {
    loadTemplate(activeTab);
  }, [loadTemplate, activeTab]);

  const previewHtml = useMemo(() => {
    let preview = watchedBody || "";
    if (settings) {
      const allPlaceholders = {
        ...emailTemplatePlaceholders.common,
        ...emailTemplatePlaceholders[activeTab].placeholders
      };

      const exampleReplacements: Record<string, string> = {
        '{{userName}}': 'John Doe',
        '{{resetLink}}': '#',
        '{{orderId}}': 'ORD-SAMPLE-123',
        '{{planName}}': 'Premium Plan',
        '{{duration}}': 'Yearly',
        '{{orderDate}}': format(new Date(), 'PPP'),
        '{{orderStatus}}': 'Completed',
        '{{originalPrice}}': '1200.00',
        '{{discountAmount}}': '200.00',
        '{{finalAmount}}': '1000.00',
        '{{paymentMethod}}': 'Bank Transfer',
        '{{expiryDate}}': format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'PPP'), // 30 days from now
        '{{siteName}}': settings.siteName,
        '{{contactEmail}}': settings.contactEmail,
        '{{adminRemarks}}': 'Your subscription was extended as a token of our appreciation.'
      };
        
      for (const [key] of Object.entries(allPlaceholders)) {
        const value = exampleReplacements[key] || `[${key.replace(/[{}]/g, '')}]`;
        preview = preview.replace(new RegExp(key.replace(/\{/g, '\\{').replace(/\}/g, '\\}'), 'g'), value);
      }
    }
    return preview;
  }, [watchedBody, settings, activeTab]);

  async function onSubmit(data: EmailTemplateFormValues) {
    setIsSubmitting(true);
    try {
      await updateEmailTemplate(activeTab, data);
      toast({ title: "Template Saved", description: "The email template has been updated." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save the template.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  const currentTemplateDetails = emailTemplatePlaceholders[activeTab];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Email Templates</h1>
          <p className="text-muted-foreground">Manage the content of automated emails sent to users.</p>
        </div>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 h-auto flex-wrap justify-start">
            {Object.keys(emailTemplatePlaceholders).filter(k => k !== 'common').map(key => (
              <TabsTrigger key={key} value={key} className="capitalize text-xs">
                {emailTemplatePlaceholders[key as keyof typeof emailTemplatePlaceholders].label}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <TabsContent value={activeTab} className="mt-4">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{currentTemplateDetails.label}</CardTitle>
                        <CardDescription>{currentTemplateDetails.description}</CardDescription>
                      </div>
                      <FormField
                        control={form.control}
                        name="isEnabled"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0 shrink-0">
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} disabled={loading || isSubmitting} />
                            </FormControl>
                            <FormLabel>Enabled</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {loading ? (
                      <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-40 w-full" />
                      </div>
                    ) : (
                      <>
                        <FormField control={form.control} name="subject" render={({ field }) => (<FormItem><FormLabel>Email Subject</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <FormLabel>Email Body (HTML)</FormLabel>
                            <div className="flex items-center gap-2">
                                <Button type="button" size="sm" variant={viewMode === 'edit' ? 'secondary' : 'ghost'} onClick={() => setViewMode('edit')}><Code className="h-4 w-4 mr-2" />HTML</Button>
                                <Button type="button" size="sm" variant={viewMode === 'preview' ? 'secondary' : 'ghost'} onClick={() => setViewMode('preview')}><Eye className="h-4 w-4 mr-2" />Preview</Button>
                            </div>
                          </div>
                          {viewMode === 'preview' ? (
                              <div className="p-4 border rounded-md min-h-[400px] bg-white overflow-auto" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                          ) : (
                              <FormField control={form.control} name="body" render={({ field }) => (<FormItem><FormControl><Textarea {...field} rows={25} className="font-mono text-xs" /></FormControl><FormMessage /></FormItem>)} />
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => loadTemplate(activeTab)} disabled={loading || isSubmitting}><RefreshCw className="mr-2 h-4 w-4" />Discard Changes</Button>
                <Button type="submit" disabled={isSubmitting || loading}><Save className="mr-2 h-4 w-4" /> Save Template</Button>
              </div>
            </form>
          </Form>
        </Tabs>
      </div>
      <div className="lg:col-span-1">
        <Card className="sticky top-24">
          <CardHeader><CardTitle>Available Placeholders</CardTitle><CardDescription>Use these in your subject and body. They will be replaced with real data.</CardDescription></CardHeader>
          <CardContent>
            <h4 className="font-semibold mb-2">For This Email:</h4>
            <ul className="space-y-3 mb-6">
              {Object.entries(currentTemplateDetails.placeholders).map(([key, desc]) => (
                <li key={key}>
                  <code className="font-mono text-sm font-semibold text-primary">{key}</code>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </li>
              ))}
            </ul>
             <h4 className="font-semibold mb-2">Common Placeholders:</h4>
            <ul className="space-y-3">
              {Object.entries(emailTemplatePlaceholders.common.placeholders).map(([key, desc]) => (
                <li key={key}>
                  <code className="font-mono text-sm font-semibold text-primary">{key}</code>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
