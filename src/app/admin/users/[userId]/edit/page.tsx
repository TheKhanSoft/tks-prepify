
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getUserProfile, updateUserPlan } from "@/lib/user-service";
import { fetchPlans } from "@/lib/plan-service";
import type { User, Plan } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const formSchema = z.object({
  planId: z.string().min(1, { message: "Please select a plan." }),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const { toast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
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
        const [userData, plansData] = await Promise.all([
          getUserProfile(userId),
          fetchPlans(),
        ]);

        if (!userData) {
          toast({ title: "Error", description: "User not found.", variant: "destructive" });
          router.push("/admin/users");
          return;
        }

        setUser(userData);
        setPlans(plansData);
        form.reset({ planId: userData.planId });
      } catch (error) {
        toast({ title: "Error", description: "Failed to load data.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [userId, router, toast, form]);

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    try {
      await updateUserPlan(userId, data.planId);
      toast({ title: "Success", description: "User's plan has been updated." });
      router.push("/admin/users");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to update user's plan.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[calc(100vh-20rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Users
        </Button>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
             <Avatar className="h-16 w-16">
                <AvatarImage src={user.photoURL || undefined} alt={user.name || "User"} data-ai-hint="user avatar" />
                <AvatarFallback>{user.name?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
                <CardTitle>{user.name || "Unnamed User"}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="planId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Membership Plan</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a plan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {plans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Change the user's current membership plan.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
