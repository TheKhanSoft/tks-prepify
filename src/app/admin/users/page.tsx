'use client';

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Edit, Search, MoreHorizontal, CreditCard, UserCog, ShieldAlert, Users, Crown, Calendar, UserPlus, Download, RefreshCw, Shield, UserCheck, UserX } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

const ADMIN_ROLES = ['Super Admin', 'Admin'];
const SUPER_ADMIN_EMAIL = 'thekhansoft@gmail.com';
const FREE_PLAN_ID = '3yc4DTybVHbkeMsnJnv4';

// Modern Stats Component with animated hover effects
const UserStats = ({ users }: { users: User[] }) => {
  const stats = useMemo(() => {
    const totalUsers = users.length;
    const adminUsers = users.filter(u => ADMIN_ROLES.includes(u.role || '')).length;
    const activeSubscriptions = users.filter(
      u => u.planId && u.planExpiryDate && new Date(u.planExpiryDate) > new Date() || u.planId && u.planId !== FREE_PLAN_ID && u.planExpiryDate === null
    ).length;
    const newUsersThisMonth = users.filter(u => {
      if (!u.createdAt) return false;
      const userDate = new Date(u.createdAt);
      const now = new Date();
      return userDate.getMonth() === now.getMonth() && userDate.getFullYear() === now.getFullYear();
    }).length;

    return { totalUsers, adminUsers, activeSubscriptions, newUsersThisMonth };
  }, [users]);

  const statCards = [
    { 
      title: 'Total Users', 
      value: stats.totalUsers, 
      icon: Users, 
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    },
    { 
      title: 'Active Users', 
      value: stats.activeSubscriptions, 
      icon: UserCheck, 
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10'
    },
    { 
      title: 'Admin Users', 
      value: stats.adminUsers, 
      icon: Shield, 
      color: 'text-purple-500',
      bg: 'bg-purple-500/10'
    },
    { 
      title: 'New This Month', 
      value: stats.newUsersThisMonth, 
      icon: Calendar, 
      color: 'text-amber-500',
      bg: 'bg-amber-500/10'
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((card, index) => (
        <Card 
          key={card.title} 
          className={cn(
            "transition-all duration-300 hover:shadow-lg hover:translate-y-[-2px]",
            card.bg
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={cn("p-2 rounded-full", card.bg)}>
              <card.icon className={cn("h-4 w-4", card.color)} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {index === 0 ? 'All registered users' : 
               index === 1 ? 'With active subscriptions' : 
               index === 2 ? 'Administrative privileges' : 
               'Joined this month'}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Modern User Row Component with hover effects
const UserRow = ({ 
  user, 
  plansMap, 
  onOpenRoleDialog, 
  isCurrentUserSuperAdmin 
}: { 
  user: User; 
  plansMap: Map<string, string>; 
  onOpenRoleDialog: (user: User) => void;
  isCurrentUserSuperAdmin: boolean;
}) => {
  const isTargetSuperAdmin = user.email === SUPER_ADMIN_EMAIL;
  const targetUserIsAdmin = ADMIN_ROLES.includes(user.role || '');
  const hasActivePlan = (user.planId && user.planExpiryDate && new Date(user.planExpiryDate) > new Date()) || (user.planId && user.planId !== FREE_PLAN_ID && user.planExpiryDate === null);
  const isExpired = user.planExpiryDate && new Date(user.planExpiryDate) < new Date();

  return (
    <TableRow className="group hover:bg-muted/10 transition-colors">
      <TableCell className="py-3">
        <Link href={`/admin/users/${user.id}/subscription`} className="flex items-center gap-3 group/link">
          <div className="relative">
            <Avatar className="h-10 w-10 ring-2 ring-transparent group-hover/link:ring-primary/20 transition-all duration-300">
              <AvatarImage src={user.photoURL || undefined} alt={user.name || "User"} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                {user.name?.charAt(0) || user.email?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {hasActivePlan && (
              <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                <div className="h-2 w-2 bg-white rounded-full"></div>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="font-medium group-hover/link:text-primary transition-colors truncate">
                {user.name || "Unnamed User"}
              </p>
              {isTargetSuperAdmin && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Crown className="h-3.5 w-3.5 text-yellow-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Super Administrator</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            <p className="text-xs text-muted-foreground font-mono truncate" title={user.id}>
              ID: {user.id.substring(0, 8)}...
            </p>
          </div>
        </Link>
      </TableCell>
      
      <TableCell className="py-3">
        <Badge 
          variant={targetUserIsAdmin ? "default" : "secondary"} 
          className={cn(
            "font-medium flex items-center gap-1",
            targetUserIsAdmin && "bg-gradient-to-r from-purple-500 to-blue-600 text-white border-0"
          )}
        >
          {targetUserIsAdmin && <Shield className="w-3.5 h-3.5" />}
          {user.role || "User"}
        </Badge>
      </TableCell>
      
      <TableCell className="py-3">
        <div className="flex items-center gap-2">
          <Badge 
            variant={hasActivePlan ? "default" : "outline"}
            className={cn(
              "whitespace-nowrap",
              hasActivePlan ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300" : 
              isExpired ? "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300" : ""
            )}
          >
            {plansMap.get(user.planId) || "No Plan"}
          </Badge>
          {user.planExpiryDate && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={cn(
                    "text-xs flex items-center gap-1",
                    hasActivePlan ? "text-green-600 dark:text-green-400" : 
                    isExpired ? "text-red-500 dark:text-red-400" : "text-muted-foreground"
                  )}>
                    <Calendar className="h-3 w-3" />
                    {format(new Date(user.planExpiryDate), "MMM d")}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{hasActivePlan ? 'Expires' : 'Expired'} {format(new Date(user.planExpiryDate), "PP")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>
      
      <TableCell className="py-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-sm">
                {user.createdAt ? format(new Date(user.createdAt), "MMM d, yyyy") : 'N/A'}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{user.createdAt ? format(new Date(user.createdAt), "PPpp") : 'No join date'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      
      <TableCell className="py-3 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>User Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onSelect={() => onOpenRoleDialog(user)} 
              disabled={!isCurrentUserSuperAdmin || isTargetSuperAdmin}
              className="gap-2"
            >
              <UserCog className="h-4 w-4" />
              Change Role
              {(!isCurrentUserSuperAdmin || isTargetSuperAdmin) && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="ml-auto text-xs text-muted-foreground">?</span>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      {isTargetSuperAdmin 
                        ? "Cannot modify Super Admin" 
                        : "Requires Super Admin"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/admin/users/${user.id}/edit`} className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Edit Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/admin/users/${user.id}/subscription`} className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Subscription
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTab, setFilterTab] = useState<'all' | 'admins' | 'active' | 'inactive'>('all');
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const loadingState = isRefreshing ? setIsRefreshing : setLoading;
    loadingState(true);
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
      loadingState(false);
    }
  }, [toast, isRefreshing]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const plansMap = useMemo(() => new Map(plans.map(p => [p.id, p.name])), [plans]);
  
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    let filtered = users;

    // Apply tab filter
    switch (filterTab) {
      case 'admins':
        filtered = filtered.filter(user => ADMIN_ROLES.includes(user.role || ''));
        break;
      case 'active':
        filtered = filtered.filter(user => 
          (user.planId && user.planExpiryDate && new Date(user.planExpiryDate) > new Date()) || (user.planId && user.planId !== FREE_PLAN_ID && user.planExpiryDate === null)
        );
        break;
      case 'inactive':
        filtered = filtered.filter(user => 
          !user.planId || !user.planExpiryDate || new Date(user.planExpiryDate) <= new Date()
        );
        break;
    }

    // Apply search filter
    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(user => {
        const nameMatch = user.name ? user.name.toLowerCase().includes(lowercasedTerm) : false;
        const emailMatch = user.email ? user.email.toLowerCase().includes(lowercasedTerm) : false;
        const roleMatch = user.role ? user.role.toLowerCase().includes(lowercasedTerm) : false;
        return nameMatch || emailMatch || roleMatch;
      });
    }

    return filtered;
  }, [users, searchTerm, filterTab]);

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
      toast({ 
        title: "Role Updated", 
        description: `${selectedUser.name}'s role has been changed to ${selectedRole}.`,
        action: (
          <Button variant="ghost" size="sm" onClick={handleRefresh}>
            Refresh
          </Button>
        )
      });
      await loadData();
      setIsRoleDialogOpen(false);
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update role.", 
        variant: "destructive" 
      });
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const isCurrentUserSuperAdmin = currentUser?.role === 'Super Admin';
  
  const availableRolesForAssignment = useMemo(() => {
    if (isCurrentUserSuperAdmin) {
      return roles;
    }
    return roles.filter(role => role.name !== 'Super Admin');
  }, [roles, isCurrentUserSuperAdmin]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mt-2" />
                <Skeleton className="h-3 w-32 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Card>
          <CardHeader>
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="flex gap-4 pt-4">
              <Skeleton className="h-10 w-full max-w-sm" />
              <Skeleton className="h-10 w-64" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage all registered users and their permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh} 
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">Refresh</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            disabled
          >
            <Download className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">Export</span>
          </Button>
          <Button 
            size="sm" 
            onClick={() => router.push('/admin/users/new')}
            className="hidden sm:flex"
          >
            <UserPlus className="h-4 w-4" />
            <span className="ml-2">Add User</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <UserStats users={users} />
      
      {/* Main Content Card */}
      <Card className="border-none shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl">User Directory</CardTitle>
              <CardDescription>
                {searchTerm ? (
                  <span>
                    Showing {filteredUsers.length} of {users.length} users matching "<span className="font-medium">{searchTerm}</span>"
                  </span>
                ) : filterTab !== 'all' ? (
                  <span>
                    Showing {filteredUsers.length} {filterTab} users
                  </span>
                ) : (
                  `Total users: ${users.length}`
                )}
              </CardDescription>
            </div>
          </div>
          
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search users by name, email, or role..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
            
            <Tabs 
              value={filterTab} 
              onValueChange={(value) => setFilterTab(value as any)}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid w-full grid-cols-4 h-9">
                <TabsTrigger value="all" className="text-xs flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  All
                </TabsTrigger>
                <TabsTrigger value="admins" className="text-xs flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5" />
                  Admins
                </TabsTrigger>
                <TabsTrigger value="active" className="text-xs flex items-center gap-1">
                  <UserCheck className="h-3.5 w-3.5" />
                  Active
                </TabsTrigger>
                <TabsTrigger value="inactive" className="text-xs flex items-center gap-1">
                  <UserX className="h-3.5 w-3.5" />
                  Inactive
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="">User</TableHead>
                  <TableHead className="">Role</TableHead>
                  <TableHead className="">Subscription</TableHead>
                  <TableHead className="">Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      plansMap={plansMap}
                      onOpenRoleDialog={handleOpenRoleDialog}
                      isCurrentUserSuperAdmin={isCurrentUserSuperAdmin}
                    />
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center py-6 gap-2">
                        <Search className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          {searchTerm || filterTab !== 'all' 
                            ? 'No users match your search criteria' 
                            : 'No users found in the system'}
                        </p>
                        {(searchTerm || filterTab !== 'all') && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              setSearchTerm('');
                              setFilterTab('all');
                            }}
                          >
                            Clear filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Role Change Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update User Role</DialogTitle>
            <DialogDescription>
              Change permissions for <span className="font-semibold">{selectedUser?.name || selectedUser?.email}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {selectedUser && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedUser.photoURL || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {selectedUser.name?.charAt(0) || selectedUser.email?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{selectedUser.name || "Unnamed User"}</div>
                  <div className="text-sm text-muted-foreground">{selectedUser.email}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Current role: <Badge variant="outline">{selectedUser.role || "User"}</Badge>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Select New Role</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role..." />
                </SelectTrigger>
                <SelectContent>
                  {availableRolesForAssignment.map(role => (
                    <SelectItem key={role.id} value={role.name}>
                      <div className="flex items-center gap-2">
                        {ADMIN_ROLES.includes(role.name) ? (
                          <Shield className="h-4 w-4 text-purple-500" />
                        ) : (
                          <UserCog className="h-4 w-4 text-blue-500" />
                        )}
                        {role.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              onClick={handleRoleChange} 
              disabled={isUpdatingRole || !selectedRole || selectedRole === selectedUser?.role}
              className="min-w-[120px]"
            >
              {isUpdatingRole ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Update Role"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}