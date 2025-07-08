
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getSubmissionById, addReplyToSubmission } from '@/lib/contact-service';
import type { ContactSubmission, MessageReply } from '@/types';
import { Loader2, ArrowLeft, Send } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function TicketDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const submissionId = params.submissionId as string;
    
    const [submission, setSubmission] = useState<ContactSubmission | null>(null);
    const [loading, setLoading] = useState(true);
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState('');
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push(`/login?redirect=/account/support/${submissionId}`);
            return;
        }

        const loadSubmission = async () => {
            setLoading(true);
            const fetchedSubmission = await getSubmissionById(submissionId, user.uid);
            if (fetchedSubmission) {
                setSubmission(fetchedSubmission);
            } else {
                toast({ title: "Error", description: "Could not find this support ticket or you don't have permission to view it.", variant: "destructive" });
                router.push('/account/support');
            }
            setLoading(false);
        };
        
        loadSubmission();
    }, [submissionId, user, authLoading, router, toast]);

    const handleReplySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim() || !submission || !user) return;
        
        setIsReplying(true);
        try {
            const replyData = {
                authorId: user.uid,
                authorName: user.displayName || 'You',
                message: replyText.trim(),
            };
            
            const result = await addReplyToSubmission(submission.id, replyData);
            
            if (result.success) {
                const newReply: MessageReply = { ...replyData, id: new Date().toISOString(), createdAt: new Date() };
                setSubmission(prev => prev ? ({ ...prev, replies: [...(prev.replies || []), newReply], status: 'open' }) : null);
                setReplyText('');
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Could not send reply.", variant: "destructive" });
        } finally {
            setIsReplying(false);
        }
    };
    
    if (loading || authLoading) {
        return <div className="flex justify-center items-center h-full min-h-[calc(100vh-20rem)]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }
    
    if (!submission) return null;

    return (
        <div className="space-y-6">
             <Button variant="outline" onClick={() => router.push('/account/support')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to All Tickets
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">{submission.subject}</CardTitle>
                    <CardDescription>Topic: {submission.topic} • Submitted on {format(new Date(submission.createdAt), "PPP")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[50vh] pr-4">
                        <div className="space-y-6">
                             {/* Initial Message */}
                            <div className="flex items-start gap-3 justify-end">
                                <div className="flex-1 text-right">
                                    <div className="rounded-lg bg-primary text-primary-foreground p-3 w-fit max-w-full inline-block text-left">
                                        <p className="text-sm font-semibold">{submission.name} (You)</p>
                                        <p className="text-sm whitespace-pre-wrap">{submission.message}</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(submission.createdAt), "p, PPP")}</p>
                                </div>
                                 <Avatar className="h-8 w-8 border bg-foreground text-background">
                                    <AvatarFallback>{submission.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                            </div>

                             {/* Replies */}
                            {submission.replies?.map((reply, index) => {
                                const isUserReply = reply.authorId === user?.uid;
                                return (
                                <div key={index} className={cn("flex items-start gap-3", isUserReply && "justify-end")}>
                                     {!isUserReply && (
                                        <Avatar className="h-8 w-8 border">
                                            <AvatarFallback>{reply.authorName?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                     )}
                                     <div className={cn("flex-1", isUserReply && "text-right")}>
                                        <div className={cn("rounded-lg p-3 w-fit max-w-full inline-block text-left", isUserReply ? "bg-primary text-primary-foreground" : "bg-muted")}>
                                            <p className="text-sm font-semibold">{reply.authorName}</p>
                                            <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">{format(new Date(reply.createdAt), "p, PPP")}</p>
                                    </div>
                                     {isUserReply && (
                                        <Avatar className="h-8 w-8 border bg-foreground text-background">
                                            <AvatarFallback>{reply.authorName?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                     )}
                                </div>
                                )
                            })}
                        </div>
                    </ScrollArea>
                </CardContent>
                <CardFooter className="border-t pt-6">
                    {submission.status === 'closed' ? (
                        <p className="text-center w-full text-muted-foreground">This ticket has been closed. Please create a new ticket for further assistance.</p>
                    ) : (
                        <form onSubmit={handleReplySubmit} className="w-full space-y-2">
                            <Label htmlFor="reply-message" className="font-semibold">Your Reply</Label>
                            <div className="flex gap-2">
                                <Textarea
                                    id="reply-message"
                                    placeholder="Type your reply..."
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    disabled={isReplying}
                                    rows={2}
                                />
                                <Button type="submit" disabled={isReplying || !replyText.trim()} size="icon">
                                    {isReplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4"/>}
                                    <span className="sr-only">Send</span>
                                </Button>
                            </div>
                        </form>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
