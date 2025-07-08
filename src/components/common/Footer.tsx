
"use client";

import Link from 'next/link';
import { BookOpen, Facebook, Github, Instagram, Linkedin, Twitter, Youtube, Link as LinkIcon, MessageSquare, MessageCircle, Twitch, Ghost, Send } from 'lucide-react';
import { Button } from '../ui/button';
import type { Settings } from '@/types';
import { socialPlatforms } from '@/lib/social-platforms';
import { useAuth } from '@/hooks/use-auth';

const iconMap: { [key: string]: React.ComponentType<{ className?: string }> } = {
    Facebook, Github, Instagram, Linkedin, Twitter, Youtube, MessageSquare, MessageCircle, Twitch, Ghost, Send, Link: LinkIcon
};

export function Footer({ settings }: { settings: Settings }) {
  const { user } = useAuth();

  return (
    <footer className="bg-card border-t">
      <div className="container mx-auto px-6 sm:px-10 lg:px-16 py-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <Link href="/" className="flex items-center gap-2 font-bold text-xl mb-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="font-headline">{settings.siteName}</span>
            </Link>
            <p className="text-muted-foreground mb-4">{settings.siteDescription}</p>
            <div className="flex gap-1">
                {settings.socialLinks && settings.socialLinks.map((link) => {
                    const platformInfo = socialPlatforms.find(p => p.value === link.platform);
                    const Icon = platformInfo ? iconMap[platformInfo.iconName] : null;

                    if (!Icon || !link.url) return null;
                    return (
                        <Button asChild variant="ghost" size="icon" key={`${link.platform}-${link.url}`}>
                            <Link href={link.url} target="_blank" rel="noopener noreferrer">
                                <Icon className="h-5 w-5" />
                                <span className="sr-only">{link.platform}</span>
                            </Link>
                        </Button>
                    )
                })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-3">
            <div>
              <h3 className="font-semibold mb-2">Platform</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/papers" className="hover:text-primary">Papers</Link></li>
                <li><Link href="/tests" className="hover:text-primary">Practice Tests</Link></li>
                <li><Link href="/categories" className="hover:text-primary">Categories</Link></li>
                <li><Link href="/pricing" className="hover:text-primary">Pricing</Link></li>
                {!user && (
                  <li><Link href="/signup" className="hover:text-primary">Sign Up</Link></li>
                )}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Resources</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/about" className="hover:text-primary">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-primary">Contact Us</Link></li>
                <li><Link href="/help" className="hover:text-primary">Help Center</Link></li>
                <li><Link href="#" className="hover:text-primary">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Legal</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/terms" className="hover:text-primary">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-primary">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t pt-6 text-center text-muted-foreground text-sm">
          © {new Date().getFullYear()} {settings.siteName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
