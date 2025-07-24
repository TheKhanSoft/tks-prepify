
'use client';

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { fetchOrdersForUser } from "@/lib/order-service";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingCart, Eye } from 'lucide-react';
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Order } from "@/types";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { rejects } from "assert";

const statusConfig = {
  pending: { 
    color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700', 
    label: 'UNPAID' 
  },
  completed: { 
    color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700', 
    label: 'PAID' 
  },
  failed: { 
    color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700', 
    label: 'FAILED' 
  },
  refunded: { 
    color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600', 
    label: 'REFUNDED' 
  },
  rejected: { 
    color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700',  
    label: 'REJECTED' 
  },
  cancelled:
  { 
    color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700',  
    label: 'CANCELED' 
  },
} as const;

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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
                <TableHead>Plan</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length > 0 ? (
                orders.map(order => {
                  const statusInfo = statusConfig[order.status] || { 
                    color: 'bg-gray-100 text-gray-800', 
                    label: 'Unknown' 
                  };
                  
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        <div>{order.planName}</div>
                        <div className="text-sm text-muted-foreground">
                          {order.pricingOptionLabel}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          <div>
                            <span className="text-muted-foreground">Amount: </span>
                            <span className="text font-medium">{formatCurrency(order.finalAmount)}</span>
                          </div>
                          {order.discountCode && (
                            <div>
                              <hr />
                              <span className="text-muted-foreground">Discount: </span>
                              {order.discountCode} (-{formatCurrency(order.discountAmount)})
                            <br />
                              <span className="text-muted-foreground">Original: </span>
                              {formatCurrency(order.originalPrice)}
                            </div>
                          )}
                          
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {order.paymentMethod}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("capitalize", statusInfo.color)}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(order.createdAt), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                            <Link href={`/invoice/${order.id}`}>
                                <Eye className="mr-2 h-4 w-4"/>
                                View Invoice
                            </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
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
