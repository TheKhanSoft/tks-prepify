
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, Save, Code } from "lucide-react";
import { getEmailTemplate, updateEmailTemplate } from "@/lib/email-service";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { fetchSettings } from "@/lib/settings-service";

const emailTemplateSchema = z.object({
  subject: z.string().min(1, "Subject is required."),
  body: z.string().min(1, "Body is required."),
  isEnabled: z.boolean().default(true),
});

type EmailTemplateFormValues = z.infer<typeof emailTemplateSchema>;

const TEMPLATE_ID = "order-confirmation";

const placeholders = [
    { key: '{{userName}}', description: "The user's full name." },
    { key: '{{orderId}}', description: "The unique ID of the order." },
    { key: '{{planName}}', description: "The name of the purchased plan." },
    { key: '{{duration}}', description: "The duration label of the plan (e.g., Monthly)." },
    { key: '{{orderDate}}', description: "The date the order was placed." },
    { key: '{{orderStatus}}', description: "The current status of the order (e.g., Pending)." },
    { key: '{{originalPrice}}', description: "The base price before discounts." },
    { key: '{{discountAmount}}', description: "The amount discounted, if any." },
    { key: '{{finalAmount}}', description: "The final amount to be paid." },
    { key: '{{paymentMethod}}', description: "The payment method chosen by the user." },
    { key: '{{siteName}}', description: "The name of your site from global settings." },
    { key: '{{contactEmail}}', description: "Your support email from global settings." },
];

export default function EmailTemplatesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHtmlView, setIsHtmlView] = useState(false);
  const [settings, setSettings] = useState<{siteName: string, contactEmail: string} | null>(null);

  const form = useForm<EmailTemplateFormValues>({
    resolver: zodResolver(emailTemplateSchema),
    defaultValues: { subject: "", body: "", isEnabled: true },
  });

  const watchedBody = form.watch("body");

  const loadTemplate = useCallback(async () => {
    setLoading(true);
    try {
      const [template, appSettings] = await Promise.all([
        getEmailTemplate(TEMPLATE_ID),
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
    loadTemplate();
  }, [loadTemplate]);
  
  const previewHtml = useMemo(() => {
    let preview = watchedBody || "";
    const exampleReplacements = {
        '{{userName}}': 'John Doe',
        '{{orderId}}': 'ORD-SAMPLE-123',
        '{{planName}}': 'Premium Plan',
        '{{duration}}': 'Yearly',
        '{{orderDate}}': format(new Date(), 'PPP'),
        '{{orderStatus}}': 'Pending',
        '{{originalPrice}}': '1200.00',
        '{{discountAmount}}': '200.00',
        '{{finalAmount}}': '1000.00',
        '{{paymentMethod}}': 'Bank Transfer',
        '{{siteName}}': settings?.siteName || 'TKS Prepify',
        '{{contactEmail}}': settings?.contactEmail || 'support@example.com',
    };
    
    for (const [key, value] of Object.entries(exampleReplacements)) {
        preview = preview.replace(new RegExp(key.replace(/\{/g, '\\{').replace(/\}/g, '\\}'), 'g'), value);
    }
    return preview;
    
  }, [watchedBody, settings]);


  async function onSubmit(data: EmailTemplateFormValues) {
    setIsSubmitting(true);
    try {
      await updateEmailTemplate(TEMPLATE_ID, data);
      toast({ title: "Template Saved", description: "The order confirmation email template has been updated." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save the template.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div>
            <h1 className="text-3xl font-bold">Email Templates</h1>
            <p className="text-muted-foreground">Manage the content of automated emails sent to users.</p>
        </div>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
                <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Order Confirmation Email</CardTitle>
                        <CardDescription>This email is sent to users after they place an order.</CardDescription>
                    </div>
                    <FormField
                        control={form.control}
                        name="isEnabled"
                        render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                            <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel>Enabled</FormLabel>
                        </FormItem>
                        )}
                    />
                </div>
                </CardHeader>
                <CardContent className="space-y-6">
                {loading ? (
                    <>
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-40 w-full" />
                    </>
                ) : (
                    <>
                    <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email Subject</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <FormLabel>Email Body</FormLabel>
                            <div className="flex items-center gap-2">
                                <Code className="h-4 w-4 text-muted-foreground" />
                                <Switch checked={isHtmlView} onCheckedChange={setIsHtmlView} aria-label="Toggle HTML view" />
                                <Eye className="h-4 w-4 text-muted-foreground" />
                            </div>
                        </div>
                        {isHtmlView ? (
                            <div className="p-4 border rounded-md min-h-[400px] bg-white" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                        ) : (
                            <FormField
                                control={form.control}
                                name="body"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormControl><Textarea {...field} rows={25} className="font-mono text-xs" /></FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                    </div>
                    </>
                )}
                </CardContent>
            </Card>
            <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting || loading}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Save className="mr-2 h-4 w-4" /> Save Template</>}
                </Button>
            </div>
            </form>
        </Form>
      </div>
      <div className="lg:col-span-1">
        <Card className="sticky top-24">
            <CardHeader>
                <CardTitle>Available Placeholders</CardTitle>
                <CardDescription>Use these placeholders in your subject and body. They will be replaced with real data.</CardDescription>
            </CardHeader>
            <CardContent>
                <ul className="space-y-3">
                    {placeholders.map(p => (
                        <li key={p.key}>
                            <code className="font-mono text-sm font-semibold text-primary">{p.key}</code>
                            <p className="text-xs text-muted-foreground">{p.description}</p>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
