
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { fetchUserBookmarks } from '@/lib/bookmark-service';
import { fetchCategories } from '@/lib/category-service';
import type { Paper, Category } from '@/types';
import { Loader2, BookmarkX } from 'lucide-react';
import { PaperCard } from '@/components/common/PaperCard';
import { getCategoryById } from '@/lib/category-helpers';

export default function SavedPapersPage() {
    const { user, loading: authLoading } = useAuth();
    const [savedPapers, setSavedPapers] = useState<Paper[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;

        const loadData = async () => {
            setLoading(true);
            if (user) {
                try {
                    const [papers, categories] = await Promise.all([
                        fetchUserBookmarks(user.uid),
                        fetchCategories()
                    ]);
                    setSavedPapers(papers);
                    setAllCategories(categories);
                } catch (error) {
                    // console.error("Failed to load saved papers:", error);
                }
            }
            setLoading(false);
        };
        loadData();
    }, [user, authLoading]);

    if (authLoading || loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[calc(100vh-20rem)]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Saved Papers</h1>
                <p className="text-muted-foreground">All your bookmarked papers in one place for easy access.</p>
            </div>
            {savedPapers.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {savedPapers.map((paper) => {
                        const category = getCategoryById(paper.categoryId, allCategories);
                        return (
                            <PaperCard key={paper.id} paper={paper} categoryName={category?.name} />
                        )
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-64 border-2 border-dashed rounded-lg">
                    <BookmarkX className="h-12 w-12 mb-4" />
                    <h3 className="text-lg font-semibold">No Saved Papers</h3>
                    <p className="mt-1">You haven't bookmarked any papers yet.</p>
                </div>
            )}
        </div>
    );
}
