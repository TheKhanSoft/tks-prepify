
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { FileText, Users, PlusCircle, ArrowUpRight, Loader2, Library, Bell, ClipboardCheck, ShieldCheck, ShieldAlert, Coins, Info, Star, Mail } from 'lucide-react';
import { fetchCategories } from '@/lib/category-service';
import { getCategoryPath } from '@/lib/category-helpers';
import { fetchPapers } from '@/lib/paper-service';
import { fetchAllQuestions, fetchAllPaperQuestionLinks } from '@/lib/question-service';
import { fetchQuestionCategories } from '@/lib/question-category-service';
import { getDescendantQuestionCategoryIds as getDescendantQCategoryIds } from '@/lib/question-category-helpers';
import { fetchUserProfiles } from '@/lib/user-service';
import { fetchAllTestAttempts, fetchAllTestAttemptsForAdmin } from '@/lib/test-attempt-service';
import { fetchPlans } from '@/lib/plan-service';
import { fetchContactSubmissions } from '@/lib/contact-service';
import type { Category, Paper, Question, QuestionCategory, User, TestAttempt, Plan, ContactSubmission } from '@/types';
import Link from 'next/link';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { subDays, formatDistanceToNow, isAfter, isBefore, addDays, format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminDashboardPage() {
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allQuestionCategories, setAllQuestionCategories] = useState<QuestionCategory[]>([]);
  const [allPapers, setAllPapers] = useState<Paper[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<TestAttempt[]>([]);
  const [allTestAttempts, setAllTestAttempts] = useState<TestAttempt[]>([]);
  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [contactSubmissions, setContactSubmissions] = useState<ContactSubmission[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [expiringFilter, setExpiringFilter] = useState('7d');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
        const [cats, papersData, questionsData, questionCatsData, linksData, usersData, recentAttemptsData, allAttemptsData, plansData, submissionsData] = await Promise.all([
            fetchCategories(),
            fetchPapers(),
            fetchAllQuestions(),
            fetchQuestionCategories(),
            fetchAllPaperQuestionLinks(),
            fetchUserProfiles(),
            fetchAllTestAttempts(5),
            fetchAllTestAttemptsForAdmin(),
            fetchPlans(),
            fetchContactSubmissions(),
        ]);
        setAllCategories(cats);
        setAllPapers(papersData);
        setAllQuestions(questionsData);
        setAllQuestionCategories(questionCatsData);
        setAllUsers(usersData);
        setRecentAttempts(recentAttemptsData);
        setAllTestAttempts(allAttemptsData);
        setAllPlans(plansData);
        setContactSubmissions(submissionsData);

        const counts = linksData.reduce((acc, link) => {
            if (link.paperId) {
                acc[link.paperId] = (acc[link.paperId] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
        setQuestionCounts(counts);

    } catch(error) {
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const {
    totalUsers,
    newUsersThisWeek,
    totalPapers,
    unpublishedPapers,
    totalQuestions,
    totalQuestionCategories,
    papersNeedingQuestions,
    totalTestAttempts,
    passedCount,
    failedCount,
    totalPlans,
    publishedPlans,
    openTickets,
    priorityTickets,
  } = useMemo(() => {
    const oneWeekAgo = subDays(new Date(), 7);
    const newUsers = allUsers.filter(u => u.createdAt && new Date(u.createdAt) >= oneWeekAgo).length;

    let totalQCategories = 0;
    const countQCategories = (categories: QuestionCategory[]) => {
      for (const category of categories) {
          totalQCategories++;
          if (category.subcategories) {
              countQCategories(category.subcategories);
          }
      }
    };
    countQCategories(allQuestionCategories);
    
    return {
      totalUsers: allUsers.length,
      newUsersThisWeek: newUsers,
      totalPapers: allPapers.length,
      unpublishedPapers: allPapers.filter(p => !p.published).length,
      totalQuestions: allQuestions.length,
      totalQuestionCategories: totalQCategories,
      papersNeedingQuestions: allPapers.filter(p => (questionCounts[p.id] || 0) < p.questionCount).length,
      totalTestAttempts: allTestAttempts.length,
      passedCount: allTestAttempts.filter(a => a.status === 'completed' && a.passed).length,
      failedCount: allTestAttempts.filter(a => a.status === 'completed' && !a.passed).length,
      totalPlans: allPlans.length,
      publishedPlans: allPlans.filter(p => p.published).length,
      openTickets: contactSubmissions.filter(s => s.status === 'open').length,
      priorityTickets: contactSubmissions.filter(s => s.priority).length,
    };
  }, [allUsers, allPapers, allQuestions, allQuestionCategories, questionCounts, allTestAttempts, allPlans, contactSubmissions]);


  const papersPerCategory = useMemo(() => {
    if (allPapers.length === 0 || allCategories.length === 0) return [];
    
    const topLevelCategories = allCategories.filter(c => !c.parentId);

    const getDescendantCategoryIds = (startId: string, allCategories: Category[]): string[] => {
        const ids: string[] = [];
        const findCategoryById = (categories: Category[], id: string): Category | undefined => {
            for (const category of categories) {
                if (category.id === id) return category;
                if (category.subcategories) {
                    const found = findCategoryById(category.subcategories, id);
                    if (found) return found;
                }
            }
            return undefined;
        }

        const startCategory = findCategoryById(allCategories, startId);
        if (!startCategory) return [];

        const queue: Category[] = [startCategory];
        while (queue.length > 0) {
            const current = queue.shift()!;
            ids.push(current.id);
            if (current.subcategories) {
                queue.push(...current.subcategories);
            }
        }
        return ids;
    };

    return topLevelCategories.map(category => {
        const descendantIds = getDescendantCategoryIds(category.id, allCategories);
        const count = allPapers.filter(p => p.categoryId && descendantIds.includes(p.categoryId)).length;
        return {
            name: category.name,
            total: count,
        };
    }).filter(c => c.total > 0);
  }, [allCategories, allPapers]);
  
  const questionsPerCategory = useMemo(() => {
      if (allQuestions.length === 0 || allQuestionCategories.length === 0) return [];
      
      const topLevelCategories = allQuestionCategories.filter(c => !c.parentId);

      return topLevelCategories.map(category => {
          const descendantIds = getDescendantQCategoryIds(category.id, allQuestionCategories);
          const count = allQuestions.filter(q => q.questionCategoryId && descendantIds.includes(q.questionCategoryId)).length;
          return {
              name: category.name,
              total: count
          };
      }).filter(c => c.total > 0);
  }, [allQuestions, allQuestionCategories]);

  const recentPapers = useMemo(() => [...allPapers].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 5), [allPapers]);
  const recentUnreadMessages = useMemo(() => contactSubmissions.filter(s => !s.isRead).slice(0, 5), [contactSubmissions]);

  const userMap = useMemo(() => new Map(allUsers.map(u => [u.id, u])), [allUsers]);
  const plansMap = useMemo(() => new Map(allPlans.map(p => [p.id, p])), [allPlans]);

   const { activeSubscribers, expiringUsers } = useMemo(() => {
    const now = new Date();
    let endDate: Date;

    if (expiringFilter === '24h') {
        endDate = addDays(now, 1);
    } else if (expiringFilter === '3d') {
        endDate = addDays(now, 3);
    } else { // '7d'
        endDate = addDays(now, 7);
    }

    const active = allUsers.filter(u => {
        if (!u.planId) return false;
        if (!u.planExpiryDate) return true;
        return isAfter(new Date(u.planExpiryDate), now);
    });

    const expiring = active.filter(u => {
        if (!u.planExpiryDate) return false;
        const expiryDate = new Date(u.planExpiryDate);
        return isAfter(expiryDate, now) && isBefore(expiryDate, endDate);
    });
    
    expiring.sort((a,b) => new Date(a.planExpiryDate!).getTime() - new Date(b.planExpiryDate!).getTime());

    return { activeSubscribers: active, expiringUsers: expiring };
}, [allUsers, expiringFilter]);


  if (loading) {
      return (
          <div className="flex justify-center items-center h-full min-h-[calc(100vh-20rem)]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
      )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, Admin! Here's an overview of your platform.</p>
        </div>
        <div className="flex gap-2">
            <Button asChild>
              <Link href="/admin/papers/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Paper
              </Link>
            </Button>
             <Button asChild variant="outline">
              <Link href="/admin/question-categories/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Question Category
              </Link>
            </Button>
        </div>
      </div>
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/users">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {newUsersThisWeek > 0 ? `+${newUsersThisWeek} in the last 7 days` : 'No new users this week'}
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/papers">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Papers</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPapers}</div>
              <p className="text-xs text-muted-foreground">
                {unpublishedPapers > 0 ? `${unpublishedPapers} unpublished` : 'All papers are published'}
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/questions">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Question Bank</CardTitle>
              <Library className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalQuestions}</div>
              <p className="text-xs text-muted-foreground">in {totalQuestionCategories} categories</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/papers">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Action Required</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{papersNeedingQuestions}</div>
              <p className="text-xs text-muted-foreground">Papers needing questions</p>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/admin/messages">
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
                <Info className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{openTickets}</div>
                <p className="text-xs text-muted-foreground">Tickets needing a reply</p>
              </CardContent>
            </Card>
        </Link>
        <Link href="/admin/messages">
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Priority Tickets</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{priorityTickets}</div>
                <p className="text-xs text-muted-foreground">High-priority tickets</p>
              </CardContent>
            </Card>
        </Link>
        <Card className="hover:bg-muted/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Test Attempts</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTestAttempts}</div>
            <p className="text-xs text-muted-foreground">All attempts started by users</p>
          </CardContent>
        </Card>
        <Link href="/admin/plans">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pricing Plans</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPlans}</div>
              <p className="text-xs text-muted-foreground">{publishedPlans} plan(s) are published</p>
            </CardContent>
          </Card>
        </Link>
      </div>

       <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Papers Overview</CardTitle>
                    <CardDescription>Total papers per top-level category, including all sub-categories.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={papersPerCategory}>
                            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "hsl(var(--background))",
                                    borderColor: "hsl(var(--border))",
                                }}
                            />
                            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Questions Overview</CardTitle>
                    <CardDescription>Number of questions per top-level question category.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={questionsPerCategory}>
                            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "hsl(var(--background))",
                                    borderColor: "hsl(var(--border))",
                                }}
                            />
                            <Bar dataKey="total" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>

       <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader className="flex flex-row items-center">
                <div className="grid gap-2">
                        <CardTitle>Recent Unread Messages</CardTitle>
                        <CardDescription>The last 5 unread messages from users.</CardDescription>
                    </div>
                    <Button asChild size="sm" className="ml-auto gap-1">
                        <Link href="/admin/messages">View All <ArrowUpRight className="h-4 w-4" /></Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    {recentUnreadMessages.length > 0 ? (
                        <div className="space-y-4">
                            {recentUnreadMessages.map((message) => {
                                return (
                                    <Link key={message.id} href="/admin/messages" className="flex items-center gap-4 hover:bg-muted/50 p-2 rounded-md">
                                        <Avatar className="hidden h-9 w-9 sm:flex">
                                            <AvatarFallback>{message.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="grid gap-1">
                                            <p className="text-sm font-medium leading-none">{message.name}</p>
                                            <p className="text-sm text-muted-foreground truncate max-w-xs">{message.subject}</p>
                                        </div>
                                        <div className="ml-auto font-medium text-right">
                                            {message.priority && <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200"><Star className="mr-1 h-3 w-3 fill-current"/>Priority</Badge>}
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                                            </div>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-10">
                            <Mail className="mx-auto h-12 w-12 text-muted-foreground/50" />
                            <p className="mt-4">Inbox is all caught up!</p>
                        </div>
                    )}
                </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center">
                <div className="grid gap-2">
                  <CardTitle>Recent Test Activity</CardTitle>
                  <CardDescription>The latest tests completed by users.</CardDescription>
                </div>
                <Button asChild size="sm" className="ml-auto gap-1">
                  <Link href="/admin/users">
                    View All
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                 {recentAttempts.length > 0 ? (
                    <div className="space-y-4">
                        {recentAttempts.map((attempt) => {
                            const user = userMap.get(attempt.userId);
                            return (
                                <Link key={attempt.id} href={`/results/test/${attempt.id}`} className="flex items-center gap-4 hover:bg-muted/50 p-2 rounded-md">
                                    <Avatar className="hidden h-9 w-9 sm:flex">
                                        <AvatarImage src={user?.photoURL || undefined} data-ai-hint="user avatar" alt="Avatar" />
                                        <AvatarFallback>{user?.name?.charAt(0) || user?.email?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="grid gap-1">
                                        <p className="text-sm font-medium leading-none">{user?.name || 'Unknown User'}</p>
                                        <p className="text-sm text-muted-foreground">{attempt.testConfigName}</p>
                                    </div>
                                    <div className="ml-auto font-medium text-right">
                                        <div className={cn("font-bold", attempt.passed ? "text-green-600" : "text-destructive")}>
                                            {attempt.percentage.toFixed(1)}%
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {attempt.endTime ? formatDistanceToNow(new Date(attempt.endTime), { addSuffix: true }) : 'N/A'}
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                 ) : (
                    <div className="text-center text-muted-foreground py-10">
                         <ClipboardCheck className="mx-auto h-12 w-12 text-muted-foreground/50" />
                        <p className="mt-4">No test activity yet.</p>
                    </div>
                 )}
              </CardContent>
            </Card>
        </div>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                    <CardTitle>Active &amp; Expiring Subscriptions</CardTitle>
                    <CardDescription>
                        {activeSubscribers.length} total active subscribers.
                    </CardDescription>
                </div>
                <Select value={expiringFilter} onValueChange={setExpiringFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter expiring..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="24h">Expiring in 24h</SelectItem>
                        <SelectItem value="3d">Expiring in 3 days</SelectItem>
                        <SelectItem value="7d">Expiring in 1 week</SelectItem>
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent>
                {expiringUsers.length > 0 ? (
                    <div className="space-y-4">
                        {expiringUsers.map((user) => {
                            const plan = plansMap.get(user.planId);
                            return (
                                <Link key={user.id} href={`/admin/users/${user.id}/subscription`} className="flex items-center gap-4 hover:bg-muted/50 p-2 rounded-md transition-colors">
                                    <Avatar className="hidden h-9 w-9 sm:flex">
                                        <AvatarImage src={user?.photoURL || undefined} data-ai-hint="user avatar" alt="Avatar" />
                                        <AvatarFallback>{user?.name?.charAt(0) || user?.email?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="grid gap-1 flex-grow">
                                        <p className="text-sm font-medium leading-none">{user?.name || 'Unknown User'}</p>
                                        <p className="text-sm text-muted-foreground">{plan?.name || 'Unknown Plan'}</p>
                                    </div>
                                    <div className="ml-auto text-right">
                                        <div className="font-medium text-destructive">
                                            Expires in {formatDistanceToNow(new Date(user.planExpiryDate!), { addSuffix: false })}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {user.planExpiryDate ? format(new Date(user.planExpiryDate), "PPP") : 'N/A'}
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-10">
                        <p>No subscriptions are expiring within the selected timeframe.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
