
'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Bookmark, Clock, ListChecks, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { getPlanById } from '@/lib/plan-service';
import { getUserProfile } from '@/lib/user-service';
import { getBookmarkForPaper, toggleBookmark } from '@/lib/bookmark-service';
import type { Paper } from '@/types';
import { cn } from '@/lib/utils';

interface PaperCardProps {
  paper: Paper;
  categoryName?: string;
}

export function PaperCard({ paper, categoryName }: PaperCardProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isToggling, setIsToggling] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial bookmark status
  useEffect(() => {
    // Don't fetch until auth state is resolved
    if (authLoading) return;

    if (user) {
      setIsLoading(true);
      getBookmarkForPaper(user.uid, paper.id)
        .then((bookmark) => {
          setIsBookmarked(!!bookmark);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [user, paper.id, authLoading]);

  const handleBookmarkClick = async () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'You must be logged in to bookmark papers.',
        variant: 'destructive',
      });
      router.push(`/login?redirect=${pathname}`);
      return;
    }

    setIsToggling(true);

    try {
      const profile = await getUserProfile(user.uid);
      if (!profile || !profile.planId) {
        throw new Error('Could not load user profile or plan.');
      }

      const plan = await getPlanById(profile.planId);
      if (!plan) {
        throw new Error('Could not load subscription plan.');
      }
      
      const result = await toggleBookmark(user.uid, paper.id, plan);

      if (result.success) {
        setIsBookmarked(result.bookmarked);
        toast({
          title: result.message,
        });
        if (pathname === '/account/saved-papers' && !result.bookmarked) {
          router.refresh();
        }
      } else {
        toast({
          title: 'Action Failed',
          description: result.message,
          variant: 'destructive',
        });
      }

    } catch (error) {
      toast({
        title: 'An error occurred',
        description: 'Could not process your request. Please try again.',
        variant: 'destructive',
      });
      console.error(error);
    } finally {
      setIsToggling(false);
    }
  };

  const BookmarkIcon = () => {
    if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
    
    return (
      <Bookmark className={cn(
        "h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors",
        isBookmarked && "text-primary fill-primary"
      )} />
    );
  };

  return (
    <Card className="flex flex-col hover:shadow-lg transition-shadow duration-300">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            {categoryName && <p className="text-sm font-medium text-primary">{categoryName}</p>}
            <CardTitle className="mt-1">{paper.title}</CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0 group" onClick={handleBookmarkClick} disabled={isToggling || isLoading}>
            {isToggling ? <Loader2 className="h-5 w-5 animate-spin" /> : <BookmarkIcon />}
            <span className="sr-only">Bookmark paper</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <CardDescription>{paper.description}</CardDescription>
        <div className="flex items-center text-muted-foreground text-sm mt-4 gap-6">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            <span>{paper.questionCount} Questions</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{paper.duration} min</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button asChild className="w-full">
          <Link href={`/papers/${paper.slug}`}>View Paper</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
