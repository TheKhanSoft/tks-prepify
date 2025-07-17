
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
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Trash2, Edit } from "lucide-react";
import type { PaymentMethod, PaymentMethodType } from "@/types";
import {
  fetchPaymentMethods,
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
} from "@/lib/payment-method-service";
import { Badge } from "@/components/ui/badge";

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

  useEffect(() => {
    loadMethods();
  }, [loadMethods]);

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

  const renderDetails = () => {
    if (!paymentType) return null;
    return (
        <>
            {(paymentType === 'bank' || paymentType === 'easypaisa' || paymentType === 'jazzcash') && (
                <FormField control={form.control} name="details.accountTitle" render={({ field }) => (<FormItem><FormLabel>Account Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            )}
            {(paymentType === 'bank' || paymentType === 'easypaisa' || paymentType === 'jazzcash') && (
                <FormField control={form.control} name="details.accountNumber" render={({ field }) => (<FormItem><FormLabel>Account / Phone Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            )}
            {paymentType === 'bank' && (
                <>
                 <FormField control={form.control} name="details.bankName" render={({ field }) => (<FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="details.iban" render={({ field }) => (<FormItem><FormLabel>IBAN (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                </>
            )}
             {paymentType === 'crypto' && (
                <>
                 <FormField control={form.control} name="details.walletAddress" render={({ field }) => (<FormItem><FormLabel>Wallet Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="details.network" render={({ field }) => (<FormItem><FormLabel>Network</FormLabel><FormControl><Input placeholder="e.g., BTC, ETH, TRC-20" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </>
            )}
        </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Methods</h1>
          <p className="text-muted-foreground">Manage payment gateways for plan subscriptions.</p>
        </div>
        <Button onClick={() => openDialog()}><PlusCircle className="mr-2 h-4 w-4"/>Add New Method</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="flex justify-center items-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {methods.length > 0 ? (
                  methods.map(method => (
                    <TableRow key={method.id}>
                      <TableCell className="font-semibold">{method.name}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{method.type}</Badge></TableCell>
                      <TableCell>
                        <Switch checked={method.enabled} onCheckedChange={() => handleToggleEnable(method)} />
                      </TableCell>
                      <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openDialog(method)}><Edit className="h-4 w-4"/></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(method.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">No payment methods found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMethod ? 'Edit' : 'Add'} Payment Method</DialogTitle>
            <DialogDescription>Fill in the details for the payment gateway.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Display Name</FormLabel><FormControl><Input placeholder="e.g., HBL Bank Transfer" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="bank">Bank Transfer</SelectItem><SelectItem value="easypaisa">EasyPaisa</SelectItem><SelectItem value="jazzcash">JazzCash</SelectItem><SelectItem value="crypto">Crypto</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
              
              {renderDetails()}

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
