
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchTestConfigs } from '@/lib/test-config-service';
import type { TestConfig } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ListChecks, Clock, Percent } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function TestsPage() {
    const [configs, setConfigs] = useState<TestConfig[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadConfigs = async () => {
            setLoading(true);
            try {
                const publishedConfigs = await fetchTestConfigs(true);
                setConfigs(publishedConfigs);
            } catch (error) {
                console.error("Failed to load test configurations:", error);
            } finally {
                setLoading(false);
            }
        };
        loadConfigs();
    }, []);
    
    if (loading) {
        return <div className="flex justify-center items-center h-[50vh]"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="container mx-auto px-6 sm:px-10 lg:px-16 py-8 md:py-12">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold font-headline">Practice Tests</h1>
                <p className="text-lg text-muted-foreground mt-2">Select a test to challenge yourself and gauge your preparation.</p>
            </div>
            
            {configs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {configs.map(config => (
                        <Card key={config.id} className="flex flex-col hover:shadow-lg transition-shadow duration-300">
                            <CardHeader>
                                <CardTitle>{config.name}</CardTitle>
                                <CardDescription>{config.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-4">
                                <div className="flex items-center text-muted-foreground text-sm gap-6">
                                    <div className="flex items-center gap-2" title="Total Questions"><ListChecks className="h-4 w-4" /><span>{config.totalQuestions} Questions</span></div>
                                    <div className="flex items-center gap-2" title="Duration"><Clock className="h-4 w-4" /><span>{config.duration} min</span></div>
                                </div>
                                 <div className="flex items-center text-muted-foreground text-sm gap-6">
                                    <div className="flex items-center gap-2" title="Passing Percentage"><Percent className="h-4 w-4" /><span>{config.passingMarks}% to Pass</span></div>
                                </div>
                                {config.hasNegativeMarking && (
                                     <Badge variant="destructive">Has Negative Marking</Badge>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button asChild className="w-full">
                                    <Link href={`/tests/${config.id}`}>View Details</Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                 <div className="col-span-full text-center py-16">
                    <p className="text-xl text-muted-foreground">No practice tests are available at the moment.</p>
                    <p>Please check back later.</p>
                </div>
            )}
        </div>
    )
}
