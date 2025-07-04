"use client"

import { useAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowRight, BookCheck, Star, Clock } from 'lucide-react';
import Link from 'next/link';

export default function AccountDashboardPage() {
    const { user } = useAuth();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Welcome, {user?.displayName || 'Member'}!</h1>
                <p className="text-muted-foreground">Here's a summary of your activity.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Papers Taken</span>
                            <BookCheck className="h-5 w-5 text-muted-foreground" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">You haven't completed any papers yet.</p>
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
                        <div className="text-4xl font-bold">N/A</div>
                        <p className="text-xs text-muted-foreground">Complete a paper to see your average.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Time Spent</span>
                             <Clock className="h-5 w-5 text-muted-foreground" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">0m</div>
                        <p className="text-xs text-muted-foreground">Total time spent on tests.</p>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Recent Results</CardTitle>
                    <CardDescription>Review your most recently completed tests.</CardDescription>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground py-12">
                   <p>Your recent test results will appear here.</p>
                   <Link href="/papers">
                        <span className="text-primary hover:underline font-semibold mt-2 inline-block">Take a test now</span>
                   </Link>
                </CardContent>
            </Card>

        </div>
    );
}
