
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, Save, Code, AlertCircle, RefreshCw, HelpCircle, Mail } from "lucide-react";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { getEmailTemplate, updateEmailTemplate } from "@/lib/email-service";
import { emailTemplatePlaceholders } from "@/lib/email-template-data";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { fetchSettings } from "@/lib/settings-service";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { sendEmail } from "@/lib/email-provider";
import type { Settings } from "@/types";

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
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [activeTab, setActiveTab] = useState<keyof typeof emailTemplatePlaceholders>("order-confirmation");
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [settings, setSettings] = useState<Settings | null>(null);
  
  const form = useForm<EmailTemplateFormValues>({
    resolver: zodResolver(emailTemplateSchema),
    defaultValues: { subject: "", body: "", isEnabled: true },
  });

  const watchedBody = form.watch("body");

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
      setSettings(appSettings);
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
        const exampleReplacements: Record<string, any> = {
            userName: 'John Doe',
            resetLink: '#',
            orderId: 'ORD-SAMPLE-123',
            planName: 'Premium Plan',
            duration: 'Yearly',
            orderDate: format(new Date(), 'PPP'),
            orderStatus: 'Completed',
            originalPrice: '1200.00',
            discountCode: 'WELCOME10', 
            discountAmount: '120.00',
            finalAmount: '1080.00',
            paymentMethod: 'Bank Transfer',
            expiryDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'PPP'),
            siteName: settings.siteName,
            contactEmail: settings.contactEmail,
            adminRemarks: 'Your subscription was extended as a token of our appreciation.'
        };
      
      const conditionalBlockRegex = /{{\s*#if\s+([a-zA-Z0-9_]+)\s*}}([\s\S]*?){{\s*\/if\s*}}/g;

      preview = preview.replace(conditionalBlockRegex, (match, key, blockContent) => {
          return exampleReplacements[key] ? blockContent : '';
      });

      for (const key of Object.keys(exampleReplacements)) {
        const value = exampleReplacements[key];
        preview = preview.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }
    }
    return preview;
  }, [watchedBody, settings]);

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

  const handleSendTestEmail = async () => {
    if (!settings) {
        toast({ title: 'Settings not loaded', description: 'Please wait for settings to load.', variant: 'destructive' });
        return;
    }
    
    const recipient = settings.testEmailAddress || settings.emailFromAddress;

    if (!recipient) {
        toast({
          title: 'Recipient Required',
          description: 'Please set a "Test Email Address" or a "Sender Email Address" in Global Settings.',
          variant: 'destructive',
        });
        return;
    }
    setIsSendingTest(true);
    try {
      const result = await sendEmail({
        templateId: activeTab,
        to: recipient,
        props: {
          userName: 'Test User',
          resetLink: '#',
          orderId: 'ORD-TEST-456',
          planName: 'Pro Plan',
          duration: 'Monthly',
          orderDate: format(new Date(), 'PPP'),
          orderStatus: 'Pending',
          originalPrice: 1500,
          discountCode: 'TESTCODE',
          discountAmount: 150,
          finalAmount: 1350,
          paymentMethod: 'Test Method',
          expiryDate: format(new Date(), 'PPP'),
          adminRemarks: 'This is a test remark.',
        },
      });

      if (result.success) {
        toast({
          title: 'Test Email Sent',
          description: `An email has been sent to ${recipient}. Check your email provider logs to confirm delivery.`,
        });
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error: any) {
      toast({
        title: 'Failed to Send Test Email',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

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
                  <CardFooter className="border-t pt-6">
                        <div className="flex items-center justify-end w-full">
                            <Button type="button" variant="secondary" onClick={handleSendTestEmail} disabled={isSendingTest}>
                                {isSendingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                                Send Test Email
                            </Button>
                        </div>
                    </CardFooter>
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
                  <code className="font-mono text-sm font-semibold text-primary">{`{{${key}}}`}</code>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </li>
              ))}
            </ul>
             <h4 className="font-semibold mb-2">Common Placeholders:</h4>
            <ul className="space-y-3 mb-6">
              {Object.entries(emailTemplatePlaceholders.common.placeholders).map(([key, desc]) => (
                <li key={key}>
                  <code className="font-mono text-sm font-semibold text-primary">{`{{${key}}}`}</code>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </li>
              ))}
            </ul>
            <h4 className="font-semibold mb-2 flex items-center gap-1.5"><HelpCircle className="h-4 w-4" />Conditional Blocks:</h4>
            <div className="text-xs text-muted-foreground space-y-2">
                <p>You can show content conditionally using Handlebars-style `if` blocks.</p>
                <div className="p-2 bg-muted rounded font-mono text-xs">
                    <p>{'{{#if placeholderName}}'}</p>
                    <p className="pl-2">Your HTML content here...</p>
                    <p>{'{{/if}}'}</p>
                </div>
                <p>The content will only be included if `placeholderName` has a value. For example, use `{"{{#if discountCode}}"}` to show a discount row only when a coupon was used.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
