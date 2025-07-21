
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookOpen, Loader2 } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { fetchSettings } from '@/lib/settings-service';
import type { Settings } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    fetchSettings().then(setSettings);
  }, []);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    if (!isFirebaseConfigured || !auth) {
        toast({
            title: "Service Not Available",
            description: "Password reset functionality is currently disabled.",
            variant: "destructive",
        });
        return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, data.email);
      setIsSubmitted(true);
    } catch (error: any) {
      // We still show a success message to prevent user enumeration (leaking which emails are registered)
      // but we can log the error for debugging.
      console.error("Password reset error:", error);
      setIsSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] bg-background p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center gap-2 mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
            {settings ? (
              <span className="text-2xl font-bold font-headline">{settings.siteName}</span>
            ) : (
              <Skeleton className="h-8 w-24" />
            )}
          </div>
          <CardTitle className="text-2xl">Forgot Password?</CardTitle>
          <CardDescription>
            {isSubmitted 
                ? "Check your inbox for a reset link."
                : "Enter your email to receive a password reset link."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSubmitted ? (
            <Alert variant="default" className="border-green-200 bg-green-50 text-green-800">
                <AlertDescription>
                    If an account exists for the email you provided, a password reset link has been sent. Please check your inbox and spam folder.
                </AlertDescription>
            </Alert>
          ) : (
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                    <FormItem>
                        <Label>Email</Label>
                        <FormControl>
                        <Input type="email" placeholder="m@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Reset Link
                </Button>
                </form>
            </Form>
          )}

          <div className="mt-4 text-center text-sm">
            Remember your password?{' '}
            <Link href="/login" className="underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
