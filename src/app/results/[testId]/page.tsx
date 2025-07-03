
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { BarChart, Book, CheckCircle2, Lightbulb, Loader2, XCircle } from 'lucide-react';
import { fetchQuestionsForPaper, PaperQuestion } from '@/lib/question-service';
import { fetchPapers } from '@/lib/paper-service';
import { fetchCategories } from '@/lib/category-service';
import { getCategoryPath } from '@/lib/category-helpers';
import type { UserAnswer, TestResult, Category } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { getPersonalizedFeedback } from '@/ai/flows/personalized-feedback';
import { recommendResources } from '@/ai/flows/resource-recommendation';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { Bar, BarChart as RechartsBarChart, XAxis, YAxis } from "recharts";

type FeedbackState = { [questionId: string]: { loading: boolean; feedback?: string; suggestions?: string } };

const chartConfig = {
  correct: { label: "Correct", color: "hsl(var(--chart-2))" },
  incorrect: { label: "Incorrect", color: "hsl(var(--destructive))" },
} satisfies ChartConfig;

export default function ResultsPage() {
  const router = useRouter();
  const params = useParams();
  const [result, setResult] = useState<TestResult | null>(null);
  const [questions, setQuestions] = useState<PaperQuestion[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>({});
  const [recommendations, setRecommendations] = useState({ loading: false, content: '' });
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
        try {
            const [cats, papers] = await Promise.all([fetchCategories(), fetchPapers()]);
            setAllCategories(cats);

            const storedResults = localStorage.getItem('latestTestResults');
            if (storedResults) {
                const { paperId, answers: userAnswersArray } = JSON.parse(storedResults);
                const paper = papers.find(p => p.id === paperId);
                if (!paper) {
                    throw new Error("Paper not found");
                }

                const fetchedQuestions = await fetchQuestionsForPaper(paperId);
                setQuestions(fetchedQuestions);

                if (fetchedQuestions.length > 0) {
                    let score = 0;
                    const processedAnswers: UserAnswer[] = fetchedQuestions.map((q) => {
                    const userAnswer = userAnswersArray.find((a: any) => a.questionId === q.id)?.selectedOption;
                    const isCorrect = Array.isArray(q.correctAnswer) 
                        ? q.correctAnswer.includes(userAnswer)
                        : q.correctAnswer === userAnswer;
                        
                    if (isCorrect) score++;
                    return {
                        questionId: q.id,
                        selectedOption: userAnswer,
                        isCorrect,
                        timeSpent: 0, // Simplified for this example
                    };
                    });

                    setResult({
                    id: params.testId as string,
                    paper,
                    answers: processedAnswers,
                    score,
                    totalTimeSpent: 0, // Simplified
                    completedAt: new Date(),
                    });
                }
            } else {
                router.push('/papers');
            }
        } catch(e) {
            console.error(e);
            router.push('/papers');
        } finally {
            setLoading(false);
        }
    }
    loadData();
  }, [params.testId, router]);


  const handleGetFeedback = async (question: PaperQuestion, userAnswer: string) => {
    if (!result || loading) return;
    setFeedback(prev => ({ ...prev, [question.id]: { loading: true } }));

    const path = getCategoryPath(result.paper.categoryId, allCategories);
    const categoryName = path?.[0]?.name || 'General';
    const subCategoryName = path && path.length > 0 ? path[path.length - 1].name : 'General';
    const correctAnswerText = Array.isArray(question.correctAnswer) ? question.correctAnswer.join(', ') : question.correctAnswer;
    
    try {
      const aiFeedback = await getPersonalizedFeedback({
        question: question.questionText,
        userAnswer: userAnswer || "No answer provided.",
        correctAnswer: correctAnswerText,
        category: categoryName,
        subcategory: subCategoryName,
      });
      setFeedback(prev => ({ ...prev, [question.id]: { loading: false, ...aiFeedback } }));
    } catch (error) {
      console.error("Failed to get feedback:", error);
      setFeedback(prev => ({ ...prev, [question.id]: { loading: false, feedback: "Could not load feedback.", suggestions: "" } }));
    }
  };

  const handleGetRecommendations = async () => {
    if (!result) return;
    setRecommendations({ loading: true, content: '' });
    const weakAreas = result.answers
      .filter(a => !a.isCorrect)
      .map(a => questions.find(q => q.id === a.questionId)?.questionText)
      .join(', ');

    try {
        const res = await recommendResources({
            performanceData: `Score: ${result.score}/${result.paper.questionCount}`,
            weakAreas: weakAreas || "No specific weak areas identified, general review recommended.",
        });
        setRecommendations({ loading: false, content: res.recommendedResources });
    } catch(error) {
        console.error("Failed to get recommendations:", error);
        setRecommendations({ loading: false, content: 'Could not load recommendations.' });
    }
  };

  const chartData = useMemo(() => {
    if (!result) return [];
    const correctCount = result.score;
    const incorrectCount = result.paper.questionCount - result.score;
    return [{ name: "Performance", correct: correctCount, incorrect: incorrectCount }];
  }, [result]);

  if (loading || !result) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto px-6 sm:px-10 lg:px-16 py-8 md:py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold font-headline">Test Results: {result.paper.title}</CardTitle>
          <CardDescription>Here&apos;s a breakdown of your performance.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-8">
          <Card className="md:col-span-1 bg-secondary/50">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <div className="text-6xl font-bold text-primary">{result.score} <span className="text-3xl text-muted-foreground">/ {result.paper.questionCount}</span></div>
              <div className="text-2xl font-semibold">Your Score</div>
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
                  <div className="prose prose-sm max-w-none text-muted-foreground">{recommendations.content}</div>
                </CardContent>
              )}
            </Card>
            <Card>
              <CardHeader><CardTitle>Detailed Review</CardTitle></CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {result.answers.map((answer) => {
                    const question = questions.find(q => q.id === answer.questionId);
                    if (!question) return null;
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
