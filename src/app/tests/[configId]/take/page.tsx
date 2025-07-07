
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { generateTest } from '@/lib/test-config-service';
import type { TestConfig, PaperQuestion, UserAnswer } from '@/types';
import { Loader2, Clock, ArrowLeft, ArrowRight, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';

type AnswersState = { [questionId: string]: string | string[] };

export default function TakeTestPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const slug = params.configId as string;

    const [config, setConfig] = useState<TestConfig | null>(null);
    const [questions, setQuestions] = useState<PaperQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<AnswersState>({});
    const [timeLeft, setTimeLeft] = useState(0);

    const handleSubmit = useCallback(() => {
        if (!config || questions.length === 0) return;

        let score = 0;
        const processedAnswers: UserAnswer[] = questions.map(q => {
            const userAnswer = answers[q.id];
            let isCorrect = false;
            
            if (q.type === 'mcq') {
                 isCorrect = Array.isArray(q.correctAnswer)
                    ? Array.isArray(userAnswer) && q.correctAnswer.length === userAnswer.length && q.correctAnswer.every(val => userAnswer.includes(val))
                    : q.correctAnswer === userAnswer;
            } else { // short_answer
                isCorrect = typeof userAnswer === 'string' && q.correctAnswer.toString().toLowerCase() === userAnswer.toLowerCase();
            }

            if(isCorrect) {
                score += config.marksPerQuestion;
            } else if (config.hasNegativeMarking && userAnswer) {
                score -= config.negativeMarkValue || 0;
            }

            return {
                questionId: q.id,
                selectedOption: Array.isArray(userAnswer) ? userAnswer.join(', ') : userAnswer,
                isCorrect,
                timeSpent: 0,
            };
        });
        
        const testAttemptId = `${config.id}-${Date.now()}`;
        const resultData = {
            config,
            questions,
            answers: processedAnswers,
            finalScore: score,
            totalTimeSpent: config.duration * 60 - timeLeft,
            completedAt: new Date().toISOString(),
        };

        try {
            localStorage.setItem(`testResult_${testAttemptId}`, JSON.stringify(resultData));
            router.replace(`/results/test/${testAttemptId}`);
        } catch (error) {
            toast({
                title: "Error saving results",
                description: "Could not save your test results due to storage limitations. Please clear some space and try again.",
                variant: "destructive"
            })
        }
    }, [answers, config, questions, timeLeft, router, toast]);

    useEffect(() => {
        if (!slug) return;

        const loadTest = async () => {
            setLoading(true);
            try {
                const { config: fetchedConfig, questions: fetchedQuestions } = await generateTest(slug);
                setConfig(fetchedConfig);
                setQuestions(fetchedQuestions);
                setTimeLeft(fetchedConfig.duration * 60);
            } catch (error) {
                console.error("Failed to generate test:", error);
                toast({
                    title: "Error",
                    description: "Could not load the test. Please try again.",
                    variant: "destructive"
                });
                router.push('/tests');
            } finally {
                setLoading(false);
            }
        };
        loadTest();
    }, [slug, router, toast]);

    useEffect(() => {
        if (timeLeft <= 0 && !loading) {
            handleSubmit();
            return;
        }
        const timer = setInterval(() => {
            setTimeLeft((prevTime) => prevTime - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft, loading, handleSubmit]);

    if (loading) {
        return <div className="flex justify-center items-center h-[80vh]"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (!config || questions.length === 0) {
        return <div className="text-center py-20">No test data available.</div>;
    }
    
    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    
    const handleAnswerChange = (questionId: string, value: string) => {
        setAnswers(prev => ({...prev, [questionId]: value}));
    };

    const handleMultiAnswerChange = (questionId: string, option: string, checked: boolean) => {
        const prevAnswers = (answers[questionId] as string[] || []);
        const newAnswers = checked
            ? [...prevAnswers, option]
            : prevAnswers.filter(ans => ans !== option);
        setAnswers(prev => ({...prev, [questionId]: newAnswers}));
    };

    return (
        <div className="container mx-auto py-8">
            <Card className="max-w-4xl mx-auto">
                <CardHeader className="border-b">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-xl">{config.name}</CardTitle>
                        <div className="flex items-center gap-2 p-2 px-3 rounded-full bg-destructive text-destructive-foreground font-mono font-bold">
                            <Clock className="h-5 w-5" />
                            <span>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-8">
                    <div className="mb-6">
                        <p className="font-semibold text-lg mb-1">Question {currentQuestion.order} of {questions.length}</p>
                        <p className="text-xl">{currentQuestion.questionText}</p>
                    </div>

                    {currentQuestion.type === 'mcq' && (
                        Array.isArray(currentQuestion.correctAnswer) ? (
                            <div className="space-y-3">
                                <Label>Select all that apply:</Label>
                                {currentQuestion.options?.map((option, i) => (
                                    <div key={i} className="flex items-center space-x-2 p-3 rounded-md border hover:bg-muted/50">
                                        <Checkbox
                                            id={`q-${currentQuestion.id}-opt-${i}`}
                                            checked={(answers[currentQuestion.id] as string[] || []).includes(option)}
                                            onCheckedChange={(checked) => handleMultiAnswerChange(currentQuestion.id, option, !!checked)}
                                        />
                                        <Label htmlFor={`q-${currentQuestion.id}-opt-${i}`} className="text-base w-full cursor-pointer">{option}</Label>
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <RadioGroup
                                value={answers[currentQuestion.id] as string || ''}
                                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                                className="space-y-2"
                            >
                                {currentQuestion.options?.map((option, i) => (
                                    <div key={i} className="flex items-center space-x-3 p-3 rounded-md border hover:bg-muted/50">
                                        <RadioGroupItem value={option} id={`q-${currentQuestion.id}-opt-${i}`} />
                                        <Label htmlFor={`q-${currentQuestion.id}-opt-${i}`} className="text-base w-full cursor-pointer">{option}</Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        )
                    )}

                    {currentQuestion.type === 'short_answer' && (
                        <div>
                             <Label htmlFor={`q-${currentQuestion.id}-input`}>Your Answer:</Label>
                             <input 
                                id={`q-${currentQuestion.id}-input`}
                                type="text"
                                value={answers[currentQuestion.id] as string || ''}
                                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                                className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                            />
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex-col items-stretch gap-4 border-t pt-6">
                     <Progress value={progress} />
                     <div className="flex justify-between items-center">
                        <Button variant="outline" onClick={() => setCurrentQuestionIndex(p => p - 1)} disabled={currentQuestionIndex === 0}><ArrowLeft className="mr-2 h-4 w-4" /> Previous</Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                               <Button variant="destructive"><Flag className="mr-2 h-4 w-4" /> End Test</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Are you sure you want to end the test?</AlertDialogTitle><AlertDialogDescription>Your test will be submitted with your current answers and the timer will stop.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Continue Test</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleSubmit}>End Test Now</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        {currentQuestionIndex < questions.length - 1 ? (
                            <Button onClick={() => setCurrentQuestionIndex(p => p + 1)}>Next <ArrowRight className="ml-2 h-4 w-4" /></Button>
                        ) : (
                            <Button onClick={handleSubmit}>Submit Test</Button>
                        )}
                     </div>
                </CardFooter>
            </Card>
        </div>
    );
}
