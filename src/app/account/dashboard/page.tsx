
"use client"

import { useAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowRight, BookCheck, Star, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import type { Plan, User as UserProfile, TestAttempt } from '@/types';
import { getUserProfile } from '@/lib/user-service';
import { fetchPlans } from '@/lib/plan-service';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fetchTestAttemptsForUser } from '@/lib/test-attempt-service';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function AccountDashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [plan, setPlan] = useState<Plan | null>(null);
    const [attempts, setAttempts] = useState<TestAttempt[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            const loadData = async () => {
                setLoading(true);
                try {
                    const [profile, plans, testAttempts] = await Promise.all([
                        getUserProfile(user.uid),
                        fetchPlans(),
                        fetchTestAttemptsForUser(user.uid)
                    ]);
                    setUserProfile(profile);
                    setAttempts(testAttempts);

                    if (profile) {
                        const currentPlan = plans.find(p => p.id === profile.planId);
                        setPlan(currentPlan || null);
                    }
                } catch (error) {
                    console.error("Failed to load user data:", error);
                } finally {
                    setLoading(false);
                }
            };
            loadData();
        } else if (!authLoading) {
            setLoading(false);
        }
    }, [user, authLoading]);

    const completedAttempts = useMemo(() => attempts.filter(a => a.status === 'completed'), [attempts]);

    const averageScore = completedAttempts.length > 0
        ? (completedAttempts.reduce((acc, attempt) => acc + attempt.percentage, 0) / completedAttempts.length)
        : null;

    if (authLoading || loading) {
         return (
            <div className="flex justify-center items-center h-full min-h-[calc(100vh-20rem)]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Welcome, {user?.displayName || 'Member'}!</h1>
                <p className="text-muted-foreground">Here's a summary of your activity and subscription.</p>
            </div>
            
            <Card className="bg-gradient-to-r from-primary to-blue-400 text-primary-foreground shadow-lg">
                <CardContent className="p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm opacity-90">Your Current Subscription</p>
                        <h3 className="text-2xl font-bold">{plan?.name || 'N/A'}</h3>
                         {userProfile?.planExpiryDate && (
                            <p className="text-xs opacity-80 mt-1">
                                Expires on {format(new Date(userProfile.planExpiryDate), 'PPP')}
                            </p>
                        )}
                    </div>
                    <Button asChild variant="secondary" className="bg-white/20 hover:bg-white/30">
                        <Link href="/pricing">
                            View & Upgrade Plans <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardContent>
            </Card>

             <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Papers Taken</span>
                            <BookCheck className="h-5 w-5 text-muted-foreground" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">{completedAttempts.length}</div>
                        <p className="text-xs text-muted-foreground">You have completed {completedAttempts.length} papers.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Average Score</span>
                            <Star className="h-5 w-5 text-muted-foreground" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">{averageScore !== null ? `${averageScore.toFixed(1)}%` : "N/A"}</div>
                        <p className="text-xs text-muted-foreground">{averageScore !== null ? "Your average across all tests." : "Complete a paper to see your average."}</p>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Recent Results</CardTitle>
                    <CardDescription>Review your most recently completed tests.</CardDescription>
                </CardHeader>
                <CardContent>
                   {completedAttempts.length > 0 ? (
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Test</TableHead>
                                    <TableHead>Score</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {completedAttempts.slice(0, 3).map(attempt => (
                                     <TableRow key={attempt.id}>
                                        <TableCell className="font-medium">{attempt.testConfigName}</TableCell>
                                        <TableCell>{attempt.score.toFixed(2)} / {attempt.totalMarks}</TableCell>
                                        <TableCell>
                                            <Badge variant={attempt.passed ? "default" : "destructive"} className={cn(attempt.passed && "bg-green-600 hover:bg-green-700")}>
                                                {attempt.passed ? "Passed" : "Failed"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{attempt.endTime ? format(new Date(attempt.endTime), "PPP") : 'N/A'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                         </Table>
                   ) : (
                    <div className="text-center text-muted-foreground py-12">
                        <p>Your recent test results will appear here.</p>
                        <Link href="/papers">
                                <span className="text-primary hover:underline font-semibold mt-2 inline-block">Take a test now</span>
                        </Link>
                    </div>
                   )}
                </CardContent>
            </Card>

        </div>
    );
}
