'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BarChart3 } from 'lucide-react';

export default function ResultsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">My Results</h1>
                <p className="text-muted-foreground">A history of all the tests you've completed.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Test History</CardTitle>
                    <CardDescription>Your past test scores and results will be listed here.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-64 border-2 border-dashed rounded-lg">
                        <BarChart3 className="h-12 w-12 mb-4" />
                        <h3 className="text-lg font-semibold">No Results Yet</h3>
                        <p className="mt-1">Complete a test paper to see your results appear here.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
