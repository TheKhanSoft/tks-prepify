'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getUserProfile, fetchUserPlanHistory } from '@/lib/user-service';
import { fetchPlans } from '@/lib/plan-service';
import { countActiveBookmarks } from '@/lib/bookmark-service';
import { countDownloadsForPeriod } from '@/lib/download-service';
import type { Plan, User as UserProfile, UserPlan, PlanFeature } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Loader2, Check, ExternalLink, Crown, Calendar, TrendingUp, AlertCircle, RefreshCw, Clock, X, MoveRight } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type UsageInfo = {
    used: number;
    limit: number;
    resetDate: Date | null;
};

const SubscriptionSkeleton = () => (
    <div className="space-y-6">
        <div className="flex justify-between items-start">
            <div className="space-y-2">
                <Skeleton className="h-8 w-56" />
                <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-9 w-24" />
        </div>
        <Card>
            <CardHeader className="bg-gradient-to-r from-muted/10 to-muted/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-7 w-44" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-9 w-36" />
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                        <Skeleton className="h-5 w-32" />
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
                                <Skeleton className="h-4 w-4 rounded-full mt-0.5" />
                                <Skeleton className="h-4 w-full" />
                            </div>
                        ))}
                    </div>
                    <div className="space-y-4">
                        <Skeleton className="h-5 w-32" />
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="space-y-2 p-4 rounded-lg border">
                                <div className="flex justify-between">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-4 w-16" />
                                </div>
                                <Skeleton className="h-2 w-full" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-80" />
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="grid grid-cols-4 items-center gap-4 p-4 border rounded-lg">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    </div>
);

const UsageCard = ({ feature, usageInfo, loadingUsage }: { 
    feature: PlanFeature; 
    usageInfo?: UsageInfo; 
    loadingUsage: boolean;
}) => {
    if (loadingUsage) {
        return (
            <div className="space-y-3 p-4 rounded-lg border bg-card">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-3 w-32" />
            </div>
        );
    }

    if (!usageInfo) return null;

    const { used, limit, resetDate } = usageInfo;
    const percentage = limit > 0 ? (used / limit) * 100 : (limit === -1 ? 0 : 100);
    const isNearLimit = percentage > 80;
    const isAtLimit = percentage >= 100;

    return (
        <div className={cn(
            "space-y-3 p-4 rounded-lg border transition-all duration-200 group",
            isAtLimit ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20" :
            isNearLimit ? "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20" :
            "border-border bg-card hover:shadow-sm hover:border-primary/20"
        )}>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <p className="font-medium text-sm capitalize">
                        {feature.text.split('(')[0] || feature.key}
                    </p>
                    {isAtLimit && <AlertCircle className="h-4 w-4 text-red-500" />}
                </div>
                <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                        <span className={cn(
                            "font-semibold",
                            isAtLimit ? "text-red-600 dark:text-red-400" :
                            isNearLimit ? "text-amber-600 dark:text-amber-400" :
                            "text-foreground"
                        )}>
                            {used.toLocaleString()}
                        </span>
                        <span className="mx-1">/</span>
                        {limit === -1 ? 'Unlimited' : limit.toLocaleString()}
                    </p>
                    {percentage > 0 && (
                        <Badge variant={isAtLimit ? "destructive" : isNearLimit ? "secondary" : "outline"} 
                               className="text-xs px-1.5 py-0.5">
                            {Math.round(percentage)}%
                        </Badge>
                    )}
                </div>
            </div>
            
            <Progress 
                value={percentage} 
                className={cn(
                    "h-2 transition-all duration-300 group-hover:h-[6px]",
                    isAtLimit && "[&>div]:bg-red-500",
                    isNearLimit && "[&>div]:bg-amber-500"
                )}
                aria-label={`${feature.text} usage`} 
            />
            
            <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>
                    {feature.period === 'lifetime' ? 'Does not reset' : 
                     resetDate ? `Resets ${format(resetDate, 'MMM d, yyyy')}` : 
                     `Resets ${feature.period}`}
                </span>
                {isAtLimit && (
                    <span className="text-red-600 dark:text-red-400 font-medium">
                        Limit reached
                    </span>
                )}
            </div>
        </div>
    );
};

const PlanStatusBadge = ({ status }: { status: string }) => {
    const variants = {
        active: { 
            variant: "default" as const, 
            className: "bg-green-500 text-green-50 text-xs px-1.5 py-0.5", 
            icon: Check 
        },
        pending: { 
            variant: "secondary" as const, 
            className: "bg-amber-500 text-amber-50 text-xs px-1.5 py-0.5", 
            icon: Clock 
        },
        expired: { 
            variant: "destructive" as const, 
            className: "text-xs px-1.5 py-0.5", 
            icon: AlertCircle 
        },
        cancelled: { 
            variant: "outline" as const, 
            className: "text-muted-foreground border-muted-foreground text-xs px-1.5 py-0.5", 
            icon: X 
        },
        migrated: {
            variant: "secondary" as const,
            className: "bg-purple-500 text-purple-50 text-xs px-1.5 py-0.5",
            icon: MoveRight
        }
    };

    const config = variants[status as keyof typeof variants] || variants.expired;
    const IconComponent = config.icon;

    return (
        <Badge variant={config.variant} className={cn(
            config.className,
            "inline-flex items-center gap-1 font-normal max-w-max"
        )}>
            <IconComponent className="h-3 w-3" />
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
    );
};

const DateRangeCell = ({ startDate, endDate, status }: { 
    startDate: string; 
    endDate?: string | null;
    status: string;
}) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;
    
    const getStartLabel = () => {
        if (status === 'active') return 'Started';
        if (status === 'expired') return 'Activated';
        if (status === 'cancelled') return 'Subscribed';
        return 'Started';
    };

    const getEndLabel = () => {
        if (status === 'active') return 'Expires';
        if (status === 'expired') return 'Ended';
        if (status === 'cancelled') return 'Cancelled';
        return 'Ended';
    };

    return (
        <div className="flex flex-col space-y-1">
            <div className="flex items-baseline gap-1">
                <span className="text-xs text-muted-foreground">{getStartLabel()}:</span>
                <span className="text-sm font-medium">
                    {format(start, 'MMM d, yyyy')}
                </span>
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-xs text-muted-foreground">{getEndLabel()}:</span>
                {end ? (
                    <span className="text-sm font-medium">
                        {format(end, 'MMM d, yyyy')}
                    </span>
                ) : (
                    <span className="text-xs text-muted-foreground">--</span>
                )}
            </div>
        </div>
    );
};

export default function SubscriptionPage() {
    const { user, loading: authLoading } = useAuth();
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [plan, setPlan] = useState<Plan | null>(null);
    const [planHistory, setPlanHistory] = useState<UserPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [usage, setUsage] = useState<Record<string, UsageInfo>>({});
    const [loadingUsage, setLoadingUsage] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const { toast } = useToast();

    const loadInitialData = async () => {
        if (!user) return;
        
        try {
            setError(null);
            const [profile, fetchedPlans, history] = await Promise.all([
                getUserProfile(user.uid),
                fetchPlans(),
                fetchUserPlanHistory(user.uid),
            ]);

            setUserProfile(profile);
            setPlans(fetchedPlans);
            setPlanHistory(history);

            if (profile?.planId) {
                const currentPlan = fetchedPlans.find(p => p.id === profile.planId);
                setPlan(currentPlan || null);
            }
        } catch (error) {
            console.error("Failed to load initial subscription data:", error);
            setError("Failed to load subscription data. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const loadUsageData = async () => {
        if (!user || !plan || !userProfile) return;

        setLoadingUsage(true);
        try {
            const usageData: Record<string, UsageInfo> = {};
            
            const activePlanHistory = planHistory.find(p => p.status === 'active');
            const subscriptionStartDate = activePlanHistory?.subscriptionDate
                ? new Date(activePlanHistory.subscriptionDate)
                : (userProfile.createdAt ? new Date(userProfile.createdAt) : new Date());

            const quotaFeatures = plan.features.filter(f => f.isQuota && f.key);

            for (const feature of quotaFeatures) {
                const usageKey = feature.key! + (feature.period ? `_${feature.period}` : '');
                let usedCount = 0;
                let resetDate: Date | null = null;
                const limit = feature.limit ?? 0;

                if (feature.key === 'bookmarks') {
                    usedCount = await countActiveBookmarks(user.uid);
                    resetDate = null; // Lifetime
                } else if (feature.key === 'downloads' && feature.period) {
                     const result = await countDownloadsForPeriod(user.uid, feature.period, subscriptionStartDate);
                     usedCount = result.count;
                     resetDate = result.resetDate;
                }
                
                usageData[usageKey] = { used: usedCount, limit, resetDate };
            }

            setUsage(usageData);
        } catch (error) {
            console.error("Failed to load usage data:", error);
            toast({
                title: "Could not load usage data",
                description: "There was an error fetching your current usage statistics. Please try refreshing the page.",
                variant: "destructive",
            });
        } finally {
            setLoadingUsage(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await Promise.all([loadInitialData(), loadUsageData()]);
        setRefreshing(false);
        toast({
            title: "Data refreshed",
            description: "Your subscription data has been updated.",
        });
    };

    useEffect(() => {
        if (!user || authLoading) return;
        loadInitialData();
    }, [user, authLoading]);
    
    useEffect(() => {
        if (!user || !plan || !userProfile) return;
        loadUsageData();
    }, [user, plan, userProfile, planHistory]);

    if (authLoading || loading) {
        return <SubscriptionSkeleton />;
    }

    if (error) {
        return (
            <div className="space-y-4">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error loading data</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                <Button onClick={handleRefresh} disabled={refreshing}>
                    {refreshing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Try Again
                </Button>
            </div>
        );
    }

    if (!userProfile) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Could not load user profile</h3>
                <p className="text-muted-foreground mb-4">Please try refreshing the page</p>
                <Button onClick={handleRefresh} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>
        );
    }

    const currentPlan = plans.find(p => p.id === userProfile.planId);
    const hasActivePlan = !!currentPlan;
    const quotaFeatures = currentPlan?.features.filter(f => f.isQuota) || [];
    const hasNearLimitUsage = Object.values(usage).some(u => u.limit > 0 && (u.used / u.limit) > 0.8);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight">Subscription Management</h1>
                    <p className="text-muted-foreground text-sm">
                        View your current plan, usage statistics, and billing history
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="shrink-0"
                >
                    {refreshing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Refresh
                </Button>
            </div>

            {hasNearLimitUsage && (
                <Alert variant="warning" className="border-l-4 border-amber-500">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <div>
                        <AlertTitle>Usage approaching limit</AlertTitle>
                        <AlertDescription>
                            You're close to reaching limits on some features. Consider upgrading your plan to avoid service interruptions.
                        </AlertDescription>
                    </div>
                </Alert>
            )}

            <Card className="overflow-hidden border-0 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-xl">
                                    {currentPlan?.name || 'No Active Plan'}
                                </CardTitle>
                                {hasActivePlan && (
                                    <Crown className="h-5 w-5 text-amber-500" />
                                )}
                            </div>
                            <CardDescription className="text-sm">
                                {currentPlan?.description || "You don't have an active subscription."}
                            </CardDescription>
                        </div>
                        <Button asChild size="sm" className="shrink-0">
                            <Link href="/pricing">
                                <TrendingUp className="h-4 w-4 mr-2" />
                                {hasActivePlan ? 'Upgrade Plan' : 'Choose Plan'}
                            </Link>
                        </Button>
                    </div>
                </CardHeader>
                
                {hasActivePlan && (
                    <>
                        <CardContent className="p-6">
                            <div className="grid gap-6 lg:grid-cols-2">
                                <div className="space-y-4">
                                    <h4 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
                                        <Check className="h-4 w-4 text-green-500" />
                                        Included Features
                                    </h4>
                                    <div className="grid gap-2">
                                        {currentPlan.features.map((feature, index) => (
                                            <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                                                <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                                <span className="text-sm">{feature.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
                                        <TrendingUp className="h-4 w-4 text-blue-500" />
                                        Usage Statistics
                                    </h4>
                                    {quotaFeatures.length > 0 ? (
                                        <div className="space-y-3">
                                            {quotaFeatures.map((feature: PlanFeature, index) => {
                                                const usageKey = (feature.key || '') + (feature.period ? `_${feature.period}` : '');
                                                const usageInfo = usage[usageKey];
                                                
                                                return (
                                                    <UsageCard
                                                        key={index}
                                                        feature={feature}
                                                        usageInfo={usageInfo}
                                                        loadingUsage={loadingUsage}
                                                    />
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                            <p>This plan has unlimited usage for all features.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                        
                        <CardFooter className="bg-muted/10 border-t px-6 py-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                {userProfile.planExpiryDate ? (
                                    <span>
                                        Your plan <strong className="text-foreground">
                                            {new Date(userProfile.planExpiryDate) > new Date() ? 
                                             `renews on ${format(new Date(userProfile.planExpiryDate), 'PPP')}` : 
                                             `expired on ${format(new Date(userProfile.planExpiryDate), 'PPP')}`}
                                        </strong>
                                    </span>
                                ) : (
                                    <span>
                                        You have <strong className="text-foreground">Lifetime Access</strong> to this plan
                                    </span>
                                )}
                            </div>
                        </CardFooter>
                    </>
                )}
            </Card>

            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Subscription History
                    </CardTitle>
                    <CardDescription className="text-sm">
                        View your past and current subscription plans
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {planHistory.length > 0 ? (
                        <div className="rounded-lg border">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[25%]">Plan</TableHead>
                                        <TableHead className="w-[15%]">Status</TableHead>
                                        <TableHead className="w-[25%]">Dates</TableHead>
                                        <TableHead className="w-[35%]">Remarks</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {planHistory.map((ph) => (
                                        <TableRow key={ph.id} className="hover:bg-muted/10">
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    {ph.status === 'active' && (
                                                        <Crown className="h-4 w-4 text-amber-500" />
                                                    )}
                                                    {ph.planName}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <PlanStatusBadge status={ph.status} />
                                            </TableCell>
                                            <TableCell>
                                                <DateRangeCell 
                                                    startDate={ph.subscriptionDate} 
                                                    endDate={ph.endDate}
                                                    status={ph.status}
                                                />
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                <div className="line-clamp-2" title={ph.remarks}>
                                                    {ph.remarks || '--'}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-medium mb-2">No subscription history</h3>
                            <p className="text-muted-foreground mb-4">Your subscription history will appear here</p>
                            <Button asChild variant="outline" size="sm">
                                <Link href="/pricing">
                                    Browse Plans
                                </Link>
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}