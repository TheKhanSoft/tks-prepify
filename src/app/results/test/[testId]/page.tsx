
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Book, CheckCircle2, Lightbulb, Loader2, XCircle, ShieldAlert, Timer, CheckSquare, BarChart, Clock } from 'lucide-react';
import type { QuestionAttempt, TestAttempt, QuestionCategory } from '@/types';
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
import { Separator } from '@/components/ui/separator';
import { format, formatDistanceStrict } from 'date-fns';
import { fetchQuestionCategories } from '@/lib/question-category-service';
import { Progress } from '@/components/ui/progress';

type FeedbackState = { [questionId: string]: { loading: boolean; feedback?: string; suggestions?: string } };

const chartConfig = {
  correct: { label: "Correct", color: "hsl(var(--chart-2))" },
  incorrect: { label: "Incorrect", color: "hsl(var(--destructive))" },
} satisfies ChartConfig;

const RETRY_DELAY = 2000; // 2 seconds
const MAX_RETRIES = 4; // Total time ~8 seconds

export default function DynamicTestResultsPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const attemptId = params.testId as string;

  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [questionCategories, setQuestionCategories] = useState<QuestionCategory[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>({});
  const [recommendations, setRecommendations] = useState({ loading: false, content: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !attemptId) return;
    if (!user) {
        toast({ title: "Unauthorized", description: "You must be logged in to view results.", variant: "destructive" });
        router.push(`/login?redirect=/results/test/${attemptId}`);
        return;
    }
    
    let retryCount = 0;
    const fetchAttempt = async () => {
        try {
            const [attemptData, categoriesData] = await Promise.all([
              getTestAttemptById(attemptId, user.uid),
              fetchQuestionCategories()
            ]);
            
            setQuestionCategories(categoriesData);
            
            if (attemptData && attemptData.status === 'completed' && attemptData.questionAttempts && attemptData.questionAttempts.length > 0) {
                setAttempt(attemptData);
                setLoading(false);
                setError(null);
            } else if (retryCount < MAX_RETRIES) {
                retryCount++;
                setTimeout(fetchAttempt, RETRY_DELAY);
            } else {
                 setLoading(false);
                 setError("Could not load your test results. The data may still be processing, or you may not have permission to view this page. Please try refreshing in a moment.");
            }
        } catch (e) {
            console.error(e);
            setLoading(false);
            setError("An unexpected error occurred while fetching your results.");
        }
    };
    
    fetchAttempt();

  }, [attemptId, user, authLoading, router, toast]);

  const handleGetFeedback = async (question: QuestionAttempt) => {
    if (!attempt || loading) return;
    setFeedback(prev => ({ ...prev, [question.questionId]: { loading: true } }));
    
    const correctAnswerText = Array.isArray(question.correctAnswer) ? question.correctAnswer.join(', ') : question.correctAnswer;
    const userAnswerText = Array.isArray(question.userAnswer) ? question.userAnswer.join(', ') : (question.userAnswer || "No answer provided.");
    
    try {
      const aiFeedback = await getPersonalizedFeedback({
        question: question.questionText,
        userAnswer: userAnswerText,
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

  const { chartData, score, totalMarks, percentage, passed, timeTaken, attemptedQuestions, minTime, maxTime } = useMemo(() => {
    if (!attempt || !attempt.questionAttempts) return { chartData: [], score: 0, totalMarks: 0, percentage: 0, passed: false, timeTaken: 'N/A', attemptedQuestions: '0 / 0', minTime: '0s', maxTime: '0s' };
    
    const correctCount = attempt.questionAttempts.filter(a => a.isCorrect).length;
    const incorrectCount = attempt.questionAttempts.length - correctCount;

    const timeTakenInSeconds = attempt.endTime && attempt.startTime ? Math.round((new Date(attempt.endTime).getTime() - new Date(attempt.startTime).getTime()) / 1000) : 0;
    const timeTakenFormatted = timeTakenInSeconds > 0 ? formatDistanceStrict(0, timeTakenInSeconds * 1000) : 'N/A';
    
    const attemptedQuestionsCount = attempt.questionAttempts.filter(a => a.userAnswer !== null && a.userAnswer !== undefined && (typeof a.userAnswer !== 'string' || a.userAnswer.trim() !== '') && (!Array.isArray(a.userAnswer) || a.userAnswer.length > 0)).length;
    
    const questionTimes = attempt.questionAttempts.map(a => a.timeSpent || 0).filter(t => t > 0);
    const minTimeSpent = questionTimes.length > 0 ? Math.min(...questionTimes) : 0;
    const maxTimeSpent = questionTimes.length > 0 ? Math.max(...questionTimes) : 0;
    
    return {
        chartData: [{ name: "Performance", correct: correctCount, incorrect: incorrectCount }],
        score: attempt.score,
        totalMarks: attempt.totalMarks,
        percentage: attempt.percentage,
        passed: attempt.passed,
        timeTaken: timeTakenFormatted,
        attemptedQuestions: `${attemptedQuestionsCount} / ${attempt.questionAttempts.length}`,
        minTime: `${minTimeSpent}s`,
        maxTime: `${maxTimeSpent}s`,
    };
  }, [attempt]);

  const categoryPerformance = useMemo(() => {
    if (!attempt?.questionAttempts || !questionCategories.length) return [];
    
    const categoryMap = new Map<string, { name: string; correct: number; total: number }>();
    
    const getCategoryName = (id: string, categories: QuestionCategory[]): string | null => {
        for (const cat of categories) {
            if (cat.id === id) return cat.name;
            if (cat.subcategories) {
                const found = getCategoryName(id, cat.subcategories);
                if (found) return found;
            }
        }
        return null;
    };

    attempt.questionAttempts.forEach(qa => {
        const categoryId = qa.questionCategoryId || 'uncategorized';
        if (!categoryMap.has(categoryId)) {
            const name = categoryId === 'uncategorized' ? 'Uncategorized' : getCategoryName(categoryId, questionCategories) || 'Unknown Category';
            categoryMap.set(categoryId, { name, correct: 0, total: 0 });
        }
        const categoryData = categoryMap.get(categoryId)!;
        categoryData.total += 1;
        if (qa.isCorrect) {
            categoryData.correct += 1;
        }
    });

    return Array.from(categoryMap.values()).map(data => ({
        ...data,
        percentage: data.total > 0 ? (data.correct / data.total) * 100 : 0,
    })).sort((a,b) => a.name.localeCompare(b.name));
  }, [attempt, questionCategories]);

  if (loading) {
    return (
        <div className="flex justify-center items-center h-screen flex-col gap-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-muted-foreground">Finalizing your results...</p>
        </div>
    );
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
    return null;
  }

  return (
    <div className="container mx-auto px-6 sm:px-10 lg:px-16 py-8 md:py-12">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-3xl font-bold font-headline">Test Results: {attempt.testConfigName}</CardTitle>
          <CardDescription>Here&apos;s a breakdown of your performance.</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-8">
             <Card className="bg-secondary/50">
                <CardHeader className="items-center">
                  <CardTitle>Summary</CardTitle>
                  <Badge className={cn(passed ? 'bg-green-600 hover:bg-green-700' : 'bg-destructive hover:bg-destructive/90', "text-lg")}>{passed ? 'PASSED' : 'FAILED'}</Badge>
                </CardHeader>
                <CardContent className="space-y-4 text-center">
                    <div>
                        <div className="text-6xl font-bold text-primary">{score.toFixed(2)} <span className="text-3xl text-muted-foreground">/ {totalMarks}</span></div>
                        <div className="text-2xl font-semibold">{percentage.toFixed(2)}%</div>
                    </div>
                    <ChartContainer config={chartConfig} className="w-full h-32">
                        <RechartsBarChart accessibilityLayer data={chartData} layout="vertical" margin={{ left: 10, right: 10 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" tickLine={false} tick={false} axisLine={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="correct" stackId="a" fill="var(--color-correct)" radius={[4, 0, 0, 4]} />
                        <Bar dataKey="incorrect" stackId="a" fill="var(--color-incorrect)" radius={[0, 4, 4, 0]} />
                        </RechartsBarChart>
                    </ChartContainer>
                    <Separator />
                    <div className="text-left space-y-3 text-sm">
                        <div className="flex justify-between items-center"><span className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4"/>Started</span> <span>{attempt.startTime ? format(new Date(attempt.startTime), 'PPP p') : 'N/A'}</span></div>
                        <div className="flex justify-between items-center"><span className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="h-4 w-4"/>Finished</span> <span>{attempt.endTime ? format(new Date(attempt.endTime), 'PPP p') : 'N/A'}</span></div>
                        <div className="flex justify-between items-center"><span className="flex items-center gap-2 text-muted-foreground"><Timer className="h-4 w-4"/>Time Taken</span> <span>{timeTaken}</span></div>
                        <div className="flex justify-between items-center"><span className="flex items-center gap-2 text-muted-foreground"><CheckSquare className="h-4 w-4"/>Attempted</span> <span>{attemptedQuestions}</span></div>
                        <div className="flex justify-between items-center"><span className="flex items-center gap-2 text-muted-foreground"><BarChart className="h-4 w-4 -rotate-90"/>Fastest Answer</span> <span>{minTime}</span></div>
                        <div className="flex justify-between items-center"><span className="flex items-center gap-2 text-muted-foreground"><BarChart className="h-4 w-4 rotate-90"/>Slowest Answer</span> <span>{maxTime}</span></div>
                    </div>
                </CardContent>
            </Card>

            {categoryPerformance.length > 0 && (
                <Card>
                    <CardHeader><CardTitle>Performance by Category</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                    {categoryPerformance.map(cat => (
                        <div key={cat.name}>
                        <div className="flex justify-between items-center mb-1">
                            <p className="font-medium text-sm">{cat.name}</p>
                            <p className="text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">{cat.correct}</span> / {cat.total}
                            </p>
                        </div>
                        <Progress value={cat.percentage} aria-label={`${cat.name} performance`} />
                        </div>
                    ))}
                    </CardContent>
                </Card>
            )}

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>AI Recommendations</CardTitle>
                <Button onClick={handleGetRecommendations} disabled={recommendations.loading}>
                  {recommendations.loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Book className="mr-2 h-4 w-4" />}
                  Suggest Resources
                </Button>
              </CardHeader>
              {recommendations.content && (
                <CardContent>
                  <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">{recommendations.content}</div>
                </CardContent>
              )}
            </Card>

          </div>
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>Detailed Question Review</CardTitle></CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {attempt.questionAttempts?.map((question) => {
                    const questionFeedback = feedback[question.questionId];
                    const correctAnswerText = Array.isArray(question.correctAnswer) ? question.correctAnswer.join(', ') : question.correctAnswer;
                    const userAnswerText = Array.isArray(question.userAnswer) ? question.userAnswer.join(', ') : (question.userAnswer || "Not Answered");

                    return (
                      <AccordionItem key={question.questionId} value={`item-${question.questionId}`}>
                        <AccordionTrigger className="text-left hover:no-underline">
                          <div className="flex items-start gap-4">
                            {question.isCorrect ? <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500 mt-1" /> : <XCircle className="h-5 w-5 flex-shrink-0 text-destructive mt-1" />}
                            <span>Question {question.order}: {question.questionText}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pl-10">
                          <div>Your answer: <Badge variant={question.isCorrect ? "default" : "destructive"} className={cn(question.isCorrect && 'bg-green-600 hover:bg-green-700')}>{userAnswerText}</Badge></div>
                          {!question.isCorrect && <div>Correct answer: <Badge className="bg-green-600 hover:bg-green-700">{correctAnswerText}</Badge></div>}
                          {question.explanation && <div className="text-muted-foreground pt-2 border-t mt-4"><span className="font-semibold text-foreground">Explanation:</span> {question.explanation}</div>}
                          {!question.isCorrect && (
                            <div className="p-4 bg-muted/50 rounded-lg mt-4">
                              <Button variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10" size="sm" onClick={() => handleGetFeedback(question)} disabled={questionFeedback?.loading || loading}>
                                {questionFeedback?.loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                                Get AI Feedback
                              </Button>
                              {questionFeedback && !questionFeedback.loading && (
                                <div className="mt-4 prose prose-sm max-w-none text-muted-foreground space-y-2">
                                  {questionFeedback.feedback && <div><p className="font-semibold text-foreground">Feedback</p><p>{questionFeedback.feedback}</p></div>}
                                  {questionFeedback.suggestions && <div><p className="font-semibold text-foreground">Suggestions</p><p>{questionFeedback.suggestions}</p></div>}
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
        </div>
    </div>
  );
}
