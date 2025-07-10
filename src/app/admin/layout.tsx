
'use client';

import { SidebarProvider, Sidebar, SidebarHeader, SidebarTrigger, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarContent, SidebarInset, SidebarFooter, SidebarSeparator, SidebarMenuBadge } from '@/components/ui/sidebar';
import { LayoutDashboard, FileText, Folder, Home, Users, Settings, Bell, Search, Library, Tags, Mail, FileSliders, ChevronRight, Database, Coins, LogOut, ClipboardList, LifeBuoy, Download, BarChart3, UserCog } from 'lucide-react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useEffect, useState } from 'react';
import type { Settings as AppSettings } from '@/types';
import { fetchSettings } from '@/lib/settings-service';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { getUnreadMessageSummary } from '@/lib/contact-service';
import { cn } from '@/lib/utils';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [unreadSummary, setUnreadSummary] = useState({ count: 0, hasPriority: false });
  
  useEffect(() => {
    fetchSettings().then(setSettings);

    const fetchUnreadCount = async () => {
      const summary = await getUnreadMessageSummary();
      setUnreadSummary(summary);
    };
    fetchUnreadCount();

  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/login');
    } catch (error: any) {
      toast({ title: "Logout Failed", description: error.message, variant: "destructive" });
    }
  };

  if (!settings) {
    return (
       <div className="flex h-screen">
            <div className="w-20 p-4 border-r">
                <Skeleton className="h-8 w-8 rounded-full mb-8" />
                <div className="space-y-4">
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-8 w-8 rounded" />
                </div>
            </div>
            <div className="flex-1">
                <header className="flex items-center justify-between px-8 h-16 border-b">
                    <Skeleton className="h-8 w-8 rounded" />
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                </header>
                <div className="p-8">
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
       </div>
    );
  }

  return (
    <SidebarProvider>
        <Sidebar collapsible="icon" variant="sidebar">
          <SidebarHeader className="px-4 py-2">
            <Link href="/admin/dashboard" className="flex items-center gap-2 font-bold text-lg">
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="font-headline group-data-[collapsible=icon]:hidden">{settings.siteName}</span>
            </Link>
          </SidebarHeader>
          <SidebarContent className="pt-4">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Dashboard">
                  <Link href="/admin/dashboard">
                    <LayoutDashboard />
                    <span className="group-data-[collapsible=icon]:hidden">Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <Collapsible asChild>
                <SidebarMenuItem>
                  <div className="w-full">
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton variant="ghost" className="w-full justify-between group-data-[collapsible=icon]:justify-center" tooltip="Pages">
                        <div className="flex items-center gap-2">
                          <FileSliders className="h-4 w-4"/>
                          <span className="group-data-[collapsible=icon]:hidden">Pages</span>
                        </div>
                        <ChevronRight className="h-4 w-4 group-data-[collapsible=icon]:hidden transition-transform [&[data-state=open]]:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="group-data-[collapsible=icon]:hidden">
                      <div className="pl-8 py-1 flex flex-col gap-1">
                        <Button asChild variant="link" className="h-auto p-0 justify-start text-muted-foreground hover:text-foreground">
                          <Link href="/admin/pages/homepage">Homepage</Link>
                        </Button>
                        <Button asChild variant="link" className="h-auto p-0 justify-start text-muted-foreground hover:text-foreground">
                          <Link href="/admin/pages/about">About Page</Link>
                        </Button>
                         <Button asChild variant="link" className="h-auto p-0 justify-start text-muted-foreground hover:text-foreground">
                          <Link href="/admin/pages/contact">Contact Page</Link>
                        </Button>
                         <Button asChild variant="link" className="h-auto p-0 justify-start text-muted-foreground hover:text-foreground">
                          <Link href="/admin/pages/terms">Terms of Service</Link>
                        </Button>
                         <Button asChild variant="link" className="h-auto p-0 justify-start text-muted-foreground hover:text-foreground">
                          <Link href="/admin/pages/privacy">Privacy Policy</Link>
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </div>
                </SidebarMenuItem>
              </Collapsible>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Papers">
                  <Link href="/admin/papers">
                    <FileText />
                    <span className="group-data-[collapsible=icon]:hidden">Papers</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Categories">
                  <Link href="/admin/categories">
                    <Folder />
                    <span className="group-data-[collapsible=icon]:hidden">Categories</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Plans">
                  <Link href="/admin/plans">
                    <Coins className="h-4 w-4" />
                    <span className="group-data-[collapsible=icon]:hidden">Plans</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Test Configs">
                  <Link href="/admin/test-configs">
                    <ClipboardList className="h-4 w-4" />
                    <span className="group-data-[collapsible=icon]:hidden">Test Configs</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Downloads">
                  <Link href="/admin/downloads">
                    <Download className="h-4 w-4" />
                    <span className="group-data-[collapsible=icon]:hidden">Downloads</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Results">
                  <Link href="/admin/results">
                    <BarChart3 className="h-4 w-4" />
                    <span className="group-data-[collapsible=icon]:hidden">Results</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <Collapsible asChild>
                <SidebarMenuItem>
                  <div className="w-full">
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton variant="ghost" className="w-full justify-between group-data-[collapsible=icon]:justify-center" tooltip="Question Bank">
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4"/>
                          <span className="group-data-[collapsible=icon]:hidden">Question Bank</span>
                        </div>
                        <ChevronRight className="h-4 w-4 group-data-[collapsible=icon]:hidden transition-transform [&[data-state=open]]:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="group-data-[collapsible=icon]:hidden">
                      <div className="pl-8 py-1 flex flex-col gap-1">
                        <Button asChild variant="link" className="h-auto p-0 justify-start text-muted-foreground hover:text-foreground">
                          <Link href="/admin/questions">All Questions</Link>
                        </Button>
                        <Button asChild variant="link" className="h-auto p-0 justify-start text-muted-foreground hover:text-foreground">
                          <Link href="/admin/question-categories">Question Categories</Link>
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </div>
                </SidebarMenuItem>
              </Collapsible>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Messages">
                  <Link href="/admin/messages">
                    <Mail />
                    <span className="group-data-[collapsible=icon]:hidden">Messages</span>
                     {unreadSummary.count > 0 && (
                        <SidebarMenuBadge className={cn(unreadSummary.hasPriority && 'bg-destructive text-destructive-foreground')}>
                            {unreadSummary.count}
                        </SidebarMenuBadge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Help Center">
                  <Link href="/admin/help">
                    <LifeBuoy />
                    <span className="group-data-[collapsible=icon]:hidden">Help Center</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
             <SidebarSeparator />
            <SidebarMenu>
               <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Users">
                  <Link href="/admin/users">
                    <Users />
                    <span className="group-data-[collapsible=icon]:hidden">Users</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Roles">
                  <Link href="/admin/roles">
                    <UserCog />
                    <span className="group-data-[collapsible=icon]:hidden">Roles</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Settings">
                      <Link href="/admin/settings">
                          <Settings />
                          <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                      </Link>
                  </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Back to Site">
                      <Link href="/">
                          <Home />
                          <span className="group-data-[collapsible=icon]:hidden">Back to Site</span>
                      </Link>
                  </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="flex items-center justify-between px-8 md:px-16 h-16 border-b sticky top-0 bg-background z-10">
            <div className="flex items-center gap-4">
                <div className="md:hidden">
                    <SidebarTrigger />
                </div>
                <div className="hidden md:block">
                    <SidebarTrigger />
                </div>
                 <div className="relative hidden lg:block">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search..." className="pl-8 w-full md:w-[200px] lg:w-[300px]" />
                </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Bell className="h-5 w-5" />
                <span className="sr-only">Toggle notifications</span>
              </Button>
               <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="rounded-full">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || "Admin"} data-ai-hint="male avatar"/>
                          <AvatarFallback>{user?.displayName?.charAt(0) || user?.email?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="sr-only">Toggle user menu</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{user?.displayName || 'My Account'}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled>Profile</DropdownMenuItem>
                   <DropdownMenuItem disabled>Settings</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <div className="p-8 md:p-16 bg-muted/40 min-h-[calc(100vh-4rem)]">
            {children}
          </div>
        </SidebarInset>
    </SidebarProvider>
  );
}
