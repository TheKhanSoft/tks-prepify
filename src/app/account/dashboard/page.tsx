"use client"

import { useAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowRight, BookCheck, Star, Clock, Loader2, Check } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Plan, User as UserProfile } from '@/types';
import { getUserProfile } from '@/lib/user-service';
import { fetchPlans } from '@/lib/plan-service';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export default function AccountDashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [plan, setPlan] = useState<Plan | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            const loadData = async () => {
                setLoading(true);
                try {
                    const [profile, plans] = await Promise.all([
                        getUserProfile(user.uid),
                        fetchPlans()
                    ]);
                    setUserProfile(profile);
                    if (profile) {
                        const currentPlan = plans.find(p => p.id === profile.planId);
                        setPlan(currentPlan || null);
                    }
                } catch (error) {
                    console.error("Failed to load user data:", error);
                } finally {
                    setLoading(false);
                }
            };
            loadData();
        } else {
            setLoading(false);
        }
    }, [user]);

    if (authLoading || loading) {
         return (
            <div className="flex justify-center items-center h-full min-h-[calc(100vh-20rem)]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Welcome, {user?.displayName || 'Member'}!</h1>
                <p className="text-muted-foreground">Here's a summary of your activity.</p>
            </div>

            <Card>
                <CardHeader className="flex-row items-start justify-between">
                    <div>
                        <CardTitle className="text-xl">
                            {plan?.name ? `${plan.name} Plan` : 'Your Subscription'}
                        </CardTitle>
                        <CardDescription>
                            {plan?.description || "Manage your subscription and explore other options."}
                        </CardDescription>
                    </div>
                    <Button asChild size="sm">
                        <Link href="/pricing">View & Upgrade Plans <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                </CardHeader>
                {plan && (
                    <CardContent className="pt-4">
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold mb-2 text-sm">Plan Features:</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    {plan.features.map((feature, index) => (
                                        <li key={index} className="flex items-start gap-2">
                                            <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            {userProfile && (
                                <div>
                                    <h4 className="font-semibold mb-1 text-sm">Plan Status:</h4>
                                    <div className="text-sm text-muted-foreground">
                                        {userProfile.planExpiryDate ? (
                                            <p>Your plan is valid until {format(new Date(userProfile.planExpiryDate), 'PPP')}.</p>
                                        ) : (
                                            <p>This plan does not expire.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                )}
            </Card>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Papers Taken</span>
                            <BookCheck className="h-5 w-5 text-muted-foreground" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">You haven't completed any papers yet.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Average Score</span>
                            <Star className="h-5 w-5 text-muted-foreground" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">N/A</div>
                        <p className="text-xs text-muted-foreground">Complete a paper to see your average.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Time Spent</span>
                             <Clock className="h-5 w-5 text-muted-foreground" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">0m</div>
                        <p className="text-xs text-muted-foreground">Total time spent on tests.</p>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Recent Results</CardTitle>
                    <CardDescription>Review your most recently completed tests.</CardDescription>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground py-12">
                   <p>Your recent test results will appear here.</p>
                   <Link href="/papers">
                        <span className="text-primary hover:underline font-semibold mt-2 inline-block">Take a test now</span>
                   </Link>
                </CardContent>
            </Card>

        </div>
    );
}
