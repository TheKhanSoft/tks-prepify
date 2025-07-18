'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchPlans } from '@/lib/plan-service';
import { Check, Loader2, Sparkles, Star, Crown, Shield, Zap, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { Plan, User as UserProfile, PricingOption } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { getUserProfile } from '@/lib/user-service';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';

const PlanActionButton = ({ user, currentPlan, targetPlan, option, isCurrentPlan }: {
    user: UserProfile | null,
    currentPlan: Plan | null,
    targetPlan: Plan,
    option: PricingOption,
    isCurrentPlan: boolean,
}) => {
    
    const isUpgrade = user && currentPlan && !isCurrentPlan && option.price > (currentPlan.pricingOptions.find(p => p.months === option.months)?.price ?? 0);
    const isDowngrade = user && currentPlan && !isCurrentPlan && option.price < (currentPlan.pricingOptions.find(p => p.months === option.months)?.price ?? 0);

    let buttonText = "Get Started";
    if (user) {
        if (isCurrentPlan) buttonText = "Your Current Plan";
        else if (isUpgrade) buttonText = `Upgrade Plan`;
        else if (isDowngrade) buttonText = `Downgrade`;
        else buttonText = "Switch Plan";
    }

    const checkoutLink = user
      ? `/checkout/${targetPlan.id}?option=${encodeURIComponent(option.label)}`
      : '/signup';

    if (isDowngrade) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <span tabIndex={0} className="w-full">
                        <Button 
                            size="lg" 
                            className="w-full h-12 font-semibold transition-all duration-200" 
                            variant={targetPlan.popular ? 'default' : 'outline'} 
                            disabled
                        >
                            {buttonText}
                        </Button>
                    </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-gray-900 text-white">
                    <p>Please contact support to downgrade your plan.</p>
                </TooltipContent>
            </Tooltip>
        );
    }

    return (
        <Button 
            asChild 
            size="lg" 
            className={cn(
                "w-full h-12 font-semibold transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg",
                targetPlan.popular && !isCurrentPlan && "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0",
                isCurrentPlan && "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0",
                !targetPlan.popular && !isCurrentPlan && "bg-white dark:bg-slate-800 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50"
            )}
            disabled={isCurrentPlan}
        >
            <Link href={checkoutLink} className="flex items-center justify-center gap-2">
                {isCurrentPlan && <Crown className="h-4 w-4" />}
                {isUpgrade && <Sparkles className="h-4 w-4" />}
                <span>{buttonText}</span>
            </Link>
        </Button>
    );
};

const PlanIcon = ({ planName, isCurrentPlan, isPopular }: { planName: string, isCurrentPlan: boolean, isPopular: boolean }) => {
    const iconClass = cn(
        "h-8 w-8 mb-2 transition-all duration-300",
        isCurrentPlan && "text-green-600",
        isPopular && !isCurrentPlan && "text-blue-600",
        !isCurrentPlan && !isPopular && "text-gray-600"
    );

    if (planName.toLowerCase().includes('premium') || planName.toLowerCase().includes('pro')) {
        return <Crown className={iconClass} />;
    }
    if (planName.toLowerCase().includes('basic') || planName.toLowerCase().includes('starter')) {
        return <Shield className={iconClass} />;
    }
    if (planName.toLowerCase().includes('advanced') || planName.toLowerCase().includes('plus')) {
        return <Zap className={iconClass} />;
    }
    return <Target className={iconClass} />;
};

export default function PricingPage() {
  const { user, loading: authLoading } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annually'>('monthly');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const fetchedPlans = await fetchPlans(true);
        setPlans(fetchedPlans);
        
        if (user) {
          const profile = await getUserProfile(user.uid);
          setUserProfile(profile);
        }
      } catch (error) {
        // console.error("Failed to load pricing data:", error);
      }
      setLoading(false);
    };
    loadData();
  }, [user]);

  const sortedPlans = React.useMemo(() => {
    return [...plans].sort((a,b) => {
      const aPrice = a.pricingOptions.find(p => p.months === 1)?.price ?? a.pricingOptions[0]?.price ?? 0;
      const bPrice = b.pricingOptions.find(p => p.months === 1)?.price ?? b.pricingOptions[0]?.price ?? 0;
      return aPrice - bPrice;
    });
  }, [plans]);

  if (loading || authLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-[50vh] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="text-lg text-muted-foreground animate-pulse">Loading pricing plans...</p>
      </div>
    );
  }
  
  const currentPlan = userProfile ? plans.find(p => p.id === userProfile.planId) : null;

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>
      
      <div className="relative container mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-8">
        {/* Header Section */}
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            Choose Your Success Path
          </div>
          
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl font-headline bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent">
            Pricing Plans for Every Goal
          </h1>
          
          <p className="mt-6 text-xl leading-8 text-muted-foreground max-w-2xl mx-auto">
            Choose the perfect plan to unlock your potential and ace your exams with confidence.
          </p>
          
          {userProfile && currentPlan && (
            <div className="mt-6 inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-4 py-2 rounded-full text-sm font-medium">
              <Crown className="h-4 w-4" />
              Currently on {currentPlan.name} Plan
            </div>
          )}
        </div>

        {/* Billing Toggle */}
        <div className="mt-16 mb-6 flex justify-center">
          <div className="relative z-10">
            <Tabs defaultValue="monthly" onValueChange={(value) => setBillingInterval(value as 'monthly' | 'annually')}>
              <TabsList className="grid w-full grid-cols-2 min-w-[320px] bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-lg border">
                <TabsTrigger 
                  value="monthly" 
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all duration-200 px-0 py-2"
                >
                  Monthly
                </TabsTrigger>
                <TabsTrigger 
                  value="annually" 
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all duration-200 px-2 py-2 flex items-center justify-center gap-2"
                >
                  <span>Annually</span>
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-0.5">
                    Save 20%
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className={cn(
          "isolate mx-auto mt-12 grid max-w-md gap-8 lg:mx-0 lg:max-w-none items-start",
          plans.length === 1 && "lg:grid-cols-1 justify-center",
          plans.length === 2 && "lg:grid-cols-2 justify-center",
          plans.length >= 3 && "lg:grid-cols-3",
        )}>
          {sortedPlans.map((plan, index) => {
            const isCurrentPlan = userProfile?.planId === plan.id;
            
            const monthlyOption = plan.pricingOptions.find(p => p.months === 1);
            const yearlyOption = plan.pricingOptions.find(p => p.months >= 12);
            
            const option = billingInterval === 'annually' ? (yearlyOption || monthlyOption) : (monthlyOption || yearlyOption);
            if (!option) return null;

            const savings = (monthlyOption && yearlyOption && billingInterval === 'annually')
              ? (monthlyOption.price * 12) - yearlyOption.price
              : 0;

            return (
                <Card key={plan.id} className={cn(
                    "relative flex flex-col rounded-3xl border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 backdrop-blur-sm overflow-hidden h-full",
                    "bg-white/80 dark:bg-slate-900/80",
                    plan.popular && !isCurrentPlan && "ring-2 ring-blue-500 border-blue-500 shadow-2xl",
                    isCurrentPlan && "ring-2 ring-green-500 border-green-500 shadow-2xl bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-950 dark:to-teal-950",
                    !plan.popular && !isCurrentPlan && "hover:border-blue-300 dark:hover:border-blue-700"
                )}>
                
                {/* Popular badge */}
                {plan.popular && !isCurrentPlan && (
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 z-20">
                        <div className="relative">
                            <Badge className="bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 text-white px-6 py-2 text-sm font-bold shadow-2xl whitespace-nowrap border-2 border-white dark:border-slate-800 rounded-full">
                                <Star className="h-4 w-4 mr-2 fill-current" />
                                MOST POPULAR
                            </Badge>
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 rounded-full blur opacity-30 scale-110"></div>
                        </div>
                    </div>
                )}

                {/* Current plan badge */}
                {isCurrentPlan && (
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 z-20">
                        <div className="relative">
                            <Badge className="bg-gradient-to-r from-green-600 via-green-700 to-emerald-600 text-white px-6 py-2 text-sm font-bold shadow-2xl whitespace-nowrap border-2 border-white dark:border-slate-800 rounded-full">
                                <Crown className="h-4 w-4 mr-2 fill-current" />
                                CURRENT PLAN
                            </Badge>
                            <div className="absolute inset-0 bg-gradient-to-r from-green-600 via-green-700 to-emerald-600 rounded-full blur opacity-30 scale-110"></div>
                        </div>
                    </div>
                )}

                <CardHeader className="p-8 pb-6 pt-16">
                    <div className="flex flex-col items-center text-center">
                        <div className="mb-4 p-3 rounded-full bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border border-blue-200 dark:border-blue-800">
                            <PlanIcon planName={plan.name} isCurrentPlan={isCurrentPlan} isPopular={plan.popular} />
                        </div>
                        <h3 className="text-2xl font-bold leading-8 mb-3 text-gray-900 dark:text-white">{plan.name}</h3>
                        <CardDescription className="text-base text-center leading-6 min-h-[3rem] flex items-center text-gray-600 dark:text-gray-300">
                            {plan.description}
                        </CardDescription>
                    </div>
                    
                    <div className="mt-8 flex flex-col items-center">
                        <div className="flex items-baseline justify-center gap-x-1 mb-2">
                            <span className="text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                PKR {option.price.toLocaleString()}
                            </span>
                            <span className="text-base lg:text-lg font-semibold text-gray-500 dark:text-gray-400">
                                /{option.months === 1 ? 'mo' : (option.months >= 12 ? 'yr' : `${option.months}mo`)}
                            </span>
                        </div>
                        
                        {savings > 0 && (
                            <div className="mt-3 inline-flex items-center gap-1 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-800 dark:text-green-200 px-4 py-2 rounded-full text-sm font-bold border border-green-200 dark:border-green-800">
                                <Sparkles className="h-4 w-4" />
                                Save PKR {savings.toLocaleString()}
                            </div>
                        )}
                        
                        {option.badge && (
                            <div className="mt-3">
                                <Badge variant="outline" className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200 dark:border-blue-800 text-sm px-3 py-1 font-medium">
                                    {option.badge}
                                </Badge>
                            </div>
                        )}
                    </div>
                </CardHeader>
                
                <CardContent className="p-8 pt-0 flex-1">
                    <ul role="list" className="space-y-4">
                        <li className="flex items-start gap-x-3">
                            <div className="flex-shrink-0 mt-1">
                                <div className="h-6 w-6 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                                    <Check className="h-4 w-4 text-white font-bold" />
                                </div>
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {plan.isAdSupported ? 'Ad-supported experience' : 'Ad-free experience'}
                            </span>
                        </li>
                        {plan.features.map((feature, featureIndex) => (
                            <li key={featureIndex} className="flex items-start gap-x-3">
                                <div className="flex-shrink-0 mt-1">
                                    <div className="h-6 w-6 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                                        <Check className="h-4 w-4 text-white font-bold" />
                                    </div>
                                </div>
                                <span className="text-sm leading-6 text-gray-700 dark:text-gray-300">
                                    {feature.text}
                                </span>
                            </li>
                        ))}
                    </ul>
                </CardContent>
                
                <CardFooter className="p-8 pt-0 mt-auto">
                    <PlanActionButton 
                        user={userProfile}
                        currentPlan={currentPlan}
                        targetPlan={plan}
                        option={option}
                        isCurrentPlan={isCurrentPlan}
                    />
                </CardFooter>
                </Card>
            )
          })}
        </div>
        
        {/* No plans available state */}
        {plans.length === 0 && (
             <div className="col-span-full text-center py-20">
                <div className="mx-auto max-w-md">
                    <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <Sparkles className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Plans Coming Soon</h3>
                    <p className="text-muted-foreground">
                        We're preparing amazing membership plans for you. Check back soon!
                    </p>
                </div>
            </div>
        )}

        {/* Trust indicators */}
        <div className="mt-20 text-center">
            <div className="inline-flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-500" />
                    <span>Secure Payment</span>
                </div>
                <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-500" />
                    <span>Instant Access</span>
                </div>
                <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-purple-500" />
                    <span>Cancel Anytime</span>
                </div>
            </div>
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}