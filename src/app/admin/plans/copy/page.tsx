
"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, PlusCircle, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { getPlanById, addPlan } from "@/lib/plan-service";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Plan } from "@/types";
import { QuotaKeys, QuotaPeriods } from "@/lib/plan-data";

const pricingOptionSchema = z.object({
  label: z.string().min(1, "Label is required."),
  price: z.coerce.number().min(0, "Price must be a non-negative number."),
  months: z.coerce.number().int({ message: "Months must be a whole number." }).min(1, "Months must be at least 1."),
  badge: z.string().optional(),
  stripePriceId: z.string().optional(),
});

const planQuotaSchema = z.object({
  key: z.string().min(1, "Key is required."),
  limit: z.coerce.number(),
  period: z.enum(['daily', 'monthly', 'yearly', 'lifetime']),
});

const planFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  features: z.array(z.object({ text: z.string().min(1, "Feature text cannot be empty.") })),
  quotas: z.array(planQuotaSchema),
  isAdSupported: z.boolean().default(false),
  published: z.boolean().default(false),
  popular: z.boolean().default(false),
  pricingOptions: z.array(pricingOptionSchema).min(1, "At least one pricing option is required."),
});

type PlanFormValues = z.infer<typeof planFormSchema>;

export default function CopyPlanPage() {
  const router = useRouter();
  const params = useParams();
  const planId = params.planId as string;
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sourcePlanName, setSourcePlanName] = useState('');

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
  });
  
  const { fields: featureFields, append: appendFeature, remove: removeFeature } = useFieldArray({
    control: form.control, name: "features",
  });
  const { fields: quotaFields, append: appendQuota, remove: removeQuota } = useFieldArray({
    control: form.control, name: "quotas",
  });
  const { fields: pricingFields, append: appendPricing, remove: removePricing } = useFieldArray({
    control: form.control, name: "pricingOptions",
  });

  useEffect(() => {
    if (!planId) return;
    const loadPlan = async () => {
      setLoading(true);
      try {
        const plan = await getPlanById(planId);
        if (plan) {
            setSourcePlanName(plan.name);
            const formattedFeatures = plan.features?.map(f => ({ text: f })) || [];
            
            form.reset({
                ...plan,
                name: `Copy of ${plan.name}`,
                features: formattedFeatures,
                published: false,
                popular: false,
                pricingOptions: plan.pricingOptions.length > 0 ? plan.pricingOptions : [{ label: 'Monthly', price: 0, months: 1 }],
            });
        } else {
          toast({ title: "Error", description: "Source plan not found.", variant: "destructive" });
          router.push('/admin/plans');
        }
      } catch (error) {
        toast({ title: "Error", description: "Failed to load plan data.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    loadPlan();
  }, [planId, form, router, toast]);

  async function onSubmit(data: PlanFormValues) {
    setIsSubmitting(true);
    try {
      const planData = {
        ...data,
        features: data.features.map(f => f.text), // Convert back to simple string array
      };
      await addPlan(planData);
      toast({ title: "Plan Copied", description: "The new plan has been created successfully." });
      router.push("/admin/plans");
      router.refresh();
    } catch (error) {
      console.error("Error copying plan:", error);
      toast({ title: "Error", description: "Failed to copy the plan.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-full min-h-[calc(100vh-20rem)]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  return (
    <div className="space-y-6">
      <div>
        <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Plans
        </Button>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Copy Plan: {sourcePlanName}</CardTitle>
                    <CardDescription>Create a new plan based on an existing one.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>New Plan Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Plan Features</CardTitle><CardDescription>Add descriptive features that will be shown as a bulleted list on the pricing page.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                  {featureFields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-2">
                        <FormField control={form.control} name={`features.${index}.text`} render={({ field }) => (<FormItem className="flex-grow"><FormLabel>Feature Text</FormLabel><FormControl><Input {...field} placeholder="e.g., Priority customer support" /></FormControl><FormMessage /></FormItem>)} />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeFeature(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => appendFeature({ text: "" })}><PlusCircle className="mr-2 h-4 w-4" />Add Feature</Button>
                  <FormMessage>{form.formState.errors.features?.message}</FormMessage>
              </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Usage Quotas</CardTitle><CardDescription>Define specific, measurable limits for features. These will be displayed separately from the main feature list.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                    {quotaFields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-4 items-end p-4 border rounded-lg">
                           <FormField control={form.control} name={`quotas.${index}.key`} render={({ field }) => (<FormItem><FormLabel>Feature</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select feature" /></SelectTrigger></FormControl><SelectContent>{QuotaKeys.map(k => <SelectItem key={k.key} value={k.key}>{k.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                           <FormField control={form.control} name={`quotas.${index}.limit`} render={({ field }) => (<FormItem><FormLabel>Limit</FormLabel><FormControl><Input type="number" {...field} placeholder="e.g., 50" /></FormControl><FormMessage /></FormItem>)} />
                           <FormField control={form.control} name={`quotas.${index}.period`} render={({ field }) => (<FormItem><FormLabel>Period</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select period" /></SelectTrigger></FormControl><SelectContent>{QuotaPeriods.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                           <Button type="button" variant="ghost" size="icon" onClick={() => removeQuota(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => appendQuota({ key: "downloads", limit: 10, period: "daily" })}><PlusCircle className="mr-2 h-4 w-4" />Add Quota</Button>
                    <FormDescription>Use -1 as the limit for unlimited access.</FormDescription>
                    <FormMessage>{form.formState.errors.quotas?.message}</FormMessage>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader><CardTitle>Pricing Options</CardTitle><CardDescription>Add one or more billing options for this plan.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                    {pricingFields.map((field, index) => (
                        <div key={field.id} className="p-4 border rounded-lg space-y-4 relative">
                            <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:text-destructive" onClick={() => removePricing(index)} disabled={pricingFields.length <= 1}><Trash2 className="h-4 w-4" /></Button>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField control={form.control} name={`pricingOptions.${index}.label`} render={({ field }) => (<FormItem><FormLabel>Label</FormLabel><FormControl><Input placeholder="e.g., Monthly" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`pricingOptions.${index}.price`} render={({ field }) => (<FormItem><FormLabel>Price</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`pricingOptions.${index}.months`} render={({ field }) => (<FormItem><FormLabel>Duration (Months)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name={`pricingOptions.${index}.badge`} render={({ field }) => (<FormItem><FormLabel>Badge (Optional)</FormLabel><FormControl><Input placeholder="e.g., Save 20%" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`pricingOptions.${index}.stripePriceId`} render={({ field }) => (<FormItem><FormLabel>Stripe Price ID (Optional)</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => appendPricing({ label: 'Yearly', price: 100, months: 12, badge: "", stripePriceId: "" })}><PlusCircle className="mr-2 h-4 w-4" />Add Pricing Option</Button>
                    <FormMessage>{form.formState.errors.pricingOptions?.message}</FormMessage>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader><CardTitle>Visibility & Behavior</CardTitle></CardHeader>
                <CardContent className="flex flex-col gap-6">
                    <FormField control={form.control} name="isAdSupported" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel>Ad-Supported</FormLabel><FormDescription>This plan will display advertisements to the user.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                    <FormField control={form.control} name="published" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel>Published</FormLabel><FormDescription>Published plans will be visible on the public pricing page.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                    <FormField control={form.control} name="popular" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel>Highlight as Popular</FormLabel><FormDescription>Mark this entire plan as "popular" to make it stand out.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => router.push('/admin/plans')} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Copy</Button>
            </div>
        </form>
      </Form>
    </div>
  );
}
