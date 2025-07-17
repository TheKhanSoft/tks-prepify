
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getPlanById } from '@/lib/plan-service';
import { getUserProfile, changeUserSubscription } from '@/lib/user-service';
import type { Plan, User as UserProfile } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Check, ArrowLeft, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function CheckoutPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { user, loading: authLoading } = useAuth();
    const planId = params.planId as string;

    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push(`/login?redirect=/checkout/${planId}`);
            return;
        }

        const loadData = async () => {
            setLoading(true);
            try {
                const plan = await getPlanById(planId);
                if (!plan) {
                    toast({ title: "Error", description: "This plan could not be found.", variant: "destructive" });
                    router.push('/pricing');
                    return;
                }
                setSelectedPlan(plan);
                
                const profile = await getUserProfile(user.uid);
                setUserProfile(profile);

                if (profile?.planId) {
                    const current = await getPlanById(profile.planId);
                    setCurrentPlan(current);
                }

            } catch (error) {
                toast({ title: "Error", description: "Could not load plan details.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        }
        loadData();

    }, [planId, user, authLoading, router, toast]);

    const handleConfirmPurchase = async () => {
        if (!user || !selectedPlan) return;
        setIsSubmitting(true);
        try {
            await changeUserSubscription(user.uid, selectedPlan.id, { remarks: "User upgraded via checkout." });
            toast({
                title: "Purchase Successful!",
                description: `You are now subscribed to the ${selectedPlan.name} plan.`,
            });
            router.push('/account/dashboard');
        } catch (error: any) {
            toast({
                title: "Purchase Failed",
                description: error.message || "Could not complete the purchase. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading || authLoading) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!selectedPlan) {
        return null;
    }

    return (
        <div className="container mx-auto max-w-4xl py-12">
            <div className="mb-6">
                 <Button variant="outline" onClick={() => router.push('/pricing')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Plans
                </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-8 items-start">
                <Card>
                    <CardHeader>
                        <CardTitle>Order Summary</CardTitle>
                        <CardDescription>You are purchasing the following plan.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 border rounded-lg bg-muted/50">
                            <h3 className="text-xl font-bold">{selectedPlan.name}</h3>
                            <p className="text-muted-foreground">{selectedPlan.description}</p>
                            <div className="mt-4 text-4xl font-extrabold">
                                PKR {selectedPlan.pricingOptions[0]?.price || '0'}
                                <span className="text-base font-normal text-muted-foreground">/{selectedPlan.pricingOptions[0]?.label || 'unit'}</span>
                            </div>
                        </div>
                        <div>
                             <h4 className="font-semibold mb-2">Features Included:</h4>
                             <ul role="list" className="space-y-2 text-sm">
                                {selectedPlan.features.map((feature, index) => (
                                    <li key={index} className="flex items-center gap-2 text-muted-foreground">
                                        <Check className="h-4 w-4 text-green-500" />
                                        <span>{feature.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5"/> Payment Details</CardTitle>
                        <CardDescription>This is a simulated payment form.</CardDescription>
                    </CardHeader>
                     <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="card-number">Card Number</Label>
                            <Input id="card-number" placeholder="**** **** **** 1234" disabled />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="expiry-date">Expiry Date</Label>
                                <Input id="expiry-date" placeholder="MM/YY" disabled />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="cvc">CVC</Label>
                                <Input id="cvc" placeholder="123" disabled />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="card-name">Name on Card</Label>
                            <Input id="card-name" placeholder="John Doe" disabled />
                        </div>
                    </CardContent>
                    <CardFooter>
                         <Button className="w-full" size="lg" onClick={handleConfirmPurchase} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Purchase
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
