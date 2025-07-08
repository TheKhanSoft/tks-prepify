
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ChevronRight, Loader2, BarChart3, ShieldAlert, ListChecks, Check, Star, ShieldCheck } from 'lucide-react';
import { useAuth } from "@/hooks/use-auth";
import { fetchTestAttemptsForUser } from "@/lib/test-attempt-service";
import type { TestAttempt } from "@/types";
import { useEffect, useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Reusable component to render the status badge
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
    return <Badge variant="outline" className="capitalize">{attempt.status || 'Unknown'}</Badge>;
};


export default function ResultsPage() {
    const { user, loading: authLoading } = useAuth();
    const [attempts, setAttempts] = useState<TestAttempt[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setLoading(false);
            return;
        }

        const loadAttempts = async () => {
            setLoading(true);
            setError(null);
            try {
                const fetchedAttempts = await fetchTestAttemptsForUser(user.uid);
                setAttempts(fetchedAttempts);
            } catch (err) {
                console.error("Failed to load test history:", err);
                setError("Could not retrieve your test results. Please try refreshing the page.");
            } finally {
                setLoading(false);
            }
        };

        loadAttempts();
    }, [user, authLoading]);
    
    const { completedAttempts, averageScore, passRate } = useMemo(() => {
        const completed = attempts.filter(a => a.status === 'completed');
        const avg = completed.length > 0 
            ? (completed.reduce((acc, attempt) => acc + attempt.percentage, 0) / completed.length)
            : null;
        const passedCount = completed.filter(a => a.passed).length;
        const rate = completed.length > 0 ? (passedCount / completed.length) * 100 : null;
        return { completedAttempts: completed, averageScore: avg, passRate: rate };
    }, [attempts]);
    
    if (loading || authLoading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[calc(100vh-20rem)]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">My Results</h1>
                <p className="text-muted-foreground">A history of all the tests you've completed or started.</p>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
                    <ListChecks className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                    <div className="text-2xl font-bold">{attempts.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completed</CardTitle>
                    <Check className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                    <div className="text-2xl font-bold">{completedAttempts.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                    <Star className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                     <div className="text-2xl font-bold">{averageScore !== null ? `${averageScore.toFixed(1)}%` : "N/A"}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                     <div className="text-2xl font-bold">{passRate !== null ? `${passRate.toFixed(1)}%` : "N/A"}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Test History</CardTitle>
                    <CardDescription>
                        You have taken {attempts.length} test{attempts.length !== 1 ? 's' : ''} in total.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                         <div className="flex flex-col items-center justify-center text-center text-destructive h-64 border-2 border-dashed border-destructive/50 rounded-lg bg-destructive/10">
                            <ShieldAlert className="h-12 w-12 mb-4" />
                            <h3 className="text-lg font-semibold">Error Loading Results</h3>
                            <p className="mt-1">{error}</p>
                        </div>
                    )}

                    {!error && attempts.length > 0 && (
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Test Name</TableHead>
                                    <TableHead>Score</TableHead>
                                    <TableHead>Percentage</TableHead>
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
                                        <TableCell>{attempt.status === 'completed' ? `${attempt.percentage.toFixed(1)}%` : 'N/A'}</TableCell>
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
                    )}

                    {!error && attempts.length === 0 && (
                        <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-64 border-2 border-dashed rounded-lg bg-muted/50">
                            <BarChart3 className="h-16 w-16 mb-4 text-primary/70" />
                            <h3 className="text-xl font-semibold">No Results Yet</h3>
                            <p className="mt-2 max-w-xs">It looks like you haven't taken any tests. Complete a test to see your detailed performance history appear here.</p>
                             <Button asChild variant="default" className="mt-4">
                                <Link href="/tests">Take a Test Now</Link>
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
