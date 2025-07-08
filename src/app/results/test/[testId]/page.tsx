
"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Book, CheckCircle2, Lightbulb, Loader2, XCircle, ShieldAlert } from 'lucide-react';
import type { QuestionAttempt, TestAttempt } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { getPersonalizedFeedback } from '@/ai/flows/personalized-feedback';
import { recommendResources } from '@/ai/flows/resource-recommendation';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { Bar, BarChart as RechartsBarChart, XAxis, YAxis } from "recharts";
import { cn } from '@/lib/utils';
import { getTestAttemptById } from '@/lib/test-attempt-service';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

type FeedbackState = { [questionId: string]: { loading: boolean; feedback?: string; suggestions?: string } };

const chartConfig = {
  correct: { label: "Correct", color: "hsl(var(--chart-2))" },
  incorrect: { label: "Incorrect", color: "hsl(var(--destructive))" },
} satisfies ChartConfig;

const RETRY_DELAY = 1500; // 1.5 seconds
const MAX_RETRIES = 3;

export default function DynamicTestResultsPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const attemptId = params.testId as string;

  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>({});
  const [recommendations, setRecommendations] = useState({ loading: false, content: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAttemptWithRetry = useCallback(async (userId: string, retries = MAX_RETRIES) => {
    try {
      const attemptData = await getTestAttemptById(attemptId, userId);
      if (attemptData) {
        setAttempt(attemptData);
        setError(null);
        setLoading(false);
      } else if (retries > 0) {
        setTimeout(() => fetchAttemptWithRetry(userId, retries - 1), RETRY_DELAY);
      } else {
        setError("Could not load your test results. It might still be processing, or you may not have permission to view this page. Please try refreshing in a moment.");
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      setError("An unexpected error occurred while fetching your results.");
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      toast({ title: "Unauthorized", description: "You must be logged in to view results.", variant: "destructive" });
      router.push(`/login?redirect=/results/test/${attemptId}`);
      return;
    }
    if (attemptId && user) {
      fetchAttemptWithRetry(user.uid);
    }
  }, [attemptId, user, authLoading, router, toast, fetchAttemptWithRetry]);

  const handleGetFeedback = async (question: QuestionAttempt) => {
    if (!attempt || loading) return;
    setFeedback(prev => ({ ...prev, [question.questionId]: { loading: true } }));
    
    const correctAnswerText = Array.isArray(question.correctAnswer) ? question.correctAnswer.join(', ') : question.correctAnswer;
    const userAnswerText = Array.isArray(question.userAnswer) ? question.userAnswer.join(', ') : question.userAnswer;
    
    try {
      const aiFeedback = await getPersonalizedFeedback({
        question: question.questionText,
        userAnswer: userAnswerText || "No answer provided.",
        correctAnswer: correctAnswerText,
        category: 'General',
        subcategory: 'General',
      });
      setFeedback(prev => ({ ...prev, [question.questionId]: { loading: false, ...aiFeedback } }));
    } catch (error) {
      console.error("Failed to get feedback:", error);
      setFeedback(prev => ({ ...prev, [question.questionId]: { loading: false, feedback: "Could not load feedback.", suggestions: "" } }));
    }
  };

  const handleGetRecommendations = async () => {
    if (!attempt) return;
    setRecommendations({ loading: true, content: '' });
    const weakAreas = attempt.questionAttempts
      ?.filter(a => !a.isCorrect)
      .map(a => a.questionText)
      .join(', ');

    try {
        const res = await recommendResources({
            performanceData: `Score: ${attempt.score}/${attempt.totalMarks}`,
            weakAreas: weakAreas || "No specific weak areas identified, general review recommended.",
        });
        setRecommendations({ loading: false, content: res.recommendedResources });
    } catch(error) {
        console.error("Failed to get recommendations:", error);
        setRecommendations({ loading: false, content: 'Could not load recommendations.' });
    }
  };

  const { chartData, score, totalMarks, percentage, passed } = useMemo(() => {
    if (!attempt || !attempt.questionAttempts) return { chartData: [], score: 0, totalMarks: 0, percentage: 0, passed: false };
    
    const correctCount = attempt.questionAttempts.filter(a => a.isCorrect).length;
    const incorrectCount = attempt.questionAttempts.length - correctCount;
    
    return {
        chartData: [{ name: "Performance", correct: correctCount, incorrect: incorrectCount }],
        score: attempt.score,
        totalMarks: attempt.totalMarks,
        percentage: attempt.percentage,
        passed: attempt.passed,
    };
  }, [attempt]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (error) {
     return (
        <div className="container mx-auto px-6 sm:px-10 lg:px-16 py-20 text-center">
             <Card className="max-w-md mx-auto">
                <CardHeader>
                    <CardTitle className="flex items-center justify-center gap-2"><ShieldAlert className="h-6 w-6 text-destructive" /> Error Loading Results</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">{error}</p>
                    <Button onClick={() => router.push('/account/results')} className="mt-6">View My Results History</Button>
                </CardContent>
             </Card>
        </div>
     );
  }

  if (!attempt) {
    return null; // Should be handled by error state
  }

  return (
    <div className="container mx-auto px-6 sm:px-10 lg:px-16 py-8 md:py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold font-headline">Test Results: {attempt.testConfigName}</CardTitle>
          <CardDescription>Here&apos;s a breakdown of your performance.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-8">
          <Card className="md:col-span-1 bg-secondary/50">
            <CardHeader className="items-center">
              <CardTitle>Summary</CardTitle>
              <Badge className={cn(passed ? 'bg-green-600' : 'bg-destructive', "text-lg")}>{passed ? 'PASSED' : 'FAILED'}</Badge>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <div className="text-6xl font-bold text-primary">{score.toFixed(2)} <span className="text-3xl text-muted-foreground">/ {totalMarks}</span></div>
              <div className="text-2xl font-semibold">{percentage.toFixed(2)}%</div>
              <ChartContainer config={chartConfig} className="w-full h-40">
                <RechartsBarChart accessibilityLayer data={chartData} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tickLine={false} tick={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="correct" stackId="a" fill="var(--color-correct)" radius={[4, 4, 4, 4]} />
                  <Bar dataKey="incorrect" stackId="a" fill="var(--color-incorrect)" radius={[4, 4, 4, 4]} />
                </RechartsBarChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Resource Recommendations</CardTitle>
                <Button onClick={handleGetRecommendations} disabled={recommendations.loading}>
                  {recommendations.loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Book className="mr-2 h-4 w-4" />}
                  Get Resources
                </Button>
              </CardHeader>
              {recommendations.content && (
                <CardContent>
                  <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">{recommendations.content}</div>
                </CardContent>
              )}
            </Card>
            <Card>
              <CardHeader><CardTitle>Detailed Review</CardTitle></CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {attempt.questionAttempts?.map((question) => {
                    const questionFeedback = feedback[question.questionId];
                    const correctAnswerText = Array.isArray(question.correctAnswer) ? question.correctAnswer.join(', ') : question.correctAnswer;
                    const userAnswerText = Array.isArray(question.userAnswer) ? question.userAnswer.join(', ') : question.userAnswer;

                    return (
                      <AccordionItem key={question.questionId} value={`item-${question.questionId}`}>
                        <AccordionTrigger className="text-left">
                          <div className="flex items-center gap-4">
                            {question.isCorrect ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-destructive" />}
                            <span>Question {question.order}: {question.questionText}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4">
                          <p>Your answer: <Badge variant={question.isCorrect ? "default" : "destructive"}>{userAnswerText || "Not Answered"}</Badge></p>
                          {!question.isCorrect && <p>Correct answer: <Badge className="bg-green-600 hover:bg-green-700">{correctAnswerText}</Badge></p>}
                          {question.explanation && <p className="text-muted-foreground"><span className="font-semibold">Explanation:</span> {question.explanation}</p>}
                          {!question.isCorrect && (
                            <div className="p-4 bg-secondary/50 rounded-lg">
                              <Button size="sm" onClick={() => handleGetFeedback(question)} disabled={questionFeedback?.loading || loading}>
                                {questionFeedback?.loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                                Get AI Feedback
                              </Button>
                              {questionFeedback && !questionFeedback.loading && (
                                <div className="mt-4 prose prose-sm max-w-none">
                                  {questionFeedback.feedback && <><h4>Feedback</h4><p>{questionFeedback.feedback}</p></>}
                                  {questionFeedback.suggestions && <><h4>Suggestions</h4><p>{questionFeedback.suggestions}</p></>}
                                </div>
                              )}
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    )
                  })}
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
