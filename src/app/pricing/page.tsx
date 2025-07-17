
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchPlans } from '@/lib/plan-service';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Plan, User as UserProfile } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { getUserProfile } from '@/lib/user-service';

export default function PricingPage() {
  const { user, loading: authLoading } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [interval, setInterval] = useState<'month' | 'year'>('month');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const fetchedPlans = await fetchPlans(true); // Fetch only published plans
      setPlans(fetchedPlans);
      
      if (user && !authLoading) {
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
      }
      
      setLoading(false);
    };
    loadData();
  }, [user, authLoading]);

  if (loading || authLoading) {
    return <div className="flex justify-center items-center h-[50vh]"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
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

        {plans.length > 0 && (
            <div className="mt-16 flex justify-center">
                <Tabs defaultValue="month" onValueChange={(value) => setInterval(value as any)}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="month">Monthly</TabsTrigger>
                        <TabsTrigger value="year">Annually</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
        )}
        
        <div className={cn(
          "isolate mx-auto mt-10 grid max-w-md gap-8 lg:mx-0 lg:max-w-none",
          plans.length === 1 && "lg:grid-cols-1",
          plans.length === 2 && "lg:grid-cols-2",
          plans.length >= 3 && "lg:grid-cols-3",
        )}>
          {plans.map((plan) => {
            const isCurrentPlan = userProfile?.planId === plan.id;
            const monthlyOption = plan.pricingOptions.find(p => p.months === 1);
            const yearlyOption = plan.pricingOptions.find(p => p.months === 12);
            
            const displayOption = interval === 'year' ? yearlyOption : monthlyOption;

            if (!displayOption) return null;

            let savings = 0;
            if (interval === 'year' && monthlyOption && yearlyOption) {
                savings = (monthlyOption.price * 12) - yearlyOption.price;
            }

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
                    <div className="mt-6 flex items-baseline gap-x-1">
                    <span className="text-5xl font-bold tracking-tight">PKR {displayOption.price}</span>
                    <span className="text-sm font-semibold leading-6 text-muted-foreground">/{interval}</span>
                    </div>
                     {displayOption.badge && (
                        <Badge className="mt-2 bg-accent/20 text-accent-foreground border-accent/50 hover:bg-accent/30">{displayOption.badge}</Badge>
                    )}
                     {savings > 0 && (
                        <p className="mt-1 text-sm text-green-600 font-semibold">
                            You save PKR {savings.toFixed(2)} a year!
                        </p>
                    )}
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
                <CardFooter className="p-8 pt-0">
                    {isCurrentPlan ? (
                         <Button size="lg" className="w-full" disabled>Your Current Plan</Button>
                    ) : (
                        <Button asChild size="lg" className="w-full" variant={plan.popular ? 'default' : 'outline'}>
                            <Link href="/signup">Choose Plan</Link>
                        </Button>
                    )}
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
  );
}
