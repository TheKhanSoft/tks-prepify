
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { updateProfile, updatePassword } from 'firebase/auth';
import { updateUserProfileInFirestore } from '@/lib/user-service';
import { useState } from 'react';

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
});
type ProfileFormValues = z.infer<typeof profileFormSchema>;

const passwordFormSchema = z.object({
    newPassword: z.string().min(6, { message: "Password must be at least 6 characters." }),
    confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});
type PasswordFormValues = z.infer<typeof passwordFormSchema>;


export default function AccountProfilePage() {
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);
    const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
    
    const profileForm = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
        values: { name: user?.displayName || "" },
    });

    const passwordForm = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordFormSchema),
        defaultValues: { newPassword: "", confirmPassword: "" },
    });
    
    async function onProfileSubmit(data: ProfileFormValues) {
        if (!user) return;
        setIsProfileSubmitting(true);
        try {
            await updateProfile(user, { displayName: data.name });
            await updateUserProfileInFirestore(user.uid, { name: data.name });
            toast({ title: "Success", description: "Your profile has been updated." });
        } catch (error: any) {
            toast({ title: "Error", description: "Could not update your profile. Please try again.", variant: "destructive" });
        } finally {
            setIsProfileSubmitting(false);
        }
    }

    async function onPasswordSubmit(data: PasswordFormValues) {
        if (!user) return;
        setIsPasswordSubmitting(true);
        try {
            await updatePassword(user, data.newPassword);
            passwordForm.reset();
            toast({ title: "Success", description: "Your password has been changed." });
        } catch (error: any) {
            let description = "Could not change your password. Please try again.";
            if(error.code === 'auth/requires-recent-login') {
                description = "This operation is sensitive and requires recent authentication. Please log out and log back in before changing your password.";
            }
            toast({ title: "Error", description, variant: "destructive", duration: 8000 });
        } finally {
            setIsPasswordSubmitting(false);
        }
    }

    if (authLoading) {
        return <div className="flex justify-center items-center h-full min-h-[calc(100vh-20rem)]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (!user) {
        return <p>You must be logged in to view this page.</p>;
    }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Profile</h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your display name and view your account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} data-ai-hint="user avatar" />
                    <AvatarFallback>{user.displayName?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <Button variant="outline" disabled>Change Avatar</Button>
                    <p className="text-xs text-muted-foreground mt-2">JPG, GIF or PNG. 1MB max.</p>
                </div>
              </div>

              <FormField
                control={profileForm.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                        <Label>Display Name</Label>
                        <FormControl>
                            <Input {...field} disabled={isProfileSubmitting} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
               />
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" value={user.email || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label>Email Verified</Label>
                <p className={`text-sm font-medium ${user.emailVerified ? 'text-green-600' : 'text-destructive'}`}>
                    {user.emailVerified ? 'Yes' : 'No'}
                </p>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={isProfileSubmitting}>
                    {isProfileSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update Profile
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Enter a new password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
             <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                     <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                            <FormItem>
                                <Label>New Password</Label>
                                <FormControl>
                                    <Input type="password" {...field} disabled={isPasswordSubmitting} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                            <FormItem>
                                <Label>Confirm New Password</Label>
                                <FormControl>
                                    <Input type="password" {...field} disabled={isPasswordSubmitting} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="flex justify-end">
                        <Button type="submit" disabled={isPasswordSubmitting}>
                            {isPasswordSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Change Password
                        </Button>
                    </div>
                </form>
            </Form>
        </CardContent>
      </Card>
    </div>
  )
}
