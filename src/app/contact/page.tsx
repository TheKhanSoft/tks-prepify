
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
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { submitContactForm } from "@/lib/contact-service";
import type { Settings } from "@/types";
import ReactMarkdown from 'react-markdown';
import { useAuth } from "@/hooks/use-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const contactFormSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  topic: z.string({ required_error: "Please select a topic." }),
  subject: z.string().min(5, { message: "Subject must be at least 5 characters." }),
  message: z.string().min(10, { message: "Message must be at least 10 characters." }),
}).refine((data) => {
    if(!data.name) return false;
    return true;
}, {
    message: "Name must be at least 2 characters.",
    path: ["name"],
}).refine((data) => {
    if(!data.email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(data.email);
}, {
    message: "Please enter a valid email address.",
    path: ["email"],
});


type ContactFormValues = z.infer<typeof contactFormSchema>;

const contactTopics = [
    "General Inquiry",
    "Report a Bug",
    "Request a Paper",
    "Issue with my Account",
    "Issue with a Test/Result",
    "Feedback & Suggestions",
    "Other"
];

function ContactForm() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { name: "", email: "", subject: "", message: "", topic: "" },
  });
  
  useEffect(() => {
      if (user) {
          form.setValue("name", user.displayName || "");
          form.setValue("email", user.email || "");
      }
  }, [user, form]);

  async function onSubmit(data: ContactFormValues) {
    setIsSubmitting(true);
    try {
       const finalData = {
        name: user?.displayName || data.name!,
        email: user?.email || data.email!,
        topic: data.topic,
        subject: data.subject,
        message: data.message,
      };

      const result = await submitContactForm(finalData);
      if (result.success) {
        toast({
          title: "Message Sent!",
          description: "Thank you for contacting us. We'll get back to you shortly.",
        });
        form.reset({ subject: "", message: "", topic: "" });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className={cn("grid gap-6", !user && "md:grid-cols-2")}>
            {!user && (
                <>
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem><Label>Full Name</Label><FormControl><Input placeholder="John Doe" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem><Label>Email Address</Label><FormControl><Input type="email" placeholder="john.doe@example.com" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                    )}
                />
                </>
            )}
        </div>
        <FormField
            control={form.control}
            name="topic"
            render={({ field }) => (
                <FormItem>
                <Label>Topic</Label>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a topic..." /></SelectTrigger></FormControl>
                    <SelectContent>{contactTopics.map(topic => <SelectItem key={topic} value={topic}>{topic}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
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
            <FormItem><Label>Message</Label><FormControl><Textarea placeholder="Your message..." rows={5} {...field} /></FormControl><FormMessage /></FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Message
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

      <div className="grid md:grid-cols-2 gap-12">
        <Card>
          <CardHeader>
            <CardTitle>Send us a message</CardTitle>
            <CardDescription>Fill out the form and we'll get back to you as soon as possible.</CardDescription>
          </CardHeader>
          <CardContent>
            <ContactForm />
          </CardContent>
        </Card>

        <div className="space-y-8">
            <h3 className="text-2xl font-bold">Our Contact Information</h3>
            <div className="space-y-4 text-lg">
                {settings.contactEmail && (
                    <div className="flex items-center gap-4">
                        <Mail className="h-6 w-6 text-primary" />
                        <span className="text-muted-foreground">{settings.contactEmail}</span>
                    </div>
                )}
                 {settings.contactPhone && (
                    <div className="flex items-center gap-4">
                        <Phone className="h-6 w-6 text-primary" />
                        <span className="text-muted-foreground">{settings.contactPhone}</span>
                    </div>
                 )}
                 {settings.contactAddress && (
                    <div className="flex items-center gap-4">
                        <MapPin className="h-6 w-6 text-primary" />
                        <span className="text-muted-foreground">{settings.contactAddress}</span>
                    </div>
                 )}
            </div>
             <p className="text-muted-foreground">
                You can also reach out to us on our social media channels. We're active and ready to help!
            </p>
        </div>
      </div>
    </div>
  );
}
