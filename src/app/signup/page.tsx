
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
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { fetchSettings } from '@/lib/settings-service';
import type { Settings } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

const signupFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type SignupFormValues = z.infer<typeof signupFormSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    fetchSettings().then(setSettings);
  }, []);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast({ title: "Sign Up Successful", description: "Welcome to Prepify!" });
      router.push('/admin/dashboard');
    } catch (error: any) {
      console.error(error);
      toast({ title: "Sign Up Failed", description: error.message, variant: "destructive" });
    } finally {
      setGoogleLoading(false);
    }
  };

  const onSubmit = async (data: SignupFormValues) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      await updateProfile(userCredential.user, {
        displayName: data.name,
      });
      toast({ title: "Sign Up Successful", description: "Welcome to Prepify!" });
      router.push('/admin/dashboard');
    } catch (error: any) {
      console.error(error);
      let errorMessage = "An unknown error occurred.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email is already in use. Please login instead.";
      } else {
        errorMessage = error.message;
      }
      toast({ title: "Sign Up Failed", description: errorMessage, variant: "destructive" });
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
          <CardTitle className="text-2xl">Create an Account</CardTitle>
          <CardDescription>Enter your information to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Full Name</Label>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <Label>Password</Label>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </form>
          </Form>
          
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>
          
           <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={googleLoading}>
            {googleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" className="mr-2 h-4 w-4"><path fill="#4285F4" d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4818h4.8436c-.2086 1.125-.8427 2.0782-1.7777 2.7064v2.2581h2.9087c1.7018-1.5668 2.6836-3.8745 2.6836-6.6055z"/><path fill="#34A853" d="M9 18c2.43 0 4.4673-.806 5.9564-2.1813l-2.9087-2.2581c-.8059.54-1.8336.8582-2.9336.8582-2.2718 0-4.2059-1.525-4.8936-3.5627H1.07v2.3327C2.5564 16.1605 5.5218 18 9 18z"/><path fill="#FBBC05" d="M4.1064 10.71c-.19-.54-.3-1.125-.3-1.71s.11-1.17.3-1.71V4.9582H1.07A8.997 8.997 0 0 0 0 9c0 1.4523.3445 2.8218.9614 4.0418L4.1064 10.71z"/><path fill="#EA4335" d="M9 3.4918c1.3218 0 2.5077.456 3.4405 1.346l2.5818-2.5818C13.4632.9973 11.4255 0 9 0 5.5218 0 2.5564 1.8395 1.07 4.9582L4.1064 7.29C4.794 5.2532 6.7282 3.4918 9 3.4918z"/></svg>
            )}
            Google
          </Button>

          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
