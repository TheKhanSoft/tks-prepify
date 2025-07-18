
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { cn } from '@/lib/utils';

// --- UI & Icon Imports ---
import { SidebarProvider, Sidebar, SidebarHeader, SidebarTrigger, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarContent, SidebarInset, SidebarFooter, SidebarSeparator, SidebarMenuBadge } from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LayoutDashboard, FileText, Folder, Home, Users, Settings, Bell, Search, Mail, FileSliders, ChevronRight, Database, Coins, LogOut, ClipboardList, LifeBuoy, Download, BarChart3, UserCog, BookOpen, Loader2, ShieldAlert, X, Banknote, Percent, ShoppingCart } from 'lucide-react';

// --- Service, Type & Hook Imports ---
import type { Settings as AppSettings } from '@/types';
import { fetchSettings } from '@/lib/settings-service';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { getUnreadMessageSummary } from '@/lib/contact-service';
import { getUserProfile } from '@/lib/user-service';

const ADMIN_ROLES = ['Super Admin', 'Admin'];

// ====================================================================
// REUSABLE NAVIGATION HELPER COMPONENTS
// ====================================================================

const NavMenuLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider group-data-[collapsible=icon]:hidden">
    {children}
  </div>
);

const NavItem = ({ href, tooltip, icon, children, badgeContent, badgeDestructive }: {
  href: string;
  tooltip: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  badgeContent?: string | number;
  badgeDestructive?: boolean;
}) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton 
        asChild 
        tooltip={tooltip} 
        className={cn(
          "transition-all duration-200 relative group",
          // Active state: lighter background with subtle left border
          isActive && "bg-orange-100 text-orange-600 hover:bg-orange-200 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-orange-500 before:rounded-r-sm",
          // Inactive state: default with darker hover
          !isActive && "hover:bg-gray-100 text-gray-700 hover:text-gray-900"
        )}
      >
        <Link href={href}>
          {icon}
          <span className="group-data-[collapsible=icon]:hidden">{children}</span>
          {badgeContent && (
            <SidebarMenuBadge className={cn(
              "transition-colors duration-200",
              badgeDestructive && 'bg-destructive text-destructive-foreground',
              isActive && 'bg-orange-500 text-white'
            )}>
              {badgeContent}
            </SidebarMenuBadge>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

const NavGroup = ({ title, tooltip, icon, subItems }: {
  title: string;
  tooltip: string;
  icon: React.ReactNode;
  subItems: { href: string; label: string }[];
}) => {
  const pathname = usePathname();
  const isAnyChildActive = useMemo(() => subItems.some(item => pathname.startsWith(item.href)), [subItems, pathname]);

  return (
    <SidebarMenuItem>
      {/* Behavior for Expanded Sidebar: A Collapsible Area */}
      <Collapsible defaultOpen={isAnyChildActive} className="w-full group-data-[collapsible=icon]:hidden">
        <CollapsibleTrigger asChild>
          <SidebarMenuButton 
            className={cn(
              "w-full justify-between transition-all duration-200 relative group",
              // Parent active state: lighter background when child is active with left border
              isAnyChildActive && "bg-orange-100 text-orange-600 hover:bg-orange-200 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-orange-500 before:rounded-r-sm",
              // Parent inactive state: default with darker hover
              !isAnyChildActive && "hover:bg-gray-100 text-gray-700 hover:text-gray-900"
            )}
          >
            <div className="flex items-center gap-2">{icon}<span>{title}</span></div>
            <ChevronRight className="h-4 w-4 transition-transform duration-200 [&[data-state=open]]:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="pl-8 py-1 flex flex-col space-y-1">
            {subItems.map(item => (
              <Button 
                key={item.href} 
                asChild 
                variant="link" 
                size="sm" 
                className={cn(
                  "h-auto justify-start transition-all duration-200 relative group rounded-md px-3 py-2",
                  // Child active state: lighter background with orange text and subtle indicator
                  pathname === item.href && "bg-orange-50 text-orange-600 font-semibold hover:bg-orange-100 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-orange-400 before:rounded-r-sm",
                  // Child inactive state: muted with darker hover
                  pathname !== item.href && "text-muted-foreground hover:text-gray-700 hover:bg-gray-50"
                )}
              >
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Behavior for Collapsed Sidebar: A Dropdown Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton 
            tooltip={tooltip} 
            className={cn(
              "hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center transition-all duration-200 relative group",
              // Parent active state in collapsed mode with left border
              isAnyChildActive && "bg-orange-100 text-orange-600 hover:bg-orange-200 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-orange-500 before:rounded-r-sm",
              // Parent inactive state in collapsed mode
              !isAnyChildActive && "hover:bg-gray-100 text-gray-700 hover:text-gray-900"
            )}
          >
            {icon}
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-48">
          <DropdownMenuLabel>{title}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {subItems.map(item => (
            <DropdownMenuItem key={item.href} asChild>
              <Link href={item.href} className={cn(
                "transition-colors duration-200",
                pathname === item.href && "bg-orange-50 text-orange-600 font-semibold"
              )}>
                {item.label}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
};

// ====================================================================
// THE MAIN ADMINLAYOUT COMPONENT
// ====================================================================
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [unreadSummary, setUnreadSummary] = useState({ count: 0, hasPriority: false });
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkAuthAndRole = async () => {
      if (authLoading) return;
      if (!user) {
        toast({ title: "Access Denied", description: "You must be logged in.", variant: "destructive" });
        router.push('/login');
        return;
      }
      try {
        const userProfile = await getUserProfile(user.uid);
        if (userProfile && userProfile.role && ADMIN_ROLES.includes(userProfile.role)) {
            setIsAuthorized(true);
            const [summary, appSettings] = await Promise.all([
              getUnreadMessageSummary(),
              fetchSettings()
            ]);
            setUnreadSummary(summary);
            setSettings(appSettings);
        } else {
            toast({ title: "Permission Denied", description: "You cannot access the admin area.", variant: "destructive" });
            router.push('/');
        }
      } catch (error) {
         toast({ title: "Authentication Error", description: "Could not verify your role.", variant: "destructive" });
         router.push('/');
      } finally {
        setIsLoading(false);
      }
    };
    checkAuthAndRole();
  }, [user, authLoading, router, toast]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    if (isSearchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSearchOpen]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/login');
    } catch (error: any) {
      toast({ title: "Logout Failed", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
       <div className="flex h-screen w-full items-center justify-center bg-background">
         <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Verifying access...</p>
         </div>
       </div>
    );
  }

  if (!isAuthorized || !settings) {
    return (
       <div className="flex h-screen w-full items-center justify-center bg-destructive/10 text-destructive">
         <div className="flex flex-col items-center gap-4 text-center p-8">
            <ShieldAlert className="h-12 w-12" />
            <h1 className="text-2xl font-bold">Access Denied</h1>
            <p>You are being redirected.</p>
         </div>
       </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="sidebar" className="flex flex-col h-screen">
        <SidebarHeader className="px-4 py-4 border-b flex-shrink-0">
          <Link href="/admin/dashboard" className="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition-opacity">
            <BookOpen className="h-5 w-5 text-primary flex-shrink-0" />
            <span 
              className="font-headline whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0"
            >
              {settings.siteName}
            </span>
          </Link>
        </SidebarHeader>

        <SidebarContent className="flex-1 overflow-y-auto pt-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
          <SidebarMenu>
            <NavItem href="/admin/dashboard" tooltip="Dashboard" icon={<LayoutDashboard />}>Dashboard</NavItem>
            <SidebarSeparator className="my-2" />

            <NavMenuLabel>Content</NavMenuLabel>
            <NavGroup
              title="Pages"
              tooltip="Pages"
              icon={<FileSliders className="h-4 w-4" />}
              subItems={[
                { href: "/admin/pages/homepage", label: "Homepage" },
                { href: "/admin/pages/about", label: "About Page" },
                { href: "/admin/pages/contact", label: "Contact Page" },
                { href: "/admin/pages/terms", label: "Terms of Service" },
                { href: "/admin/pages/privacy", label: "Privacy Policy" },
              ]}
            />
            <NavItem href="/admin/papers" tooltip="Papers" icon={<FileText />}>Papers</NavItem>
            <NavItem href="/admin/categories" tooltip="Categories" icon={<Folder />}>Categories</NavItem>
            <SidebarSeparator className="my-2" />
            
            <NavMenuLabel>E-commerce</NavMenuLabel>
            <NavItem href="/admin/orders" tooltip="Orders" icon={<ShoppingCart className="h-4 w-4" />}>Orders</NavItem>
            <NavItem href="/admin/plans" tooltip="Plans" icon={<Coins className="h-4 w-4" />}>Plans</NavItem>
            <NavItem href="/admin/discounts" tooltip="Discounts" icon={<Percent className="h-4 w-4" />}>Discounts</NavItem>
            <NavItem href="/admin/payments" tooltip="Payments" icon={<Banknote className="h-4 w-4" />}>Payment Methods</NavItem>
            <NavItem href="/admin/downloads" tooltip="Downloads" icon={<Download className="h-4 w-4" />}>Downloads</NavItem>
            <SidebarSeparator className="my-2" />
            
            <NavMenuLabel>Assessment</NavMenuLabel>
            <NavItem href="/admin/test-configs" tooltip="Test Configs" icon={<ClipboardList className="h-4 w-4" />}>Test Configs</NavItem>
            <NavItem href="/admin/results" tooltip="Results" icon={<BarChart3 className="h-4 w-4" />}>Results</NavItem>
            <NavGroup
              title="Question Bank"
              tooltip="Question Bank"
              icon={<Database className="h-4 w-4" />}
              subItems={[
                { href: "/admin/questions", label: "All Questions" },
                { href: "/admin/question-categories", label: "Question Categories" },
              ]}
            />
            <SidebarSeparator className="my-2" />
            
            <NavMenuLabel>Communication</NavMenuLabel>
            <NavItem href="/admin/messages" tooltip="Messages" icon={<Mail />} badgeContent={unreadSummary.count > 0 ? unreadSummary.count : undefined} badgeDestructive={unreadSummary.hasPriority}>Messages</NavItem>
            <NavItem href="/admin/help" tooltip="Help Center" icon={<LifeBuoy />}>Help Center</NavItem>
            <SidebarSeparator className="my-2" />
            
            <NavMenuLabel>User Management</NavMenuLabel>
            <NavItem href="/admin/users" tooltip="Users" icon={<Users />}>Users</NavItem>
            <NavItem href="/admin/roles" tooltip="Roles" icon={<UserCog />}>Roles</NavItem>
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="border-t p-2 flex-shrink-0">
          <SidebarMenu>
            <NavItem href="/admin/settings" tooltip="Settings" icon={<Settings />}>Settings</NavItem>
            <SidebarSeparator className="my-1" />
            {/* Back to Site - smaller and less prominent */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Back to Site" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50">
                <Link href="/" className="flex items-center gap-2">
                  <Home className="h-3 w-3" />
                  <span className="group-data-[collapsible=icon]:hidden">Back to Site</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex items-center justify-between px-1 pr-8 md:pr-8 h-16 border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
          {isSearchOpen ? (
            <div ref={searchRef} className="w-full flex items-center gap-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Search across the entire platform..."
                className="h-9 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-base"
              />
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => setIsSearchOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                  <SidebarTrigger className="hover:bg-accent" />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 hover:bg-accent" onClick={() => setIsSearchOpen(true)}>
                  <Search className="h-4 w-4" />
                  <span className="sr-only">Open Search</span>
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 hover:bg-accent">
                  <Bell className="h-4 w-4" />
                  <span className="sr-only">Toggle notifications</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 hover:bg-accent">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || "Admin"} />
                            <AvatarFallback className="text-sm">{user?.displayName?.charAt(0) || user?.email?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="sr-only">Toggle user menu</span>
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user?.displayName || 'Admin User'}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled>Profile</DropdownMenuItem>
                    <DropdownMenuItem disabled>Settings</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          )}
        </header>
        <div className="p-6 md:p-8 bg-muted/40 min-h-[calc(100vh-4rem)]">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
