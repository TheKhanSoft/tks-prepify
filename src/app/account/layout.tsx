
'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, LayoutDashboard, User, BarChart3, Bookmark, Home, BookOpen, LogOut, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Settings } from '@/types';
import { fetchSettings } from '@/lib/settings-service';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

const accountNavLinks = [
  { href: '/account/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/account/profile', label: 'Profile', icon: User },
  { href: '/account/subscription', label: 'Subscription', icon: CreditCard },
  { href: '/account/results', label: 'My Results', icon: BarChart3 },
  { href: '/account/saved-papers', label: 'Saved Papers', icon: Bookmark },
];

export default function AccountLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [settings, setSettings] = useState<Settings | null>(null);
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/login');
    } catch (error: any) {
      toast({ title: "Logout Failed", description: error.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/login?redirect=${pathname}`);
    }
    fetchSettings().then(setSettings);
  }, [user, loading, router, pathname]);

  if (loading || !user || !settings) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      <aside className="hidden w-64 flex-col border-r bg-background sm:flex">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/" className="flex items-center gap-2 font-bold font-headline">
            <BookOpen className="h-6 w-6 text-primary" />
            <span>{settings.siteName}</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-2 p-4">
          {accountNavLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Button
                variant={pathname === link.href ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-2"
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Button>
            </Link>
          ))}
        </nav>
        <div className="mt-auto p-4 space-y-2">
           <Button variant="ghost" onClick={handleLogout} className="w-full justify-start gap-2">
              <LogOut className="h-4 w-4" />
              Logout
          </Button>
          <Link href="/">
             <Button variant="ghost" className="w-full justify-start gap-2">
                <Home className="h-4 w-4" />
                Back to Main Site
            </Button>
          </Link>
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        {/* Header for mobile or other content can go here if needed */}
        <main className="flex-1 p-6 sm:p-10">{children}</main>
      </div>
    </div>
  );
}
