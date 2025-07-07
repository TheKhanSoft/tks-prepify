
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { BarChart as BarChartIcon, Book, CheckCircle2, Lightbulb, Loader2, XCircle, Award } from 'lucide-react';
import type { UserAnswer, TestConfig, Question, PaperQuestion, Category } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { getPersonalizedFeedback } from '@/ai/flows/personalized-feedback';
import { recommendResources } from '@/ai/flows/resource-recommendation';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { Bar, BarChart as RechartsBarChart, XAxis, YAxis } from "recharts";
import { fetchQuestionCategories } from '@/lib/question-category-service';
import { getQuestionCategoryById } from '@/lib/question-category-helpers';
import { cn } from '@/lib/utils';

type FeedbackState = { [questionId: string]: { loading: boolean; feedback?: string; suggestions?: string } };

type TestResultData = {
  config: TestConfig;
  questions: PaperQuestion[];
  answers: UserAnswer[];
  finalScore: number;
  totalTimeSpent: number;
  completedAt: string;
};

const chartConfig = {
  correct: { label: "Correct", color: "hsl(var(--chart-2))" },
  incorrect: { label: "Incorrect", color: "hsl(var(--destructive))" },
} satisfies ChartConfig;

export default function DynamicTestResultsPage() {
  const router = useRouter();
  const params = useParams();
  const [resultData, setResultData] = useState<TestResultData | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>({});
  const [recommendations, setRecommendations] = useState({ loading: false, content: '' });
  const [allQuestionCategories, setAllQuestionCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const testId = params.testId as string;
    if (!testId) {
        router.push('/tests');
        return;
    }

    const loadData = async () => {
        setLoading(true);
        try {
            const storedResults = localStorage.getItem(`testResult_${testId}`);
            if (!storedResults) {
                throw new Error("Test result not found in storage.");
            }
            const data: TestResultData = JSON.parse(storedResults);
            setResultData(data);
            
            const cats = await fetchQuestionCategories();
            setAllQuestionCategories(cats);

        } catch (e) {
            console.error(e);
            router.push('/tests');
        } finally {
            setLoading(false);
        }
    }
    loadData();
  }, [params.testId, router]);
  
  const handleGetFeedback = async (question: PaperQuestion, userAnswer: string) => {
    if (!resultData) return;
    setFeedback(prev => ({ ...prev, [question.id]: { loading: true } }));

    const category = question.questionCategoryId ? getQuestionCategoryById(question.questionCategoryId, allQuestionCategories) : null;
    const categoryName = category?.name || 'General';
    const correctAnswerText = Array.isArray(question.correctAnswer) ? question.correctAnswer.join(', ') : question.correctAnswer;
    
    try {
      const aiFeedback = await getPersonalizedFeedback({
        question: question.questionText,
        userAnswer: userAnswer || "No answer provided.",
        correctAnswer: correctAnswerText,
        category: categoryName,
        subcategory: categoryName, // Simplified for dynamic tests
      });
      setFeedback(prev => ({ ...prev, [question.id]: { loading: false, ...aiFeedback } }));
    } catch (error) {
      console.error("Failed to get feedback:", error);
      setFeedback(prev => ({ ...prev, [question.id]: { loading: false, feedback: "Could not load feedback.", suggestions: "" } }));
    }
  };

  const handleGetRecommendations = async () => {
    if (!resultData) return;
    setRecommendations({ loading: true, content: '' });
    const weakAreas = resultData.answers
      .filter(a => !a.isCorrect)
      .map(a => resultData.questions.find(q => q.id === a.questionId)?.questionText)
      .join(', ');

    try {
        const res = await recommendResources({
            performanceData: `Score: ${resultData.finalScore}/${resultData.config.totalQuestions * resultData.config.marksPerQuestion}`,
            weakAreas: weakAreas || "No specific weak areas identified, general review recommended.",
        });
        setRecommendations({ loading: false, content: res.recommendedResources });
    } catch(error) {
        console.error("Failed to get recommendations:", error);
        setRecommendations({ loading: false, content: 'Could not load recommendations.' });
    }
  };

  const { chartData, score, totalMarks, percentage, passStatus } = useMemo(() => {
    if (!resultData) return { chartData: [], score: 0, totalMarks: 0, percentage: 0, passStatus: 'failed' };
    
    const correctAnswers = resultData.answers.filter(a => a.isCorrect).length;
    const incorrectAnswers = resultData.answers.filter(a => !a.isCorrect).length;
    
    return {
        chartData: [{ name: "Performance", correct: correctAnswers, incorrect: incorrectAnswers }],
        score: resultData.finalScore.toFixed(2),
        totalMarks: resultData.config.totalQuestions * resultData.config.marksPerQuestion,
        percentage: ((resultData.finalScore / (resultData.config.totalQuestions * resultData.config.marksPerQuestion)) * 100),
        passStatus: ((resultData.finalScore / (resultData.config.totalQuestions * resultData.config.marksPerQuestion)) * 100) >= resultData.config.passingMarks ? 'passed' : 'failed',
    };
  }, [resultData]);

  if (loading || !resultData) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto px-6 sm:px-10 lg:px-16 py-8 md:py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold font-headline">Test Results: {resultData.config.name}</CardTitle>
          <CardDescription>Here&apos;s a breakdown of your performance.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-8">
          <Card className="md:col-span-1 bg-secondary/50">
            <CardHeader className="items-center">
              <CardTitle>Summary</CardTitle>
              <Badge className={cn(passStatus === 'passed' ? 'bg-green-600' : 'bg-destructive', "text-lg")}>{passStatus.toUpperCase()}</Badge>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <div className="text-6xl font-bold text-primary">{score} <span className="text-3xl text-muted-foreground">/ {totalMarks}</span></div>
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
                  {resultData.questions.map((question) => {
                    const answer = resultData.answers.find(a => a.questionId === question.id);
                    if (!answer) return null;
                    const questionFeedback = feedback[question.id];
                    const correctAnswerText = Array.isArray(question.correctAnswer) ? question.correctAnswer.join(', ') : question.correctAnswer;

                    return (
                      <AccordionItem key={question.id} value={`item-${question.id}`}>
                        <AccordionTrigger className="text-left">
                          <div className="flex items-center gap-4">
                            {answer.isCorrect ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-destructive" />}
                            <span>Question {question.order}: {question.questionText}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4">
                          <p>Your answer: <Badge variant={answer.isCorrect ? "default" : "destructive"}>{answer.selectedOption || "Not Answered"}</Badge></p>
                          {!answer.isCorrect && <p>Correct answer: <Badge className="bg-green-600 hover:bg-green-700">{correctAnswerText}</Badge></p>}
                          {question.explanation && <p className="text-muted-foreground"><span className="font-semibold">Explanation:</span> {question.explanation}</p>}
                          {!answer.isCorrect && (
                            <div className="p-4 bg-secondary/50 rounded-lg">
                              <Button size="sm" onClick={() => handleGetFeedback(question, answer.selectedOption)} disabled={questionFeedback?.loading || loading}>
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
