
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { fetchAllUserPlanHistory, updateUserPlanHistoryRecord, type UserPlanHistoryRecord } from "@/lib/user-service";
import type { UserPlanStatus } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, MoreHorizontal, Calendar, Clock, AlertTriangle, Check, X } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

const statusConfig: { [key in UserPlanStatus]: { color: string; label: string; icon: React.FC<any>} } = {
    active: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Active', icon: CheckCircle2 },
    pending: { color: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Pending', icon: Clock },
    suspended: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Suspended', icon: X },
    expired: { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Expired', icon: Calendar },
    migrated: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Migrated', icon: Check },
    cancelled: { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Cancelled', icon: X },
};

export default function AdminOrdersPage() {
    const { toast } = useToast();
    const [history, setHistory] = useState<UserPlanHistoryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchAllUserPlanHistory();
            setHistory(data);
        } catch (error) {
            toast({ title: "Error", description: "Could not load order history.", variant: "destructive" });
        }
        setLoading(false);
    }, [toast]);

    useEffect(() => { loadData() }, [loadData]);
    
    const handleUpdateStatus = async (recordId: string, status: UserPlanStatus) => {
        try {
            await updateUserPlanHistoryRecord(recordId, { status });
            toast({ title: "Status Updated", description: `Order has been marked as ${status}.` });
            await loadData();
        } catch {
            toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
        }
    }
    
    const filteredHistory = history.filter(item => 
        item.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.planName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Orders & Subscriptions</h1>
                    <p className="text-muted-foreground">View and manage all user subscription records.</p>
                </div>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>All Subscription Records</CardTitle>
                    <CardDescription>A complete history of all user plan subscriptions and changes.</CardDescription>
                     <div className="pt-4">
                        <Input 
                            placeholder="Search by user name, email, or plan..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="max-w-md"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Plan</TableHead>
                            <TableHead>Dates</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                            ) : filteredHistory.length > 0 ? (
                                filteredHistory.map(item => {
                                    const statusInfo = statusConfig[item.status] || { color: 'bg-gray-100 text-gray-800', label: 'Unknown', icon: AlertTriangle };
                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">
                                                <div>{item.userName || 'N/A'}</div>
                                                <div className="text-xs text-muted-foreground">{item.userEmail || 'N/A'}</div>
                                            </TableCell>
                                            <TableCell>{item.planName}</TableCell>
                                            <TableCell>
                                                <div>Subscribed: {format(new Date(item.subscriptionDate), "PPP")}</div>
                                                <div className="text-xs text-muted-foreground">Expires: {item.endDate ? format(new Date(item.endDate), "PPP") : "Never"}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={cn("capitalize gap-1.5", statusInfo.color)}>
                                                    <statusInfo.icon className="h-3 w-3" />
                                                    {statusInfo.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {item.paidAmount !== undefined && <div>Paid: PKR {item.paidAmount.toFixed(2)}</div>}
                                                {item.discountCode && <div>Code: <Badge variant="secondary">{item.discountCode}</Badge></div>}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => handleUpdateStatus(item.id, 'active')} disabled={item.status === 'active'}>Mark as Active</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleUpdateStatus(item.id, 'pending')} disabled={item.status === 'pending'}>Mark as Pending</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleUpdateStatus(item.id, 'suspended')} disabled={item.status === 'suspended'}>Mark as Suspended</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleUpdateStatus(item.id, 'cancelled')} disabled={item.status === 'cancelled'}>Mark as Cancelled</DropdownMenuItem>
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

