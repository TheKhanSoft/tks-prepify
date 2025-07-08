
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { fetchSubmissionsForUser } from '@/lib/contact-service';
import type { ContactSubmission, ContactSubmissionStatus } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronRight, MessageSquarePlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

const statusConfig: { [key in ContactSubmissionStatus]: { color: string; label: string } } = {
    open: { color: 'bg-blue-500 hover:bg-blue-600', label: 'Open' },
    replied: { color: 'bg-amber-500 hover:bg-amber-600', label: 'Admin Replied' },
    closed: { color: 'bg-gray-500 hover:bg-gray-600', label: 'Closed' },
};

export default function SupportPage() {
    const { user, loading: authLoading } = useAuth();
    const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const loadSubmissions = async () => {
            setLoading(true);
            const userSubmissions = await fetchSubmissionsForUser(user.uid);
            setSubmissions(userSubmissions);
            setLoading(false);
        };
        loadSubmissions();
    }, [user]);

    if (authLoading || loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[calc(100vh-20rem)]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Support Tickets</h1>
                    <p className="text-muted-foreground">A history of your conversations with our support team.</p>
                </div>
                <Button asChild>
                    <Link href="/contact">
                        <MessageSquarePlus className="mr-2 h-4 w-4"/>
                        Create New Ticket
                    </Link>
                </Button>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>My Tickets</CardTitle>
                    <CardDescription>
                        You have submitted {submissions.length} ticket{submissions.length !== 1 ? 's' : ''}.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Subject</TableHead>
                                <TableHead>Topic</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Last Updated</TableHead>
                                <TableHead><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {submissions.length > 0 ? (
                                submissions.map(sub => {
                                    const statusInfo = statusConfig[sub.status];
                                    return (
                                        <TableRow key={sub.id}>
                                            <TableCell className="font-medium">{sub.subject}</TableCell>
                                            <TableCell><Badge variant="secondary">{sub.topic}</Badge></TableCell>
                                            <TableCell><Badge className={statusInfo.color}>{statusInfo.label}</Badge></TableCell>
                                            <TableCell>{formatDistanceToNow(new Date(sub.lastRepliedAt || sub.createdAt), { addSuffix: true })}</TableCell>
                                            <TableCell className="text-right">
                                                <Button asChild variant="ghost" size="sm">
                                                    <Link href={`/account/support/${sub.id}`}>
                                                        View Ticket <ChevronRight className="h-4 w-4 ml-2" />
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        You haven't submitted any support tickets yet.
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
