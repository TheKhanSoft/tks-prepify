"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fetchSettings } from "@/lib/settings-service";
import { Mail, Phone, MapPin, Loader2, Send, FileText, AlertCircle, CheckCircle2, Users, MessageSquare, Clock, Globe } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
    .instanceof(File)
    .optional()
    .refine((file) => !file || file.size <= MAX_FILE_SIZE, `File size should be less than 1MB.`)
    .refine((file) => !file || ACCEPTED_FILE_TYPES.includes(file.type), "Only .jpg, .jpeg, .png, .webp and .pdf formats are supported."),
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

// Enhanced contact topics with categories and icons
const contactTopics = [
    { value: "General Inquiry", label: "General Inquiry", category: "General", icon: MessageSquare },
    { value: "Report a Bug", label: "Report a Bug", category: "Technical", icon: AlertCircle },
    { value: "Request a Paper", label: "Request a Paper", category: "Academic", icon: FileText },
    { value: "Payment Confirmation", label: "Payment Confirmation", category: "Billing", icon: CheckCircle2 },
    { value: "Issue with my Account", label: "Account Issues", category: "Account", icon: Users },
    { value: "Issue with a Test/Result", label: "Test/Result Issues", category: "Technical", icon: AlertCircle },
    { value: "Issue with Downloading Paper", label: "Download Issues", category: "Technical", icon: AlertCircle },
    { value: "Issue with Generating Test", label: "Test Generation Issues", category: "Technical", icon: AlertCircle },
    { value: "Irrelevant Paper Category", label: "Paper Category Issue", category: "Academic", icon: FileText },
    { value: "Feedback & Suggestions", label: "Feedback & Suggestions", category: "General", icon: MessageSquare },
    { value: "Other", label: "Other", category: "General", icon: MessageSquare }
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
  
  useEffect(() => {
      if (user) {
          form.setValue("name", user.displayName || "", { shouldValidate: true });
          form.setValue("email", user.email || "", { shouldValidate: true });
      }
  }, [user, form]);

  async function onSubmit(data: ContactFormValues) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
        if (value) {
            formData.append(key, value);
        }
    });
    
    try {
      const result = await submitContactForm(formData);
      if (result.success) {
        toast({
          title: "Message Sent Successfully! ✨",
          description: "Thank you for contacting us. We'll get back to you within 24 hours.",
        });
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
        title: "Oops! Something went wrong",
        description: error.message || "Failed to send message. Please try again or contact us directly.",
        variant: "destructive",
      });
    }
  }

  const selectedTopicData = contactTopics.find(topic => topic.value === selectedTopic);

  return (
    <div className="relative">
      {/* Decorative background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 rounded-2xl -z-10" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl -z-10" />
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Header Section */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">
              <MessageSquare className="w-4 h-4" />
              Quick Response Form
            </div>
            {user && (
              <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700 dark:text-green-300">
                  Welcome back, {user.displayName}! Your contact information has been pre-filled.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Personal Information */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">1</span>
              </div>
              Personal Information
            </div>
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 pl-10">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                            <Label className="text-sm font-medium">Full Name *</Label>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  placeholder="Enter your full name" 
                                  {...field} 
                                  disabled={!!user}
                                  className="pl-4 h-12 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 focus:border-primary rounded-xl transition-all duration-200 hover:border-gray-300"
                                />
                                {!!user && <Badge className="absolute right-3 top-3 text-xs">Auto-filled</Badge>}
                              </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                            <Label className="text-sm font-medium">Email Address *</Label>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  type="email" 
                                  placeholder="your.email@example.com" 
                                  {...field} 
                                  disabled={!!user}
                                  className="pl-4 h-12 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 focus:border-primary rounded-xl transition-all duration-200 hover:border-gray-300"
                                />
                                {!!user && <Badge className="absolute right-3 top-3 text-xs">Auto-filled</Badge>}
                              </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
          </div>

          {/* Inquiry Details */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">2</span>
              </div>
              Inquiry Details
            </div>
            
            <div className="pl-10 space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormField
                      control={form.control}
                      name="topic"
                      render={({ field }) => (
                          <FormItem className="space-y-3">
                            <Label className="text-sm font-medium">Topic *</Label>
                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-12 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 focus:border-primary rounded-xl">
                                    <SelectValue placeholder="Select your inquiry topic..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {contactTopics.map(topic => {
                                    const IconComponent = topic.icon;
                                    return (
                                      <SelectItem key={topic.value} value={topic.value} className="py-3">
                                        <div className="flex items-center gap-3">
                                          <IconComponent className="w-4 h-4 text-muted-foreground" />
                                          <div>
                                            <div className="font-medium">{topic.label}</div>
                                            <div className="text-xs text-muted-foreground">{topic.category}</div>
                                          </div>
                                        </div>
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
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
                              <FormItem className="space-y-3">
                                  <Label className="text-sm font-medium">Order ID *</Label>
                                  <FormControl>
                                    <Input 
                                      placeholder="e.g., ORD-123456789" 
                                      {...field}
                                      className="pl-4 h-12 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 focus:border-primary rounded-xl transition-all duration-200 hover:border-gray-300"
                                    />
                                  </FormControl>
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
                  <FormItem className="space-y-3">
                    <Label className="text-sm font-medium">Subject *</Label>
                    <FormControl>
                      <Input 
                        placeholder="Brief description of your inquiry" 
                        {...field}
                        className="pl-4 h-12 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 focus:border-primary rounded-xl transition-all duration-200 hover:border-gray-300"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Message & Attachment */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">3</span>
              </div>
              Message & Attachments
            </div>
            
            <div className="pl-10 space-y-6">
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <Label className="text-sm font-medium">Message *</Label>
                    <FormControl>
                      <Textarea 
                        placeholder="Please provide detailed information about your inquiry. The more details you provide, the better we can assist you..." 
                        rows={6} 
                        {...field}
                        className="resize-none bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 focus:border-primary rounded-xl transition-all duration-200 hover:border-gray-300 p-4"
                      />
                    </FormControl>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Minimum 10 characters required</span>
                      <span>{field.value?.length || 0} characters</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="attachment"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <Label className="text-sm font-medium">Attachment (Optional)</Label>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type="file" 
                          onChange={e => field.onChange(e.target.files?.[0])}
                          className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 h-12 bg-white dark:bg-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl transition-all duration-200 hover:border-primary"
                        />
                        <FileText className="absolute right-3 top-3 w-5 h-5 text-muted-foreground" />
                      </div>
                    </FormControl>
                    <FormDescription className="text-xs bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                      📎 Supported formats: JPG, PNG, WebP, PDF • Maximum size: 1MB
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-6">
            <Button 
              type="submit" 
              className="w-full h-14 text-lg font-semibold rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                  Sending your message...
                </>
              ) : (
                <>
                  <Send className="mr-3 h-5 w-5" />
                  Send Message
                </>
              )}
            </Button>
            
            <p className="text-center text-xs text-muted-foreground mt-4">
              🔒 Your information is secure and will only be used to respond to your inquiry.
            </p>
          </div>
        </form>
      </Form>
    </div>
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
      <div className="flex flex-col justify-center items-center h-full min-h-[calc(100vh-20rem)] space-y-4">
        <div className="relative">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-primary/20"></div>
        </div>
        <p className="text-muted-foreground animate-pulse">Loading contact information...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-6 sm:px-10 lg:px-16 py-12 md:py-16">
        {/* Hero Section */}
        <div className="text-center mb-20 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10 blur-3xl -z-10"></div>
          
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-primary/10 text-primary rounded-full text-sm font-medium mb-8 animate-fade-in">
            <Globe className="w-4 h-4" />
            Available 24/7 • Quick Response Guaranteed
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold font-headline bg-gradient-to-r from-gray-900 via-primary to-gray-700 dark:from-gray-100 dark:via-primary dark:to-gray-300 bg-clip-text text-transparent mb-6">
            {settings.contactTitle}
          </h1>
          
          <div className="prose prose-xl dark:prose-invert text-muted-foreground max-w-4xl mx-auto">
            <ReactMarkdown>{settings.contactSubtitle || ''}</ReactMarkdown>
          </div>
          
          {/* Quick stats */}
          <div className="flex justify-center gap-8 mt-12 flex-wrap">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">24h</div>
              <div className="text-sm text-muted-foreground">Response Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">99%</div>
              <div className="text-sm text-muted-foreground">Satisfaction Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">10k+</div>
              <div className="text-sm text-muted-foreground">Happy Customers</div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-16">
          {/* Contact Form */}
          <div className="lg:col-span-3">
              <Card className="shadow-2xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
                  <CardHeader className="text-center pb-8">
                      <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-primary/70 flex items-center justify-center">
                          <MessageSquare className="w-5 h-5 text-white" />
                        </div>
                        Send us a Message
                      </CardTitle>
                      <CardDescription className="text-lg text-muted-foreground">
                        We're here to help! Fill out the form below and our team will get back to you shortly.
                      </CardDescription>
                  </CardHeader>
                  <CardContent className="px-8 pb-8">
                      <ContactForm />
                  </CardContent>
              </Card>
          </div>
          
          {/* Contact Information */}
          <div className="lg:col-span-2 space-y-8">
              <div className="sticky top-8">
                <h3 className="text-3xl font-bold mb-8 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-primary/70 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-white" />
                  </div>
                  Get in Touch
                </h3>
                
                <div className="space-y-6">
                    {settings.contactEmail && (
                        <a 
                          href={`mailto:${settings.contactEmail}`} 
                          className="group block transform hover:-translate-y-1 transition-all duration-300"
                        >
                          <div className="flex items-start gap-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-6 hover:border-primary hover:shadow-xl hover:bg-white dark:hover:bg-gray-800 transition-all duration-300 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
                              <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 group-hover:scale-110 transition-transform duration-300">
                                  <Mail className="h-6 w-6 text-white" />
                              </div>
                              <div className="space-y-1">
                                  <h4 className="font-bold text-lg">Email Support</h4>
                                  <p className="text-primary font-medium break-all">{settings.contactEmail}</p>
                                  <p className="text-sm text-muted-foreground">Available 24/7 • Quick response</p>
                              </div>
                          </div>
                        </a>
                    )}
                    
                     {settings.contactPhone && (
                         <a 
                           href={`tel:${settings.contactPhone}`} 
                           className="group block transform hover:-translate-y-1 transition-all duration-300"
                         >
                           <div className="flex items-start gap-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-6 hover:border-primary hover:shadow-xl hover:bg-white dark:hover:bg-gray-800 transition-all duration-300 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
                              <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-green-500 to-green-600 p-4 group-hover:scale-110 transition-transform duration-300">
                                  <Phone className="h-6 w-6 text-white" />
                              </div>
                              <div className="space-y-1">
                                  <h4 className="font-bold text-lg">Phone Support</h4>
                                  <p className="text-primary font-medium">{settings.contactPhone}</p>
                                  <p className="text-sm text-muted-foreground">Mon-Fri 9AM-6PM</p>
                              </div>
                          </div>
                         </a>
                     )}
                     
                     {settings.contactAddress && (
                        <div className="group block transform hover:-translate-y-1 transition-all duration-300">
                          <div className="flex items-start gap-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-6 hover:border-primary hover:shadow-xl hover:bg-white dark:hover:bg-gray-800 transition-all duration-300 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
                              <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-4 group-hover:scale-110 transition-transform duration-300">
                                  <MapPin className="h-6 w-6 text-white" />
                              </div>
                              <div className="space-y-1">
                                  <h4 className="font-bold text-lg">Visit Us</h4>
                                  <p className="text-muted-foreground leading-relaxed">{settings.contactAddress}</p>
                                  <p className="text-sm text-muted-foreground">Office hours: 9AM-5PM</p>
                              </div>
                          </div>
                        </div>
                     )}
                </div>
                
                {/* Additional Info Card */}
                <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
                  <div className="flex items-center gap-3 mb-4">
                    <Clock className="w-5 h-5 text-primary" />
                    <h4 className="font-semibold">Response Times</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium">Within 2-4 hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="font-medium">Immediate</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Complex issues:</span>
                      <span className="font-medium">Within 24 hours</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                   <p className="text-sm text-blue-700 dark:text-blue-300 text-center">
                      💬 You can also reach out to us on our social media channels for quick updates and community support!
                   </p>
                </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}