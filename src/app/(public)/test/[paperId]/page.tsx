
"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { questions as allQuestions } from '@/lib/data';
import { fetchPapers } from '@/lib/paper-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, CheckCircle2, Lightbulb, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { Paper } from '@/types';

// THIS FILE IS DEPRECATED AND WILL BE REPLACED BY /app/papers/[slug]/page.tsx
// It is kept to avoid breaking changes if the file system cannot be modified.

export default function SolvedPaperPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.paperId as string;
  const [paper, setPaper] = useState<Paper | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 2;

  useEffect(() => {
    const loadPaper = async () => {
        if (!slug) return;
        setLoading(true);
        const papers = await fetchPapers();
        const foundPaper = papers.find(p => p.slug === slug || p.id === slug);
        setPaper(foundPaper || null);
        setLoading(false);
    }
    loadPaper();
  }, [slug])

  if(loading) {
    return (
        <div className="container mx-auto text-center py-20">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        </div>
    );
  }

  if (!paper) {
    return (
      <div className="container mx-auto text-center py-20">
        <h1 className="text-2xl font-bold">Paper not found</h1>
        <p>This question paper could not be loaded.</p>
        <Button onClick={() => router.push('/papers')} className="mt-4">Go to Papers</Button>
      </div>
    );
  }
  
  const questions = allQuestions.filter(q => q.paperId === paper.id);

  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const startIndex = (currentPage - 1) * questionsPerPage;
  const endIndex = startIndex + questionsPerPage;
  const currentQuestions = questions.slice(startIndex, endIndex);

  const goToNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const goToPreviousPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  return (
    <div className="container mx-auto px-16 py-8 md:py-12">
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
          {currentQuestions.map((question, index) => (
            <div key={question.id}>
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="flex-shrink-0 flex-grow-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-lg">
                  {startIndex + index + 1}
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
                                ? 'bg-chart-2/20 border-chart-2'
                                : 'bg-card'
                            )}
                          >
                            {isCorrect ? (
                              <CheckCircle2 className="h-5 w-5 text-chart-2 flex-shrink-0" />
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
                    <div className="mb-4 p-4 rounded-md border bg-green-600/10 border-green-600">
                        <p className="font-semibold text-green-700">Correct Answer</p>
                        <p className="text-card-foreground mt-1">{question.correctAnswer}</p>
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
              {index < currentQuestions.length - 1 && <Separator className="mt-8" />}
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
