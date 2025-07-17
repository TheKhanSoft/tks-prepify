
"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Trash2, Edit, Banknote, Landmark, Wallet, MoreHorizontal, Power } from "lucide-react";
import type { PaymentMethod, PaymentMethodType } from "@/types";
import {
  fetchPaymentMethods,
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
} from "@/lib/payment-method-service";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const paymentMethodSchema = z.object({
  name: z.string().min(3, "Name is required."),
  type: z.enum(['bank', 'easypaisa', 'jazzcash', 'crypto']),
  enabled: z.boolean().default(true),
  details: z.object({
    bankName: z.string().optional(),
    accountTitle: z.string().optional(),
    accountNumber: z.string().optional(),
    iban: z.string().optional(),
    walletAddress: z.string().optional(),
    network: z.string().optional(),
  }),
}).refine(data => {
    if (data.type === 'bank') {
        return data.details.bankName && data.details.accountTitle && data.details.accountNumber;
    }
    if (data.type === 'easypaisa' || data.type === 'jazzcash') {
        return data.details.accountTitle && data.details.accountNumber;
    }
    if (data.type === 'crypto') {
        return data.details.walletAddress && data.details.network;
    }
    return true;
}, {
    message: "Please fill all required details for the selected payment type.",
    path: ["details"],
});

type FormValues = z.infer<typeof paymentMethodSchema>;

const getIconForType = (type: PaymentMethodType) => {
    switch (type) {
        case 'bank': return <Landmark className="h-6 w-6 text-blue-500" />;
        case 'easypaisa': return <Banknote className="h-6 w-6 text-green-500" />;
        case 'jazzcash': return <Banknote className="h-6 w-6 text-red-500" />;
        case 'crypto': return <Wallet className="h-6 w-6 text-amber-500" />;
        default: return <Banknote className="h-6 w-6" />;
    }
};

const MethodCardSkeleton = () => (
    <Card className="flex flex-col">
        <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/4" />
        </CardHeader>
        <CardContent className="space-y-2 flex-grow">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
        </CardContent>
        <CardFooter className="flex justify-between items-center">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-8" />
        </CardFooter>
    </Card>
);

const AddMethodCard = ({ onClick }: { onClick: () => void }) => (
  <Card onClick={onClick} className="flex flex-col items-center justify-center border-2 border-dashed border-muted bg-transparent hover:bg-muted/50 hover:border-primary/50 transition-colors cursor-pointer min-h-[220px]">
    <div className="text-center">
      <PlusCircle className="mx-auto h-10 w-10 text-muted-foreground" />
      <p className="mt-2 text-sm font-semibold text-muted-foreground">Add New Method</p>
    </div>
  </Card>
);


export default function PaymentMethodsPage() {
  const { toast } = useToast();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: {
      enabled: true,
      details: {},
    },
  });
  
  const paymentType = form.watch("type");

  const loadMethods = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPaymentMethods();
      setMethods(data);
    } catch (error) {
      toast({ title: "Error", description: "Could not load payment methods.", variant: "destructive" });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { loadMethods(); }, [loadMethods]);

  const openDialog = (method: PaymentMethod | null = null) => {
    setEditingMethod(method);
    form.reset(method ? {
        name: method.name,
        type: method.type,
        enabled: method.enabled,
        details: method.details
    } : {
      name: "",
      enabled: true,
      details: {},
    });
    setIsDialogOpen(true);
  };

  const handleToggleEnable = async (method: PaymentMethod) => {
    try {
      await updatePaymentMethod(method.id, { enabled: !method.enabled });
      toast({ title: "Success", description: `"${method.name}" has been ${!method.enabled ? 'enabled' : 'disabled'}.` });
      await loadMethods();
    } catch {
      toast({ title: "Error", description: "Could not update status.", variant: "destructive" });
    }
  };
  
  const handleDelete = async (id: string) => {
      try {
          await deletePaymentMethod(id);
          toast({title: "Success", description: "Payment method deleted."});
          await loadMethods();
      } catch {
          toast({title: "Error", description: "Failed to delete method.", variant: "destructive"});
      }
  }

  async function onSubmit(data: FormValues) {
    setIsSaving(true);
    try {
      if (editingMethod) {
        await updatePaymentMethod(editingMethod.id, data);
        toast({ title: "Success", description: "Payment method updated." });
      } else {
        await addPaymentMethod(data);
        toast({ title: "Success", description: "Payment method added." });
      }
      setIsDialogOpen(false);
      await loadMethods();
    } catch (error) {
      toast({ title: "Error", description: "Could not save payment method.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  const renderDetailsForm = () => {
    if (!paymentType) return null;
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(paymentType === 'bank' || paymentType === 'easypaisa' || paymentType === 'jazzcash') && (
                <FormField control={form.control} name="details.accountTitle" render={({ field }) => (<FormItem><FormLabel>Account Title</FormLabel><FormControl><Input {...field} value={field.value || ''}/></FormControl><FormMessage /></FormItem>)} />
            )}
            {(paymentType === 'bank' || paymentType === 'easypaisa' || paymentType === 'jazzcash') && (
                <FormField control={form.control} name="details.accountNumber" render={({ field }) => (<FormItem><FormLabel>Account / Phone Number</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
            )}
            {paymentType === 'bank' && (
                <>
                 <FormField control={form.control} name="details.bankName" render={({ field }) => (<FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input {...field} value={field.value || ''}/></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="details.iban" render={({ field }) => (<FormItem><FormLabel>IBAN (Optional)</FormLabel><FormControl><Input {...field} value={field.value || ''}/></FormControl><FormMessage /></FormItem>)} />
                </>
            )}
             {paymentType === 'crypto' && (
                <>
                 <FormField control={form.control} name="details.walletAddress" render={({ field }) => (<FormItem><FormLabel>Wallet Address</FormLabel><FormControl><Input {...field} value={field.value || ''}/></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="details.network" render={({ field }) => (<FormItem><FormLabel>Network</FormLabel><FormControl><Input placeholder="e.g., BTC, ETH, TRC-20" {...field} value={field.value || ''}/></FormControl><FormMessage /></FormItem>)} />
                </>
            )}
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Methods</h1>
          <p className="text-muted-foreground">Manage payment gateways for plan subscriptions.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AddMethodCard onClick={() => openDialog()} />
        {loading ? (
            Array.from({ length: 3 }).map((_, i) => <MethodCardSkeleton key={i} />)
        ) : (
            methods.map(method => (
                <Card key={method.id} className="flex flex-col">
                    <CardHeader className="flex-grow">
                        <div className="flex justify-between items-start gap-4">
                            <div>
                                <div className="p-3 rounded-full bg-muted w-fit mb-4">{getIconForType(method.type)}</div>
                                <CardTitle className="text-lg">{method.name}</CardTitle>
                                <CardDescription className="capitalize">{method.type}</CardDescription>
                            </div>
                            <Badge variant={method.enabled ? "default" : "secondary"} className={cn(method.enabled && 'bg-green-600 hover:bg-green-700')}>{method.enabled ? "Enabled" : "Disabled"}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-1">
                        {method.details.accountTitle && <p><strong>Title:</strong> {method.details.accountTitle}</p>}
                        {method.details.accountNumber && <p><strong>Number:</strong> {method.details.accountNumber}</p>}
                        {method.details.bankName && <p><strong>Bank:</strong> {method.details.bankName}</p>}
                        {method.details.walletAddress && <p><strong>Address:</strong> <span className="break-all">{method.details.walletAddress}</span></p>}
                        {method.details.network && <p><strong>Network:</strong> {method.details.network}</p>}
                    </CardContent>
                    <CardFooter className="flex justify-between items-center border-t pt-4 mt-4">
                        <Button variant="ghost" size="sm" onClick={() => handleToggleEnable(method)} className="gap-2">
                           <Power className="h-4 w-4" /> {method.enabled ? "Disable" : "Enable"}
                        </Button>
                        <div>
                             <Button variant="ghost" size="icon" onClick={() => openDialog(method)}><Edit className="h-4 w-4"/></Button>
                             <Button variant="ghost" size="icon" onClick={() => handleDelete(method.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
                        </div>
                    </CardFooter>
                </Card>
            ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingMethod ? 'Edit' : 'Add'} Payment Method</DialogTitle>
            <DialogDescription>Fill in the details for the payment gateway.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Display Name</FormLabel><FormControl><Input placeholder="e.g., HBL Bank Transfer" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="bank">Bank Transfer</SelectItem><SelectItem value="easypaisa">EasyPaisa</SelectItem><SelectItem value="jazzcash">JazzCash</SelectItem><SelectItem value="crypto">Crypto</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
              </div>
              
              {renderDetailsForm()}

              <FormField control={form.control} name="enabled" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel>Enabled</FormLabel><FormDescription>If enabled, this method will be shown on the checkout page.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
