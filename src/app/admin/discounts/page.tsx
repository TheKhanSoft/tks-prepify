
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Trash2, Edit, Percent, Tag, Settings, Calendar as CalendarIcon, ClipboardCopy } from "lucide-react";
import { fetchDiscounts, addDiscount, updateDiscount, deleteDiscount, type Discount } from "@/lib/discount-service";
import { fetchPlans, type Plan } from "@/lib/plan-service";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

const discountFormSchema = z.object({
  name: z.string().min(3, "Name is required."),
  code: z.string().optional(),
  type: z.enum(['percentage', 'flat']),
  value: z.coerce.number().min(0, "Value must be a non-negative number."),
  isActive: z.boolean().default(true),
  
  appliesToAllPlans: z.boolean().default(true),
  applicablePlanIds: z.array(z.string()).optional(),

  appliesToAllDurations: z.boolean().default(true),
  applicableDurations: z.array(z.string()).optional(),

  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
}).refine(data => {
    if (data.type === 'percentage') return data.value <= 100;
    return true;
}, {
    message: "Percentage value cannot exceed 100.",
    path: ["value"],
}).refine(data => {
    if (!data.appliesToAllPlans) return data.applicablePlanIds && data.applicablePlanIds.length > 0;
    return true;
}, {
    message: "Please select at least one plan.",
    path: ["applicablePlanIds"],
}).refine(data => {
    if (!data.appliesToAllDurations) return data.applicableDurations && data.applicableDurations.length > 0;
    return true;
}, {
    message: "Please select at least one duration.",
    path: ["applicableDurations"],
});


type FormValues = z.infer<typeof discountFormSchema>;

export default function DiscountsPage() {
  const { toast } = useToast();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [deletingDiscountId, setDeletingDiscountId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(discountFormSchema),
  });

  const appliesToAllPlans = form.watch("appliesToAllPlans");
  const appliesToAllDurations = form.watch("appliesToAllDurations");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [discountsData, plansData] = await Promise.all([fetchDiscounts(), fetchPlans()]);
      setDiscounts(discountsData);
      setPlans(plansData);
    } catch (error) {
      toast({ title: "Error", description: "Could not load data.", variant: "destructive" });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const openDialog = (discount: Discount | null = null) => {
    setEditingDiscount(discount);
    form.reset(discount ? {
        ...discount,
        startDate: discount.startDate ? new Date(discount.startDate) : null,
        endDate: discount.endDate ? new Date(discount.endDate) : null,
    } : {
      name: "",
      type: "percentage",
      value: 10,
      isActive: true,
      appliesToAllPlans: true,
      applicablePlanIds: [],
      appliesToAllDurations: true,
      applicableDurations: [],
    });
    setIsDialogOpen(true);
  };
  
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({title: "Copied!", description: `Discount code "${code}" copied to clipboard.`});
  }

  async function onSubmit(data: FormValues) {
    setIsSaving(true);
    const payload: Partial<Discount> = {
      ...data,
      applicablePlanIds: data.appliesToAllPlans ? [] : data.applicablePlanIds,
      applicableDurations: data.appliesToAllDurations ? [] : data.applicableDurations,
      startDate: data.startDate?.toISOString(),
      endDate: data.endDate?.toISOString(),
    };
    try {
      if (editingDiscount) {
        await updateDiscount(editingDiscount.id, payload);
        toast({ title: "Success", description: "Discount updated." });
      } else {
        await addDiscount(payload as Omit<Discount, 'id'>);
        toast({ title: "Success", description: "Discount added." });
      }
      setIsDialogOpen(false);
      await loadData();
    } catch (error) {
      toast({ title: "Error", description: "Could not save discount.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }
  
  const handleDelete = async () => {
    if (!deletingDiscountId) return;
    try {
        await deleteDiscount(deletingDiscountId);
        toast({title: "Success", description: "Discount deleted."});
        await loadData();
    } catch {
        toast({title: "Error", description: "Failed to delete discount.", variant: "destructive"});
    } finally {
        setIsDeleteAlertOpen(false);
        setDeletingDiscountId(null);
    }
  }
  
  const confirmDelete = (id: string) => {
    setDeletingDiscountId(id);
    setIsDeleteAlertOpen(true);
  }

  const uniqueDurations = useMemo(() => {
    const allDurations = new Set<string>();
    plans.forEach(plan => {
        plan.pricingOptions.forEach(opt => {
            allDurations.add(opt.label);
        });
    });
    return Array.from(allDurations);
  }, [plans]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Discounts & Offers</h1>
          <p className="text-muted-foreground">Manage coupon codes and automatic discounts for your plans.</p>
        </div>
        <Button onClick={() => openDialog()}><PlusCircle className="mr-2 h-4 w-4" /> Add Discount</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Active Discounts</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
             Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full mb-4" />)
          ) : discounts.length > 0 ? (
            <div className="space-y-4">
              {discounts.map(d => (
                <Card key={d.id} className={cn(!d.isActive && "bg-muted/50")}>
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                             <div className="p-3 rounded-full bg-primary/10 w-fit">
                                {d.code ? <Tag className="h-6 w-6 text-primary" /> : <Percent className="h-6 w-6 text-primary" />}
                            </div>
                            <div>
                                <h3 className="font-semibold">{d.name}</h3>
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                     <Badge variant={d.type === 'percentage' ? "default" : "secondary"}>
                                       {d.type === 'percentage' ? `${d.value}% OFF` : `PKR ${d.value} OFF`}
                                    </Badge>
                                    {d.code ? (
                                        <Badge variant="outline" className="cursor-pointer group" onClick={() => copyCode(d.code!)}>
                                            {d.code} <ClipboardCopy className="h-3 w-3 ml-2 text-muted-foreground group-hover:text-primary"/>
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline">Automatic</Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="text-sm text-muted-foreground text-right hidden md:block">
                                <p><strong>Applies to:</strong> {d.appliesToAllPlans ? 'All Plans' : `${d.applicablePlanIds?.length || 0} Plan(s)`}</p>
                                {d.endDate && <p><strong>Expires:</strong> {format(new Date(d.endDate), "MMM dd, yyyy")}</p>}
                            </div>
                            <Switch checked={d.isActive} onCheckedChange={(val) => updateDiscount(d.id, {isActive: val}).then(loadData)} aria-label="Toggle discount status" />
                            <div>
                                <Button variant="ghost" size="icon" onClick={() => openDialog(d)}><Edit className="h-4 w-4"/></Button>
                                <Button variant="ghost" size="icon" onClick={() => confirmDelete(d.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
              ))}
            </div>
          ) : (
             <div className="text-center py-16 text-muted-foreground">No discounts have been created yet.</div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingDiscount ? 'Edit' : 'Add'} Discount</DialogTitle>
            <DialogDescription>Fill in the details for the discount or offer.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="e.g., Summer Sale" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="code" render={({ field }) => (<FormItem><FormLabel>Discount Code (Optional)</FormLabel><FormControl><Input placeholder="e.g., SUMMER24" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="percentage">Percentage</SelectItem><SelectItem value="flat">Flat Amount</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="value" render={({ field }) => (<FormItem><FormLabel>Value</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField control={form.control} name="startDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Start Date (Optional)</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="endDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>End Date (Optional)</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
              </div>

              <div className="space-y-4">
                 <FormField control={form.control} name="appliesToAllPlans" render={({ field }) => (<FormItem className="flex flex-row items-center space-x-3 space-y-0 p-3 rounded-md border bg-muted/50"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Apply to all plans</FormLabel></FormItem>)} />
                    
                  {!appliesToAllPlans && (
                     <FormField
                        control={form.control}
                        name="applicablePlanIds"
                        render={() => (
                          <FormItem>
                            <FormLabel>Select Plans</FormLabel>
                            <div className="max-h-40 overflow-y-auto space-y-2 rounded-md border p-4">
                              {plans.map((plan) => (
                                <FormField
                                  key={plan.id}
                                  control={form.control}
                                  name="applicablePlanIds"
                                  render={({ field }) => (
                                    <FormItem key={plan.id} className="flex flex-row items-start space-x-3 space-y-0">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(plan.id)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...(field.value || []), plan.id])
                                              : field.onChange(field.value?.filter((value) => value !== plan.id));
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">{plan.name}</FormLabel>
                                    </FormItem>
                                  )}
                                />
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                  )}
              </div>
              
               <div className="space-y-4">
                  <FormField control={form.control} name="appliesToAllDurations" render={({ field }) => (<FormItem className="flex flex-row items-center space-x-3 space-y-0 p-3 rounded-md border bg-muted/50"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Apply to all plan durations</FormLabel></FormItem>)} />

                   {!appliesToAllDurations && (
                     <FormField
                        control={form.control}
                        name="applicableDurations"
                        render={() => (
                          <FormItem>
                            <FormLabel>Select Durations</FormLabel>
                            <div className="max-h-40 overflow-y-auto space-y-2 rounded-md border p-4">
                              {uniqueDurations.map((duration) => (
                                <FormField
                                  key={duration}
                                  control={form.control}
                                  name="applicableDurations"
                                  render={({ field }) => (
                                    <FormItem key={duration} className="flex flex-row items-start space-x-3 space-y-0">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(duration)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...(field.value || []), duration])
                                              : field.onChange(field.value?.filter((value) => value !== duration));
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">{duration}</FormLabel>
                                    </FormItem>
                                  )}
                                />
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                  )}
               </div>

              <FormField control={form.control} name="isActive" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel>Active</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
       <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete the discount.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
