
'use client';

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { fetchOrdersForUser } from "@/lib/order-service";
import type { Order, OrderStatus } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingCart } from 'lucide-react';
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Configuration for styling status badges
const statusConfig: { [key in OrderStatus]: { color: string; label: string } } = {
    pending: { color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700', label: 'Pending' },
    completed: { color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700', label: 'Completed' },
    failed: { color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700', label: 'Failed' },
    refunded: { color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600', label: 'Refunded' },
};

export default function OrdersPage() {
    const { user, loading: authLoading } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        
        if (!user) {
            setLoadingData(false);
            return;
        }

        const loadOrders = async () => {
            setLoadingData(true);
            try {
                const fetchedOrders = await fetchOrdersForUser(user.uid);
                setOrders(fetchedOrders);
            } catch (err) {
                console.error("Failed to load orders:", err);
            } finally {
                setLoadingData(false);
            }
        };

        loadOrders();
    }, [user, authLoading]);
    
    // Loading state for initial auth check or data fetching
    if (authLoading || loadingData) {
        return (
            <div className="flex justify-center items-center h-full min-h-[calc(100vh-20rem)]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">My Orders</h1>
                <p className="text-muted-foreground">A history of all your plan purchases.</p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Order History</CardTitle>
                    <CardDescription>
                        You have placed {orders.length} order{orders.length !== 1 ? 's' : ''}.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order ID</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.length > 0 ? (
                                orders.map(order => {
                                    const statusInfo = statusConfig[order.status] || { color: 'bg-gray-100 text-gray-800', label: 'Unknown' };
                                    return (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-mono text-xs">{order.id}</TableCell>
                                            <TableCell className="font-medium">{order.planName}</TableCell>
                                            <TableCell>PKR {order.finalAmount.toLocaleString()}</TableCell>
                                            <TableCell>
                                                <Badge className={cn("capitalize", statusInfo.color)}>
                                                    {statusInfo.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{format(new Date(order.createdAt), "PPP")}</TableCell>
                                        </TableRow>
                                    )
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-48 text-center">
                                         <div className="flex flex-col items-center justify-center text-muted-foreground">
                                            <ShoppingCart className="h-12 w-12 mb-4" />
                                            <h3 className="text-lg font-semibold">No Orders Found</h3>
                                            <p className="mt-1">You haven't purchased any plans yet.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
