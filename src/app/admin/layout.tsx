
import { SidebarProvider, Sidebar, SidebarHeader, SidebarTrigger, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarContent, SidebarInset, SidebarFooter } from '@/components/ui/sidebar';
import { LayoutDashboard, FileText, Folder, Home, Users, Settings, Bell, Search, Library } from 'lucide-react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
        <Sidebar collapsible="icon" variant="sidebar">
          <SidebarHeader className="px-4 py-2">
            <Link href="/admin/dashboard" className="flex items-center gap-2 font-bold text-lg">
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="font-headline group-data-[collapsible=icon]:hidden">Prepify</span>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Dashboard">
                  <Link href="/admin/dashboard">
                    <LayoutDashboard />
                    <span className="group-data-[collapsible=icon]:hidden">Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Papers">
                  <Link href="/admin/papers">
                    <FileText />
                    <span className="group-data-[collapsible=icon]:hidden">Papers</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="All Questions">
                  <Link href="/admin/questions">
                    <Library />
                    <span className="group-data-[collapsible=icon]:hidden">All Questions</span>
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
                <SidebarMenuButton asChild tooltip="Users">
                  <Link href="/admin/users">
                    <Users />
                    <span className="group-data-[collapsible=icon]:hidden">Users</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
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
                          <AvatarImage src="https://placehold.co/40x40.png" alt="Admin" data-ai-hint="male avatar"/>
                          <AvatarFallback>A</AvatarFallback>
                        </Avatar>
                        <span className="sr-only">Toggle user menu</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled>Profile</DropdownMenuItem>
                   <DropdownMenuItem disabled>Settings</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Logout</DropdownMenuItem>
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
