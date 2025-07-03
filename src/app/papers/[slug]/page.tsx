
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, CheckCircle2, Lightbulb, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { getPaperBySlug } from '@/lib/paper-service';
import { fetchQuestionsForPaper } from '@/lib/question-service';
import type { Paper, Question } from '@/types';

export default function SolvedPaperPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  
  const [paper, setPaper] = useState<Paper | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 2;

  useEffect(() => {
    const loadData = async () => {
        if (!slug) return;
        setLoading(true);
        try {
            const fetchedPaper = await getPaperBySlug(slug);
            if (fetchedPaper && fetchedPaper.published) {
                setPaper(fetchedPaper);
                const fetchedQuestions = await fetchQuestionsForPaper(fetchedPaper.id);
                // Sort questions by order client-side
                fetchedQuestions.sort((a, b) => a.order - b.order);
                setQuestions(fetchedQuestions);
            } else {
                setPaper(null);
            }
        } catch (error) {
            console.error("Failed to fetch paper:", error);
            setPaper(null);
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, [slug]);

  if (loading) {
    return (
        <div className="container mx-auto text-center py-20 flex justify-center items-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        </div>
    );
  }

  if (!paper) {
    return (
      <div className="container mx-auto text-center py-20">
        <h1 className="text-2xl font-bold">Paper Not Found</h1>
        <p>This question paper could not be found or is not available.</p>
        <Button onClick={() => router.push('/papers')} className="mt-4">Go to Papers</Button>
      </div>
    );
  }
  
  if (questions.length === 0) {
     return (
      <div className="container mx-auto text-center py-20">
        <h1 className="text-2xl font-bold">No Questions Found</h1>
        <p>There are no questions available for this paper yet.</p>
        <Button onClick={() => router.push('/papers')} className="mt-4">Go to Papers</Button>
      </div>
    );
  }

  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const startIndex = (currentPage - 1) * questionsPerPage;
  const endIndex = startIndex + questionsPerPage;
  const currentQuestions = questions.slice(startIndex, endIndex);

  const goToNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const goToPreviousPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  return (
    <div className="container mx-auto px-6 sm:px-10 lg:px-16 py-8 md:py-12">
      <div className="mb-8">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-4xl font-bold font-headline">{paper.title}</h1>
        <p className="text-lg text-muted-foreground mt-2">{paper.description}</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Questions & Answers</CardTitle>
          <CardDescription>Review the questions and their correct answers below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {currentQuestions.map((question) => (
            <div key={question.id}>
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="flex-shrink-0 flex-grow-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-lg">
                  {question.order}
                </div>
                <div className="flex-grow w-full">
                  <p className="font-semibold text-lg mb-4">{question.questionText}</p>
                  
                  {question.type === 'mcq' && question.options && (
                    <div className="space-y-2 mb-4">
                      {question.options.map((option, optIndex) => {
                        const isCorrect = Array.isArray(question.correctAnswer)
                          ? question.correctAnswer.includes(option)
                          : option === question.correctAnswer;
                        
                        return (
                          <div
                            key={optIndex}
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-md border',
                              isCorrect
                                ? 'bg-green-600/10 border-green-600/50'
                                : 'bg-card'
                            )}
                          >
                            {isCorrect ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                            ) : (
                              <div className="h-5 w-5 flex-shrink-0" />
                            )}
                            <span className="text-base">{option}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {question.type === 'short_answer' && (
                    <div className="mb-4 p-4 rounded-md border bg-green-600/10 border-green-600/50">
                        <div className="flex items-center gap-2">
                           <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                          <p className="font-semibold text-green-700">Correct Answer</p>
                        </div>
                        <p className="text-card-foreground mt-2 pl-7">{question.correctAnswer}</p>
                    </div>
                  )}
                  
                  {question.explanation && (
                    <div className="flex items-start gap-3 p-3 rounded-md bg-secondary/50">
                       <Lightbulb className="h-5 w-5 text-accent-foreground flex-shrink-0 mt-1" />
                       <div>
                          <p className="font-semibold">Explanation</p>
                          <p className="text-muted-foreground">{question.explanation}</p>
                       </div>
                    </div>
                  )}
                </div>
              </div>
              {question.order < currentQuestions[currentQuestions.length - 1].order && <Separator className="mt-8" />}
            </div>
          ))}
        </CardContent>
        {totalPages > 1 && (
            <CardFooter className="flex justify-between items-center border-t pt-6">
                <Button onClick={goToPreviousPage} disabled={currentPage === 1} variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                </span>
                <Button onClick={goToNextPage} disabled={currentPage === totalPages} variant="outline">
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}
