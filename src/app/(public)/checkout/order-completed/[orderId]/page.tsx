
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getOrderById } from '@/lib/order-service';
import type { Order, Settings } from '@/types';
import { fetchSettings } from '@/lib/settings-service';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, ArrowLeft, Mail, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const InfoRow = ({ label, value }: { label: string, value: string | number }) => (
    <div className="flex justify-between items-center py-2 border-b">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="text-sm font-semibold">{value}</div>
    </div>
);

export default function OrderCompletedPage() {
    const router = useRouter();
    const params = useParams();
    const orderId = params.orderId as string;
    const { user, loading: authLoading } = useAuth();
    
    const [order, setOrder] = useState<Order | null>(null);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push(`/login?redirect=/checkout/order-completed/${orderId}`);
            return;
        }

        const loadData = async () => {
            setLoading(true);
            try {
                const [orderData, settingsData] = await Promise.all([
                    getOrderById(orderId, user.uid),
                    fetchSettings()
                ]);
                
                if (!orderData) {
                    throw new Error("Order not found or you don't have permission to view it.");
                }

                setOrder(orderData);
                setSettings(settingsData);
            } catch (error: any) {
                console.error("Error loading order:", error);
                // Optionally push to a generic error page or user's dashboard
                router.push('/account/dashboard');
            } finally {
                setLoading(false);
            }
        };
        
        loadData();
    }, [orderId, user, authLoading, router]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    if (!order || !settings) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
                    <h1 className="text-3xl font-bold text-gray-800">Thank You For Your Order!</h1>
                    <p className="text-muted-foreground mt-2">Your order has been placed successfully and is now pending payment verification.</p>
                </div>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Order Summary</CardTitle>
                        <CardDescription>Order ID: {order.id}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <InfoRow label="Plan" value={order.planName} />
                        <InfoRow label="Duration" value={order.pricingOptionLabel} />
                        <InfoRow label="Order Date" value={format(new Date(order.createdAt), "PPP")} />
                        <InfoRow label="Status" value={<Badge className="capitalize bg-amber-100 text-amber-800 hover:bg-amber-100">{order.status}</Badge>} />
                        <div className="border-t pt-4 mt-4">
                            <InfoRow label="Subtotal" value={`PKR ${order.originalPrice.toLocaleString()}`} />
                            {order.discountAmount > 0 && (
                                 <InfoRow label={`Discount (${order.discountCode || 'Applied'})`} value={`- PKR ${order.discountAmount.toLocaleString()}`} />
                            )}
                            <InfoRow label="Total Amount" value={`PKR ${order.finalAmount.toLocaleString()}`} />
                        </div>
                    </CardContent>
                </Card>

                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Next Steps: Submit Proof of Payment</CardTitle>
                        <CardDescription>To activate your subscription, please send us your proof of payment using one of the methods below.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row gap-4">
                         <Button asChild className="w-full">
                            <Link href={`mailto:${settings.contactEmail}?subject=Payment Proof for Order ${order.id}`}>
                                <Mail className="mr-2 h-4 w-4" /> Email Us
                            </Link>
                        </Button>
                        <Button asChild className="w-full" variant="outline">
                            <Link href="/contact">
                                <MessageSquare className="mr-2 h-4 w-4" /> Contact Support
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                <div className="mt-8 text-center">
                    <Button variant="ghost" onClick={() => router.push('/account/dashboard')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Go to My Dashboard
                    </Button>
                </div>
            </div>
        </div>
    );
}
