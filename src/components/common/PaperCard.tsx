'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Bookmark, Clock, ListChecks, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { getPlanById } from '@/lib/plan-service';
import { getUserProfile } from '@/lib/user-service';
import type { Paper } from '@/types';

interface PaperCardProps {
  paper: Paper;
  categoryName?: string;
}

export function PaperCard({ paper, categoryName }: PaperCardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isBookmarking, setIsBookmarking] = useState(false);

  const handleBookmarkClick = async () => {
    setIsBookmarking(true);
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'You must be logged in to bookmark papers.',
        variant: 'destructive',
      });
      router.push('/login');
      setIsBookmarking(false);
      return;
    }

    try {
      const profile = await getUserProfile(user.uid);
      if (!profile || !profile.planId) {
        throw new Error('Could not load user profile or plan.');
      }

      const plan = await getPlanById(profile.planId);
      if (!plan) {
        throw new Error('Could not load subscription plan.');
      }

      const bookmarkFeature = plan.features.find(f => f.key === 'bookmarks');
      // For now, we will assume usage is within limits if the feature exists and is not 0.
      // A full implementation would check the user's current bookmark count against the limit.
      const hasAccess = bookmarkFeature && bookmarkFeature.isQuota && bookmarkFeature.limit !== 0;

      if (hasAccess) {
        // Placeholder for actual bookmarking logic
        toast({
          title: 'Paper Bookmarked!',
          description: `"${paper.title}" has been saved to your library.`,
        });
      } else {
        toast({
          title: 'Upgrade Required',
          description: 'Your current plan does not allow bookmarking papers. Please upgrade to a higher tier.',
          variant: 'destructive',
          duration: 8000
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
      setIsBookmarking(false);
    }
  };

  return (
    <Card className="flex flex-col hover:shadow-lg transition-shadow duration-300">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            {categoryName && <p className="text-sm font-medium text-primary">{categoryName}</p>}
            <CardTitle className="mt-1">{paper.title}</CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0 group" onClick={handleBookmarkClick} disabled={isBookmarking}>
            {isBookmarking ? <Loader2 className="h-5 w-5 animate-spin" /> : <Bookmark className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:fill-primary/20 transition-colors" />}
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