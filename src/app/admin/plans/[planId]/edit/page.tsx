
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, PlusCircle, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { getPlanById, updatePlan } from "@/lib/plan-service";
import type { Plan } from "@/types";

const planFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  price: z.coerce.number().min(0, "Price cannot be negative."),
  interval: z.enum(["month", "year"], { required_error: "You must select a billing interval." }),
  features: z.array(z.object({ value: z.string().min(1, "Feature cannot be empty.") })).min(1, "At least one feature is required."),
  published: z.boolean().default(false),
  popular: z.boolean().default(false),
  stripePriceId: z.string().optional(),
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

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "features",
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>Price</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="interval" render={({ field }) => (<FormItem><FormLabel>Billing Interval</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select an interval" /></SelectTrigger></FormControl><SelectContent><SelectItem value="month">Monthly</SelectItem><SelectItem value="year">Yearly</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
              </div>
              <div>
                <Label>Features</Label>
                <div className="space-y-4 pt-2">
                  {fields.map((field, index) => (
                    <FormField key={field.id} control={form.control} name={`features.${index}.value`} render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-2">
                          <FormControl><Input {...field} placeholder={`Feature ${index + 1}`} /></FormControl>
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}/>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ value: "" })}><PlusCircle className="mr-2 h-4 w-4" />Add Feature</Button>
                </div>
              </div>
              <FormField control={form.control} name="stripePriceId" render={({ field }) => (<FormItem><FormLabel>Stripe Price ID (Optional)</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormDescription>For payment integration. You can add this later.</FormDescription><FormMessage /></FormItem>)} />
              <div className="flex flex-col gap-6 pt-4 border-t">
                  <FormField control={form.control} name="published" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel>Published</FormLabel><FormDescription>Published plans will be visible on the public pricing page.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                  <FormField control={form.control} name="popular" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel>Popular</FormLabel><FormDescription>Mark this plan as "popular" to highlight it.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
              </div>
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
