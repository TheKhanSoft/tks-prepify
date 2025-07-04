
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getUserProfile, fetchUserPlanHistory } from '@/lib/user-service';
import { fetchPlans } from '@/lib/plan-service';
import type { Plan, User as UserProfile, UserPlan } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Loader2, Check, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from '@/lib/utils';

export default function SubscriptionPage() {
    const { user, loading: authLoading } = useAuth();
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [plan, setPlan] = useState<Plan | null>(null);
    const [planHistory, setPlanHistory] = useState<UserPlan[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            const loadData = async () => {
                setLoading(true);
                try {
                    const [profile, plans, history] = await Promise.all([
                        getUserProfile(user.uid),
                        fetchPlans(),
                        fetchUserPlanHistory(user.uid)
                    ]);
                    setUserProfile(profile);
                    setPlanHistory(history);
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
        } else if (!authLoading) {
            setLoading(false);
        }
    }, [user, authLoading]);

    if (authLoading || loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[calc(100vh-20rem)]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!plan || !userProfile) {
        return (
            <div className="text-center">
                <p>Could not load subscription details.</p>
                <Link href="/pricing">
                    <Button className="mt-4">View Plans</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">My Subscription</h1>
                <p className="text-muted-foreground">Manage your plan and billing details.</p>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Current Plan</CardTitle>
                        <CardDescription>Here are the details of your active subscription.</CardDescription>
                    </div>
                    <Button asChild>
                        <Link href="/pricing">
                            View & Upgrade Plans <ExternalLink className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-6 rounded-lg border bg-secondary/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h3 className="text-2xl font-bold text-primary">{plan.name}</h3>
                            <p className="text-muted-foreground mt-1">{plan.description}</p>
                        </div>
                        <div>
                            {userProfile.planExpiryDate ? (
                                <Badge variant="outline">
                                    Renews on {format(new Date(userProfile.planExpiryDate), 'PPP')}
                                </Badge>
                            ) : (
                                 <Badge variant="outline">
                                    Lifetime Access
                                </Badge>
                            )}
                        </div>
                    </div>

                    <div>
                        <h4 className="font-semibold text-lg mb-4">Plan Features:</h4>
                        <ul className="space-y-3">
                            {plan.features.map((feature, index) => (
                                <li key={index} className="flex items-center gap-3">
                                    <Check className="h-5 w-5 text-green-500" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Billing History</CardTitle>
                    <CardDescription>A record of your past and current subscriptions.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Plan</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Start Date</TableHead>
                                <TableHead>End Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {planHistory.length > 0 ? (
                                planHistory.map((ph) => (
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
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                        No billing history found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
