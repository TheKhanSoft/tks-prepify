
'use client';

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { useRouter, useParams, useSearchParams, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getPlanById } from '@/lib/plan-service';
import type { Plan, PaymentMethod, User as UserProfile, PricingOption, PaymentMethodType, Discount } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Check, ArrowLeft, Banknote, Landmark, Wallet, X, Tag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchPaymentMethods } from '@/lib/payment-method-service';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { changeUserSubscription, getUserProfile } from '@/lib/user-service';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { validateDiscountCode } from '@/lib/discount-service';
import { cn } from '@/lib/utils';

// --- Reusable UI Components ---

const InfoRow = ({ label, value, className }: { label: string; value?: string | number; className?: string }) => (
    <div className={cn("flex justify-between text-sm", className)}>
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
};

const groupPaymentMethods = (methods: PaymentMethod[]) => {
    const groups: { [key in PaymentMethodType | 'other']?: PaymentMethod[] } = {};
    const groupOrder: (PaymentMethodType | 'other')[] = ['bank', 'easypaisa', 'jazzcash', 'crypto', 'other'];
    const groupLabels: Record<PaymentMethodType | 'other', string> = {
        bank: 'Bank Transfers',
        easypaisa: 'Mobile Wallets',
        jazzcash: 'Mobile Wallets',
        crypto: 'Cryptocurrency',
        other: 'Other Methods'
    };

    methods.forEach(method => {
        const groupKey = (method.type === 'easypaisa' || method.type === 'jazzcash') ? 'easypaisa' : method.type;
        if (!groups[groupKey]) {
            groups[groupKey] = [];
        }
        groups[groupKey]!.push(method);
    });

    return groupOrder
        .map(key => ({
            label: groupLabels[key],
            methods: groups[key] || []
        }))
        .filter(group => group.methods.length > 0);
};

function CheckoutPageSkeleton() {
    return (
      <div className="container mx-auto max-w-4xl py-12">
        <Skeleton className="h-10 w-28 mb-6" />
        <div className="grid md:grid-cols-2 gap-8 items-start">
            <Card className="sticky top-24">
                <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 border rounded-lg bg-muted/50 space-y-2">
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-5 w-1/4" />
                        <Skeleton className="h-10 w-1/3 mt-4" />
                    </div>
                    <div className="space-y-2 pt-4">
                        <Skeleton className="h-5 w-1/3 mb-2" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                     <Skeleton className="h-12 w-full" />
                </CardFooter>
            </Card>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                 <CardContent className="space-y-4">
                   <Skeleton className="h-12 w-full" />
                   <Skeleton className="h-12 w-full" />
                   <Skeleton className="h-12 w-full" />
                </CardContent>
            </Card>
        </div>
      </div>
    );
}

function CheckoutPageComponent({ planId, optionLabel }: { planId: string, optionLabel: string | null }) {
    const router = useRouter();
    const pathname = usePathname();
    const { toast } = useToast();
    const { user, loading: authLoading } = useAuth();
    
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [selectedOption, setSelectedOption] = useState<PricingOption | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [isConfirming, setIsConfirming] = useState(false);

    // Discount state
    const [couponCode, setCouponCode] = useState('');
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
    const [appliedDiscount, setAppliedDiscount] = useState<Discount | null>(null);

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            const redirectUrl = optionLabel ? `${pathname}?option=${encodeURIComponent(optionLabel)}` : pathname;
            router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
            return;
        }

        const loadData = async () => {
            if (!planId || !optionLabel) {
                 toast({ title: "Invalid Link", description: "The checkout link is missing required information.", variant: "destructive" });
                 router.push('/pricing');
                 return;
            }
            
            try {
                const [plan, methods, profile] = await Promise.all([
                    getPlanById(planId),
                    fetchPaymentMethods(true),
                    getUserProfile(user.uid),
                ]);
                
                if (!plan || !profile) {
                    throw new Error("Plan or user profile not found.");
                }
                
                const option = plan.pricingOptions.find(p => p.label === optionLabel);
                if (!option) {
                    throw new Error("The selected pricing option is invalid for this plan.");
                }

                if (plan.id === profile.planId) {
                    toast({ title: "Already Subscribed", description: "You are already on this plan.", variant: "default" });
                    router.push('/account/subscription');
                    return;
                }

                setSelectedPlan(plan);
                setSelectedOption(option);
                setPaymentMethods(methods);
                setUserProfile(profile);
                
            } catch (error: any) {
                 toast({ title: "Error Loading Checkout", description: error.message || "Could not load checkout details.", variant: "destructive" });
                 router.push('/pricing');
            } finally {
                setLoading(false);
            }
        };
        
        loadData();
    }, [planId, optionLabel, user, authLoading, router, toast, pathname]);
    
    const handleApplyCoupon = useCallback(async () => {
        if (!couponCode || !selectedPlan || !selectedOption) return;
        setIsApplyingCoupon(true);
        try {
            const result = await validateDiscountCode(couponCode, selectedPlan.id, selectedOption.label);
            if (result.success && result.discount) {
                setAppliedDiscount(result.discount);
                toast({ title: "Coupon Applied!", description: result.message });
            } else {
                toast({ title: "Invalid Coupon", description: result.message, variant: "destructive" });
                setCouponCode('');
            }
        } catch (error) {
            toast({ title: "Error", description: "Could not apply coupon.", variant: "destructive" });
        } finally {
            setIsApplyingCoupon(false);
        }
    }, [couponCode, selectedPlan, selectedOption, toast]);

    const handleRemoveCoupon = () => {
        setAppliedDiscount(null);
        setCouponCode('');
        toast({ title: "Coupon Removed" });
    };


    const handleConfirmPurchase = async () => {
        if (!user || !selectedPlan || !selectedOption) return;
        setIsConfirming(true);
        try {
            await changeUserSubscription(user.id, selectedPlan.id, { 
              endDate: null,
              pricingOption: selectedOption,
              discount: appliedDiscount,
              status: 'pending',
              remarks: `User initiated checkout for ${selectedOption.label}. Awaiting payment.`
            });
            toast({
                title: "Purchase Request Sent!",
                description: `Your subscription to the ${selectedPlan.name} plan is now pending payment confirmation.`
            });
            router.push('/account/subscription');
        } catch (error: any) {
            toast({
                title: 'Purchase Failed',
                description: error.message || "Could not complete your purchase. Please try again.",
                variant: 'destructive'
            });
        } finally {
            setIsConfirming(false);
        }
    };
    
    const { originalPrice, discountAmount, finalPrice } = useMemo(() => {
        const price = selectedOption?.price ?? 0;
        let discount = 0;
        if (appliedDiscount) {
            if (appliedDiscount.type === 'percentage') {
                discount = price * (appliedDiscount.value / 100);
            } else { // flat
                discount = appliedDiscount.value;
            }
        }
        const final = Math.max(0, price - discount);
        return { originalPrice: price, discountAmount: discount, finalPrice: final };
    }, [selectedOption, appliedDiscount]);
    
    const groupedMethods = useMemo(() => groupPaymentMethods(paymentMethods), [paymentMethods]);

    if (authLoading || loading) {
        return <CheckoutPageSkeleton />;
    }
    
    if (!selectedPlan || !selectedOption || !userProfile) {
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
                <Card className="sticky top-24">
                    <CardHeader>
                        <CardTitle>Order Summary</CardTitle>
                        <CardDescription>You are purchasing the following plan.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 border rounded-lg bg-muted/50">
                            <h3 className="text-xl font-bold">{selectedPlan.name}</h3>
                            <p className="text-muted-foreground">{selectedOption.label} Plan</p>
                        </div>
                        <div className="space-y-2 pt-4">
                            <InfoRow label="Base Price" value={`PKR ${originalPrice.toFixed(2)}`} />
                            {appliedDiscount && (
                                <>
                                    <InfoRow label={`Discount (${appliedDiscount.name})`} value={`- PKR ${discountAmount.toFixed(2)}`} className="text-green-600"/>
                                    <Separator/>
                                    <InfoRow label="Total Amount" value={`PKR ${finalPrice.toFixed(2)}`} className="font-bold text-lg" />
                                </>
                            )}
                        </div>
                        <div className="pt-4 space-y-2">
                             <h4 className="font-semibold mb-2">Apply Coupon</h4>
                             {appliedDiscount ? (
                                <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50 text-green-700">
                                    <p className="font-semibold flex items-center gap-2"><Tag className="h-4 w-4"/>Code "{appliedDiscount.code}" applied!</p>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-green-700" onClick={handleRemoveCoupon}><X className="h-4 w-4"/></Button>
                                </div>
                             ) : (
                                <div className="flex w-full items-center space-x-2">
                                    <Input type="text" placeholder="Coupon Code" value={couponCode} onChange={e => setCouponCode(e.target.value)} disabled={isApplyingCoupon}/>
                                    <Button type="submit" onClick={handleApplyCoupon} disabled={!couponCode || isApplyingCoupon}>
                                       {isApplyingCoupon && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Apply
                                    </Button>
                                </div>
                             )}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" size="lg" onClick={handleConfirmPurchase} disabled={isConfirming}>
                            {isConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            Confirm Purchase (PKR {finalPrice.toFixed(2)})
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
                         {groupedMethods.map(group => (
                             <div key={group.label} className="space-y-2">
                                 <h4 className="font-semibold text-muted-foreground px-1">{group.label}</h4>
                                 {group.methods.map(method => (
                                     <AccordionItem value={method.id} key={method.id}>
                                         <AccordionTrigger className="font-semibold text-base">
                                            <div className="flex items-center gap-3">
                                                 {getIconForType(method.type)}
                                                 {method.name}
                                            </div>
                                         </AccordionTrigger>
                                         <AccordionContent>
                                             <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                                                 {method.details.accountTitle && <InfoRow label="Account Title" value={method.details.accountTitle} />}
                                                 {method.details.accountNumber && <InfoRow label="Account Number" value={method.details.accountNumber} />}
                                                 {method.details.bankName && <InfoRow label="Bank Name" value={method.details.bankName} />}
                                                 {method.details.iban && <InfoRow label="IBAN" value={method.details.iban} />}
                                                 {method.details.network && <InfoRow label="Network" value={method.details.network} />}
                                                 {method.details.walletAddress && <InfoRow label="Wallet Address" value={method.details.walletAddress} />}
                                                 <p className="text-xs text-muted-foreground pt-4">After payment, please send a screenshot of the transaction to our support team for verification.</p>
                                             </div>
                                         </AccordionContent>
                                     </AccordionItem>
                                 ))}
                             </div>
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

export default function CheckoutPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const planId = params.planid as string;
    const optionLabel = searchParams.get('option');

    return (
        <Suspense fallback={<CheckoutPageSkeleton />}>
            <CheckoutPageComponent planId={planId} optionLabel={optionLabel} />
        </Suspense>
    );
}

    