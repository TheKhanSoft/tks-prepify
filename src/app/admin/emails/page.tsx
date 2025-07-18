
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, Code, Save } from "lucide-react";
import { getEmailTemplate, updateEmailTemplate } from "@/lib/email-service";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

const emailTemplateSchema = z.object({
  subject: z.string().min(1, "Subject is required."),
  body: z.string().min(1, "Body is required."),
  isEnabled: z.boolean().default(true),
});

type EmailTemplateFormValues = z.infer<typeof emailTemplateSchema>;

const TEMPLATE_ID = "order-confirmation";

export default function EmailTemplatesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHtmlView, setIsHtmlView] = useState(false);

  const form = useForm<EmailTemplateFormValues>({
    resolver: zodResolver(emailTemplateSchema),
    defaultValues: { subject: "", body: "", isEnabled: true },
  });

  const watchedBody = form.watch("body");

  const loadTemplate = useCallback(async () => {
    setLoading(true);
    try {
      const template = await getEmailTemplate(TEMPLATE_ID);
      if (template) {
        form.reset(template);
      }
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
    if (!watchedBody) return "";
    // Safely replace placeholders with static example data for the preview
    return watchedBody
        .replace(/{{userName}}/g, "John Doe")
        .replace(/{{orderId}}/g, "OD-123-ABC")
        .replace(/{{planName}}/g, "Premium Plan")
        .replace(/{{duration}}/g, "Yearly")
        .replace(/{{orderDate}}/g, new Date().toLocaleDateString())
        .replace(/{{orderStatus}}/g, "Pending")
        .replace(/{{originalPrice}}/g, "1200.00")
        .replace(/{{discountAmount}}/g, "200.00")
        .replace(/{{finalAmount}}/g, "1000.00")
        .replace(/{{paymentMethod}}/g, "Bank Transfer");
  }, [watchedBody]);


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
    <div className="space-y-6 max-w-4xl">
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
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
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
                            <span className="text-sm text-muted-foreground">Preview</span>
                            <Switch checked={!isHtmlView} onCheckedChange={(checked) => setIsHtmlView(!checked)} aria-label="Toggle HTML view" />
                            <span className="text-sm text-muted-foreground">HTML</span>
                        </div>
                    </div>
                     {!isHtmlView ? (
                        <div className="p-4 border rounded-md min-h-[200px] bg-white prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                     ) : (
                        <FormField
                            control={form.control}
                            name="body"
                            render={({ field }) => (
                                <FormItem>
                                <FormControl><Textarea {...field} rows={25} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                     )}
                     <FormDescription>
                        Use HTML for formatting. Available placeholders: `{{userName}}`, `{{orderId}}`, `{{planName}}`, `{{duration}}`, `{{orderDate}}`, `{{orderStatus}}`, `{{originalPrice}}`, `{{discountAmount}}`, `{{finalAmount}}`, `{{paymentMethod}}`.
                     </FormDescription>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || loading}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Template
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
