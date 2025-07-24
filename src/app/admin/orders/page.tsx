'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchAllOrders, processOrder } from "@/lib/order-service";
import type { OrderWithUserData, OrderStatus } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, MoreHorizontal, Calendar, Clock, XCircle, AlertTriangle, User, Search, DollarSign, ShoppingCart, Check, UserCircle, CrossIcon, DiamondPlus, X, SquareX, Ban, CopyX, BookX, FileX, FileX2 } from 'lucide-react';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';

// --- CONFIGURATION ---
const statusConfig: { [key in OrderStatus]: { color: string; label: string; icon: React.FC<any>} } = {
    pending: { color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700', label: 'Pending', icon: Clock },
    completed: { color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700', label: 'Completed', icon: CheckCircle2 },
    failed: { color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700', label: 'Failed', icon: XCircle },
    cancelled: { color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700', label: 'Cancelled', icon: XCircle },
    rejected: { color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700', label: 'Rejected', icon: XCircle },
    refunded: { color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600', label: 'Refunded', icon: AlertTriangle },
};

// --- MODULAR COMPONENTS ---

/**
 * 1. OrderStats: Key metric cards at the top.
 */
const OrderStats = ({ orders }: { orders: OrderWithUserData[] }) => {
    const stats = useMemo(() => ({
        totalOrders: orders.length,
        totalRevenue: orders.filter(o => o.status === 'completed').reduce((acc, order) => acc + order.finalAmount, 0),
        pending: orders.filter(o => o.status === 'pending').length,
        completed: orders.filter(o => o.status === 'completed').length,
    }), [orders]);

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

/**
 * 2. OrderDetailSheet: The new slide-in panel for viewing order details.
 */
const OrderDetailSheet = ({ order, isOpen, onClose, onUpdateStatus, isLoading, }: { order: OrderWithUserData | null; isOpen: boolean; onClose: () => void; onUpdateStatus: (order: OrderWithUserData, newStatus: OrderStatus) => void; isLoading: boolean;  }) => {
    if (!order) return null;
    const statusInfo = statusConfig[order.status];
    
    const handleApproveClick = (e: React.MouseEvent) => {
        e.stopPropagation(); 
        onUpdateStatus(order, 'completed');
    };

    const handleCancelClick = (e: React.MouseEvent) => {
        e.stopPropagation(); 
        onUpdateStatus(order, 'cancelled');
    };

    const handleRejectClick = (e: React.MouseEvent) => {
        e.stopPropagation(); 
        onUpdateStatus(order, 'rejected');
    };

    const handleFailClick = (e: React.MouseEvent) => {
        e.stopPropagation(); 
        onUpdateStatus(order, 'failed');
    };

    

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-lg">
                <SheetHeader>
                    <SheetTitle>Order Details</SheetTitle>
                    <SheetDescription>Detailed information for order ID: {order.id}</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                    <Card>
                        <CardHeader><CardTitle className='flex items-center gap-2'><UserCircle className="h-5 w-5" /> Customer Information</CardTitle></CardHeader>
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
                                <Link href={`/admin/users/${order.userId}/subscription`}><User className="mr-2 h-4 w-4" /> View Full Profile</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className='flex items-center gap-2'><ShoppingCart className="h-5 w-5" /> Order Summary</CardTitle></CardHeader>
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
                    {order.status === 'pending' && (
                        <Button 
                            size="sm"
                            onClick={handleFailClick}
                            disabled={isLoading}
                            className="bg-amber-500 hover:bg-amber-600 text-white"
                            >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <SquareX className="h-4 w-4" />} Fail
                        </Button>
                    )}
                    {order.status === 'pending' && (
                        <Button 
                            size="sm"
                            onClick={handleCancelClick}
                            disabled={isLoading}
                            className="bg-red-500 hover:bg-red-600 text-white"
                            >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <X className="h-4 w-4" />} Cancel
                        </Button>
                    )}
                    {order.status === 'pending' && (
                        <Button 
                            size="sm"
                            onClick={handleRejectClick}
                            disabled={isLoading}
                            className="bg-red-500 hover:bg-red-600 text-white">
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <XCircle className="h-4 w-4" />} Reject
                        </Button>
                    )}
                    {order.status === 'pending'  && (
                        <Button 
                            size="sm"
                            onClick={handleApproveClick}
                            disabled={isLoading}
                            className="mr-2">
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4" />} Approve
                        </Button>
                    )}
                    {order.status !== 'completed' && order.status !== 'pending' && (
                        <Button 
                            size="sm"
                            onClick={handleCancelClick}
                            disabled={isLoading}
                            className="bg-amber-500 hover:bg-amber-600 text-white"

                            >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Clock className="h-4 w-4" />} Pending
                        </Button>
                    )}
                    
                    <SheetClose asChild><Button variant="outline">Close</Button></SheetClose>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
};


/**
 * 3. OrderRow: A single row in the table, now with the Approve button added back.
 */
const OrderRow = ({ order, onUpdateStatus, isLoading, onViewDetails }: { order: OrderWithUserData; onUpdateStatus: (order: OrderWithUserData, newStatus: OrderStatus) => void; isLoading: boolean; onViewDetails: () => void; }) => {
    const statusInfo = statusConfig[order.status] || { color: 'bg-gray-100 text-gray-800', label: 'Unknown', icon: AlertTriangle };

    const handleApproveClick = (e: React.MouseEvent) => {
        e.stopPropagation(); 
        onUpdateStatus(order, 'completed');
    };

    const handleCancelClick = (e: React.MouseEvent) => {
        e.stopPropagation(); 
        onUpdateStatus(order, 'cancelled');
    };

    const handleRejectClick = (e: React.MouseEvent) => {
        e.stopPropagation(); 
        onUpdateStatus(order, 'rejected');
    };

    const handleFailClick = (e: React.MouseEvent) => {
        e.stopPropagation(); 
        onUpdateStatus(order, 'failed');
    };

    return (
        <TableRow onClick={onViewDetails} className="cursor-pointer hover:bg-muted/50">
            <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarImage src={order.userImage || ''} alt={order.userName || ''} />
                        <AvatarFallback>{order.userName?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className='space-y-1'>
                        <span className="font-semibold hover:underline">{order.userName || 'N/A'}</span>
                        <div className="text-xs text-muted-foreground">{order.userEmail || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground font-mono" title={order.id}>ID: {order.id.substring(0, 8)}...</div>
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <div>{order.planName}</div>
                <div className="text-xs text-muted-foreground">{order.pricingOptionLabel}</div>
            </TableCell>
            <TableCell>
                <div className="font-semibold">PKR {order.finalAmount.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{order.paymentMethod}</div>
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-1.5">
                   <Calendar className="h-3.5 w-3.5 text-muted-foreground"/> {format(new Date(order.createdAt), "PPP")}
                </div>
            </TableCell>
            <TableCell>
                <Badge variant="outline" className={cn("capitalize gap-1.5 font-semibold", statusInfo.color)}>
                    {isLoading ? <Loader2 className="h-3 w-3 animate-spin"/> : <statusInfo.icon className="h-3 w-3" />}
                    {statusInfo.label}
                </Badge>
            </TableCell>
            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                {/* --- ADDED APPROVE BUTTON --- */}
                {order.status === 'pending' && (
                    <Button 
                        size="sm"
                        onClick={handleApproveClick}
                        disabled={isLoading}
                        className="mr-2"
                    >
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Check className="mr-2 h-4 w-4" />}
                        Approve
                    </Button>
                )}
                {/* --- END ADDED BUTTON --- */}
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" disabled={isLoading}>
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <MoreHorizontal className="h-4 w-4"/>}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={onViewDetails}><Search className="mr-2 h-4 w-4"/> View Details</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onUpdateStatus(order, 'completed')} disabled={order.status === 'completed' || isLoading}>
                            <CheckCircle2 className="mr-2 h-4 w-4"/> Mark as Approved
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onUpdateStatus(order, 'cancelled')} disabled={order.status === 'cancelled' || isLoading}>
                            <CheckCircle2 className="mr-2 h-4 w-4"/> Mark as Cancelled
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onUpdateStatus(order, 'rejected')} disabled={order.status === 'rejected' || isLoading}>
                            <CheckCircle2 className="mr-2 h-4 w-4"/> Mark as Rejected
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onUpdateStatus(order, 'failed')} disabled={order.status === 'failed' || isLoading}>
                            <XCircle className="mr-2 h-4 w-4"/> Mark as Failed
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onUpdateStatus(order, 'pending')} disabled={order.status === 'pending' || isLoading}>
                            <Clock className="mr-2 h-4 w-4"/> Mark as Pending
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
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
                                <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                                <TabsTrigger value="rejected">Rejected</TabsTrigger>
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
                                filteredOrders.map(order => (
                                    <OrderRow 
                                        key={order.id}
                                        order={order}
                                        onUpdateStatus={handleUpdateStatus}
                                        isLoading={actionLoading[order.id]}
                                        onViewDetails={() => setSelectedOrder(order)}
                                    />
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={6} className="h-48 text-center text-muted-foreground">No records found.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <OrderDetailSheet
                isOpen={!!selectedOrder}
                onClose={() => setSelectedOrder(null)}
                order={selectedOrder}
                onUpdateStatus={handleUpdateStatus}
                isLoading={actionLoading[selectedOrder?.id || ''] || false}
            />
        </div>
    );
}