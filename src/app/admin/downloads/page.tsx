
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2, Download, User, FileText, Star, TrendingUp } from "lucide-react";
import type { Download as DownloadType, User as UserType, Paper } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { fetchAllDownloads } from "@/lib/download-service";
import { fetchUserProfiles } from "@/lib/user-service";
import { fetchPapers } from "@/lib/paper-service";
import { format, subDays, isAfter } from "date-fns";
import Link from 'next/link';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

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
            <div className="text-2xl font-bold text-foreground">{value}</div>
            {description && (
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
        </CardContent>
    </Card>
);


export default function AdminDownloadsPage() {
    const { toast } = useToast();
    const [downloads, setDownloads] = useState<DownloadType[]>([]);
    const [users, setUsers] = useState<UserType[]>([]);
    const [papers, setPapers] = useState<Paper[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [downloadsData, usersData, papersData] = await Promise.all([
                fetchAllDownloads(),
                fetchUserProfiles(),
                fetchPapers(),
            ]);
            setDownloads(downloadsData);
            setUsers(usersData);
            setPapers(papersData);
        } catch (error) {
            toast({
                title: "Error",
                description: "Could not load download data.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);
    
    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
    const paperMap = useMemo(() => new Map(papers.map(p => [p.id, p])), [papers]);
    
    const augmentedDownloads = useMemo(() => {
        return downloads
            .map(download => ({
                ...download,
                user: userMap.get(download.userId),
                paper: paperMap.get(download.paperId),
            }))
            .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [downloads, userMap, paperMap]);

    const { totalDownloads, uniqueUsers, mostDownloadedPaper, downloadsLast7Days } = useMemo(() => {
        if (downloads.length === 0) {
            return { totalDownloads: 0, uniqueUsers: 0, mostDownloadedPaper: 'N/A', downloadsLast7Days: 0 };
        }
        const uniqueUserIds = new Set(downloads.map(d => d.userId));
        
        const paperDownloadCounts = downloads.reduce((acc, d) => {
            acc[d.paperId] = (acc[d.paperId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const mostDownloadedPaperId = Object.keys(paperDownloadCounts).length > 0
            ? Object.keys(paperDownloadCounts).reduce((a, b) => paperDownloadCounts[a] > paperDownloadCounts[b] ? a : b)
            : '';
        const mostDownloadedPaperName = paperMap.get(mostDownloadedPaperId)?.title || 'N/A';

        const sevenDaysAgo = subDays(new Date(), 7);
        const recentDownloads = downloads.filter(d => isAfter(new Date(d.createdAt), sevenDaysAgo)).length;

        return {
            totalDownloads: downloads.length,
            uniqueUsers: uniqueUserIds.size,
            mostDownloadedPaper: mostDownloadedPaperName,
            downloadsLast7Days: recentDownloads,
        };
    }, [downloads, paperMap]);

    if (loading) {
        return <div className="flex justify-center items-center h-full min-h-[calc(100vh-20rem)]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Downloads Dashboard</h1>
                <p className="text-lg text-muted-foreground">
                    Monitor paper download activity across the platform.
                </p>
            </div>
            
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Downloads"
                    value={totalDownloads.toString()}
                    icon={Download}
                />
                <StatsCard
                    title="Unique Users"
                    value={uniqueUsers.toString()}
                    icon={User}
                    description="Users who have downloaded at least once."
                />
                <StatsCard
                    title="Most Popular Paper"
                    value={mostDownloadedPaper}
                    icon={Star}
                    description="By total downloads."
                />
                <StatsCard
                    title="Downloads (Last 7 Days)"
                    value={downloadsLast7Days.toString()}
                    icon={TrendingUp}
                />
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Download History</CardTitle>
                    <CardDescription>A complete log of all paper downloads.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Paper</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {augmentedDownloads.length > 0 ? (
                                augmentedDownloads.map(d => (
                                    <TableRow key={d.id}>
                                        <TableCell>
                                            {d.paper ? (
                                                <Link href={`/admin/papers/${d.paper.id}/edit`} className="font-medium hover:underline">
                                                    {d.paper.title}
                                                </Link>
                                            ) : (
                                                <span className="text-muted-foreground">Paper not found</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                             {d.user ? (
                                                <Link href={`/admin/users/${d.user.id}/subscription`} className="flex items-center gap-3 group">
                                                    <Avatar className="h-9 w-9">
                                                        <AvatarImage src={d.user.photoURL || undefined} alt={d.user.name || "User"} />
                                                        <AvatarFallback>{d.user.name?.charAt(0) || d.user.email?.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="font-medium group-hover:underline">{d.user.name || "N/A"}</div>
                                                        <div className="text-sm text-muted-foreground">{d.user.email}</div>
                                                    </div>
                                                </Link>
                                            ) : (
                                                <span className="text-muted-foreground">User not found</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(d.createdAt), "PPP p")}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                        No downloads have been recorded yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
