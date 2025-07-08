
"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, Mail, MailOpen, Star, User, MessageSquare } from "lucide-react";
import { fetchContactSubmissions, updateSubmissionStatus, addReplyToSubmission } from "@/lib/contact-service";
import type { ContactSubmission, MessageReply } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function AdminMessagesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedSubmissions = await fetchContactSubmissions();
      setSubmissions(fetchedSubmissions);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const handleViewMessage = async (submission: ContactSubmission) => {
    setSelectedSubmission(submission);
    setIsDialogOpen(true);
    if (!submission.isRead) {
      try {
        await updateSubmissionStatus(submission.id, true);
        setSubmissions(prev =>
          prev.map(s => (s.id === submission.id ? { ...s, isRead: true } : s))
        );
      } catch (error) {
      }
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedSubmission || !user) return;

    setIsReplying(true);
    try {
      const replyData = {
        authorId: user.uid,
        authorName: user.displayName || 'Admin',
        message: replyText.trim(),
      };
      
      const result = await addReplyToSubmission(selectedSubmission.id, replyData);
      
      if (result.success) {
        // Optimistic UI update
        const newReply: MessageReply = {
          ...replyData,
          id: new Date().toISOString(), // Temporary client-side ID
          createdAt: new Date(),
        };

        const updatedSubmission = {
            ...selectedSubmission,
            isRead: true, // Replying marks it as read
            replies: [...(selectedSubmission.replies || []), newReply],
        };
        setSelectedSubmission(updatedSubmission);
        
        // Update main list as well
        setSubmissions(prev =>
          prev.map(s => (s.id === updatedSubmission.id ? updatedSubmission : s))
        );

        setReplyText("");
        toast({ title: "Reply Sent" });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ title: "Error Sending Reply", description: error.message, variant: "destructive" });
    } finally {
      setIsReplying(false);
    }
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[calc(100vh-20rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Contact Messages</h1>
          <p className="text-muted-foreground">A list of all messages submitted through the contact form.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Inbox</CardTitle>
            <CardDescription>Total Messages: {submissions.length}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.length > 0 ? (
                  submissions.map((submission) => (
                    <TableRow key={submission.id} className={cn(!submission.isRead && "font-bold")}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                           {submission.isRead ? (
                            <MailOpen className="h-5 w-5 text-muted-foreground" />
                            ) : (
                            <Mail className="h-5 w-5 text-primary" />
                            )}
                            {submission.replies && submission.replies.length > 0 && (
                                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            )}
                        </div>
                      </TableCell>
                       <TableCell>
                        {submission.priority && <Star className="h-5 w-5 text-amber-500 fill-amber-400" />}
                      </TableCell>
                      <TableCell>
                        <div>{submission.name}</div>
                        <div className="text-xs text-muted-foreground font-normal">{submission.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{submission.topic}</Badge>
                      </TableCell>
                      <TableCell>{submission.subject}</TableCell>
                      <TableCell>
                        {format(new Date(submission.createdAt), "PPP p")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewMessage(submission)}
                        >
                          <Eye className="mr-2 h-4 w-4" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No messages found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if(!open) {
            setSelectedSubmission(null);
            setReplyText("");
        }
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle>{selectedSubmission?.subject}</DialogTitle>
                <DialogDescription>
                    <Badge variant="outline">{selectedSubmission?.topic}</Badge> - Received on{" "}
                    {selectedSubmission && format(new Date(selectedSubmission.createdAt), "PPP p")}
                </DialogDescription>
              </div>
              {selectedSubmission?.priority && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200">
                    <Star className="mr-2 h-4 w-4 fill-current"/>
                    Priority Support
                </Badge>
              )}
            </div>
          </DialogHeader>
          <div className="flex flex-col gap-4">
             <ScrollArea className="h-96 pr-4 border-b pb-4">
                <div className="space-y-6">
                    {/* Original Message */}
                    <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8 border">
                            <AvatarFallback>{selectedSubmission?.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <div className="rounded-lg bg-muted p-3 w-fit max-w-full">
                                <p className="text-sm font-semibold">{selectedSubmission?.name}</p>
                                <p className="text-sm whitespace-pre-wrap">{selectedSubmission?.message}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {selectedSubmission && format(new Date(selectedSubmission.createdAt), "p")}
                            </p>
                        </div>
                    </div>

                    {/* Replies */}
                    {selectedSubmission?.replies?.map((reply, index) => (
                    <div key={index} className="flex items-start gap-3 justify-end">
                        <div className="flex-1 text-right">
                            <div className="rounded-lg bg-primary text-primary-foreground p-3 w-fit max-w-full inline-block text-left">
                                <p className="text-sm font-semibold">{reply.authorName} (You)</p>
                                <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(reply.createdAt), "p")}
                            </p>
                        </div>
                        <Avatar className="h-8 w-8 border bg-foreground text-background">
                            <AvatarFallback>{reply.authorName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </div>
                    ))}
                </div>
            </ScrollArea>
             <form onSubmit={handleReplySubmit} className="space-y-2">
                <Label htmlFor="reply-message" className="sr-only">Your Reply</Label>
                <Textarea
                    id="reply-message"
                    placeholder="Type your reply here..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={isReplying}
                    rows={4}
                />
                <div className="flex justify-end">
                    <Button type="submit" disabled={isReplying || !replyText.trim()}>
                    {isReplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Reply
                    </Button>
                </div>
            </form>
          </div>
          <DialogFooter className="sm:justify-start">
            {selectedSubmission?.userId && (
                <Button variant="outline" asChild>
                  <Link href={`/admin/users/${selectedSubmission.userId}/subscription`}>
                    <User className="mr-2 h-4 w-4"/> View User
                  </Link>
                </Button>
            )}
             <DialogClose asChild>
                <Button type="button" variant="secondary">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
