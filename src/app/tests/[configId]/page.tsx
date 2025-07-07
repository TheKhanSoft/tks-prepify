
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getTestConfigBySlug } from '@/lib/test-config-service';
import type { TestConfig } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ListChecks, Clock, Percent, ArrowRight, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function TestDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.configId as string;

    const [config, setConfig] = useState<TestConfig | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!slug) return;

        const loadConfig = async () => {
            setLoading(true);
            try {
                const fetchedConfig = await getTestConfigBySlug(slug);
                if (fetchedConfig && fetchedConfig.published) {
                    setConfig(fetchedConfig);
                } else {
                    setConfig(null);
                }
            } catch (error) {
                console.error("Failed to load test configuration:", error);
                setConfig(null);
            } finally {
                setLoading(false);
            }
        };
        loadConfig();
    }, [slug]);
    
    if (loading) {
        return <div className="flex justify-center items-center h-[50vh]"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!config) {
         return (
            <div className="container mx-auto text-center py-20">
                <h1 className="text-2xl font-bold">Test Not Found</h1>
                <p>This test configuration could not be found or is not available.</p>
                <Button onClick={() => router.push('/tests')} className="mt-4">Back to All Tests</Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto flex items-center justify-center min-h-[calc(100vh-10rem)] py-12">
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-bold">{config.name}</CardTitle>
                    <CardDescription className="text-lg">{config.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="border rounded-lg p-6 space-y-4">
                        <h3 className="font-semibold text-lg text-center mb-4">Test Rules & Structure</h3>
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="p-4 bg-muted/50 rounded-md">
                                <ListChecks className="h-8 w-8 mx-auto text-primary mb-2" />
                                <p className="font-bold text-xl">{config.totalQuestions}</p>
                                <p className="text-sm text-muted-foreground">Total Questions</p>
                            </div>
                            <div className="p-4 bg-muted/50 rounded-md">
                                <Clock className="h-8 w-8 mx-auto text-primary mb-2" />
                                <p className="font-bold text-xl">{config.duration}</p>
                                <p className="text-sm text-muted-foreground">Minutes</p>
                            </div>
                             <div className="p-4 bg-muted/50 rounded-md">
                                <Percent className="h-8 w-8 mx-auto text-primary mb-2" />
                                <p className="font-bold text-xl">{config.passingMarks}%</p>
                                <p className="text-sm text-muted-foreground">Passing Score</p>
                            </div>
                            <div className="p-4 bg-muted/50 rounded-md">
                                <p className="font-bold text-xl">{config.marksPerQuestion}</p>
                                <p className="text-sm text-muted-foreground">Marks per Question</p>
                            </div>
                        </div>
                         {config.hasNegativeMarking && (
                            <div className="text-center pt-4">
                               <Badge variant="destructive">Negative Marking: {config.negativeMarkValue} marks will be deducted for each wrong answer.</Badge>
                            </div>
                        )}
                    </div>
                     <p className="text-sm text-muted-foreground text-center">You are about to start the test. The timer will begin as soon as you click the "Start Test" button. Make sure you are ready.</p>
                    <div className="flex justify-between gap-4">
                        <Button variant="outline" onClick={() => router.push('/tests')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Choose Another Test
                        </Button>
                        <Button size="lg" asChild>
                            <Link href={`/tests/${config.slug}/take`}>Start Test <ArrowRight className="ml-2 h-4 w-4" /></Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
