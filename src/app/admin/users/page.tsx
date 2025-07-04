
'use client';

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Edit, Search } from "lucide-react";
import { fetchUserProfiles } from "@/lib/user-service";
import { fetchPlans } from "@/lib/plan-service";
import type { User, Plan } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function AdminUsersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [fetchedUsers, fetchedPlans] = await Promise.all([
        fetchUserProfiles(),
        fetchPlans(),
      ]);
      setUsers(fetchedUsers);
      setPlans(fetchedPlans);
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
      return users.filter(user => 
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [users, searchTerm]);

  if (loading) {
    return <div className="flex justify-center items-center h-full min-h-[calc(100vh-20rem)]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
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
          <CardDescription>Total users: {users.length}</CardDescription>
          <div className="pt-4 relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
             <Input 
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="max-w-sm pl-9"
              />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
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
                      <div className="flex items-center gap-3">
                         <Avatar className="h-9 w-9">
                            <AvatarImage src={user.photoURL || undefined} alt={user.name || "User"} data-ai-hint="user avatar" />
                            <AvatarFallback>{user.name?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="font-medium">{user.name || "N/A"}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{plansMap.get(user.planId) || "No Plan"}</Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(user.createdAt.toDate()), "PPP")}
                    </TableCell>
                    <TableCell className="text-right">
                       <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/users/${user.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </Link>
                       </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
