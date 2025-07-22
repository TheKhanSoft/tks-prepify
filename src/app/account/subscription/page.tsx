'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getUserProfile, fetchUserPlanHistory } from '@/lib/user-service';
import { fetchPlans } from '@/lib/plan-service';
import { countActiveBookmarks } from '@/lib/bookmark-service';
import { countDownloadsForPeriod } from '@/lib/download-service';
import type { Plan, User as UserProfile, UserPlan, PlanFeature } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Loader2, Check, ExternalLink, Crown, Calendar, TrendingUp, AlertCircle, RefreshCw, Clock, X } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

// --- Type Definitions ---

type UsageInfo = {
    used: number;
    limit: number;
    resetDate: Date | null;
};

type SubscriptionData = {
    userProfile: UserProfile | null;
    plans: Plan[];
    currentPlan: Plan | null;
    planHistory: UserPlan[];
};

type DataState = {
    data: SubscriptionData | null;
    usage: Record<string, UsageInfo>;
    loading: boolean;
    loadingUsage: boolean;
    error: string | null;
};

// --- Custom Hooks ---

/**
 * @remarks
 * Encapsulating data fetching logic within a custom hook improves separation of concerns.
 * This makes the main component cleaner and the data fetching logic reusable.
 * It also simplifies state management by co-locating related states.
 */
const useSubscriptionData = () => {
    const { user, loading: authLoading } = useAuth();
    const [state, setState] = useState<DataState>({
        data: null,
        usage: {},
        loading: true,
        loadingUsage: true,
        error: null,
    });
    const { toast } = useToast();

    const loadData = useCallback(async (forceRefresh = false) => {
        if (!user) return;

        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const [profile, fetchedPlans, history] = await Promise.all([
                getUserProfile(user.uid),
                fetchPlans(),
                fetchUserPlanHistory(user.uid),
            ]);

            const currentPlan = fetchedPlans.find(p => p.id === profile?.planId) || null;
            const subscriptionData = { userProfile: profile, plans: fetchedPlans, currentPlan, planHistory: history };

            setState(prev => ({ ...prev, data: subscriptionData, loading: false }));

            // Load usage data after initial data is loaded
            if (currentPlan && profile) {
                loadUsage(user.uid, currentPlan, profile, history, toast);
            } else {
                setState(prev => ({ ...prev, loadingUsage: false }));
            }

            if (forceRefresh) {
                toast({
                    title: "Data refreshed",
                    description: "Your subscription data has been updated.",
                });
            }
        } catch (error) {
            console.error("Failed to load subscription data:", error);
            setState(prev => ({ ...prev, error: "Failed to load subscription data. Please try again.", loading: false }));
        }
    }, [user, toast]);

    const loadUsage = useCallback(async (uid: string, plan: Plan, userProfile: UserProfile, planHistory: UserPlan[], toast: any) => {
        setState(prev => ({ ...prev, loadingUsage: true }));
        try {
            const usageData: Record<string, UsageInfo> = {};
            const activePlanHistory = planHistory.find(p => p.status === 'active');
            const subscriptionStartDate = activePlanHistory?.subscriptionDate
                ? new Date(activePlanHistory.subscriptionDate)
                : (userProfile.createdAt ? new Date(userProfile.createdAt) : new Date());

            const quotaFeatures = plan.features.filter(f => f.isQuota && f.key);

            for (const feature of quotaFeatures) {
                const usageKey = `${feature.key!}${feature.period ? `_${feature.period}` : ''}`;
                let usedCount = 0;
                let resetDate: Date | null = null;
                const limit = feature.limit ?? 0;

                if (feature.key === 'bookmarks') {
                    usedCount = await countActiveBookmarks(uid);
                } else if (feature.key === 'downloads' && feature.period) {
                    const result = await countDownloadsForPeriod(uid, feature.period, subscriptionStartDate);
                    usedCount = result.count;
                    resetDate = result.resetDate;
                }
                
                usageData[usageKey] = { used: usedCount, limit, resetDate };
            }

            setState(prev => ({ ...prev, usage: usageData, loadingUsage: false }));
        } catch (error) {
            console.error("Failed to load usage data:", error);
            toast({
                title: "Could not load usage data",
                description: "There was an error fetching your current usage statistics.",
                variant: "destructive",
            });
            setState(prev => ({...prev, loadingUsage: false }));
        }
    }, []);

    useEffect(() => {
        if (user && !authLoading) {
            loadData();
        } else if (!authLoading) {
            setState(prev => ({...prev, loading: false }));
        }
    }, [user, authLoading, loadData]);

    return { ...state, refresh: () => loadData(true) };
};


// --- UI Components ---

/**
 * @remarks
 * Skeleton loaders provide a better user experience by giving an indication of the content that is about to be displayed.
 * This is preferable to a blank screen or a simple loading spinner.
 */
const SubscriptionSkeleton = () => (
    <div className="space-y-8 animate-pulse">
        <div className="space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-96" />
        </div>
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-5 w-72" />
                    </div>
                    <Skeleton className="h-10 w-40" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid gap-8 md:grid-cols-2">
                    <div className="space-y-4">
                        <Skeleton className="h-6 w-32" />
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <Skeleton className="h-5 w-5 rounded-full" />
                                <Skeleton className="h-5 w-full" />
                            </div>
                        ))}
                    </div>
                    <div className="space-y-4">
                        <Skeleton className="h-6 w-32" />
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-2 w-full" />
                            </div>
                        ))}
                    </div>
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
            "space-y-3 p-4 rounded-lg border transition-all duration-200",
            isAtLimit ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20" :
            isNearLimit ? "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20" :
            "border-border bg-card hover:shadow-sm"
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
                        <Badge variant={isAtLimit ? "destructive" : isNearLimit ? "secondary" : "outline"} className="text-xs">
                            {Math.round(percentage)}%
                        </Badge>
                    )}
                </div>
            </div>
            
            <Progress 
                value={percentage} 
                className={cn(
                    "h-2 transition-all duration-300",
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
        active: { variant: "default" as const, className: "bg-green-600 hover:bg-green-700", icon: Check },
        pending: { variant: "secondary" as const, className: "bg-amber-500 hover:bg-amber-600", icon: Clock },
        expired: { variant: "outline" as const, className: "border-red-300 text-red-600", icon: AlertCircle },
        cancelled: { variant: "secondary" as const, className: "bg-gray-500 hover:bg-gray-600", icon: X }
    };

    const config = variants[status as keyof typeof variants] || variants.expired;
    const IconComponent = config.icon;

    return (
        <Badge variant={config.variant} className={cn(config.className, "flex items-center gap-1")}>
            <IconComponent className="h-3 w-3" />
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
    );
};


// --- Main Page Component ---

export default function SubscriptionPage() {
    const { data, usage, loading, loadingUsage, error, refresh } = useSubscriptionData();
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = async () => {
        setRefreshing(true);
        await refresh();
        setRefreshing(false);
    };

    /**
     * @remarks
     * Proper handling of loading and error states is crucial for a good user experience. [3, 22]
     * Displaying a skeleton loader during initial load and a clear error message with a retry option are best practices.
     */
    if (loading) {
        return <SubscriptionSkeleton />;
    }

    if (error) {
        return (
            <div className="space-y-6 text-center py-12">
                <Alert variant="destructive" className="max-w-md mx-auto">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                <Button onClick={handleRefresh} disabled={refreshing}>
                    {refreshing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Try Again
                </Button>
            </div>
        );
    }

    if (!data?.userProfile) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">Could not load user profile</p>
                <p className="text-muted-foreground mb-4">Please try refreshing the page.</p>
                <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
                    {refreshing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Refresh
                </Button>
            </div>
        );
    }

    const { userProfile, currentPlan, planHistory } = data;
    const hasActivePlan = !!currentPlan;
    const quotaFeatures = currentPlan?.features.filter(f => f.isQuota) || [];
    const hasNearLimitUsage = Object.values(usage).some(u => u.limit > 0 && (u.used / u.limit) > 0.8);

    /**
     * @remarks
     * The main content is structured using Card components from shadcn/ui for a consistent and clean layout. [27, 34]
     * Visual hierarchy is used to guide the user's attention to important information. [6]
     */
    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">My Subscription</h1>
                    <p className="text-muted-foreground">Manage your plan and monitor your usage.</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="shrink-0"
                >
                    {refreshing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Refresh
                </Button>
            </div>

            {hasNearLimitUsage && (
                <Alert className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription>
                        You're approaching the limit for some features. Consider <Link href="/pricing" className="font-semibold underline">upgrading your plan</Link> to avoid interruptions.
                    </AlertDescription>
                </Alert>
            )}

            <Card className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-2xl">
                                    {currentPlan?.name || 'No Active Plan'}
                                </CardTitle>
                                {hasActivePlan && <Crown className="h-5 w-5 text-amber-500" />}
                            </div>
                            <CardDescription className="text-base">
                                {currentPlan?.description || "You don't have an active subscription."}
                            </CardDescription>
                        </div>
                        <Button asChild size="lg" className="shrink-0">
                            <Link href="/pricing">
                                <TrendingUp className="h-4 w-4 mr-2" />
                                {hasActivePlan ? 'Upgrade Plan' : 'Choose Plan'}
                                <ExternalLink className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </CardHeader>
                
                {hasActivePlan && currentPlan && (
                    <>
                        <CardContent className="p-6">
                            <div className="grid gap-8 lg:grid-cols-2">
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-lg flex items-center gap-2">
                                        <Check className="h-5 w-5 text-green-500" />
                                        Plan Features
                                    </h4>
                                    <div className="grid gap-3">
                                        {currentPlan.features.map((feature, index) => (
                                            <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-green-50/50 dark:bg-green-950/10 border border-green-200 dark:border-green-800">
                                                <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                                <span className="text-sm">{feature.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-semibold text-lg flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-blue-500" />
                                        Current Usage
                                    </h4>
                                    {quotaFeatures.length > 0 ? (
                                        <div className="space-y-4">
                                            {quotaFeatures.map((feature: PlanFeature, index) => {
                                                const usageKey = `${feature.key || ''}${feature.period ? `_${feature.period}` : ''}`;
                                                return (
                                                    <UsageCard
                                                        key={index}
                                                        feature={feature}
                                                        usageInfo={usage[usageKey]}
                                                        loadingUsage={loadingUsage}
                                                    />
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground bg-muted/50 rounded-lg">
                                            <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                            <p>This plan has unlimited usage for all features.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                        
                        <CardFooter className="bg-muted/20 border-t p-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                {userProfile.planExpiryDate ? (
                                    <span>
                                        Your plan renews on <strong className="text-foreground">
                                            {format(new Date(userProfile.planExpiryDate), 'PPP')}
                                        </strong>
                                    </span>
                                ) : (
                                    <span>
                                        You have <strong className="text-foreground">Lifetime Access</strong> to this plan.
                                    </span>
                                )}
                            </div>
                        </CardFooter>
                    </>
                )}
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Billing History
                    </CardTitle>
                    <CardDescription>
                        A complete record of your subscription history.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {planHistory.length > 0 ? (
                        /**
                         * @remarks
                         * The `Table` component from shadcn/ui is used for displaying tabular data. [1, 11]
                         * It provides a clean and responsive way to present the billing history.
                         */
                        <div className="overflow-x-auto">
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
                                    {planHistory.map((ph) => (
                                        <TableRow key={ph.id} className="hover:bg-muted/50">
                                            <TableCell className="font-medium">{ph.planName}</TableCell>
                                            <TableCell>
                                                <PlanStatusBadge status={ph.status} />
                                            </TableCell>
                                            <TableCell>
                                                {format(new Date(ph.subscriptionDate), 'PPP')}
                                            </TableCell>
                                            <TableCell>
                                                {ph.endDate ? format(new Date(ph.endDate), 'PPP') : 
                                                 ph.status === 'active' ? 'Active' : 'N/A'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground bg-muted/50 rounded-lg">
                            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">No billing history yet</p>
                            <p className="text-sm mb-4">Your subscription history will appear here.</p>
                            <Button asChild variant="outline">
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