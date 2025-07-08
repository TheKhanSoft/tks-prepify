
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, Mail, MailOpen, Star, User, MessageSquare, ChevronDown, CheckCircle, Info, XCircle } from "lucide-react";
import { fetchContactSubmissions, updateSubmissionStatus, addReplyToSubmission } from "@/lib/contact-service";
import type { ContactSubmission, MessageReply, ContactSubmissionStatus } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const statusConfig: { [key in ContactSubmissionStatus]: { icon: React.FC<any>; color: string; label: string } } = {
    open: { icon: Info, color: 'text-blue-500', label: 'Open' },
    replied: { icon: CheckCircle, color: 'text-amber-500', label: 'Replied' },
    closed: { icon: XCircle, color: 'text-gray-500', label: 'Closed' },
};


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

  const handleChangeStatus = async (newStatus: ContactSubmissionStatus) => {
    if (!selectedSubmission || selectedSubmission.status === newStatus) return;
    
    try {
        await updateSubmissionStatus(selectedSubmission.id, newStatus);
        
        const updatedSubmission = { ...selectedSubmission, status: newStatus };
        setSelectedSubmission(updatedSubmission);
        setSubmissions(prev => prev.map(s => s.id === updatedSubmission.id ? updatedSubmission : s));

        toast({ title: "Status Updated", description: `Ticket marked as ${newStatus}.` });
    } catch (error) {
        toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    }
  }

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

        const updatedSubmission: ContactSubmission = {
            ...selectedSubmission,
            status: 'replied',
            lastRepliedAt: new Date(),
            isRead: true, // Replying marks it as read
            replies: [...(selectedSubmission.replies || []), newReply],
        };
        setSelectedSubmission(updatedSubmission);
        
        setSubmissions(prev => prev.map(s => (s.id === updatedSubmission.id ? updatedSubmission : s)));

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
                  <TableHead>From</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.length > 0 ? (
                  submissions.map((submission) => {
                    const statusInfo = statusConfig[submission.status];
                    return (
                        <TableRow key={submission.id} className={cn(!submission.isRead && "font-bold")}>
                        <TableCell>
                            <div className="flex items-center gap-2">
                            {submission.priority && <Star className="h-5 w-5 text-amber-500 fill-amber-400" title="Priority Support" />}
                            {submission.replies && submission.replies.length > 0 ? (
                                <MessageSquare className="h-5 w-5 text-muted-foreground" title="Has replies" />
                            ) : (
                                <MailOpen className="h-5 w-5 text-muted-foreground" />
                            )}
                            </div>
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
                            <Badge variant="outline" className={cn('capitalize', statusInfo.color, `border-${statusInfo.color.replace('text-', '')}/50`)}>
                                <statusInfo.icon className={cn('mr-2 h-4 w-4', statusInfo.color)} />
                                {statusInfo.label}
                            </Badge>
                        </TableCell>
                        <TableCell>
                           {formatDistanceToNow(new Date(submission.lastRepliedAt || submission.createdAt), { addSuffix: true })}
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
                    )
                  })
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
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle>{selectedSubmission?.subject}</DialogTitle>
                <DialogDescription>
                    <Badge variant="outline">{selectedSubmission?.topic}</Badge> - Ticket from {selectedSubmission?.name}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                {selectedSubmission?.priority && (<Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200"><Star className="mr-2 h-4 w-4 fill-current"/>Priority</Badge>)}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline">Status: {selectedSubmission?.status} <ChevronDown className="ml-2 h-4 w-4"/></Button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleChangeStatus('open')}>Mark as Open</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleChangeStatus('replied')}>Mark as Replied</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleChangeStatus('closed')}>Mark as Closed</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
              </div>
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
                                {selectedSubmission && formatDistanceToNow(new Date(selectedSubmission.createdAt), { addSuffix: true })}
                            </p>
                        </div>
                    </div>

                    {/* Replies */}
                    {selectedSubmission?.replies?.map((reply, index) => {
                        const isAdminReply = reply.authorId !== selectedSubmission.userId;
                        return (
                        <div key={index} className={cn("flex items-start gap-3", isAdminReply && "justify-end")}>
                            {isAdminReply && (
                                <div className="flex-1 text-right">
                                    <div className="rounded-lg bg-primary text-primary-foreground p-3 w-fit max-w-full inline-block text-left">
                                        <p className="text-sm font-semibold">{reply.authorName} (You)</p>
                                        <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}</p>
                                </div>
                            )}
                            <Avatar className="h-8 w-8 border bg-foreground text-background">
                                <AvatarFallback>{reply.authorName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            {!isAdminReply && (
                                <div className="flex-1">
                                    <div className="rounded-lg bg-muted p-3 w-fit max-w-full">
                                        <p className="text-sm font-semibold">{reply.authorName}</p>
                                        <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}</p>
                                </div>
                            )}
                        </div>
                        )
                    })}
                </div>
            </ScrollArea>
             <form onSubmit={handleReplySubmit} className="space-y-2">
                <Label htmlFor="reply-message" className="sr-only">Your Reply</Label>
                <Textarea
                    id="reply-message"
                    placeholder="Type your reply here..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={isReplying || selectedSubmission?.status === 'closed'}
                    rows={4}
                />
                <div className="flex justify-end">
                    <Button type="submit" disabled={isReplying || !replyText.trim() || selectedSubmission?.status === 'closed'}>
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
