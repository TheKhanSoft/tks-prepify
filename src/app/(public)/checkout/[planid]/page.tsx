'use client';

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { useRouter, useParams, useSearchParams, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getPlanById } from '@/lib/plan-service';
import type { Plan, PaymentMethod, User as UserProfile, PricingOption, PaymentMethodType, Discount } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, ArrowLeft, Banknote, Landmark, Wallet, X, Tag, Shield, Clock, CreditCard, Copy, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchPaymentMethods } from '@/lib/payment-method-service';
import { changeUserSubscription, getUserProfile } from '@/lib/user-service';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { validateDiscountCode } from '@/lib/discount-service';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createOrder } from '@/lib/order-service';


// --- Enhanced Reusable UI Components ---

const InfoRow = ({ label, value, className, copyable = false }: { 
  label: string; 
  value?: string | number; 
  className?: string; 
  copyable?: boolean;
}) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    if (value && copyable) {
      try {
        await navigator.clipboard.writeText(value.toString());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  return (
    <div className={cn("flex justify-between items-center text-sm py-2", className)}>
      <p className="text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <p className="font-medium text-right">{value || '-'}</p>
        {copyable && value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-6 w-6 p-0"
          >
            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          </Button>
        )}
      </div>
    </div>
  );
};

const getIconForType = (type: string) => {
  switch (type) {
    case 'bank': return <Landmark className="h-5 w-5 text-blue-500" />;
    case 'easypaisa': return <Banknote className="h-5 w-5 text-green-500" />;
    case 'jazzcash': return <Banknote className="h-5 w-5 text-orange-500" />;
    case 'crypto': return <Wallet className="h-5 w-5 text-amber-500" />;
    default: return <CreditCard className="h-5 w-5 text-gray-500" />;
  }
};

const getBadgeForType = (type: string) => {
  switch (type) {
    case 'bank': return <Badge variant="outline" className="text-blue-600 border-blue-200">Bank Transfer</Badge>;
    case 'easypaisa': return <Badge variant="outline" className="text-green-600 border-green-200">EasyPaisa</Badge>;
    case 'jazzcash': return <Badge variant="outline" className="text-orange-600 border-orange-200">JazzCash</Badge>;
    case 'crypto': return <Badge variant="outline" className="text-amber-600 border-amber-200">Crypto</Badge>;
    default: return <Badge variant="outline">Payment</Badge>;
  }
};

const groupPaymentMethods = (methods: PaymentMethod[]) => {
  const groups: { [key in PaymentMethodType | 'mobile']?: PaymentMethod[] } = {};
  const groupOrder: (PaymentMethodType | 'mobile')[] = ['bank', 'mobile', 'crypto', 'creditcard'];
  const groupLabels: Record<PaymentMethodType | 'mobile', string> = {
    bank: 'Bank Transfer',
    mobile: 'Mobile Wallets',
    crypto: 'Cryptocurrency',
    creditcard: 'Credit Card',
  };

  methods.forEach(method => {
    let groupKey: PaymentMethodType | 'mobile' = method.type;
    if (method.type === 'easypaisa' || method.type === 'jazzcash') {
      groupKey = 'mobile';
    }
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey]!.push(method);
  });

  return groupOrder
    .map(key => ({
      key,
      label: groupLabels[key],
      methods: groups[key] || []
    }))
    .filter(group => group.methods.length > 0);
};

function CheckoutPageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto max-w-6xl py-8">
        <div className="mb-8">
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2">
            <Card className="sticky top-8">
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentMethodCard({ method, isSelected, onSelect }: { 
  method: PaymentMethod; 
  isSelected: boolean; 
  onSelect: () => void; 
}) {
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        isSelected ? "ring-2 ring-primary border-primary" : "border-gray-200"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {getIconForType(method.type)}
            <div>
              <h4 className="font-semibold">{method.name}</h4>
              {getBadgeForType(method.type)}
            </div>
          </div>
          <div className={cn(
            "w-4 h-4 rounded-full border-2 flex items-center justify-center",
            isSelected ? "border-primary bg-primary" : "border-gray-300"
          )}>
            {isSelected && <Check className="h-2 w-2 text-white" />}
          </div>
        </div>
        
        {isSelected && (
          <div className="space-y-2 pt-3 border-t">
            {method.details.accountTitle && (
              <InfoRow label="Account Title" value={method.details.accountTitle} copyable />
            )}
            {method.details.accountNumber && (
              <InfoRow label="Account Number" value={method.details.accountNumber} copyable />
            )}
            {method.details.bankName && (
              <InfoRow label="Bank Name" value={method.details.bankName} />
            )}
            {method.details.iban && (
              <InfoRow label="IBAN" value={method.details.iban} copyable />
            )}
            {method.details.network && (
              <InfoRow label="Network" value={method.details.network} />
            )}
            {method.details.walletAddress && (
              <InfoRow label="Wallet Address" value={method.details.walletAddress} copyable />
            )}
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                After payment, please send a screenshot of the transaction to our support team for verification.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
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
        
        // Auto-select first payment method
        if (methods.length > 0) {
          setSelectedPaymentMethod(methods[0]);
        }
        
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

  const { originalPrice, discountAmount, finalPrice } = useMemo(() => {
    const price = selectedOption?.price ?? 0;
    let discount = 0;
    if (appliedDiscount) {
      if (appliedDiscount.type === 'percentage') {
        discount = price * (appliedDiscount.value / 100);
      } else {
        discount = appliedDiscount.value;
      }
    }
    const final = Math.max(0, price - discount);
    return { originalPrice: price, discountAmount: discount, finalPrice: final };
  }, [selectedOption, appliedDiscount]);


  const handleConfirmPurchase = async () => {
    if (!user || !userProfile || !selectedPlan || !selectedOption || !selectedPaymentMethod) {
      toast({ title: 'Error', description: 'Missing necessary information to create an order.', variant: 'destructive'});
      return;
    };
    setIsConfirming(true);
    try {
      const orderData = {
          userId: user.uid,
          userName: userProfile.name,
          userEmail: userProfile.email,
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          pricingOptionLabel: selectedOption.label,
          originalPrice: originalPrice,
          finalAmount: finalPrice,
          discountId: appliedDiscount?.id,
          discountCode: appliedDiscount?.code,
          discountAmount: discountAmount,
          paymentMethod: selectedPaymentMethod.name,
          paymentMethodType: selectedPaymentMethod.type,
      };

      const orderId = await createOrder(orderData);
      
      toast({
        title: "Order Placed!",
        description: `Your request for the ${selectedPlan.name} plan is being processed.`
      });
      router.push(`/checkout/order-completed/${orderId}`);
    } catch (error: any) {
      toast({
        title: 'Order Failed',
        description: error.message || "Could not place your order. Please try again.",
        variant: 'destructive'
      });
    } finally {
      setIsConfirming(false);
    }
  };
  
  const groupedMethods = useMemo(() => groupPaymentMethods(paymentMethods), [paymentMethods]);

  if (authLoading || loading) {
    return <CheckoutPageSkeleton />;
  }
  
  if (!selectedPlan || !selectedOption || !userProfile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto max-w-6xl py-8">
        <div className="mb-8">
          <Button variant="outline" onClick={() => router.push('/pricing')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Plans
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Plans</span>
            <span>/</span>
            <span>{selectedPlan.name}</span>
            <span>/</span>
            <span className="text-foreground font-medium">Checkout</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Payment Methods Section */}
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Methods
                </CardTitle>
                <CardDescription>
                  Choose your preferred payment method to complete the purchase
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={groupedMethods[0]?.key} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    {groupedMethods.map(group => (
                      <TabsTrigger key={group.key} value={group.key} className="flex items-center gap-2">
                        {group.key === 'bank' && <Landmark className="h-4 w-4" />}
                        {group.key === 'mobile' && <Banknote className="h-4 w-4" />}
                        {group.key === 'crypto' && <Wallet className="h-4 w-4" />}
                        {group.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {groupedMethods.map(group => (
                    <TabsContent key={group.key} value={group.key} className="space-y-4 mt-6">
                      {group.methods.map(method => (
                        <PaymentMethodCard
                          key={method.id}
                          method={method}
                          isSelected={selectedPaymentMethod?.id === method.id}
                          onSelect={() => setSelectedPaymentMethod(method)}
                        />
                      ))}
                    </TabsContent>
                  ))}
                </Tabs>
                
                {paymentMethods.length === 0 && (
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No payment methods are currently available.</p>
                    <p className="text-sm text-muted-foreground">Please contact support for assistance.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Summary Section */}
          <div className="lg:col-span-2">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Order Summary
                </CardTitle>
                <CardDescription>Review your purchase details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Plan Details */}
                <div className="p-4 border rounded-lg bg-gradient-to-r from-primary/5 to-primary/10">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-primary">{selectedPlan.name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedOption.label} Plan</p>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      <Clock className="h-3 w-3 mr-1" />
                      {selectedOption.label}
                    </Badge>
                  </div>
                  {selectedPlan.description && (
                    <p className="text-sm text-muted-foreground mt-2">{selectedPlan.description}</p>
                  )}
                </div>

                {/* Pricing Breakdown */}
                <div className="space-y-3">
                  <InfoRow 
                    label="Base Price" 
                    value={`PKR ${originalPrice.toLocaleString()}`} 
                    className={appliedDiscount ? "text-muted-foreground line-through" : ""}
                  />
                  
                  {appliedDiscount && (
                    <InfoRow 
                      label={`Discount (${appliedDiscount.name})`} 
                      value={`- PKR ${discountAmount.toLocaleString()}`} 
                      className="text-green-600 font-semibold"
                    />
                  )}
                  
                  <Separator />
                  
                  <InfoRow 
                    label="Total Amount" 
                    value={`PKR ${finalPrice.toLocaleString()}`} 
                    className="text-lg font-bold"
                  />
                </div>

                {/* Coupon Section */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Promo Code
                  </h4>
                  
                  {appliedDiscount ? (
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50 border-green-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">
                          "{appliedDiscount.code}" applied
                        </span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleRemoveCoupon}
                        className="text-green-600 hover:text-green-800"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Enter promo code"
                        value={couponCode}
                        onChange={e => setCouponCode(e.target.value.toUpperCase())}
                        disabled={isApplyingCoupon}
                        className="flex-1"
                      />
                      <Button 
                        onClick={handleApplyCoupon} 
                        disabled={!couponCode || isApplyingCoupon}
                        variant="outline"
                      >
                        {isApplyingCoupon ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Apply"
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
              
              <CardFooter>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      className="w-full" 
                      size="lg" 
                      disabled={isConfirming || !selectedPaymentMethod}
                    >
                      {isConfirming ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Shield className="mr-2 h-4 w-4" />
                          Confirm Purchase (PKR {finalPrice.toLocaleString()})
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Your Purchase</AlertDialogTitle>
                      <AlertDialogDescription>
                        You are about to place an order for the <strong>{selectedPlan.name} ({selectedOption.label})</strong> plan 
                        for <strong>PKR {finalPrice.toLocaleString()}</strong>.
                        <br /><br />
                        Please ensure you have completed the payment before confirming. Your subscription will be activated after payment is verified by an admin.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isConfirming}>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleConfirmPurchase} disabled={isConfirming}>
                        {isConfirming ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Yes, I've Made the Payment"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          </div>
        </div>
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
