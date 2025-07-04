

"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { getUserProfile, changeUserSubscription, fetchUserPlanHistory } from "@/lib/user-service";
import { fetchPlans } from "@/lib/plan-service";
import type { User, Plan, UserPlan } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  planId: z.string().min(1, { message: "Please select a plan." }),
});

type FormValues = z.infer<typeof formSchema>;

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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
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
        form.reset({ planId: userData.planId });
      } catch (error) {
        toast({ title: "Error", description: "Failed to load subscription data.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [userId, router, toast, form]);

  async function onSubmit(data: FormValues) {
    if (data.planId === user?.planId) {
        toast({ title: "No Change", description: "User is already on this plan.", variant: "default" });
        return;
    }

    setIsSubmitting(true);
    try {
      await changeUserSubscription(userId, data.planId);
      toast({ title: "Success", description: "User's plan has been updated successfully." });
      router.push("/admin/users");
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast({ title: "Error", description: error.message || "Failed to update user's plan.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-full min-h-[calc(100vh-20rem)]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!user) return null;

  const currentPlan = plans.find(p => p.id === user.planId);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Users
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
             <Avatar className="h-16 w-16"><AvatarImage src={user.photoURL || undefined} alt={user.name || "User"} /><AvatarFallback>{user.name?.charAt(0) || user.email?.charAt(0)}</AvatarFallback></Avatar>
            <div>
                <CardTitle>Manage Subscription</CardTitle>
                <CardDescription>{user.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Change Plan</CardTitle>
          <CardDescription>Assign a new subscription plan to this user. This will create a new entry in their history.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="flex flex-col md:flex-row items-end gap-4">
                    <FormField
                        control={form.control}
                        name="planId"
                        render={({ field }) => (
                        <FormItem className="flex-grow">
                            <FormLabel>New Plan</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                            <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select a plan to assign" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {plans.map((plan) => (<SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>))}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <Button type="submit" disabled={isSubmitting || form.getValues("planId") === user.planId}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Change Plan
                    </Button>
                </div>
            </form>
          </Form>
        </CardContent>
        {currentPlan && (
            <CardFooter className="bg-muted/50 border-t p-4 rounded-b-lg">
                <p className="text-sm text-muted-foreground">Currently on <strong>{currentPlan.name}</strong> plan. {user.planExpiryDate ? `Expires on ${format(new Date(user.planExpiryDate), "PPP")}` : 'No expiration.'}</p>
            </CardFooter>
        )}
      </Card>
      
      <Card>
        <CardHeader><CardTitle>Subscription History</CardTitle><CardDescription>A log of all plans this user has been subscribed to.</CardDescription></CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Subscribed On</TableHead>
                        <TableHead>End Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {planHistory.length > 0 ? (
                    planHistory.map(ph => (
                        <TableRow key={ph.id}>
                            <TableCell className="font-medium">{ph.planName}</TableCell>
                            <TableCell>
                                <Badge variant={ph.status === 'current' ? 'default' : 'secondary'} className={cn(ph.status === 'current' && 'bg-green-600 hover:bg-green-700')}>{ph.status}</Badge>
                            </TableCell>
                            <TableCell>{format(new Date(ph.subscriptionDate), 'PPP')}</TableCell>
                            <TableCell>{ph.endDate ? format(new Date(ph.endDate), 'PPP') : 'N/A'}</TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow><TableCell colSpan={4} className="text-center h-24">No subscription history found.</TableCell></TableRow>
                )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
