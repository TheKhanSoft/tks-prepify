
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

  const footerLinks = [
    {
      title: 'Platform',
      links: [
        { label: 'Papers', href: '/papers' },
        { label: 'Practice Tests', href: '/tests' },
        { label: 'Categories', href: '/categories' },
        { label: 'Pricing', href: '/pricing' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'About Us', href: '/about' },
        { label: 'Contact Us', href: '/contact' },
        { label: 'Blog', href: '#' },
      ],
    },
    {
      title: 'Support',
      links: [
        { label: 'Help Center', href: '/help' },
        { label: 'Terms of Service', href: '/terms' },
        { label: 'Privacy Policy', href: '/privacy' },
      ],
    },
  ];

  if (!user) {
    const platformColumn = footerLinks.find(c => c.title === 'Platform');
    if (platformColumn && !platformColumn.links.some(l => l.href === '/signup')) {
      platformColumn.links.push({ label: 'Sign Up', href: '/signup' });
    }
  }

  return (
    <footer className="bg-card border-t">
      <div className="container mx-auto px-6 sm:px-10 lg:px-16 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl mb-4">
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="font-headline">{settings.siteName}</span>
            </Link>
            <p className="text-muted-foreground mb-4 max-w-sm">{settings.siteDescription}</p>
            <div className="flex gap-1">
                {settings.socialLinks && settings.socialLinks.map((link) => {
                    const platformInfo = socialPlatforms.find(p => p.value === link.platform);
                    const Icon = platformInfo ? iconMap[platformInfo.iconName] : LinkIcon;

                    if (!link.url) return null;
                    return (
                        <Button asChild variant="ghost" size="icon" key={`${link.platform}-${link.url}`} aria-label={link.platform}>
                            <Link href={link.url} target="_blank" rel="noopener noreferrer">
                                <Icon className="h-5 w-5" />
                                <span className="sr-only">{link.platform}</span>
                            </Link>
                        </Button>
                    )
                })}
            </div>
          </div>
          
          {footerLinks.map((column) => (
            <div key={column.title}>
              <h3 className="font-semibold mb-4">{column.title}</h3>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-muted-foreground hover:text-primary transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

        </div>
        <div className="mt-12 border-t pt-8 text-center text-muted-foreground text-sm">
          © {new Date().getFullYear()} {settings.siteName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
