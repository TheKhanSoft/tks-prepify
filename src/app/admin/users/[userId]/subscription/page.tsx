
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, RefreshCw, Edit, CalendarIcon } from "lucide-react";
import { getUserProfile, changeUserSubscription, fetchUserPlanHistory, updateUserPlanHistoryRecord } from "@/lib/user-service";
import { fetchPlans } from "@/lib/plan-service";
import type { User, Plan, UserPlan, UserPlanStatus } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";

const changePlanFormSchema = z.object({
  planId: z.string().min(1, { message: "Please select a plan." }),
  endDate: z.date().optional().nullable(),
  remarks: z.string().optional(),
});

const editHistoryFormSchema = z.object({
  endDate: z.date().optional().nullable(),
  status: z.enum(['current', 'expired', 'cancelled']),
  remarks: z.string().optional(),
});

type ChangePlanFormValues = z.infer<typeof changePlanFormSchema>;
type EditHistoryFormValues = z.infer<typeof editHistoryFormSchema>;

export default function ManageSubscriptionPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const { toast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planHistory, setPlanHistory] = useState<UserPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingHistoryRecord, setEditingHistoryRecord] = useState<UserPlan | null>(null);

  const changePlanForm = useForm<ChangePlanFormValues>({
    resolver: zodResolver(changePlanFormSchema),
  });

  const editHistoryForm = useForm<EditHistoryFormValues>({
    resolver: zodResolver(editHistoryFormSchema),
  });

  const loadData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [userData, plansData, historyData] = await Promise.all([
        getUserProfile(userId),
        fetchPlans(),
        fetchUserPlanHistory(userId),
      ]);

      if (!userData) {
        toast({ title: "Error", description: "User not found.", variant: "destructive" });
        router.push("/admin/users");
        return;
      }

      setUser(userData);
      setPlans(plansData);
      setPlanHistory(historyData);
      changePlanForm.reset({ planId: userData.planId, remarks: "", endDate: null });
    } catch (error) {
      toast({ title: "Error", description: "Failed to load subscription data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function onPlanChangeSubmit(data: ChangePlanFormValues) {
    if (data.planId === user?.planId) {
        toast({ title: "No Change", description: "User is already on this plan.", variant: "default" });
        return;
    }
    setIsSubmitting(true);
    try {
      await changeUserSubscription(userId, data.planId, {
        endDate: data.endDate,
        remarks: data.remarks
      });
      toast({ title: "Success", description: "User's plan has been updated successfully." });
      await loadData(); // Reload data to show updated history
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update user's plan.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onEditHistorySubmit(data: EditHistoryFormValues) {
    if (!editingHistoryRecord) return;
    setIsEditing(true);
    try {
        await updateUserPlanHistoryRecord(editingHistoryRecord.id, {
            status: data.status,
            endDate: data.endDate,
            remarks: data.remarks,
        });
        toast({ title: "Success", description: "Subscription record has been updated." });
        setEditingHistoryRecord(null);
        await loadData();
    } catch (error: any) {
        toast({ title: "Error", description: "Failed to update record.", variant: "destructive"});
    } finally {
        setIsEditing(false);
    }
  }

  const handleEditClick = (record: UserPlan) => {
    setEditingHistoryRecord(record);
    editHistoryForm.reset({
        status: record.status as 'current' | 'expired' | 'cancelled',
        endDate: record.endDate ? new Date(record.endDate) : null,
        remarks: record.remarks || '',
    });
  }

  if (loading) {
    return <div className="flex justify-center items-center h-full min-h-[calc(100vh-20rem)]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!user) return null;

  const currentPlan = plans.find(p => p.id === user.planId);

  return (
    <div className="space-y-6 max-w-4xl">
      <div><Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}><ArrowLeft className="mr-2 h-4 w-4" />Back to Users</Button></div>
      <Card><CardHeader><div className="flex items-center gap-4"><Avatar className="h-16 w-16"><AvatarImage src={user.photoURL || undefined} alt={user.name || "User"} data-ai-hint="user avatar" /><AvatarFallback>{user.name?.charAt(0) || user.email?.charAt(0)}</AvatarFallback></Avatar><div><CardTitle>Manage Subscription</CardTitle><CardDescription>{user.email}</CardDescription></div></div></CardHeader></Card>
      
      <Card>
        <CardHeader><CardTitle>Change Plan</CardTitle><CardDescription>Assign a new subscription plan to this user. This will automatically migrate the current plan and create a new history record.</CardDescription></CardHeader>
        <CardContent>
          <Form {...changePlanForm}>
            <form onSubmit={changePlanForm.handleSubmit(onPlanChangeSubmit)} className="space-y-4">
              <FormField control={changePlanForm.control} name="planId" render={({ field }) => (<FormItem><FormLabel>New Plan</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}><FormControl><SelectTrigger><SelectValue placeholder="Select a plan to assign" /></SelectTrigger></FormControl><SelectContent>{plans.map((plan) => (<SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={changePlanForm.control} name="endDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Expiry Date (Optional)</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} disabled={(date) => date < new Date()} initialFocus /></PopoverContent></Popover><FormDescription>Leave blank for automatic duration based on the plan, or no expiry for free plans.</FormDescription><FormMessage /></FormItem>)} />
              <FormField control={changePlanForm.control} name="remarks" render={({ field }) => (<FormItem><FormLabel>Remarks (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., promotional offer, manual extension" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting || changePlanForm.getValues("planId") === user.planId}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Change Plan</Button>
              </div>
            </form>
          </Form>
        </CardContent>
        {currentPlan && (<CardFooter className="bg-muted/50 border-t p-4 rounded-b-lg"><p className="text-sm text-muted-foreground">Currently on <strong>{currentPlan.name}</strong> plan. {user.planExpiryDate ? `Expires on ${format(new Date(user.planExpiryDate), "PPP")}` : 'No expiration.'}</p></CardFooter>)}
      </Card>
      
      <Card>
        <CardHeader><CardTitle>Subscription History</CardTitle><CardDescription>A log of all plans this user has been subscribed to.</CardDescription></CardHeader>
        <CardContent>
            <Table>
                <TableHeader><TableRow><TableHead>Plan</TableHead><TableHead>Status</TableHead><TableHead>Subscribed On</TableHead><TableHead>End Date</TableHead><TableHead>Remarks</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                {planHistory.length > 0 ? (
                    planHistory.map(ph => (<TableRow key={ph.id}><TableCell className="font-medium">{ph.planName}</TableCell><TableCell><Badge variant={ph.status === 'current' ? 'default' : 'secondary'} className={cn(ph.status === 'current' && 'bg-green-600 hover:bg-green-700')}>{ph.status}</Badge></TableCell><TableCell>{format(new Date(ph.subscriptionDate), 'PPP')}</TableCell><TableCell>{ph.endDate ? format(new Date(ph.endDate), 'PPP') : 'N/A'}</TableCell><TableCell className="truncate max-w-xs">{ph.remarks}</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => handleEditClick(ph)}><Edit className="mr-2 h-4 w-4" /> Edit</Button></TableCell></TableRow>))
                ) : (
                    <TableRow><TableCell colSpan={6} className="text-center h-24">No subscription history found.</TableCell></TableRow>
                )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
      <Dialog open={!!editingHistoryRecord} onOpenChange={(open) => !open && setEditingHistoryRecord(null)}>
        <DialogContent>
            <DialogHeader><DialogTitle>Edit Subscription Record</DialogTitle><DialogDescription>Modify the details for the "{editingHistoryRecord?.planName}" plan subscription.</DialogDescription></DialogHeader>
             <Form {...editHistoryForm}>
                <form id="edit-history-form" onSubmit={editHistoryForm.handleSubmit(onEditHistorySubmit)} className="space-y-6 py-4">
                     <FormField control={editHistoryForm.control} name="status" render={({ field }) => (<FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger></FormControl><SelectContent><SelectItem value="current">Current</SelectItem><SelectItem value="expired">Expired</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                     <FormField control={editHistoryForm.control} name="endDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>End Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                     <FormField control={editHistoryForm.control} name="remarks" render={({ field }) => (<FormItem><FormLabel>Remarks</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                </form>
            </Form>
            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit" form="edit-history-form" disabled={isEditing}>{isEditing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save Changes</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
