
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Book, CheckCircle2, Lightbulb, Loader2, XCircle, ShieldAlert, Timer, CheckSquare, BarChart, Clock, Percent, ListChecks } from 'lucide-react';
import type { QuestionAttempt, TestAttempt, QuestionCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { getPersonalizedFeedback } from '@/ai/flows/personalized-feedback';
import { recommendResources } from '@/ai/flows/resource-recommendation';
import { cn } from '@/lib/utils';
import { getTestAttemptById } from '@/lib/test-attempt-service';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceStrict } from 'date-fns';
import { fetchQuestionCategories } from '@/lib/question-category-service';
import { Progress } from '@/components/ui/progress';
import { getQuestionCategoryById } from '@/lib/question-category-helpers';

type FeedbackState = { [questionId: string]: { loading: boolean; feedback?: string; suggestions?: string } };

const RETRY_DELAY = 2000; 
const MAX_RETRIES = 4;

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

  const { score, totalMarks, percentage, passed, timeTaken, attemptedQuestions, correctCount, incorrectCount } = useMemo(() => {
    if (!attempt || !attempt.questionAttempts) return { score: 0, totalMarks: 0, percentage: 0, passed: false, timeTaken: 'N/A', attemptedQuestions: '0 / 0', correctCount: 0, incorrectCount: 0 };
    
    const correct = attempt.questionAttempts.filter(a => a.isCorrect).length;
    const incorrect = attempt.questionAttempts.length - correct;

    const timeTakenInSeconds = attempt.endTime && attempt.startTime ? Math.round((new Date(attempt.endTime).getTime() - new Date(attempt.startTime).getTime()) / 1000) : 0;
    const timeTakenFormatted = timeTakenInSeconds > 0 ? formatDistanceStrict(0, timeTakenInSeconds * 1000) : 'N/A';
    
    const attemptedQuestionsCount = attempt.questionAttempts.filter(a => a.userAnswer !== null && a.userAnswer !== undefined && (typeof a.userAnswer !== 'string' || a.userAnswer.trim() !== '') && (!Array.isArray(a.userAnswer) || a.userAnswer.length > 0)).length;
    
    return {
        score: attempt.score,
        totalMarks: attempt.totalMarks,
        percentage: attempt.percentage,
        passed: attempt.passed,
        timeTaken: timeTakenFormatted,
        attemptedQuestions: `${attemptedQuestionsCount} / ${attempt.questionAttempts.length}`,
        correctCount: correct,
        incorrectCount: incorrect,
    };
  }, [attempt]);

  const categoryPerformance = useMemo(() => {
    if (!attempt?.questionAttempts || !questionCategories.length) return [];
    
    const categoryMap = new Map<string, { name: string; correct: number; total: number }>();
    
    const getCategoryName = (id: string): string => {
        const cat = getQuestionCategoryById(id, questionCategories);
        return cat ? cat.name : 'Uncategorized';
    };

    attempt.questionAttempts.forEach(qa => {
        const categoryId = qa.questionCategoryId || 'uncategorized';
        if (!categoryMap.has(categoryId)) {
            categoryMap.set(categoryId, { name: getCategoryName(categoryId), correct: 0, total: 0 });
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

      <div className="grid lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-2 space-y-8 sticky top-24">
             <Card className={cn("text-center", passed ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800")}>
                <CardHeader>
                  <CardTitle className="text-xl">Overall Result</CardTitle>
                  <Badge variant={passed ? "default" : "destructive"} className={cn("mx-auto text-lg", passed && "bg-green-600 hover:bg-green-700")}>
                      {passed ? "PASSED" : "FAILED"}
                  </Badge>
                </CardHeader>
                <CardContent>
                    <p className="text-6xl font-bold text-primary">{percentage.toFixed(1)}<span className="text-4xl text-muted-foreground">%</span></p>
                    <p className="text-muted-foreground mt-1">Score: {score.toFixed(2)} / {totalMarks}</p>
                </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2 text-sm"><CheckSquare className="h-4 w-4" /> Correct</CardDescription>
                        <CardTitle className="text-3xl">{correctCount}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2 text-sm"><XCircle className="h-4 w-4" /> Incorrect</CardDescription>
                        <CardTitle className="text-3xl">{incorrectCount}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2 text-sm"><Timer className="h-4 w-4" /> Time Taken</CardDescription>
                        <CardTitle className="text-3xl">{timeTaken}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2 text-sm"><ListChecks className="h-4 w-4" /> Attempted</CardDescription>
                        <CardTitle className="text-3xl">{attemptedQuestions}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

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
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader><CardTitle>Detailed Question Review</CardTitle></CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {attempt.questionAttempts?.map((question) => {
                    const questionFeedback = feedback[question.questionId];
                    const correctAnswerText = Array.isArray(question.correctAnswer) ? question.correctAnswer.join(', ') : question.correctAnswer;
                    const userAnswerText = Array.isArray(question.userAnswer) ? question.userAnswer.join(', ') : (question.userAnswer || "Not Answered");
                    const questionCategoryName = question.questionCategoryId ? getQuestionCategoryById(question.questionCategoryId, questionCategories)?.name : null;

                    return (
                      <AccordionItem key={question.questionId} value={`item-${question.questionId}`}>
                        <AccordionTrigger className="text-left hover:no-underline">
                          <div className="flex items-start gap-4">
                            {question.isCorrect ? <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500 mt-1" /> : <XCircle className="h-5 w-5 flex-shrink-0 text-destructive mt-1" />}
                            <span>Question {question.order}: {question.questionText}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pl-10">
                          <div className='flex justify-between items-center text-sm'>
                            <span>Your answer: <Badge variant={question.isCorrect ? "default" : "destructive"} className={cn('text-base', question.isCorrect && 'bg-green-600 hover:bg-green-700')}>{userAnswerText}</Badge></span>
                            {question.timeSpent && <span className='text-muted-foreground flex items-center gap-1'><Clock className='h-3 w-3'/> {question.timeSpent}s</span>}
                          </div>
                          {!question.isCorrect && <div>Correct answer: <Badge className="bg-green-600 hover:bg-green-700 text-base">{correctAnswerText}</Badge></div>}
                          {questionCategoryName && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                                  <strong>Category:</strong> <Badge variant="outline">{questionCategoryName}</Badge>
                              </div>
                          )}
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
