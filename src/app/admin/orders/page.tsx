
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchAllOrders, processOrder } from "@/lib/order-service";
import type { OrderWithUserData, OrderStatus } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, MoreHorizontal, Clock, XCircle, AlertTriangle, User, Search, DollarSign, ShoppingCart, Check, X, Inbox, UserCircle, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';

// --- CONFIGURATION ---
const statusConfig: { [key in OrderStatus]: { color: string; label: string; icon: React.FC<any>} } = {
    pending: { color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700', label: 'Pending', icon: Clock },
    completed: { color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700', label: 'Completed', icon: CheckCircle2 },
    failed: { color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700', label: 'Failed', icon: XCircle },
    refunded: { color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600', label: 'Refunded', icon: AlertTriangle },
};

// --- MODULAR UI COMPONENTS ---

const OrderStats = ({ orders, isLoading }: { orders: OrderWithUserData[], isLoading: boolean }) => {
    const stats = useMemo(() => ({
        totalOrders: orders.length,
        totalRevenue: orders.filter(o => o.status === 'completed').reduce((acc, order) => acc + order.finalAmount, 0),
        pending: orders.filter(o => o.status === 'pending').length,
    }), [orders]);

    const statCards = [
        { title: 'Total Revenue', value: `PKR ${stats.totalRevenue.toLocaleString()}`, icon: DollarSign },
        { title: 'Total Orders', value: stats.totalOrders.toLocaleString(), icon: ShoppingCart },
        { title: 'Pending Orders', value: stats.pending.toLocaleString(), icon: Clock },
    ];

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" />
            </div>
        )
    }

    return (
        <div className="grid gap-4 md:grid-cols-3">
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

const TableSkeleton = () => (
    [...Array(5)].map((_, i) => (
        <TableRow key={i}>
            <TableCell>
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-32" />
                    </div>
                </div>
            </TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
        </TableRow>
    ))
);

const OrderDetailSheet = ({ order, isOpen, onClose }: { order: OrderWithUserData | null, isOpen: boolean, onClose: () => void }) => {
    if (!order) return null;
    const statusInfo = statusConfig[order.status];

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-lg">
                <SheetHeader>
                    <SheetTitle>Order Details</SheetTitle>
                    <SheetDescription>Detailed information for order ID: {order.id}</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className='flex items-center gap-2'><UserCircle className="h-5 w-5" /> Customer</CardTitle>
                        </CardHeader>
                        <CardContent className='space-y-4'>
                            <div className="flex items-center gap-4">
                                <Avatar className="h-16 w-16">
                                    <AvatarImage src={order.userImage || ''} />
                                    <AvatarFallback>{order.userName?.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-bold text-lg">{order.userName}</div>
                                    <div className="text-sm text-muted-foreground">{order.userEmail}</div>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                                <Link href={`/admin/users/${order.userId}/subscription`}><User className="mr-2 h-4 w-4" /> View Profile</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className='flex items-center gap-2'><ShoppingCart className="h-5 w-5" /> Order Summary</CardTitle>
                        </CardHeader>
                        <CardContent className='space-y-2 text-sm'>
                            <div className="flex justify-between"><span>Plan:</span> <span className="font-medium">{order.planName}</span></div>
                            <div className="flex justify-between"><span>Tier:</span> <span className="font-medium">{order.pricingOptionLabel}</span></div>
                            <div className="flex justify-between"><span>Payment Method:</span> <span className="font-medium">{order.paymentMethod}</span></div>
                            <div className="flex justify-between"><span>Date:</span> <span className="font-medium">{format(new Date(order.createdAt), "PPP p")}</span></div>
                            <div className="flex justify-between items-center"><span>Status:</span> <Badge variant="outline" className={cn("capitalize", statusInfo.color)}><statusInfo.icon className="mr-1.5 h-3 w-3"/>{statusInfo.label}</Badge></div>
                             <div className="flex justify-between pt-4 border-t mt-4">
                                <span className='text-base'>Total Amount:</span>
                                <span className="font-bold text-base">PKR {order.finalAmount.toLocaleString()}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                 <SheetFooter className='mt-6'>
                    <SheetClose asChild><Button variant="outline">Close</Button></SheetClose>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
};

// --- MAIN PAGE COMPONENT ---
export default function AdminOrdersPage() {
    const { toast } = useToast();
    const [orders, setOrders] = useState<OrderWithUserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
    const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('all');
    const [selectedOrder, setSelectedOrder] = useState<OrderWithUserData | null>(null);

    const loadData = useCallback(async () => {
        if (!loading) setLoading(true);
        try {
            const data = await fetchAllOrders();
            setOrders(data);
        } catch (error) {
            toast({ title: "Error", description: "Could not load orders.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast, loading]);

    useEffect(() => { loadData() }, [loadData]);
    
    const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
        setActionLoading(prev => ({...prev, [orderId]: true}));
        try {
            await processOrder(orderId, newStatus);
            toast({ title: "Order Updated", description: `Order status changed to ${newStatus}.` });
            await loadData();
            if(selectedOrder?.id === orderId) {
                 const updatedOrder = await fetchAllOrders().then(orders => orders.find(o => o.id === orderId));
                 setSelectedOrder(updatedOrder || null);
            }
        } catch (e: any) {
            toast({ title: "Error", description: e.message || "Failed to update order.", variant: "destructive" });
        } finally {
            setActionLoading(prev => ({...prev, [orderId]: false}));
        }
    };
    
    const filteredOrders = useMemo(() => orders
        .filter(item => activeTab === 'all' || item.status === activeTab)
        .filter(item => 
            item.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.id.toLowerCase().includes(searchTerm.toLowerCase())
        ), [orders, searchTerm, activeTab]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
                    <p className="text-muted-foreground">View, manage, and inspect all user plan orders.</p>
                </div>
            </div>

            <OrderStats orders={orders} isLoading={loading} />
            
            <Card>
                <CardHeader>
                     <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="relative flex-1 w-full md:w-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search by user, email, or Order ID..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full max-w-sm pl-9"
                            />
                        </div>
                         <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
                            <TabsList className="grid w-full grid-cols-5 md:w-auto">
                                <TabsTrigger value="all">All</TabsTrigger>
                                <TabsTrigger value="pending">Pending</TabsTrigger>
                                <TabsTrigger value="completed">Completed</TabsTrigger>
                                <TabsTrigger value="failed">Failed</TabsTrigger>
                                <TabsTrigger value="refunded">Refunded</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Customer</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableSkeleton />
                            ) : filteredOrders.length > 0 ? (
                                filteredOrders.map(order => {
                                    const isLoadingAction = actionLoading[order.id];
                                    const statusInfo = statusConfig[order.status];
                                    return (
                                        <TableRow key={order.id} onClick={() => setSelectedOrder(order)} className="cursor-pointer hover:bg-muted/50">
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-3">
                                                    <Avatar>
                                                        <AvatarImage src={order.userImage || ''} />
                                                        <AvatarFallback>{order.userName?.charAt(0).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="font-semibold">{order.userName || 'N/A'}</div>
                                                        <div className="text-xs text-muted-foreground">{order.userEmail || 'N/A'}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{order.planName}</TableCell>
                                            <TableCell>PKR {order.finalAmount.toLocaleString()}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={cn("capitalize gap-1.5 font-semibold", statusInfo.color)}>
                                                    {isLoadingAction ? <Loader2 className="h-3 w-3 animate-spin"/> : <statusInfo.icon className="h-3 w-3" />}
                                                    {statusInfo.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button size="icon" variant="ghost" disabled={isLoadingAction}>
                                                            {isLoadingAction ? <Loader2 className="h-4 w-4 animate-spin"/> : <MoreHorizontal className="h-4 w-4"/>}
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => setSelectedOrder(order)}><Search className="mr-2 h-4 w-4" />View Details</DropdownMenuItem>
                                                        <DropdownMenuSeparator/>
                                                        <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'completed')} disabled={order.status === 'completed'}>
                                                            <CheckCircle2 className="mr-2 h-4 w-4"/> Mark as Completed
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'failed')} disabled={order.status === 'failed'}>
                                                            <XCircle className="mr-2 h-4 w-4"/> Mark as Failed
                                                        </DropdownMenuItem>
                                                         <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'refunded')} disabled={order.status === 'refunded'}>
                                                            <AlertTriangle className="mr-2 h-4 w-4"/> Mark as Refunded
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'pending')} disabled={order.status === 'pending'}>
                                                            <Clock className="mr-2 h-4 w-4"/> Mark as Pending
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-48 text-center">
                                        <Inbox className="h-12 w-12 mx-auto text-muted-foreground/50" />
                                        <p className="font-semibold mt-4">No orders found</p>
                                        <p className="text-muted-foreground text-sm">Try adjusting your search or filter.</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <OrderDetailSheet 
                isOpen={!!selectedOrder}
                onClose={() => setSelectedOrder(null)}
                order={selectedOrder}
            />
        </div>
    );
}
