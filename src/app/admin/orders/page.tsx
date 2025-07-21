'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchAllOrders, processOrder } from "@/lib/order-service";
import type { OrderWithUserData, OrderStatus } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, MoreHorizontal, Calendar, Clock, XCircle, AlertTriangle, User, Search, DollarSign, ShoppingCart, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Enhanced status configuration with modern colors and icons
const statusConfig: { [key in OrderStatus]: { color: string; label: string; icon: React.FC<any>} } = {
    pending: { color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700', label: 'Pending', icon: Clock },
    completed: { color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700', label: 'Completed', icon: CheckCircle2 },
    failed: { color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700', label: 'Failed', icon: XCircle },
    refunded: { color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600', label: 'Refunded', icon: AlertTriangle },
};

// A component for displaying key statistics
const OrderStats = ({ orders }: { orders: OrderWithUserData[] }) => {
    const stats = useMemo(() => {
        return {
            totalOrders: orders.length,
            totalRevenue: orders.filter(o => o.status === 'completed').reduce((acc, order) => acc + order.finalAmount, 0),
            pending: orders.filter(o => o.status === 'pending').length,
            completed: orders.filter(o => o.status === 'completed').length,
        };
    }, [orders]);

    const statCards = [
        { title: 'Total Orders', value: stats.totalOrders, icon: ShoppingCart },
        { title: 'Total Revenue', value: `PKR ${stats.totalRevenue.toLocaleString()}`, icon: DollarSign },
        { title: 'Pending', value: stats.pending, icon: Clock },
        { title: 'Completed', value: stats.completed, icon: CheckCircle2 },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map(card => (
                <Card key={card.title}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                        <card.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{card.value}</div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export default function AdminOrdersPage() {
    const { toast } = useToast();
    const [orders, setOrders] = useState<OrderWithUserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
    const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('all');

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
    
    const filteredOrders = useMemo(() => orders
        .filter(item => activeTab === 'all' || item.status === activeTab)
        .filter(item => 
            item.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.planName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.id.toLowerCase().includes(searchTerm.toLowerCase())
        ), [orders, searchTerm, activeTab]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
                <p className="text-muted-foreground">View and manage all user plan orders.</p>
            </div>

            <OrderStats orders={orders} />
            
            <Card>
                <CardHeader>
                     <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="relative flex-1 w-full md:w-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search by user, email, plan, or Order ID..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full max-w-md pl-9"
                            />
                        </div>
                         <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
                            <TabsList>
                                <TabsTrigger value="all">All</TabsTrigger>
                                <TabsTrigger value="pending">Pending</TabsTrigger>
                                <TabsTrigger value="completed">Completed</TabsTrigger>
                                <TabsTrigger value="failed">Failed</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Payment</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={6} className="h-48 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                            ) : filteredOrders.length > 0 ? (
                                filteredOrders.map(item => {
                                    const statusInfo = statusConfig[item.status] || { color: 'bg-gray-100 text-gray-800', label: 'Unknown', icon: AlertTriangle };
                                    const isLoadingAction = actionLoading[item.id];
                                    return (
                                        <TableRow key={item.id} className="hover:bg-muted/50">
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-3">
                                                    <Avatar>
                                                        <AvatarImage src={item.userImage || ''} alt={item.userName || ''} />
                                                        <AvatarFallback>{item.userName?.charAt(0).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    <div className='space-y-1'>
                                                        <Link href={`/admin/users/${item.userId}/subscription`} className="font-semibold hover:underline">{item.userName || 'N/A'}</Link>
                                                        <div className="text-xs text-muted-foreground">{item.userEmail || 'N/A'}</div>
                                                        <div className="text-xs text-muted-foreground font-mono" title={item.id}>ID: {item.id.substring(0, 8)}...</div>
                                                    </div>
                                                </div>
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
                                                <div className="flex items-center gap-1.5">
                                                   <Calendar className="h-3.5 w-3.5 text-muted-foreground"/> {format(new Date(item.createdAt), "PPP")}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={cn("capitalize gap-1.5 font-semibold", statusInfo.color)}>
                                                    {isLoadingAction ? <Loader2 className="h-3 w-3 animate-spin"/> : <statusInfo.icon className="h-3 w-3" />}
                                                    {statusInfo.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                 {item.status === 'pending' && (
                                                    <Button 
                                                        size="sm"
                                                        onClick={() => handleUpdateStatus(item, 'completed')}
                                                        disabled={isLoadingAction}
                                                        className="mr-2"
                                                    >
                                                        {isLoadingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Check className="mr-2 h-4 w-4" />}
                                                        Approve
                                                    </Button>
                                                )}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button size="icon" variant="ghost" disabled={isLoadingAction}>
                                                            {isLoadingAction ? <Loader2 className="h-4 w-4 animate-spin"/> : <MoreHorizontal className="h-4 w-4"/>}
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                                                         <DropdownMenuItem onClick={() => handleUpdateStatus(item, 'completed')} disabled={item.status === 'completed' || isLoadingAction}>
                                                            <CheckCircle2 className="mr-2 h-4 w-4"/> Approve & Activate
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleUpdateStatus(item, 'failed')} disabled={item.status === 'failed' || isLoadingAction}>
                                                            <XCircle className="mr-2 h-4 w-4"/> Reject Order
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleUpdateStatus(item, 'pending')} disabled={item.status === 'pending' || isLoadingAction}>
                                                            <Clock className="mr-2 h-4 w-4"/> Mark as Pending
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                         <DropdownMenuItem asChild>
                                                            <Link href={`/admin/users/${item.userId}/subscription`}>
                                                                <User className="mr-2 h-4 w-4"/> View User
                                                            </Link>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            ) : (
                                <TableRow><TableCell colSpan={6} className="h-48 text-center text-muted-foreground">No records found.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}