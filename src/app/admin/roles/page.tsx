
"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2 } from "lucide-react";
import { fetchRoles, deleteRole, countUsersWithRole } from "@/lib/role-service";
import type { Role } from "@/types";
import { useToast } from "@/hooks/use-toast";

export default function AdminRolesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteAlert, setDeleteAlert] = useState<{ open: boolean, role?: Role }>({ open: false });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedRoles = await fetchRoles();
      setRoles(fetchedRoles);
      const counts: Record<string, number> = {};
      for (const role of fetchedRoles) {
        counts[role.id] = await countUsersWithRole(role.name);
      }
      setUserCounts(counts);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load roles.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async () => {
    if (!deleteAlert.role) return;
    setIsDeleting(true);
    try {
      if ((userCounts[deleteAlert.role.id] || 0) > 0) {
        throw new Error("Cannot delete a role that is assigned to users.");
      }
      await deleteRole(deleteAlert.role.id);
      toast({ title: "Role Deleted", description: `"${deleteAlert.role.name}" has been deleted.` });
      await loadData();
    } catch (error: any) {
      toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setDeleteAlert({ open: false });
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Manage Roles</h1>
            <p className="text-muted-foreground">Create and manage user roles for your application.</p>
          </div>
           <Button asChild>
              <Link href="/admin/roles/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Role
              </Link>
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>All Roles</CardTitle>
            <CardDescription>A list of all roles for assigning permissions to users.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
                <div className="flex justify-center items-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
                <Table>
                <TableHeader><TableRow><TableHead>Role Name</TableHead><TableHead>Users Assigned</TableHead><TableHead className="text-right w-24">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                    {roles.length > 0 ? roles.map((role) => (
                    <TableRow key={role.id}>
                        <TableCell className="font-medium">{role.name}</TableCell>
                        <TableCell>{userCounts[role.id] || 0}</TableCell>
                        <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild><Link href={`/admin/roles/${role.id}/edit`}><Edit className="mr-2 h-4 w-4" />Edit</Link></DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onSelect={() => setDeleteAlert({ open: true, role })}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        </TableCell>
                    </TableRow>
                    )) : (
                    <TableRow><TableCell colSpan={3} className="h-24 text-center">No roles found.</TableCell></TableRow>
                    )}
                </TableBody>
                </Table>
            )}
          </CardContent>
        </Card>
      </div>
      <AlertDialog open={deleteAlert.open} onOpenChange={(open) => !open && setDeleteAlert({ open: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the role "{deleteAlert.role?.name}". This action cannot be undone and may fail if the role is currently assigned to any users.</AlertDialogDescription>
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
