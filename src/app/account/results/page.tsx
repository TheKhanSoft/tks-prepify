
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ChevronRight, Loader2, BarChart3 } from 'lucide-react';
import { useAuth } from "@/hooks/use-auth";
import { fetchTestAttemptsForUser } from "@/lib/test-attempt-service";
import type { TestAttempt } from "@/types";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const StatusBadge = ({ attempt }: { attempt: TestAttempt }) => {
    if (attempt.status === 'completed') {
        return (
            <Badge variant={attempt.passed ? "default" : "destructive"} className={cn(
                'capitalize',
                attempt.passed ? "bg-green-600 hover:bg-green-700" : "bg-destructive hover:bg-destructive/90"
            )}>
                {attempt.passed ? "Passed" : "Failed"}
            </Badge>
        );
    }
    if (attempt.status === 'in-progress') {
        return <Badge variant="secondary" className="capitalize">In Progress</Badge>;
    }
    return <Badge variant="outline" className="capitalize">{attempt.status}</Badge>;
};

export default function ResultsPage() {
    const { user, loading: authLoading } = useAuth();
    const [attempts, setAttempts] = useState<TestAttempt[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const loadAttempts = useCallback(async (userId: string) => {
        setLoading(true);
        try {
            const fetchedAttempts = await fetchTestAttemptsForUser(userId);
            setAttempts(fetchedAttempts);
        } catch (error) {
            console.error("Failed to load test history:", error);
            toast({
                title: "Error Loading History",
                description: "Could not retrieve your test results. Please try refreshing the page.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (authLoading) return;
        
        if (user) {
            loadAttempts(user.uid);
        } else {
            setLoading(false);
        }
    }, [user, authLoading, loadAttempts]);

    if (loading || authLoading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[calc(100vh-20rem)]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    const completedAttemptsCount = attempts.filter(a => a.status === 'completed').length;
    
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">My Results</h1>
                <p className="text-muted-foreground">A history of all the tests you've completed or started.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Test History</CardTitle>
                    <CardDescription>
                        You have taken {attempts.length} test{attempts.length !== 1 ? 's' : ''} in total. Completed: {completedAttemptsCount}.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {attempts.length > 0 ? (
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Test Name</TableHead>
                                    <TableHead>Score</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {attempts.map(attempt => (
                                    <TableRow key={attempt.id}>
                                        <TableCell className="font-medium">{attempt.testConfigName}</TableCell>
                                        <TableCell>{attempt.status === 'completed' ? `${attempt.score.toFixed(2)} / ${attempt.totalMarks}`: 'N/A'}</TableCell>
                                        <TableCell>
                                            <StatusBadge attempt={attempt} />
                                        </TableCell>
                                        <TableCell>{attempt.startTime ? format(new Date(attempt.startTime), "PPP") : 'N/A'}</TableCell>
                                        <TableCell className="text-right">
                                            {attempt.status === 'completed' ? (
                                                <Button asChild variant="ghost" size="sm">
                                                    <Link href={`/results/test/${attempt.id}`}>
                                                        View Details <ChevronRight className="h-4 w-4 ml-2" />
                                                    </Link>
                                                </Button>
                                            ) : (
                                                <Button asChild variant="secondary" size="sm">
                                                    <Link href={`/tests/${attempt.testConfigSlug}/take`}>
                                                        Resume Test
                                                    </Link>
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                         </Table>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-64 border-2 border-dashed rounded-lg">
                            <BarChart3 className="h-12 w-12 mb-4" />
                            <h3 className="text-lg font-semibold">No Results Yet</h3>
                            <p className="mt-1">Complete a test to see your results appear here.</p>
                            <Button asChild variant="link" className="mt-2">
                                <Link href="/tests">Take a Test Now</Link>
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
