

'use client';

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Edit, Search, MoreHorizontal, CreditCard, UserCog } from "lucide-react";
import { fetchUserProfiles, assignUserRole } from "@/lib/user-service";
import { fetchPlans } from "@/lib/plan-service";
import { fetchRoles } from "@/lib/role-service";
import type { User, Plan, Role } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminUsersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [fetchedUsers, fetchedPlans, fetchedRoles] = await Promise.all([
        fetchUserProfiles(),
        fetchPlans(),
        fetchRoles(),
      ]);
      setUsers(fetchedUsers);
      setPlans(fetchedPlans);
      setRoles(fetchedRoles);
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not load user data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const plansMap = useMemo(() => new Map(plans.map(p => [p.id, p.name])), [plans]);
  
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchTerm) return users;

    const lowercasedTerm = searchTerm.toLowerCase();

    return users.filter(user => {
      const nameMatch = user.name ? user.name.toLowerCase().includes(lowercasedTerm) : false;
      const emailMatch = user.email ? user.email.toLowerCase().includes(lowercasedTerm) : false;
      return nameMatch || emailMatch;
    });
  }, [users, searchTerm]);

  const handleOpenRoleDialog = (user: User) => {
    setSelectedUser(user);
    setSelectedRole(user.role || '');
    setIsRoleDialogOpen(true);
  }

  const handleRoleChange = async () => {
    if (!selectedUser) return;
    setIsUpdatingRole(true);
    try {
      await assignUserRole(selectedUser.id, selectedRole);
      toast({ title: "Role Updated", description: `${selectedUser.name}'s role has been changed.` });
      await loadData(); // Reload to show the change
      setIsRoleDialogOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to update role.", variant: "destructive" });
    } finally {
      setIsUpdatingRole(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full min-h-[calc(100vh-20rem)]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
              <h1 className="text-3xl font-bold">User Management</h1>
              <p className="text-muted-foreground">View and manage all registered users.</p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>Total users found in the database: {users.length}</CardDescription>
            <div className="pt-4">
              <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="max-w-sm pl-9"
                  />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Link href={`/admin/users/${user.id}/subscription`} className="flex items-center gap-3 group">
                          <Avatar className="h-9 w-9">
                              <AvatarImage src={user.photoURL || undefined} alt={user.name || "User"} data-ai-hint="user avatar" />
                              <AvatarFallback>{user.name?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                              <div className="font-medium group-hover:underline">{user.name || "N/A"}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </Link>
                      </TableCell>
                       <TableCell>
                        <Badge variant="secondary">{user.role || "User"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{plansMap.get(user.planId) || "No Plan"}</Badge>
                      </TableCell>
                      <TableCell>
                        {user.createdAt
                          ? format(new Date(user.createdAt), "PPP")
                          : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button aria-haspopup="true" size="icon" variant="ghost">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onSelect={() => handleOpenRoleDialog(user)}>
                                  <UserCog className="mr-2 h-4 w-4" />
                                  Change Role
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                  <Link href={`/admin/users/${user.id}/edit`}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit Profile
                                  </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                  <Link href={`/admin/users/${user.id}/subscription`}>
                                      <CreditCard className="mr-2 h-4 w-4" />
                                      Manage Subscription
                                  </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Change Role for {selectedUser?.name}</DialogTitle>
                <DialogDescription>Select a new role for this user.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
                 <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger><SelectValue placeholder="Select a role..." /></SelectTrigger>
                    <SelectContent>
                        {roles.map(role => (
                            <SelectItem key={role.id} value={role.name}>{role.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={handleRoleChange} disabled={isUpdatingRole}>
                  {isUpdatingRole && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                  Save Changes
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
