
"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, Copy, Bookmark, FileText, Bot } from "lucide-react";
import { fetchPlans, deletePlan, updatePlan } from "@/lib/plan-service";
import type { Plan } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

export default function AdminPlansPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState<{ [key: string]: boolean }>({});
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedPlans = await fetchPlans();
      setPlans(fetchedPlans);
    } catch (error) {
      toast({ title: "Error", description: "Could not load plans.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const openDeleteDialog = (plan: Plan) => {
    setPlanToDelete(plan);
    setDeleteAlertOpen(true);
  };

  const handleDeletePlan = async () => {
    if (!planToDelete) return;
    setIsDeleting(true);
    try {
      await deletePlan(planToDelete.id);
      toast({ title: "Plan Deleted", description: `"${planToDelete.name}" has been successfully deleted.` });
      await loadPlans();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete the plan.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setDeleteAlertOpen(false);
    }
  };

  const handleStatusToggle = async (planId: string, field: 'published' | 'popular', newStatus: boolean) => {
    setIsUpdating(prev => ({ ...prev, [planId]: true }));
    try {
        await updatePlan(planId, { [field]: newStatus });
        toast({ title: "Plan Updated", description: `The ${field} status has been updated.` });
        setPlans(prevPlans => prevPlans.map(p => p.id === planId ? { ...p, [field]: newStatus } : p));
        router.refresh();
    } catch (error) {
        toast({ title: "Error", description: "Failed to update plan.", variant: "destructive" });
    } finally {
        setIsUpdating(prev => ({ ...prev, [planId]: false }));
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full min-h-[calc(100vh-20rem)]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Manage Membership Plans</h1>
          <Button asChild><Link href="/admin/plans/new"><PlusCircle className="mr-2 h-4 w-4" />Add New Plan</Link></Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>All Plans</CardTitle>
            <CardDescription>A list of all membership plans available.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">Plan Name</TableHead>
                  <TableHead>Pricing</TableHead>
                  <TableHead>Quotas</TableHead>
                  <TableHead className="text-center">Published</TableHead>
                  <TableHead className="text-center">Popular</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.length > 0 ? plans.map((plan) => {
                  const isPlanUpdating = isUpdating[plan.id] || isDeleting;
                  return (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <div className="font-medium">{plan.name}</div>
                        <div className="text-sm text-muted-foreground">{plan.description}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                            {plan.pricingOptions.map((opt) => (
                                <Badge key={opt.label} variant="secondary">
                                    PKR {opt.price} / {opt.label}
                                </Badge>
                            ))}
                        </div>
                      </TableCell>
                      <TableCell>
                          <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2"><Bookmark className="h-3.5 w-3.5" /><span>{plan.maxBookmarks === -1 ? 'Unlimited' : plan.maxBookmarks} Bookmarks</span></div>
                            <div className="flex items-center gap-2"><FileText className="h-3.5 w-3.5" /><span>{plan.papersPerMonth === -1 ? 'Unlimited' : plan.papersPerMonth}/mo Papers</span></div>
                            <div className="flex items-center gap-2"><Bot className="h-3.5 w-3.5" /><span>{plan.aiInteractionsPerMonth === -1 ? 'Unlimited' : plan.aiInteractionsPerMonth}/mo AI</span></div>
                          </div>
                      </TableCell>
                       <TableCell className="text-center">
                            <Switch checked={plan.published} onCheckedChange={(status) => handleStatusToggle(plan.id, 'published', status)} disabled={isPlanUpdating} aria-label="Toggle published status" />
                        </TableCell>
                         <TableCell className="text-center">
                            <Switch checked={plan.popular} onCheckedChange={(status) => handleStatusToggle(plan.id, 'popular', status)} disabled={isPlanUpdating} aria-label="Toggle popular status" />
                        </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost" disabled={isPlanUpdating}><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Actions</span></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild><Link href={`/admin/plans/${plan.id}/edit`}><Edit className="mr-2 h-4 w-4" />Edit</Link></DropdownMenuItem>
                             <DropdownMenuItem asChild><Link href={`/admin/plans/copy/${plan.id}`}><Copy className="mr-2 h-4 w-4" />Copy</Link></DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onSelect={() => openDeleteDialog(plan)} disabled={isPlanUpdating}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center">No plans found. Create one to get started.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the plan "{planToDelete?.name}". This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePlan} disabled={isDeleting}>{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
