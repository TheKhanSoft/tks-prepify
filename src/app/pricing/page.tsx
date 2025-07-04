
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchPlans } from '@/lib/plan-service';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default async function PricingPage() {
  const plans = await fetchPlans(true); // Fetch only published plans

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
        
        <div className={cn(
          "isolate mx-auto mt-16 grid max-w-md gap-8 lg:mx-0 lg:max-w-none",
          plans.length === 1 && "lg:grid-cols-1",
          plans.length === 2 && "lg:grid-cols-2",
          plans.length >= 3 && "lg:grid-cols-3",
        )}>
          {plans.map((plan) => (
            <Card key={plan.id} className={cn(
              "flex flex-col rounded-3xl",
              plan.popular ? "ring-2 ring-primary border-primary shadow-2xl" : "shadow-lg"
            )}>
              <CardHeader className="p-8">
                <div className="flex items-center justify-between gap-4">
                    <h3 className="text-2xl font-semibold leading-8">{plan.name}</h3>
                    {plan.popular && <Badge>Most Popular</Badge>}
                </div>
                <CardDescription className="mt-4">{plan.description}</CardDescription>
                <div className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-5xl font-bold tracking-tight">${plan.price}</span>
                  <span className="text-sm font-semibold leading-6 text-muted-foreground">/{plan.interval}</span>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-0 flex-1">
                <ul role="list" className="space-y-4 text-sm leading-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-x-3">
                      <Check className="h-6 w-5 flex-none text-primary" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="p-8 pt-0">
                 <Button asChild size="lg" className="w-full" variant={plan.popular ? 'default' : 'outline'}>
                    <Link href="/signup">Choose Plan</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
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
