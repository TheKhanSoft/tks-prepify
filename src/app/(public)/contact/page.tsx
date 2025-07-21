
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fetchSettings } from "@/lib/settings-service";
import { Mail, Phone, MapPin, Loader2 } from "lucide-react";
import React, { useState, useEffect } from "react";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { submitContactForm } from "@/lib/contact-service";
import type { Settings } from "@/types";
import ReactMarkdown from 'react-markdown';
import { useAuth } from "@/hooks/use-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 1024 * 1024; // 1 MB
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];

// Schema for form validation
const contactFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  topic: z.string({ required_error: "Please select a topic." }).min(1, "Please select a topic."),
  orderId: z.string().optional(),
  subject: z.string().min(5, { message: "Subject must be at least 5 characters." }),
  message: z.string().min(10, { message: "Message must be at least 10 characters." }),
  attachment: z
    .custom<FileList>()
    .optional()
    .refine((files) => !files || files.length === 0 || files[0].size <= MAX_FILE_SIZE, `File size should be less than 1MB.`)
    .refine((files) => !files || files.length === 0 || ACCEPTED_FILE_TYPES.includes(files[0].type), "Only .jpg, .jpeg, .png, .webp and .pdf formats are supported."),
}).refine(data => {
    if (data.topic === 'Payment Confirmation') {
        return !!data.orderId && data.orderId.length > 0;
    }
    return true;
}, {
    message: "Order ID is required for payment confirmation inquiries.",
    path: ["orderId"],
});


type ContactFormValues = z.infer<typeof contactFormSchema>;

// Expanded list of topics
const contactTopics = [
    "General Inquiry",
    "Report a Bug",
    "Request a Paper",
    "Payment Confirmation",
    "Issue with my Account",
    "Issue with a Test/Result",
    "Issue with Downloading Paper",
    "Issue with Generating Test",
    "Irrelevant Paper Category",
    "Feedback & Suggestions",
    "Other"
];

function ContactForm() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { name: "", email: "", subject: "", message: "", topic: "", orderId: "" },
  });

  const { formState: { isSubmitting }, watch } = form;
  const selectedTopic = watch('topic');
  
  // Pre-fill form for logged-in users
  useEffect(() => {
      if (user) {
          form.setValue("name", user.displayName || "", { shouldValidate: true });
          form.setValue("email", user.email || "", { shouldValidate: true });
      }
  }, [user, form]);

  async function onSubmit(data: ContactFormValues) {
    try {
      const result = await submitContactForm({
          ...data,
          // The service function expects the file, not the FileList
          attachment: data.attachment?.[0]
      }, user?.uid);

      if (result.success) {
        toast({
          title: "Message Sent!",
          description: "Thank you for contacting us. We'll get back to you shortly.",
        });
        // Reset only fields user can edit
        form.reset({
            ...form.getValues(),
            subject: "",
            message: "",
            topic: "",
            orderId: "",
            attachment: undefined,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                        <Label>Full Name</Label>
                        <FormControl><Input placeholder="The Khan Soft" {...field} disabled={!!user} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                    <FormItem>
                        <Label>Email Address</Label>
                        <FormControl><Input type="email" placeholder="tks-prepify@thekhansoft.tech" {...field} disabled={!!user} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                    <FormItem>
                    <Label>Topic</Label>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a topic..." /></SelectTrigger></FormControl>
                        <SelectContent>{contactTopics.map(topic => <SelectItem key={topic} value={topic}>{topic}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
            {selectedTopic === 'Payment Confirmation' && (
                <FormField
                    control={form.control}
                    name="orderId"
                    render={({ field }) => (
                        <FormItem>
                            <Label>Order ID</Label>
                            <FormControl><Input placeholder="Your order number" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}
        </div>
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem><Label>Subject</Label><FormControl><Input placeholder="Question about a paper" {...field} /></FormControl><FormMessage /></FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem><Label>Message</Label><FormControl><Textarea placeholder="Please provide as much detail as possible..." rows={5} {...field} /></FormControl><FormMessage /></FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="attachment"
          render={({ field: { onChange, value, ...rest } }) => (
            <FormItem>
              <Label>Attachment (Optional)</Label>
              <FormControl>
                <Input type="file" onChange={e => onChange(e.target.files)} {...rest} />
              </FormControl>
              <FormDescription>You can attach an image or PDF file (max 1MB).</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send Message
        </Button>
      </form>
    </Form>
  );
}

export default function ContactPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      const fetchedSettings = await fetchSettings();
      setSettings(fetchedSettings);
      setLoading(false);
    };
    loadSettings();
  }, []);

  if (loading || !settings) {
    return (
      <div className="flex justify-center items-center h-full min-h-[calc(100vh-20rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 sm:px-10 lg:px-16 py-12 md:py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold font-headline">{settings.contactTitle}</h1>
        <div className="prose prose-lg dark:prose-invert text-muted-foreground mt-4 max-w-3xl mx-auto">
          <ReactMarkdown>{settings.contactSubtitle || ''}</ReactMarkdown>
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-12">
        <div className="md:col-span-3">
            <Card>
                <CardHeader>
                    <CardTitle>Send us a message</CardTitle>
                    <CardDescription>Fill out the form and we'll get back to you as soon as possible.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ContactForm />
                </CardContent>
            </Card>
        </div>
        <div className="md:col-span-2 space-y-6">
            <h3 className="text-2xl font-bold">Our Contact Information</h3>
            <div className="space-y-4">
                {settings.contactEmail && (
                    <a href={`mailto:${settings.contactEmail}`} className="flex items-start gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors group">
                        <div className="flex-shrink-0 rounded-full bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors">
                            <Mail className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h4 className="font-semibold">Email</h4>
                            <p className="text-muted-foreground break-all">{settings.contactEmail}</p>
                        </div>
                    </a>
                )}
                 {settings.contactPhone && (
                     <a href={`tel:${settings.contactPhone}`} className="flex items-start gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors group">
                        <div className="flex-shrink-0 rounded-full bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors">
                            <Phone className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h4 className="font-semibold">Phone</h4>
                            <p className="text-muted-foreground">{settings.contactPhone}</p>
                        </div>
                    </a>
                 )}
                 {settings.contactAddress && (
                    <div className="flex items-start gap-4 rounded-lg border p-4">
                        <div className="flex-shrink-0 rounded-full bg-primary/10 p-3">
                            <MapPin className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h4 className="font-semibold">Address</h4>
                            <p className="text-muted-foreground">{settings.contactAddress}</p>
                        </div>
                    </div>
                 )}
            </div>
             <p className="text-muted-foreground pt-4">
                You can also reach out to us on our social media channels. We're active and ready to help!
            </p>
        </div>
      </div>
    </div>
  );
}
