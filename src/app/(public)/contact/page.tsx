"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fetchSettings } from "@/lib/settings-service";
import { Mail, Phone, MapPin, Loader2, Send, FileText, AlertCircle, CheckCircle2, Users, MessageSquare, Clock, Globe, ArrowRight, ArrowLeft, X, RefreshCw } from "lucide-react";
import React, { useState, useEffect } from "react";
import * as z from "zod";
import { useForm, FormProvider, useFormContext } from "react-hook-form";
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
import { AnimatePresence, motion } from "framer-motion";

// --- FORM SCHEMA & TYPES ---
const MAX_FILE_SIZE = 1024 * 1024 * 2; // 2 MB
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];

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
    .refine((file) => !file || file.size <= MAX_FILE_SIZE, `File size should be less than 2MB.`)
    .refine((file) => !file || ACCEPTED_FILE_TYPES.includes(file.type), "Only .jpg, .jpeg, .png, .webp and .pdf formats are supported."),
}).refine(data => {
    if (data.topic === 'Payment Confirmation') return !!data.orderId && data.orderId.length > 0;
    return true;
}, { message: "Order ID is required for payment confirmation inquiries.", path: ["orderId"] });

type ContactFormValues = z.infer<typeof contactFormSchema>;

const contactTopics = [
    { value: "General Inquiry", label: "General Inquiry", category: "General", icon: MessageSquare, recommended: "email" },
    { value: "Report a Bug", label: "Report a Bug", category: "Technical", icon: AlertCircle, recommended: "email" },
    { value: "Request a Paper", label: "Request a Paper", category: "Academic", icon: FileText, recommended: "email" },
    { value: "Payment Confirmation", label: "Payment Confirmation", category: "Billing", icon: CheckCircle2, recommended: "email" },
    { value: "Issue with my Account", label: "Account Issues", category: "Account", icon: Users, recommended: "email" },
    { value: "Issue with a Test/Result", label: "Test/Result Issues", category: "Technical", icon: AlertCircle, recommended: "phone" },
    { value: "Issue with Downloading Paper", label: "Download Issues", category: "Technical", icon: AlertCircle, recommended: "phone" },
    { value: "Issue with Generating Test", label: "Test Generation Issues", category: "Technical", icon: AlertCircle, recommended: "phone" },
    { value: "Irrelevant Paper Category", label: "Paper Category Issue", category: "Academic", icon: FileText, recommended: "email" },
    { value: "Feedback & Suggestions", label: "Feedback & Suggestions", category: "General", icon: MessageSquare, recommended: "email" },
    { value: "Other", label: "Other", category: "General", icon: MessageSquare, recommended: "email" }
];

// --- REUSABLE FORM COMPONENTS ---

const StepPersonalInfo = () => {
  const { control } = useFormContext<ContactFormValues>();
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      {user && (
        <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 dark:text-green-300">
            Welcome back, {user.displayName}! Your info is pre-filled.
          </AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <FormField
            control={control}
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
            control={control}
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
  );
};

const StepInquiryDetails = () => {
  const { control, watch } = useFormContext<ContactFormValues>();
  const selectedTopic = watch('topic');
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
              control={control}
              name="topic"
              render={({ field }) => (
                  <FormItem className="space-y-3">
                    <Label className="text-sm font-medium">Topic *</Label>
                    <Select onValueChange={field.onChange} value={field.value}>
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
          <AnimatePresence>
            {selectedTopic === 'Payment Confirmation' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <FormField
                    control={control}
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
              </motion.div>
            )}
          </AnimatePresence>
      </div>
      <FormField
        control={control}
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
  );
};

const StepMessageAndAttachment = () => {
    const { control, watch, setValue } = useFormContext<ContactFormValues>();
    const attachment = watch("attachment");

    const formatBytes = (bytes: number, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
    
    return (
        <div className="space-y-6">
            <FormField
                control={control}
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
                control={control}
                name="attachment"
                render={({ field: { onChange, ...props }}) => (
                    <FormItem>
                        <Label>Attachment (Optional)</Label>
                        {!attachment ? (
                            <FormControl>
                                <div className="relative">
                                  <Input type="file" onChange={(e) => onChange(e.target.files?.[0])} {...props} className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 h-12 bg-white dark:bg-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl transition-all duration-200 hover:border-primary" />
                                  <FileText className="absolute right-3 top-3 w-5 h-5 text-muted-foreground" />
                                </div>
                            </FormControl>
                        ) : (
                           <div className="flex items-center justify-between p-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
                               <div className="flex items-center gap-3 min-w-0">
                                   <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                                   <div className="text-sm font-medium min-w-0">
                                       <p className="truncate">{attachment.name}</p>
                                       <p className="text-xs text-muted-foreground">{formatBytes(attachment.size)}</p>
                                   </div>
                               </div>
                               <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={() => setValue('attachment', undefined, { shouldValidate: true })}>
                                   <X className="h-4 w-4" />
                               </Button>
                           </div>
                        )}
                        <FormDescription className="text-xs">📎 Supported formats: JPG, PNG, WebP, PDF • Max size: 2MB</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    );
};

const SuccessView = ({ onReset }: { onReset: () => void }) => (
    <div className="text-center py-10 flex flex-col items-center justify-center space-y-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1, rotate: 360 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}>
            <CheckCircle2 className="h-24 w-24 text-green-500" />
        </motion.div>
        <div className="space-y-2">
            <h3 className="text-2xl font-bold">Message Sent Successfully!</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">Thank you for reaching out. Our team will review your message and get back to you within 24 hours.</p>
        </div>
        <Button onClick={onReset} className="h-12 text-md font-semibold rounded-xl">
            <RefreshCw className="mr-2 h-4 w-4" />
            Send Another Message
        </Button>
    </div>
);

// --- MAIN CONTACT FORM COMPONENT ---

function ContactForm({ onTopicChange }: { onTopicChange: (topic: string) => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const methods = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { name: "", email: "", subject: "", message: "", topic: "", orderId: "" },
    mode: "onChange"
  });
  
  const { formState: { isSubmitting }, watch, trigger, reset } = methods;
  
  const selectedTopic = watch('topic');
  useEffect(() => { onTopicChange(selectedTopic); }, [selectedTopic, onTopicChange]);
  
  useEffect(() => {
      if (user) {
          methods.setValue("name", user.displayName || "", { shouldValidate: true });
          methods.setValue("email", user.email || "", { shouldValidate: true });
      }
  }, [user, methods]);
  
  const nextStep = async () => {
    const fields: (keyof ContactFormValues)[] = currentStep === 0 ? ['name', 'email'] : ['topic', 'subject', 'orderId'];
    const output = await trigger(fields, { shouldFocus: true });
    if (output) setCurrentStep(prev => prev + 1);
  };
  const prevStep = () => setCurrentStep(prev => prev - 1);
  
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
        setIsSubmitted(true);
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
  
  const handleReset = () => {
      reset({ name: user?.displayName || "", email: user?.email || "", subject: "", message: "", topic: "", orderId: "", attachment: undefined });
      setCurrentStep(0);
      setIsSubmitted(false);
  }

  const steps = [
    { id: 1, name: "Info", component: <StepPersonalInfo /> },
    { id: 2, name: "Details", component: <StepInquiryDetails /> },
    { id: 3, name: "Message", component: <StepMessageAndAttachment /> },
  ];
  
  return (
    <div className="relative">
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
            <AnimatePresence mode="wait">
                {isSubmitted ? (
                    <motion.div key="success" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <SuccessView onReset={handleReset} />
                    </motion.div>
                ) : (
                    <motion.div key="form" className="space-y-8">
                        {/* Animated Progress Bar */}
                        <div className="flex items-center space-x-2">
                            {steps.map((step, index) => (
                                <React.Fragment key={step.id}>
                                    <div className="flex flex-col items-center space-y-2">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${currentStep >= index ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                                            {currentStep > index ? <CheckCircle2 className="w-6 h-6" /> : step.id}
                                        </div>
                                        <p className={`text-xs font-medium ${currentStep >= index ? 'text-primary' : 'text-muted-foreground'}`}>{step.name}</p>
                                    </div>
                                    {index < steps.length - 1 && (
                                        <div className="flex-1 h-1 rounded-full bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
                                            <motion.div className="absolute top-0 left-0 h-full bg-primary" animate={{ width: currentStep > index ? '100%' : '0%' }} transition={{ duration: 0.4, ease: "easeInOut" }} />
                                        </div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>

                        {/* Form Step Content */}
                        <AnimatePresence mode="wait">
                            <motion.div key={currentStep} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                                {steps[currentStep].component}
                            </motion.div>
                        </AnimatePresence>
                        
                        {/* Navigation */}
                        <div className="pt-6 flex items-center gap-4">
                            {currentStep > 0 && <Button type="button" onClick={prevStep} variant="outline" className="h-12 text-md font-semibold rounded-xl"> <ArrowLeft className="mr-2 h-4 w-4" /> Back </Button>}
                            {currentStep < steps.length - 1 ? (
                                <Button type="button" onClick={nextStep} className="w-full h-12 text-md font-semibold rounded-xl"> Next <ArrowRight className="ml-2 h-4 w-4" /> </Button>
                            ) : (
                                <Button type="submit" className="w-full h-14 text-lg font-semibold rounded-xl" disabled={isSubmitting}>
                                  {isSubmitting ? <><Loader2 className="mr-3 h-5 w-5 animate-spin" /> Sending...</> : <><Send className="mr-3 h-5 w-5" /> Send Message</>}
                                </Button>
                            )}
                        </div>
                        <p className="text-center text-xs text-muted-foreground">🔒 Your information is secure with us.</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </form>
      </FormProvider>
    </div>
  );
}

// --- MAIN PAGE COMPONENT ---

export default function ContactPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState("");

  const recommendedMethod = contactTopics.find(t => t.value === selectedTopic)?.recommended;

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

  const ContactInfoCard = ({ href, icon: Icon, title, value, detail, methodType, gradientFrom, gradientTo }: any) => (
      <a href={href} className="group block transform hover:-translate-y-1 transition-all duration-300">
          <motion.div 
              className="flex items-start gap-4 rounded-2xl border-2 p-6 hover:border-primary hover:shadow-xl hover:bg-white dark:hover:bg-gray-800 transition-all duration-300 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800"
              animate={{
                  borderColor: recommendedMethod === methodType ? '#3b82f6' : 'hsl(var(--border))',
                  boxShadow: recommendedMethod === methodType ? '0 0 20px rgba(59, 130, 246, 0.2)' : 'none'
              }}
              transition={{ duration: 0.5 }}
          >
              <div className={`flex-shrink-0 rounded-xl bg-gradient-to-br ${gradientFrom} ${gradientTo} p-4 group-hover:scale-110 transition-transform duration-300`}><Icon className="h-6 w-6 text-white" /></div>
              <div className="space-y-1">
                  <h4 className="font-bold text-lg">{title}</h4>
                  <p className="text-primary font-medium break-all">{value}</p>
                  <p className="text-sm text-muted-foreground">{detail}</p>
              </div>
          </motion.div>
      </a>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-6 py-16">
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
        </div>

        <div className="grid lg:grid-cols-5 gap-16">
          <div className="lg:col-span-3">
              <Card className="shadow-2xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
                  <CardHeader className="p-8">
                      <CardTitle className="text-3xl font-bold flex items-center gap-3">
                        <MessageSquare className="w-8 h-8 text-primary" />
                        Send us a Message
                      </CardTitle>
                      <CardDescription className="text-lg text-muted-foreground pt-2">
                        Fill out our smart form, and we'll get back to you shortly.
                      </CardDescription>
                  </CardHeader>
                  <CardContent className="px-8 pb-8">
                      <ContactForm onTopicChange={setSelectedTopic} />
                  </CardContent>
              </Card>
          </div>
          
          <div className="lg:col-span-2 space-y-8">
              <div className="sticky top-8">
                <h3 className="text-3xl font-bold mb-8">Or, Use a Direct Method</h3>
                <div className="space-y-6">
                    {settings.contactEmail && <ContactInfoCard href={`mailto:${settings.contactEmail}`} icon={Mail} title="Email Support" value={settings.contactEmail} detail="Best for detailed inquiries" methodType="email" gradientFrom="from-blue-500" gradientTo="to-blue-600" />}
                    {settings.contactPhone && <ContactInfoCard href={`tel:${settings.contactPhone}`} icon={Phone} title="Phone Support" value={settings.contactPhone} detail="Best for urgent issues" methodType="phone" gradientFrom="from-green-500" gradientTo="to-green-600" />}
                    {settings.contactAddress && <ContactInfoCard href="#" icon={MapPin} title="Visit Us" value={settings.contactAddress} detail="Office hours: 9AM-5PM" methodType="address" gradientFrom="from-purple-500" gradientTo="to-purple-600" />}
                </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}