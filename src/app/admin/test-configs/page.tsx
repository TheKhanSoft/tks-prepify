
"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { fetchTestConfigs, deleteTestConfig, updateTestConfig } from "@/lib/test-config-service";
import type { TestConfig } from "@/types";

export default function AdminTestConfigsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [configs, setConfigs] = useState<TestConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState<{ [key: string]: boolean }>({});
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<TestConfig | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedConfigs = await fetchTestConfigs();
      setConfigs(fetchedConfigs);
    } catch (error) {
      toast({ title: "Error", description: "Could not load test configurations.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openDeleteDialog = (config: TestConfig) => {
    setConfigToDelete(config);
    setDeleteAlertOpen(true);
  };

  const handleStatusToggle = async (configId: string, newStatus: boolean) => {
    setIsUpdating(prev => ({ ...prev, [configId]: true }));
    try {
        await updateTestConfig(configId, { published: newStatus });
        toast({ title: "Success", description: "Published status updated." });
        setConfigs(prev => prev.map(c => c.id === configId ? { ...c, published: newStatus } : c));
        router.refresh();
    } catch (error) {
        toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    } finally {
        setIsUpdating(prev => ({ ...prev, [configId]: false }));
    }
  };

  const handleDelete = async () => {
    if (!configToDelete) return;
    setIsDeleting(true);
    try {
      await deleteTestConfig(configToDelete.id);
      toast({ title: "Deleted", description: `"${configToDelete.name}" has been deleted.` });
      await loadData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete the configuration.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setDeleteAlertOpen(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full min-h-[calc(100vh-20rem)]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Test Configurations</h1>
          <Button asChild><Link href="/admin/test-configs/new"><PlusCircle className="mr-2 h-4 w-4" />Add New Config</Link></Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>All Configurations</CardTitle>
            <CardDescription>A list of all available test blueprints.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">Name</TableHead>
                  <TableHead>Total Questions</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Passing Mark</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.length > 0 ? configs.map((config) => {
                  const isUpdatingConfig = isUpdating[config.id] || (isDeleting && configToDelete?.id === config.id);
                  return (
                    <TableRow key={config.id}>
                      <TableCell>
                        <div className="font-medium">{config.name}</div>
                        <div className="text-sm text-muted-foreground font-mono">{config.slug}</div>
                      </TableCell>
                      <TableCell>{config.totalQuestions}</TableCell>
                      <TableCell>{config.duration} min</TableCell>
                      <TableCell>{config.passingMarks}%</TableCell>
                      <TableCell>
                        <Switch checked={config.published} onCheckedChange={(status) => handleStatusToggle(config.id, status)} disabled={isUpdatingConfig} aria-label="Toggle published status" />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost" disabled={isUpdatingConfig}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild><Link href={`/admin/test-configs/${config.id}/edit`}><Edit className="mr-2 h-4 w-4" />Edit</Link></DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onSelect={() => openDeleteDialog(config)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center">No test configurations found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the configuration "{configToDelete?.name}". This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
