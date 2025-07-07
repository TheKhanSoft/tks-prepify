
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getUserProfile, fetchUserPlanHistory } from '@/lib/user-service';
import { fetchPlans } from '@/lib/plan-service';
import { countActiveBookmarks } from '@/lib/bookmark-service';
import { countMonthlyDownloads } from '@/lib/download-service';
import type { Plan, User as UserProfile, UserPlan } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Loader2, Check, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

export default function SubscriptionPage() {
    const { user, loading: authLoading } = useAuth();
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [plan, setPlan] = useState<Plan | null>(null);
    const [planHistory, setPlanHistory] = useState<UserPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [usage, setUsage] = useState<Record<string, number>>({});

    useEffect(() => {
        if (user) {
            const loadData = async () => {
                setLoading(true);
                try {
                    const [profile, plans, history, bookmarkCount, downloadCount] = await Promise.all([
                        getUserProfile(user.uid),
                        fetchPlans(),
                        fetchUserPlanHistory(user.uid),
                        countActiveBookmarks(user.uid),
                        countMonthlyDownloads(user.uid)
                    ]);
                    setUserProfile(profile);
                    setPlanHistory(history);
                    setUsage({ bookmarks: bookmarkCount, downloads: downloadCount });

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

    const quotaFeatures = plan.features.filter(f => f.isQuota);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">My Subscription</h1>
                <p className="text-muted-foreground">Manage your plan and billing details.</p>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-2xl">{plan.name}</CardTitle>
                        <CardDescription>{plan.description}</CardDescription>
                    </div>
                    <Button asChild>
                        <Link href="/pricing">
                            View & Upgrade Plans <ExternalLink className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardHeader>
                <CardContent className="grid gap-8 md:grid-cols-2">
                   <div>
                        <h4 className="font-semibold text-lg mb-4">Plan Features</h4>
                        <ul className="space-y-3">
                            {plan.features.map((feature, index) => (
                                <li key={index} className="flex items-center gap-3">
                                    <Check className="h-5 w-5 text-green-500" />
                                    <span>{feature.text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                     <div className="space-y-6 rounded-lg border bg-muted/50 p-6">
                        <h4 className="font-semibold text-lg">Current Usage</h4>
                         {quotaFeatures.length > 0 ? (
                            quotaFeatures.map((feature) => {
                                const limit = feature.limit ?? 0;
                                const used = usage[feature.key || ''] || 0;
                                const percentage = limit > 0 ? (used / limit) * 100 : (limit === -1 ? 100 : 0);

                                return (
                                    <div key={feature.key}>
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="font-medium text-sm">{feature.text}</p>
                                            <p className="text-xs text-muted-foreground">
                                                <span className="font-semibold text-foreground">{used}</span> / {limit === -1 ? 'Unlimited' : limit}
                                            </p>
                                        </div>
                                        <Progress value={percentage} aria-label={`${feature.text} usage`} />
                                        <p className="text-xs text-muted-foreground mt-1 capitalize">Resets {feature.period}</p>
                                    </div>
                                )
                            })
                        ) : (
                            <p className="text-muted-foreground text-sm">This plan does not have any usage quotas.</p>
                        )}
                    </div>
                </CardContent>
                 <CardFooter className="border-t pt-4 mt-6">
                    {userProfile.planExpiryDate ? (
                        <p className="text-sm text-muted-foreground">
                            Your plan will renew on <strong>{format(new Date(userProfile.planExpiryDate), 'PPP')}</strong>.
                        </p>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            You have <strong>Lifetime Access</strong> to this plan.
                        </p>
                    )}
                 </CardFooter>
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
                                            <Badge variant={ph.status === 'active' ? 'default' : 'secondary'} className={cn(ph.status === 'active' && 'bg-green-600 hover:bg-green-700')}>{ph.status.charAt(0).toUpperCase() + ph.status.slice(1)}</Badge>
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
