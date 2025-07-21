
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchAllOrders, processOrder } from "@/lib/order-service";
import type { OrderWithUserData, OrderStatus } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, MoreHorizontal, Calendar, Clock, XCircle, AlertTriangle, User, Search } from 'lucide-react';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Input } from '@/components/ui/input';
import Link from 'next/link';

const statusConfig: { [key in OrderStatus]: { color: string; label: string; icon: React.FC<any>} } = {
    pending: { color: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Pending', icon: Clock },
    completed: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Completed', icon: CheckCircle2 },
    failed: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Failed', icon: XCircle },
    refunded: { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Refunded', icon: AlertTriangle },
};

export default function AdminOrdersPage() {
    const { toast } = useToast();
    const [orders, setOrders] = useState<OrderWithUserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchAllOrders();
            setOrders(data);
        } catch (error) {
            toast({ title: "Error", description: "Could not load orders.", variant: "destructive" });
        }
        setLoading(false);
    }, [toast]);

    useEffect(() => { loadData() }, [loadData]);
    
    const handleUpdateStatus = async (order: OrderWithUserData, newStatus: OrderStatus) => {
        setActionLoading(prev => ({...prev, [order.id]: true}));
        try {
            await processOrder(order.id, newStatus);
            toast({ title: "Order Updated", description: `Order status changed to ${newStatus}.` });
            await loadData();
        } catch (e: any) {
            toast({ title: "Error", description: e.message || "Failed to update order.", variant: "destructive" });
        } finally {
            setActionLoading(prev => ({...prev, [order.id]: false}));
        }
    };
    
    const filteredOrders = useMemo(() => orders.filter(item => 
        item.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.planName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase())
    ), [orders, searchTerm]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Orders</h1>
                    <p className="text-muted-foreground">View and manage all user plan orders.</p>
                </div>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>All Orders</CardTitle>
                    <CardDescription>A complete history of all user plan purchases.</CardDescription>
                     <div className="pt-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search by user, email, plan, or Order ID..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="max-w-md pl-9"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Plan</TableHead>
                            <TableHead>Payment</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                            ) : filteredOrders.length > 0 ? (
                                filteredOrders.map(item => {
                                    const statusInfo = statusConfig[item.status] || { color: 'bg-gray-100 text-gray-800', label: 'Unknown', icon: AlertTriangle };
                                    const isLoadingAction = actionLoading[item.id];
                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">
                                                <Link href={`/admin/users/${item.userId}/subscription`} className="group">
                                                    <div className="group-hover:text-primary group-hover:underline">{item.userName || 'N/A'}</div>
                                                    <div className="text-xs text-muted-foreground">{item.userEmail || 'N/A'}</div>
                                                    <div className="text-xs text-muted-foreground font-mono mt-1">ID: {item.id}</div>
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <div>{item.planName}</div>
                                                <div className="text-xs text-muted-foreground">{item.pricingOptionLabel}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-semibold">PKR {item.finalAmount.toLocaleString()}</div>
                                                <div className="text-xs text-muted-foreground">{item.paymentMethod}</div>
                                            </TableCell>
                                            <TableCell>
                                                {format(new Date(item.createdAt), "PPP")}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={cn("capitalize gap-1.5", statusInfo.color)}>
                                                    {isLoadingAction ? <Loader2 className="h-3 w-3 animate-spin"/> : <statusInfo.icon className="h-3 w-3" />}
                                                    {statusInfo.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button size="icon" variant="ghost" disabled={isLoadingAction}>
                                                            {isLoadingAction ? <Loader2 className="h-4 w-4 animate-spin"/> : <MoreHorizontal className="h-4 w-4"/>}
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => handleUpdateStatus(item, 'completed')} disabled={item.status === 'completed'}>
                                                            Approve & Activate Plan
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleUpdateStatus(item, 'failed')} disabled={item.status === 'failed'}>
                                                            Reject Order
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleUpdateStatus(item, 'pending')} disabled={item.status === 'pending'}>
                                                            Mark as Pending
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                         <DropdownMenuItem asChild>
                                                            <Link href={`/admin/users/${item.userId}/subscription`}>
                                                                <User className="mr-2 h-4 w-4"/> View User Subscription
                                                            </Link>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            ) : (
                                <TableRow><TableCell colSpan={6} className="h-32 text-center">No records found.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
