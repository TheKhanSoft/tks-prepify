
import Link from 'next/link';
import { BookOpen, Facebook, Github, Linkedin, Twitter } from 'lucide-react';
import { fetchSettings } from '@/lib/settings-service';
import { Button } from '../ui/button';

export async function Footer() {
  const settings = await fetchSettings();

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
                {settings.twitterUrl && (
                    <Button asChild variant="ghost" size="icon">
                        <Link href={settings.twitterUrl} target="_blank" rel="noopener noreferrer">
                            <Twitter className="h-5 w-5" />
                            <span className="sr-only">Twitter</span>
                        </Link>
                    </Button>
                )}
                {settings.facebookUrl && (
                    <Button asChild variant="ghost" size="icon">
                        <Link href={settings.facebookUrl} target="_blank" rel="noopener noreferrer">
                            <Facebook className="h-5 w-5" />
                            <span className="sr-only">Facebook</span>
                        </Link>
                    </Button>
                )}
                 {settings.linkedinUrl && (
                    <Button asChild variant="ghost" size="icon">
                        <Link href={settings.linkedinUrl} target="_blank" rel="noopener noreferrer">
                            <Linkedin className="h-5 w-5" />
                            <span className="sr-only">LinkedIn</span>
                        </Link>
                    </Button>
                )}
                 {settings.githubUrl && (
                    <Button asChild variant="ghost" size="icon">
                        <Link href={settings.githubUrl} target="_blank" rel="noopener noreferrer">
                            <Github className="h-5 w-5" />
                            <span className="sr-only">GitHub</span>
                        </Link>
                    </Button>
                )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 md:col-span-2 md:grid-cols-3">
            <div>
              <h3 className="font-semibold mb-2">Platform</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/papers" className="hover:text-primary">Papers</Link></li>
                <li><Link href="/#categories" className="hover:text-primary">Categories</Link></li>
                <li><Link href="#" className="hover:text-primary">Forum</Link></li>
                <li><Link href="/signup" className="hover:text-primary">Sign Up</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Resources</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="#" className="hover:text-primary">Help Center</Link></li>
                <li><Link href="#" className="hover:text-primary">Blog</Link></li>
                <li><Link href="#" className="hover:text-primary">Contact Us</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Legal</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="#" className="hover:text-primary">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-primary">Privacy Policy</Link></li>
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
