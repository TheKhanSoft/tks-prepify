"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
// Import necessary UI components
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
// Import icons
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, Users, Shield } from "lucide-react";
// Import services, types, and hooks
import { fetchRoles, deleteRole, countUsersWithRole, addRole, updateRole } from "@/lib/role-service";
import type { Role } from "@/types";
import { useToast } from "@/hooks/use-toast";

// --- SIMPLIFIED Data Structures ---
interface RoleFormData {
  name: string;
}
const defaultFormData: RoleFormData = { name: "" };

// --- Helper Components (Unchanged) ---
const RoleCard = ({ role, userCount, onEdit, onDelete }: { role: Role; userCount: number; onEdit: (role: Role) => void; onDelete: (role: Role) => void; }) => (
  <Card className="flex flex-col">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-base font-semibold tracking-tight truncate" title={role.name}>{role.name}</CardTitle>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="flex-shrink-0">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(role)}>
            <Edit className="mr-2 h-4 w-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onSelect={() => onDelete(role)}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </CardHeader>
    <CardContent className="flex-grow flex items-end">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>{userCount} {userCount === 1 ? 'user' : 'users'} assigned</span>
      </div>
    </CardContent>
  </Card>
);

const RoleCardSkeleton = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <Skeleton className="h-6 w-3/5" />
      <Skeleton className="h-8 w-8 rounded-md" />
    </CardHeader>
    <CardContent>
      <div className="flex items-center space-x-2">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-2/5" />
      </div>
    </CardContent>
  </Card>
);

const AddRoleCard = ({ onClick }: { onClick: () => void }) => (
  <Card onClick={onClick} className="flex flex-col items-center justify-center border-2 border-dashed border-muted bg-transparent hover:bg-muted/50 hover:border-primary/50 transition-colors cursor-pointer min-h-[140px]">
    <div className="text-center">
      <PlusCircle className="mx-auto h-10 w-10 text-muted-foreground" />
      <p className="mt-2 text-sm font-semibold text-muted-foreground">Add New Role</p>
    </div>
  </Card>
);

const EmptyState = ({ onAdd }: { onAdd: () => void }) => (
  <div className="col-span-full flex flex-col items-center justify-center rounded-lg border border-dashed shadow-sm py-16 text-center">
    <Shield className="h-12 w-12 text-muted-foreground" />
    <h3 className="mt-4 text-lg font-semibold">No Roles Found</h3>
    <p className="mt-1 text-sm text-muted-foreground">Get started by creating your first role.</p>
    <Button onClick={onAdd} className="mt-4">
      <PlusCircle className="mr-2 h-4 w-4" />
      Create Role
    </Button>
  </div>
);


// --- Main Page Component ---
export default function AdminRolesPage() {
  const { toast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  
  // State for modals and actions
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteAlert, setDeleteAlert] = useState<{ open: boolean, role?: Role }>({ open: false });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<RoleFormData>(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<RoleFormData>>({});

  // --- Data Handling (Unchanged) ---
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

  // --- Custom Sorting Logic (Unchanged) ---
  const sortedRoles = useMemo(() => {
    const specialOrder = ['super admin', 'admin'];
    return [...roles].sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aIndex = specialOrder.indexOf(aName);
      const bIndex = specialOrder.indexOf(bName);
      if (aIndex > -1 && bIndex > -1) return aIndex - bIndex;
      if (aIndex > -1) return -1;
      if (bIndex > -1) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [roles]);

  // --- Event Handlers ---
  const openAddModal = () => {
    setModalMode('add');
    setFormData(defaultFormData);
    setFormErrors({});
    setEditingRole(null);
    setModalOpen(true);
  };

  const openEditModal = (role: Role) => {
    setModalMode('edit');
    // Set only the name
    setFormData({ name: role.name });
    setFormErrors({});
    setEditingRole(role);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const validateForm = (): boolean => {
    const errors: Partial<RoleFormData> = {};
    if (!formData.name.trim()) {
      errors.name = "Role name is required";
    } else if (roles.some(role => role.name.toLowerCase() === formData.name.toLowerCase() && role.id !== editingRole?.id)) {
      errors.name = "A role with this name already exists";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      if (modalMode === 'add') {
        await addRole(formData);
        toast({ title: "Role Created", description: `"${formData.name}" has been created.` });
      } else if (editingRole) {
        await updateRole(editingRole.id, formData);
        toast({ title: "Role Updated", description: `"${formData.name}" has been updated.` });
      }
      closeModal();
      await loadData();
    } catch (error: any) {
      toast({ title: "Operation Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDelete = async () => { /* ... (unchanged) ... */ };

  // --- Render Method ---
  return (
    <>
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Roles</h1>
          <p className="mt-1 text-muted-foreground">Create and manage user roles for your application.</p>
        </div>
        
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
          {loading ? (
            Array.from({ length: 9 }).map((_, index) => <RoleCardSkeleton key={index} />)
          ) : roles.length === 0 ? (
            <EmptyState onAdd={openAddModal} />
          ) : (
            <>
              <AddRoleCard onClick={openAddModal} />
              {sortedRoles.map(role => (
                <RoleCard
                  key={role.id}
                  role={role}
                  userCount={userCounts[role.id] || 0}
                  onEdit={openEditModal}
                  onDelete={(r) => setDeleteAlert({ open: true, role: r })}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* --- SIMPLIFIED Add/Edit Role Modal --- */}
      <Dialog open={modalOpen} onOpenChange={(isOpen) => !isSaving && setModalOpen(isOpen)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{modalMode === 'add' ? 'Add New Role' : 'Edit Role'}</DialogTitle>
            <DialogDescription>
              {modalMode === 'add' ? 'Enter a name for the new role.' : `Update the name for the "${editingRole?.name}" role.`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Role Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ name: e.target.value })}
                placeholder="e.g., Content Editor"
                className={formErrors.name ? 'border-destructive' : ''}
                autoFocus
              />
              {formErrors.name && <p className="text-sm text-destructive">{formErrors.name}</p>}
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={closeModal} disabled={isSaving}>Cancel</Button>
              <Button type="submit" disabled={isSaving || !formData.name.trim()}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {modalMode === 'add' ? 'Create Role' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- Delete Confirmation Dialog (Unchanged) --- */}
      <AlertDialog open={deleteAlert.open} onOpenChange={(open) => !isDeleting && setDeleteAlert({ open: false, role: undefined })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the role "{deleteAlert.role?.name}". This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}