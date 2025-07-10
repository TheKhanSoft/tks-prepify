'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, Download, User, FileText, Star, TrendingUp, BookOpen, Tag, Calendar } from "lucide-react";
import type { Download as DownloadType, User as UserType, Paper, Category } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { fetchAllDownloads } from "@/lib/download-service";
import { fetchUserProfiles } from "@/lib/user-service";
import { fetchPapers } from "@/lib/paper-service";
import { fetchCategories } from "@/lib/category-service";
// --- Import both helper functions ---
import { getCategoryPath, getFlattenedCategories } from "@/lib/category-helpers"; 
import { format, subDays, isAfter } from "date-fns";
import Link from 'next/link';

// --- (StatsCard component remains the same) ---
const StatsCard = ({ title, value, icon: Icon, description }: {
    title: string;
    value: string;
    icon: any;
    description?: string;
}) => (
    <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <Icon className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold text-foreground truncate" title={value}>{value}</div>
            {description && (
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
        </CardContent>
    </Card>
);


// --- (DownloadCard component remains the same) ---
const DownloadCard = ({ download, userMap, paperMap, allCategories }: { 
    download: DownloadType; 
    userMap: Map<string, UserType>;
    paperMap: Map<string, Paper>;
    allCategories: Category[];
}) => {
    const user = userMap.get(download.userId);
    const paper = paperMap.get(download.paperId);
    
    const categoryPathString = paper?.categoryId 
        ? getCategoryPath(paper.categoryId, allCategories).map(c => c.name).join(' / ') 
        : 'Uncategorized';

    return (
        <Link href={`/admin/papers/${paper?.id}/edit`} className="block h-full">
            <Card className="group h-full hover:shadow-xl hover:scale-[1.02] transition-all duration-300 border-l-4 border-l-primary/20 hover:border-l-primary cursor-pointer flex flex-col justify-between">
                <CardContent className="p-4 flex-grow flex flex-col gap-3">
                    <div className="flex-grow">
                        <p className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-1">
                            {paper?.title || 'Unknown Paper'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Tag className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{categoryPathString}</span>
                        </div>
                    </div>
                    <div className="border-t pt-3 mt-3 space-y-2 text-xs text-muted-foreground">
                         <div className="flex items-center gap-2">
                            <User className="h-3 w-3 flex-shrink-0"/>
                            <span>{user?.name || 'Unknown User'}</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 flex-shrink-0"/>
                            <span>{format(new Date(download.createdAt), "MMM dd, yyyy")}</span>
                         </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
};


export default function AdminDownloadsPage() {
    const { toast } = useToast();
    const [downloads, setDownloads] = useState<DownloadType[]>([]);
    const [users, setUsers] = useState<UserType[]>([]);
    const [papers, setPapers] = useState<Paper[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    // --- (loadData and useEffect remain the same) ---
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [downloadsData, usersData, papersData, categoriesData] = await Promise.all([
                fetchAllDownloads(),
                fetchUserProfiles(),
                fetchPapers(),
                fetchCategories(),
            ]);
            setDownloads(downloadsData);
            setUsers(usersData);
            setPapers(papersData);
            setCategories(categoriesData);
        } catch (error) {
            toast({ title: "Error", description: "Could not load required data.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);
    
    useEffect(() => { loadData(); }, [loadData]);
    
    const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
    const paperMap = useMemo(() => new Map(papers.map(p => [p.id, p])), [papers]);
    
    // --- FIX: Create a flat list of all categories ---
    const flatCategories = useMemo(() => getFlattenedCategories(categories), [categories]);
    
    // --- FIX: Build the categoryMap from the complete flat list ---
    const categoryMap = useMemo(() => new Map(flatCategories.map(c => [c.id, c])), [flatCategories]);

    const sortedDownloads = useMemo(() => {
        return downloads.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [downloads]);

    const { totalDownloads, uniqueUsers, mostDownloadedPaper, downloadsLast7Days, mostPopularCategory } = useMemo(() => {
        if (downloads.length === 0 || papers.length === 0 || categories.length === 0) {
            return { totalDownloads: 0, uniqueUsers: 0, mostDownloadedPaper: 'N/A', downloadsLast7Days: 0, mostPopularCategory: 'N/A' };
        }

        const uniqueUserIds = new Set(downloads.map(d => d.userId));
        
        const paperDownloadCounts = downloads.reduce((acc, d) => {
            acc[d.paperId] = (acc[d.paperId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const mostDownloadedPaperId = Object.keys(paperDownloadCounts).length > 0 ? Object.keys(paperDownloadCounts).reduce((a, b) => paperDownloadCounts[a] > paperDownloadCounts[b] ? a : b) : '';
        const mostDownloadedPaperName = paperMap.get(mostDownloadedPaperId)?.title || 'N/A';

        const categoryDownloadCounts = downloads.reduce((acc, d) => {
            const paper = paperMap.get(d.paperId);
            if (paper?.categoryId) {
                acc[paper.categoryId] = (acc[paper.categoryId] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        const mostPopularCategoryId = Object.keys(categoryDownloadCounts).length > 0 ? Object.keys(categoryDownloadCounts).reduce((a, b) => categoryDownloadCounts[a] > categoryDownloadCounts[b] ? a : b) : '';

        // --- FIX: Use the full category tree to get the path for the stat card ---
        // This ensures a consistent look with the download cards themselves.
        const mostPopularCategoryName = mostPopularCategoryId 
            ? getCategoryPath(mostPopularCategoryId, categories).map(c => c.name).join(' / ') || 'N/A'
            : 'N/A';
            
        const sevenDaysAgo = subDays(new Date(), 7);
        const recentDownloads = downloads.filter(d => isAfter(new Date(d.createdAt), sevenDaysAgo)).length;

        return {
            totalDownloads: downloads.length,
            uniqueUsers: uniqueUserIds.size,
            mostDownloadedPaper: mostDownloadedPaperName,
            downloadsLast7Days: recentDownloads,
            mostPopularCategory: mostPopularCategoryName,
        };
    }, [downloads, papers, categories, paperMap]); // Add `categories` and `papers` to dependency array

    // --- (The rest of the component JSX remains the same) ---
    if (loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[calc(100vh-20rem)]">
                <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    <p className="text-muted-foreground">Loading download data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Downloads History</h1>
                <p className="text-lg text-muted-foreground">Monitor paper download activity across the platform</p>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <StatsCard title="Total Downloads" value={totalDownloads.toString()} icon={Download} description="All paper downloads" />
                <StatsCard title="Last 7 Days" value={downloadsLast7Days.toString()} icon={TrendingUp} description="Recent activity" />
                <StatsCard title="Unique Users" value={uniqueUsers.toString()} icon={User} description="Users who have downloaded" />
                <StatsCard title="Most Popular Paper" value={mostDownloadedPaper} icon={Star} description="By total downloads" />
                <StatsCard title="Popular Category" value={mostPopularCategory} icon={BookOpen} description={mostPopularCategory} />
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold">Recent Downloads</h2>
                    {downloads.length > 0 && <div className="text-sm text-muted-foreground">{downloads.length} download{downloads.length !== 1 ? 's' : ''} found</div>}
                </div>

                {downloads.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {sortedDownloads.map(download => (
                            <DownloadCard 
                                key={download.id} 
                                download={download} 
                                userMap={userMap}
                                paperMap={paperMap}
                                allCategories={categories}
                            />
                        ))}
                    </div>
                ) : (
                    <Card className="border-dashed border-2">
                        <CardContent className="flex flex-col items-center justify-center text-center py-16">
                            <div className="rounded-full bg-primary/10 p-6 mb-4"><Download className="h-12 w-12 text-primary" /></div>
                            <h3 className="text-xl font-semibold mb-2">No Downloads Yet</h3>
                            <p className="text-muted-foreground max-w-md mb-6">No paper downloads have been recorded yet. They will appear here once users start downloading papers.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}