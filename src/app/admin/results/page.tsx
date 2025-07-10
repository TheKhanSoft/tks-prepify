'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ChevronRight, Loader2, BarChart3, ShieldAlert, ListChecks, Check, Star, ShieldCheck, Calendar, Clock, Target, TrendingUp, Award, BookOpen } from 'lucide-react';
import { useAuth } from "@/hooks/use-auth";
import { fetchAllTestAttemptsForAdmin } from "@/lib/test-attempt-service";
import type { TestAttempt, User as UserType } from "@/types";
import { fetchUserProfiles } from "@/lib/user-service";
import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Enhanced status badge with better visual design
const StatusBadge = ({ attempt }: { attempt: TestAttempt }) => {
    if (attempt.status === 'completed') {
        return (
            <Badge 
                variant={attempt.passed ? "default" : "destructive"} 
                className={cn(
                    'capitalize flex items-center gap-1 px-3 py-1',
                    attempt.passed 
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white" 
                        : "bg-red-500 hover:bg-red-600 text-white"
                )}
            >
                {attempt.passed ? <Award className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                {attempt.passed ? "Passed" : "Failed"}
            </Badge>
        );
    }
    if (attempt.status === 'in-progress') {
        return (
            <Badge variant="secondary" className="capitalize flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 border-blue-200">
                <Clock className="h-3 w-3" />
                In Progress
            </Badge>
        );
    }
    return (
        <Badge variant="outline" className="capitalize flex items-center gap-1 px-3 py-1">
            <Clock className="h-3 w-3" />
            {attempt.status || 'Unknown'}
        </Badge>
    );
};

// Modern test attempt card component
const TestAttemptCard = ({ attempt, userMap }: { attempt: TestAttempt; userMap: Map<string, UserType> }) => {
    const getScoreColor = (percentage: number) => {
        if (percentage >= 80) return "text-emerald-600";
        if (percentage >= 60) return "text-yellow-600";
        return "text-red-600";
    };

    const getScoreBackgroundColor = (percentage: number) => {
        if (percentage >= 80) return "bg-emerald-50 border-emerald-200";
        if (percentage >= 60) return "bg-yellow-50 border-yellow-200";
        return "bg-red-50 border-red-200";
    };
    
    const testUser = userMap.get(attempt.userId);

    const CardWrapper = ({ children }: { children: React.ReactNode }) => {
        if (attempt.status === 'completed') {
            return (
                <Link href={`/results/test/${attempt.id}`} className="block">
                    <Card className="group hover:shadow-xl hover:scale-[1.02] transition-all duration-300 border-l-4 border-l-primary/20 hover:border-l-primary cursor-pointer bg-gradient-to-r from-white to-gray-50/50 hover:from-primary/5 hover:to-primary/10">
                        {children}
                    </Card>
                </Link>
            );
        }
        return (
            <Card className="border-l-4 border-l-gray-300 bg-gradient-to-r from-white to-gray-50/50 opacity-75">
                {children}
            </Card>
        );
    };

    return (
        <CardWrapper>
            <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                        <CardTitle className="text-lg font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                            {attempt.testConfigName}
                        </CardTitle>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                {attempt.startTime ? format(new Date(attempt.startTime), "MMM dd, yyyy") : 'N/A'}
                            </div>
                            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                <div className="w-2 h-2 bg-primary rounded-full" />
                                {testUser?.name || attempt.userName || attempt.userEmail || 'Unknown User'}
                            </div>
                        </div>
                    </div>
                    <StatusBadge attempt={attempt} />
                </div>
            </CardHeader>
            
            <CardContent className="pt-0">
                {attempt.status === 'completed' ? (
                    <div className="space-y-4">
                        {/* Enhanced Score Display */}
                        <div className={cn("rounded-xl p-4 border", getScoreBackgroundColor(attempt.percentage))}>
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Score Achieved</div>
                                    <div className="text-lg font-bold text-foreground">
                                        {attempt.score.toFixed(1)} / {attempt.totalMarks}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={cn("text-3xl font-bold", getScoreColor(attempt.percentage))}>
                                        {attempt.percentage.toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Hover Indicator */}
                        <div className="flex items-center justify-center text-sm text-muted-foreground group-hover:text-primary transition-colors">
                            <span className="mr-2">Click to view detailed results</span>
                            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="rounded-xl p-4 bg-blue-50 border border-blue-200">
                            <div className="flex items-center justify-center gap-2 text-blue-700">
                                <Clock className="h-5 w-5" />
                                <span className="font-medium">Test in Progress</span>
                            </div>
                        </div>
                        <div className="text-center text-sm text-muted-foreground">
                            User is currently taking this test
                        </div>
                    </div>
                )}
            </CardContent>
        </CardWrapper>
    );
};

// Enhanced stats card component
const StatsCard = ({ title, value, icon: Icon, description, trend }: {
    title: string;
    value: string;
    icon: any;
    description?: string;
    trend?: string;
}) => (
    <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <Icon className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold text-foreground">{value}</div>
            {description && (
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
            {trend && (
                <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                    <span className="text-xs text-emerald-600">{trend}</span>
                </div>
            )}
        </CardContent>
    </Card>
);

export default function ResultsPage() {
    const { user, loading: authLoading } = useAuth();
    const [attempts, setAttempts] = useState<TestAttempt[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [users, setUsers] = useState<UserType[]>([]);

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
                const [fetchedAttempts, usersData] = await Promise.all([
                    fetchAllTestAttemptsForAdmin(), 
                    fetchUserProfiles()
                ]);
                setAttempts(fetchedAttempts);
                setUsers(usersData);
            } catch (err) {
                setError("Could not retrieve your test results. Please try refreshing the page.");
            } finally {
                setLoading(false);
            }
        };

        loadAttempts();
    }, [user, authLoading]);

    const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
    
    const { completedAttempts, averageScore, passRate, recentTrend } = useMemo(() => {
        const completed = attempts.filter(a => a.status === 'completed');
        const avg = completed.length > 0 
            ? (completed.reduce((acc, attempt) => acc + attempt.percentage, 0) / completed.length)
            : null;
        const passedCount = completed.filter(a => a.passed).length;
        const rate = completed.length > 0 ? (passedCount / completed.length) * 100 : null;
    
        // Calculate recent trend (last 3 vs previous 3)
        const recent = completed.slice(-3);
        const previous = completed.slice(-6, -3);
        const recentAvg = recent.length > 0 ? recent.reduce((acc, a) => acc + a.percentage, 0) / recent.length : 0;
        const previousAvg = previous.length > 0 ? previous.reduce((acc, a) => acc + a.percentage, 0) / previous.length : 0;
        const trend = recent.length >= 2 && previousAvg > 0 ? 
            `${recentAvg > previousAvg ? '+' : ''}${(recentAvg - previousAvg).toFixed(1)}%` : null;
        
        return { completedAttempts: completed, averageScore: avg, passRate: rate, recentTrend: trend };
    }, [attempts]);
    
    if (loading || authLoading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[calc(100vh-20rem)]">
                <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    <p className="text-muted-foreground">Loading your test results...</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Test Results Dashboard</h1>
                <p className="text-lg text-muted-foreground">
                    Track your progress and view detailed performance analytics
                </p>
            </div>
            
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Attempts"
                    value={attempts.length.toString()}
                    icon={ListChecks}
                    description="All test attempts"
                />
                <StatsCard
                    title="Completed Tests"
                    value={completedAttempts.length.toString()}
                    icon={Check}
                    description="Successfully finished"
                />
                <StatsCard
                    title="Average Score"
                    value={averageScore !== null ? `${averageScore.toFixed(1)}%` : "N/A"}
                    icon={Star}
                    description="Overall performance"
                    trend={recentTrend || undefined}
                />
                <StatsCard
                    title="Pass Rate"
                    value={passRate !== null ? `${passRate.toFixed(1)}%` : "N/A"}
                    icon={ShieldCheck}
                    description="Success percentage"
                />
            </div>

            {/* Main Content */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold">Recent Test Attempts</h2>
                    {attempts.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                            {attempts.length} test{attempts.length !== 1 ? 's' : ''} found
                        </div>
                    )}
                </div>

                {/* Error State */}
                {error && (
                    <Card className="border-red-200 bg-red-50">
                        <CardContent className="flex flex-col items-center justify-center text-center py-12">
                            <ShieldAlert className="h-12 w-12 text-red-500 mb-4" />
                            <h3 className="text-lg font-semibold text-red-700">Error Loading Results</h3>
                            <p className="text-red-600 mt-2">{error}</p>
                            <Button onClick={() => window.location.reload()} className="mt-4">
                                Try Again
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Test Attempts Grid */}
                {!error && attempts.length > 0 && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {attempts.map(attempt => (
                            <TestAttemptCard key={attempt.id} attempt={attempt} userMap={userMap} />
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!error && attempts.length === 0 && (
                    <Card className="border-dashed border-2">
                        <CardContent className="flex flex-col items-center justify-center text-center py-16">
                            <div className="rounded-full bg-primary/10 p-6 mb-4">
                                <BarChart3 className="h-12 w-12 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">No Test Results Yet</h3>
                            <p className="text-muted-foreground max-w-md mb-6">
                                You haven't taken any tests yet. Start your learning journey by taking your first test!
                            </p>
                            <Button asChild size="lg" className="gap-2">
                                <Link href="/tests">
                                    <BookOpen className="h-4 w-4" />
                                    Browse Available Tests
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}