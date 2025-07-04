
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
import { getPlanById, updatePlan } from "@/lib/plan-service";
import { Label } from "@/components/ui/label";

const pricingOptionSchema = z.object({
  label: z.string().min(1, "Label is required."),
  price: z.coerce.number().min(0, "Price must be a non-negative number."),
  months: z.coerce.number().int({ message: "Months must be a whole number." }).min(1, "Months must be at least 1."),
  badge: z.string().optional(),
  stripePriceId: z.string().optional(),
});

const planFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  features: z.array(z.object({ value: z.string().min(1, "Feature cannot be empty.") })).min(1, "At least one feature is required."),
  published: z.boolean().default(false),
  popular: z.boolean().default(false),
  pricingOptions: z.array(pricingOptionSchema).min(1, "At least one pricing option is required."),
});

type PlanFormValues = z.infer<typeof planFormSchema>;

export default function EditPlanPage() {
  const router = useRouter();
  const params = useParams();
  const planId = params.planId as string;
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
  });

  useEffect(() => {
    if (!planId) return;
    const loadPlan = async () => {
      setLoading(true);
      try {
        const plan = await getPlanById(planId);
        if (plan) {
          form.reset({
            ...plan,
            features: plan.features.map(f => ({ value: f })),
            pricingOptions: plan.pricingOptions.length > 0 ? plan.pricingOptions : [{ label: 'Monthly', price: 0, months: 1 }],
          });
        } else {
          toast({ title: "Error", description: "Plan not found.", variant: "destructive" });
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

  const { fields: featureFields, append: appendFeature, remove: removeFeature } = useFieldArray({
    control: form.control, name: "features",
  });
  const { fields: pricingFields, append: appendPricing, remove: removePricing } = useFieldArray({
    control: form.control, name: "pricingOptions",
  });

  async function onSubmit(data: PlanFormValues) {
    setIsSubmitting(true);
    try {
      const planData = {
        ...data,
        features: data.features.map(f => f.value),
      };
      await updatePlan(planId, planData);
      toast({ title: "Plan Updated", description: "The plan has been updated successfully." });
      router.push("/admin/plans");
      router.refresh();
    } catch (error) {
      console.error("Error updating plan:", error);
      toast({ title: "Error", description: "Failed to update the plan.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-full min-h-[calc(100vh-20rem)]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  const currentPlanName = form.getValues('name');

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
                    <CardTitle>Edit Plan: {currentPlanName}</CardTitle>
                    <CardDescription>Update the details for this membership plan.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Plan Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <div>
                        <Label>Features</Label>
                        <div className="space-y-4 pt-2">
                        {featureFields.map((field, index) => (
                            <FormField key={field.id} control={form.control} name={`features.${index}.value`} render={({ field }) => (<FormItem><div className="flex items-center gap-2"><FormControl><Input {...field} placeholder={`Feature ${index + 1}`} /></FormControl><Button type="button" variant="ghost" size="icon" onClick={() => removeFeature(index)} disabled={featureFields.length <= 1}><Trash2 className="h-4 w-4" /></Button></div><FormMessage /></FormItem>)}/>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => appendFeature({ value: "" })}><PlusCircle className="mr-2 h-4 w-4" />Add Feature</Button>
                        </div>
                    </div>
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
                <CardHeader><CardTitle>Visibility</CardTitle></CardHeader>
                <CardContent className="flex flex-col gap-6">
                    <FormField control={form.control} name="published" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel>Published</FormLabel><FormDescription>Published plans will be visible on the public pricing page.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                    <FormField control={form.control} name="popular" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel>Highlight as Popular</FormLabel><FormDescription>Mark this entire plan as "popular" to make it stand out.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => router.push('/admin/plans')} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes</Button>
            </div>
        </form>
      </Form>
    </div>
  );
}
