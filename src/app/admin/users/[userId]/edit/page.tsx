"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Shield, CreditCard, Calendar, Crown, User as UserIcon, Activity, Check, X } from "lucide-react";
import { getUserProfile, updateUserProfileInFirestore } from "@/lib/user-service";
import type { User } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { fetchPlans } from "@/lib/plan-service";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
});

type FormValues = z.infer<typeof formSchema>;

const FREE_PLAN_ID = '3yc4DTybVHbkeMsnJnv4';

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const { toast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<string[]>(["Admin", "Moderator", "Premium", "User"]);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [plans, setPlans] = useState<Plan[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    const loadData = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const [userData, fetchedPlans] = await Promise.all([
          getUserProfile(userId),
          fetchPlans()
        ]);

        if (!userData) {
          toast({ title: "Error", description: "User not found.", variant: "destructive" });
          router.push("/admin/users");
          return;
        }

        setUser(userData);
        setPlans(fetchedPlans);
        setSelectedRole(userData.role || "User"); // Assuming 'role' is a string now
        form.reset({ name: userData.name || "" });
      } catch (error) {
        toast({ title: "Error", description: "Failed to load user data.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [userId, router, toast, form]);

  const plansMap = useMemo(() => new Map(plans.map(p => [p.id, p.name])), [plans]);

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    try {
      await updateUserProfileInFirestore(userId, { name: data.name });
      toast({ title: "Success", description: "User's name has been updated." });
      router.push("/admin/users");
      router.refresh();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update user's name.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getSubscriptionStatus = (subscription: any) => {
    if (!subscription) return "No subscription";
    if (subscription.status === "active") return "Active";
    if (subscription.status === "canceled") return "Canceled";
    if (subscription.status === "past_due") return "Past Due";
    return "Unknown";
  };

  const subscriptionDetails = useMemo(() => {
    if (!user) return null;
    const hasActivePlan = (user.planId && user.planExpiryDate && new Date(user.planExpiryDate) > new Date()) || (user.planId && user.planId !== FREE_PLAN_ID && user.planExpiryDate === null);
    const isExpired = user.planExpiryDate && new Date(user.planExpiryDate) < new Date();
    const planName = plansMap.get(user.planId) || "No Plan";
    const subscriptionDate = plansMap.get(user.planId) || "No Plan";
    const endDate = plansMap.get(user.planId) || "No Plan";
    
    let statusText: "Active" | "Expired" | "Free Tier" = "Free Tier";
    if (hasActivePlan) statusText = "Active";
    if (isExpired) statusText = "Expired";

    return { hasActivePlan, isExpired, planName, subscriptionDate, endDate, statusText };
  }, [user, plansMap]);

  const getSubscriptionVariant = (status: string) => {
    switch (status) {
      case "Active": return "default";
      case "Canceled": return "destructive";
      case "Past Due": return "secondary";
      default: return "outline";
    }
  };

  const getRoleVariant = (role: string) => {
    switch (role?.toLowerCase()) {
      case "super admin": return "destructive";
      case "admin": return "destructive";
      case "moderator": return "secondary";
      case "premium": return "default";
      default: return "outline";
    }
  };

  const saveUserRole = async () => {
    if (!user) return;

    if (selectedRole === "Super Admin" && user.role !== "Super Admin") {
      toast({ title: "Error", description: "You are unauthorized to perform this action.", variant: "destructive" });
      return;
    }
    
    try {
      setIsSubmitting(true);
      await updateUserProfileInFirestore(userId, { role: selectedRole });
      setUser({ ...user, role: selectedRole });
      toast({ title: "Success", description: "User role updated successfully." });
      setIsEditingRole(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to update user role.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAccountStatus = async () => {
    if (!user) return;
    
    try {
      setIsSubmitting(true);
      const newStatus = !user.isActive;
      await updateUserProfileInFirestore(userId, { isActive: newStatus });
      setUser({ ...user, isActive: newStatus });
      toast({ 
        title: "Success", 
        description: `Account ${newStatus ? "activated" : "suspended"} successfully.` 
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update account status.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[calc(100vh-20rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Users
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left side - Edit Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user.photoURL || undefined} alt={user.name || "User"} data-ai-hint="user avatar" />
                  <AvatarFallback>{user.name?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>Edit User</CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" defaultValue={user.email || ''} disabled />
                    </FormControl>
                    <FormDescription>
                      Changing a user's email requires a secure server environment and is not enabled in this admin panel.
                    </FormDescription>
                  </FormItem>
                  
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" disabled />
                    </FormControl>
                    <FormDescription>
                      Changing a user's password requires a secure server environment and is not enabled in this admin panel.
                    </FormDescription>
                  </FormItem>

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

        {/* Right side - User Details */}
        <div className="space-y-6">
          {/* User Role Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  User Role
                </CardTitle>
                {isEditingRole ? (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsEditingRole(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={saveUserRole}
                      disabled={isSubmitting}
                    >
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save
                    </Button>
                  </div>
                ) : user.role !== "Super Admin" && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsEditingRole(true)}
                    >
                      Edit Role
                    </Button>
                  
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isEditingRole ? (
                 <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableRoles.map(role => (
                            <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              ) : (
                <div className="flex flex-wrap gap-2">
                    <Badge variant={getRoleVariant(user.role)} className="capitalize">
                      {user.role || "User"}
                    </Badge>
                </div>
              )}
              <div className="text-sm text-muted-foreground mt-4 space-y-1">
                <p><strong>Account Created:</strong> {formatDate(user.createdAt, "PPP")}</p>
                <p><strong>Last Active:</strong> {formatDate(user.lastLoginAt)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Details Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscription Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                <Badge variant={subscriptionDetails.hasActivePlan ? 'default' : subscriptionDetails.isExpired ? 'destructive' : 'secondary'}>
                  {subscriptionDetails.statusText}
                </Badge>
              </div>

              {subscriptionDetails ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Plan:</span>
                    <div className="flex items-center gap-1">
                    {subscriptionDetails?.planName?.includes("Premium") && (
                      <Crown className="h-4 w-4 text-yellow-500" />
                    )}
                      <span className="text-sm capitalize">{subscriptionDetails.planName || "N/A"}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Started:</span>
                    <span className="text-sm">{formatDate(subscriptionDetails.subscriptionDate)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Next Billing:</span>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{formatDate(subscriptionDetails.endDate)}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Manage Subscription" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="upgrade">Upgrade Plan</SelectItem>
                        <SelectItem value="downgrade">Downgrade Plan</SelectItem>
                        <SelectItem value="cancel">Cancel Subscription</SelectItem>
                        <SelectItem value="reactivate">Reactivate Subscription</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 space-y-2">
                  <p className="text-sm text-muted-foreground">No active subscription</p>
                  <p className="text-xs text-muted-foreground">User is on the free plan</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Assign Subscription
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Statistics Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Account Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Sessions:</span>
                  <span className="text-sm">{user.totalSessions || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Email Verified:</span>
                  <Badge variant={user.emailVerified ? "default" : "secondary"}>
                    {user.emailVerified ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Account Status:</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={user.isActive ? "default" : "destructive"}>
                      {user.isActive ? "Active" : "Suspended"}
                    </Badge>
                    <Switch 
                      id="account-status" 
                      checked={user.isActive} 
                      onCheckedChange={toggleAccountStatus}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 grid grid-cols-2 gap-2">
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm font-medium">Content Created</p>
                  <p className="text-xl font-bold">{user.stats?.contentCreated || 0}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm font-medium">Comments</p>
                  <p className="text-xl font-bold">{user.stats?.comments || 0}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm font-medium">Likes Given</p>
                  <p className="text-xl font-bold">{user.stats?.likesGiven || 0}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm font-medium">Reports</p>
                  <p className="text-xl font-bold">{user.stats?.reports || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}