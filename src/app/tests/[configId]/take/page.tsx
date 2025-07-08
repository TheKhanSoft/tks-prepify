
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { generateTest } from '@/lib/test-config-service';
import type { TestConfig, PaperQuestion, QuestionAttempt } from '@/types';
import { Loader2, Clock, ArrowLeft, ArrowRight, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { startTestAttempt, submitTestAttempt } from '@/lib/test-attempt-service';

type AnswerEntry = { answer?: string | string[]; timeSpent: number };
type AnswersState = { [questionId: string]: AnswerEntry };

export default function TakeTestPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useAuth();
    const slug = params.configId as string;

    const [config, setConfig] = useState<TestConfig | null>(null);
    const [questions, setQuestions] = useState<PaperQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [attemptId, setAttemptId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<AnswersState>({});
    const [timeLeft, setTimeLeft] = useState(0);
    const effectRan = useRef(false);
    const questionStartTimeRef = useRef<number>(0);

    const recordTimeSpent = useCallback(() => {
        if (!questionStartTimeRef.current || questions.length === 0) return;

        const timeSpentOnCurrent = Math.round((Date.now() - questionStartTimeRef.current) / 1000);
        const currentQId = questions[currentQuestionIndex].id;

        setAnswers(prev => {
            const existingEntry = prev[currentQId] || { answer: undefined, timeSpent: 0 };
            return {
                ...prev,
                [currentQId]: {
                    ...existingEntry,
                    timeSpent: (existingEntry.timeSpent || 0) + timeSpentOnCurrent,
                }
            };
        });
        questionStartTimeRef.current = Date.now();
    }, [currentQuestionIndex, questions]);


    const handleSubmit = useCallback(async (currentAnswers: AnswersState) => {
        if (!config || questions.length === 0 || !attemptId || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await submitTestAttempt(attemptId, config, questions, currentAnswers);
            router.replace(`/results/test/${attemptId}`);
        } catch (error) {
            console.error("Error submitting test:", error);
            toast({
                title: "Submission Failed",
                description: "There was an error submitting your test. Please try again.",
                variant: "destructive"
            });
            setIsSubmitting(false);
        }
    }, [config, questions, attemptId, router, toast, isSubmitting]);

    useEffect(() => {
        if (effectRan.current) return;

        const loadTest = async () => {
            if (!slug || !user) return;
            setLoading(true);
            try {
                const { config: fetchedConfig, questions: fetchedQuestions } = await generateTest(slug);
                setConfig(fetchedConfig);
                setQuestions(fetchedQuestions);
                setTimeLeft(fetchedConfig.duration * 60);
                questionStartTimeRef.current = Date.now();

                const newAttemptId = await startTestAttempt(user.uid, fetchedConfig);
                setAttemptId(newAttemptId);
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
        return () => { effectRan.current = true; };
    }, [slug, user, router, toast]);

    const finalizeAndSubmit = useCallback(() => {
        const timeSpentOnCurrent = Math.round((Date.now() - questionStartTimeRef.current) / 1000);
        const currentQId = questions[currentQuestionIndex].id;
        const existingEntry = answers[currentQId] || { timeSpent: 0 };
        const finalAnswers = {
            ...answers,
            [currentQId]: {
                ...existingEntry,
                timeSpent: (existingEntry.timeSpent || 0) + timeSpentOnCurrent
            }
        };
        handleSubmit(finalAnswers);
    }, [answers, currentQuestionIndex, questions, handleSubmit]);

    useEffect(() => {
        if (timeLeft <= 0 && !loading && questions.length > 0 && !isSubmitting) {
            toast({ title: "Time's up!", description: "Submitting your test automatically." });
            finalizeAndSubmit();
            return;
        }
        if (!loading && !isSubmitting) {
            const timer = setInterval(() => {
                setTimeLeft((prevTime) => prevTime > 0 ? prevTime - 1 : 0);
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [timeLeft, loading, questions.length, toast, isSubmitting, finalizeAndSubmit]);

    if (loading) {
        return (
            <div className="container mx-auto py-8 flex flex-col items-center justify-center h-[80vh] gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <h1 className="text-2xl font-bold">Generating Your Test</h1>
                <p className="text-muted-foreground">Please wait a moment while we prepare your questions...</p>
            </div>
        );
    }
    
    if (!config || questions.length === 0) {
        return <div className="text-center py-20">No test data available.</div>;
    }
    
    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    
    const handleAnswerChange = (questionId: string, value: string) => {
        setAnswers(prev => ({...prev, [questionId]: { ...prev[questionId], answer: value }}));
    };

    const handleMultiAnswerChange = (questionId: string, option: string, checked: boolean) => {
        setAnswers(prev => {
            const existingEntry = prev[questionId] || { timeSpent: 0 };
            const prevAnswers = (existingEntry.answer as string[] || []);
            const newAnswers = checked ? [...prevAnswers, option] : prevAnswers.filter(ans => ans !== option);
            return {...prev, [questionId]: { ...existingEntry, answer: newAnswers }};
        });
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
                                            checked={(answers[currentQuestion.id]?.answer as string[] || []).includes(option)}
                                            onCheckedChange={(checked) => handleMultiAnswerChange(currentQuestion.id, option, !!checked)}
                                        />
                                        <Label htmlFor={`q-${currentQuestion.id}-opt-${i}`} className="text-base w-full cursor-pointer">{option}</Label>
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <RadioGroup
                                value={answers[currentQuestion.id]?.answer as string || ''}
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
                                value={answers[currentQuestion.id]?.answer as string || ''}
                                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                                className="mt-2 block w-full rounded-md border-input bg-background shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2"
                            />
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex-col items-stretch gap-4 border-t pt-6">
                     <Progress value={progress} />
                     <div className="flex justify-between items-center">
                        <Button variant="outline" onClick={() => { recordTimeSpent(); setCurrentQuestionIndex(p => p - 1); }} disabled={currentQuestionIndex === 0 || isSubmitting}><ArrowLeft className="mr-2 h-4 w-4" /> Previous</Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                               <Button variant="destructive" disabled={isSubmitting}><Flag className="mr-2 h-4 w-4" /> End Test</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Are you sure you want to end the test?</AlertDialogTitle><AlertDialogDescription>Your test will be submitted with your current answers and the timer will stop.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Continue Test</AlertDialogCancel>
                                    <AlertDialogAction onClick={finalizeAndSubmit} disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        End Test Now
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        {currentQuestionIndex < questions.length - 1 ? (
                            <Button onClick={() => { recordTimeSpent(); setCurrentQuestionIndex(p => p + 1); }} disabled={isSubmitting}>Next <ArrowRight className="ml-2 h-4 w-4" /></Button>
                        ) : (
                            <Button onClick={finalizeAndSubmit} disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Submit Test
                            </Button>
                        )}
                     </div>
                </CardFooter>
            </Card>
        </div>
    );
}
