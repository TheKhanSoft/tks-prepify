
"use client";

import React, { useState, useEffect, useCallback } from "react";
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
} from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, Mail, MailOpen } from "lucide-react";
import { fetchContactSubmissions, updateSubmissionStatus } from "@/lib/contact-service";
import type { ContactSubmission } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function AdminMessagesPage() {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedSubmissions = await fetchContactSubmissions();
      setSubmissions(fetchedSubmissions);
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not load messages.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

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
        toast({
          title: "Error",
          description: "Could not mark message as read.",
          variant: "destructive",
        });
      }
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
                        {submission.isRead ? (
                          <MailOpen className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <Mail className="h-5 w-5 text-primary" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div>{submission.name}</div>
                        <div className="text-xs text-muted-foreground font-normal">{submission.email}</div>
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
                    <TableCell colSpan={5} className="h-24 text-center">
                      No messages found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Message from {selectedSubmission?.name}</DialogTitle>
            <DialogDescription>
              {selectedSubmission?.subject} - Received on{" "}
              {selectedSubmission && format(new Date(selectedSubmission.createdAt), "PPP p")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="text-sm">
              <span className="font-semibold">From:</span> {selectedSubmission?.name} &lt;{selectedSubmission?.email}&gt;
            </div>
            <div className="p-4 bg-muted/50 rounded-md border text-sm whitespace-pre-wrap">
              {selectedSubmission?.message}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
