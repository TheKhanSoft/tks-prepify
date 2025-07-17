
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getPlanById } from '@/lib/plan-service';
import type { Plan, PaymentMethod, User as UserProfile } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Check, ArrowLeft, Banknote, Landmark, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchPaymentMethods } from '@/lib/payment-method-service';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { changeUserSubscription, getUserProfile } from '@/lib/user-service';
import { format } from 'date-fns';

const InfoRow = ({ label, value }: { label: string; value?: string | number }) => (
    <div className="flex justify-between text-sm">
        <p className="text-muted-foreground">{label}</p>
        <p className="font-medium text-right">{value || '-'}</p>
    </div>
);

const getIconForType = (type: string) => {
    switch (type) {
        case 'bank': return <Landmark className="h-5 w-5" />;
        case 'easypaisa': return <Banknote className="h-5 w-5 text-green-500" />;
        case 'jazzcash': return <Banknote className="h-5 w-5 text-red-500" />;
        case 'crypto': return <Wallet className="h-5 w-5 text-amber-500" />;
        default: return <Banknote className="h-5 w-5" />;
    }
}

export default function CheckoutPage() {
    const params = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const { toast } = useToast();
    const { user, loading: authLoading } = useAuth();
    const planId = params.planId as string;

    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [isConfirming, setIsConfirming] = useState(false);
    
    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push(`/login?redirect=${pathname}`);
            return;
        }

        const loadData = async () => {
            setLoading(true);
            try {
                const [plan, methods, profile] = await Promise.all([
                    getPlanById(planId),
                    fetchPaymentMethods(true),
                    getUserProfile(user.uid),
                ]);
                
                if (!plan) {
                    toast({ title: "Error", description: "This plan could not be found.", variant: "destructive" });
                    router.push('/pricing');
                    return;
                }
                
                if (plan.id === profile?.planId) {
                    toast({ title: "Already Subscribed", description: "You are already subscribed to this plan.", variant: "default" });
                    router.push('/account/subscription');
                    return;
                }

                setSelectedPlan(plan);
                setPaymentMethods(methods);
                setUserProfile(profile);
                
            } catch (error) {
                toast({ title: "Error", description: "Could not load page details.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        }
        loadData();

    }, [planId, user, authLoading, router, toast, pathname]);

    const handleConfirmPurchase = async () => {
        if (!user || !selectedPlan) return;
        setIsConfirming(true);
        try {
            await changeUserSubscription(user.uid, selectedPlan.id, { remarks: "User self-subscribed via checkout." });
            toast({
                title: "Purchase Successful!",
                description: `You have successfully subscribed to the ${selectedPlan.name} plan.`
            });
            router.push('/account/dashboard');
        } catch (error: any) {
            toast({
                title: 'Purchase Failed',
                description: error.message || "Could not complete your purchase. Please try again.",
                variant: 'destructive'
            });
        } finally {
            setIsConfirming(false);
        }
    }


    if (loading || authLoading) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!selectedPlan) {
         return (
             <div className="flex items-center justify-center h-screen flex-col gap-4">
                 <h1 className="text-2xl font-semibold">Could not load plan</h1>
                 <p className="text-muted-foreground">The selected plan might not exist or is unavailable.</p>
                 <Button onClick={() => router.push('/pricing')}>Go to Pricing</Button>
             </div>
         );
    }

    const pricingOption = selectedPlan.pricingOptions[0]; // Assuming one for now

    return (
        <div className="container mx-auto max-w-4xl py-12">
            <div className="mb-6">
                 <Button variant="outline" onClick={() => router.push('/pricing')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Plans
                </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-8 items-start">
                <Card className="sticky top-24">
                    <CardHeader>
                        <CardTitle>Order Summary</CardTitle>
                        <CardDescription>You are purchasing the following plan.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 border rounded-lg bg-muted/50">
                            <h3 className="text-xl font-bold">{selectedPlan.name}</h3>
                            <p className="text-muted-foreground">{selectedPlan.description}</p>
                            <div className="mt-4 text-4xl font-extrabold">
                                PKR {pricingOption?.price || '0'}
                                <span className="text-base font-normal text-muted-foreground">/{pricingOption?.label || 'unit'}</span>
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
                         <Card className="mt-4 bg-transparent shadow-none">
                            <CardHeader className="p-0 pb-2"><h4 className="font-semibold">User Details</h4></CardHeader>
                            <CardContent className="p-0 space-y-1">
                                <InfoRow label="Name" value={userProfile?.name || 'N/A'}/>
                                <InfoRow label="Email" value={userProfile?.email || 'N/A'}/>
                            </CardContent>
                        </Card>
                    </CardContent>
                     <CardFooter>
                        <Button className="w-full" size="lg" onClick={handleConfirmPurchase} disabled={isConfirming}>
                            {isConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            Confirm Purchase
                        </Button>
                    </CardFooter>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">Payment Details</CardTitle>
                        <CardDescription>Please complete your payment using one of the methods below.</CardDescription>
                    </CardHeader>
                     <CardContent className="space-y-4">
                       <Accordion type="single" collapsible className="w-full">
                         {paymentMethods.map(method => (
                            <AccordionItem value={method.id} key={method.id}>
                                <AccordionTrigger className="font-semibold text-base">
                                   <div className="flex items-center gap-3">
                                        {getIconForType(method.type)}
                                        {method.name}
                                   </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                                        {method.type === 'bank' && (
                                            <>
                                                <InfoRow label="Bank Name" value={method.details.bankName} />
                                                <InfoRow label="Account Title" value={method.details.accountTitle} />
                                                <InfoRow label="Account Number" value={method.details.accountNumber} />
                                                <InfoRow label="IBAN" value={method.details.iban} />
                                            </>
                                        )}
                                        {(method.type === 'easypaisa' || method.type === 'jazzcash') && (
                                            <>
                                                <InfoRow label="Account Title" value={method.details.accountTitle} />
                                                <InfoRow label="Account Number" value={method.details.accountNumber} />
                                            </>
                                        )}
                                        {method.type === 'crypto' && (
                                            <>
                                                <InfoRow label="Network" value={method.details.network} />
                                                <InfoRow label="Wallet Address" value={method.details.walletAddress} />
                                            </>
                                        )}
                                        <p className="text-xs text-muted-foreground pt-4">After payment, please send a screenshot of the transaction to our support team for verification.</p>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                         ))}
                       </Accordion>
                       {paymentMethods.length === 0 && (
                           <div className="text-center text-muted-foreground py-8">
                               No payment methods are currently available. Please contact support.
                           </div>
                       )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

