
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchPlans } from '@/lib/plan-service';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { Plan, User as UserProfile, PricingOption } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { getUserProfile } from '@/lib/user-service';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const PlanActionButton = ({ user, currentPlan, targetPlan, option, isCurrentPlan, isUpgrade, isDowngrade }: {
    user: UserProfile | null,
    currentPlan: Plan | null,
    targetPlan: Plan,
    option: PricingOption,
    isCurrentPlan: boolean,
    isUpgrade: boolean,
    isDowngrade: boolean,
}) => {
    let buttonText = `Choose ${option.label}`;
    if (user) {
        if (isCurrentPlan) buttonText = "Your Current Plan";
        else if (isUpgrade) buttonText = `Upgrade to ${option.label}`;
        else if (isDowngrade) buttonText = "Downgrade";
    }

    const checkoutLink = user
      ? `/checkout/${targetPlan.id}?option=${encodeURIComponent(option.label)}`
      : '/signup';

    if (isDowngrade) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <span tabIndex={0} className="w-full">
                        <Button size="lg" className="w-full" variant={targetPlan.popular ? 'default' : 'outline'} disabled>
                            {buttonText}
                        </Button>
                    </span>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Please contact support to downgrade your plan.</p>
                </TooltipContent>
            </Tooltip>
        );
    }

    return (
        <Button asChild size="lg" className="w-full" variant={targetPlan.popular ? 'default' : 'outline'} disabled={isCurrentPlan}>
            <Link href={checkoutLink}>
                {buttonText}
            </Link>
        </Button>
    );
};


export default function PricingPage() {
  const { user, loading: authLoading } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

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
    return <div className="flex justify-center items-center h-[50vh]"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  const currentPlan = userProfile ? plans.find(p => p.id === userProfile.planId) : null;

  return (
    <TooltipProvider>
    <div className="bg-background text-foreground">
      <div className="container mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl font-headline">
            Pricing Plans for Every Goal
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Choose the perfect plan to unlock your potential and ace your exams.
          </p>
        </div>

        <div className={cn(
          "isolate mx-auto mt-16 grid max-w-md gap-8 lg:mx-0 lg:max-w-none",
          plans.length === 1 && "lg:grid-cols-1",
          plans.length === 2 && "lg:grid-cols-2",
          plans.length >= 3 && "lg:grid-cols-3",
        )}>
          {sortedPlans.map((plan) => {
            const isCurrentPlan = userProfile?.planId === plan.id;
            const monthlyOption = plan.pricingOptions.find(p => p.months === 1);
            const yearlyOption = plan.pricingOptions.find(p => p.months === 12);
            const otherOptions = plan.pricingOptions.filter(p => p.months !== 1 && p.months !== 12);

            const getLowestPrice = (options: PricingOption[]): number => {
                if (!options || options.length === 0) return -1;
                return Math.min(...options.map(o => o.price));
            };

            const currentPlanPrice = getLowestPrice(currentPlan?.pricingOptions || []);

            return (
                <Card key={plan.id} className={cn(
                    "flex flex-col rounded-3xl",
                    plan.popular && !isCurrentPlan && "ring-2 ring-primary border-primary shadow-2xl",
                    isCurrentPlan && "ring-2 ring-blue-500 border-blue-500 shadow-2xl"
                )}>
                <CardHeader className="p-8">
                    <div className="flex items-center justify-between gap-4">
                        <h3 className="text-2xl font-semibold leading-8">{plan.name}</h3>
                        {isCurrentPlan ? (
                             <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">Current Plan</Badge>
                        ) : plan.popular && <Badge>Most Popular</Badge>}
                    </div>
                    <CardDescription className="mt-4">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-0 flex-1">
                    <ul role="list" className="space-y-4 text-sm leading-6">
                      <li className="flex gap-x-3">
                        <Check className="h-6 w-5 flex-none text-primary" aria-hidden="true" />
                        {plan.isAdSupported ? 'Ad-supported experience' : 'Ad-free experience'}
                      </li>
                      {plan.features.map((feature, index) => (
                          <li key={index} className="flex gap-x-3">
                              <Check className="h-6 w-5 flex-none text-primary" aria-hidden="true" />
                              <span>
                                  {feature.text}
                              </span>
                          </li>
                      ))}
                    </ul>
                </CardContent>
                <CardFooter className="p-8 pt-0 mt-auto">
                    <div className="w-full space-y-4">
                        {[...(monthlyOption ? [monthlyOption] : []), ...(yearlyOption ? [yearlyOption] : []), ...otherOptions].map(option => {
                           const targetPrice = option.price;
                           const isUpgrade = user && currentPlan && !isCurrentPlan && targetPrice > currentPlanPrice;
                           const isDowngrade = user && currentPlan && !isCurrentPlan && targetPrice < currentPlanPrice;
                           
                           return (
                               <div key={option.label} className="text-center">
                                    <div className="flex items-baseline justify-center gap-x-1">
                                       <span className="text-4xl font-bold tracking-tight">PKR {option.price}</span>
                                       <span className="text-sm font-semibold leading-6 text-muted-foreground">/{option.months === 1 ? 'month' : (option.months === 12 ? 'year' : `${option.months} mo`)}</span>
                                    </div>
                                    {option.badge && <Badge className="mt-2">{option.badge}</Badge>}
                                    <div className="mt-4">
                                       <PlanActionButton 
                                            user={userProfile}
                                            currentPlan={currentPlan}
                                            targetPlan={plan}
                                            option={option}
                                            isCurrentPlan={isCurrentPlan}
                                            isUpgrade={isUpgrade}
                                            isDowngrade={isDowngrade}
                                       />
                                    </div>
                               </div>
                           )
                        })}
                    </div>
                </CardFooter>
                </Card>
            )
          })}
        </div>
        
        {plans.length === 0 && (
             <div className="col-span-full text-center text-muted-foreground py-16">
              <p className="text-xl">No membership plans are available at the moment. Please check back soon!</p>
            </div>
        )}
      </div>
    </div>
    </TooltipProvider>
  );
}
