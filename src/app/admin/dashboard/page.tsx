
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { FileText, Users, Folder, PlusCircle, ArrowUpRight, Loader2, Library, Tags } from 'lucide-react';
import { users } from '@/lib/data';
import { fetchCategories } from '@/lib/category-service';
import { getCategoryPath, getFlattenedCategories, getDescendantCategoryIds } from '@/lib/category-helpers';
import { fetchPapers } from '@/lib/paper-service';
import { fetchAllQuestions, fetchAllPaperQuestionLinks } from '@/lib/question-service';
import { fetchQuestionCategories } from '@/lib/question-category-service';
import { getDescendantQuestionCategoryIds as getDescendantQCategoryIds } from '@/lib/question-category-helpers';
import type { Category, Paper, Question, QuestionCategory } from '@/types';
import Link from 'next/link';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export default function AdminDashboardPage() {
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allQuestionCategories, setAllQuestionCategories] = useState<QuestionCategory[]>([]);
  const [allPapers, setAllPapers] = useState<Paper[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
        const [cats, papersData, questionsData, questionCatsData, linksData] = await Promise.all([
            fetchCategories(),
            fetchPapers(),
            fetchAllQuestions(),
            fetchQuestionCategories(),
            fetchAllPaperQuestionLinks()
        ]);
        setAllCategories(cats);
        setAllPapers(papersData);
        setAllQuestions(questionsData);
        setAllQuestionCategories(questionCatsData);

        const counts = linksData.reduce((acc, link) => {
            if (link.paperId) {
                acc[link.paperId] = (acc[link.paperId] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
        setQuestionCounts(counts);

    } catch(error) {
        console.error("Failed to load dashboard data:", error);
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalPapers = allPapers.length;
  const totalPaperCategories = useMemo(() => getFlattenedCategories(allCategories).length, [allCategories]);
  const totalQuestions = allQuestions.length;
  const totalQuestionCategories = useMemo(() => {
      let count = 0;
      const countCategories = (categories: QuestionCategory[]) => {
          for (const category of categories) {
              count++;
              if (category.subcategories) {
                  countCategories(category.subcategories);
              }
          }
      };
      countCategories(allQuestionCategories);
      return count;
  }, [allQuestionCategories]);

  const totalUsers = users.length;

  const papersPerCategory = useMemo(() => {
    if (allPapers.length === 0 || allCategories.length === 0) return [];
    
    const topLevelCategories = allCategories.filter(c => !c.parentId);

    return topLevelCategories.map(category => {
        const descendantIds = getDescendantCategoryIds(category.id, allCategories);
        const count = allPapers.filter(p => descendantIds.includes(p.categoryId)).length;
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
  const recentUsers = users.slice(-5).reverse();
  
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
            <p className="text-muted-foreground">Welcome back, Admin!</p>
        </div>
        <div className="flex gap-2">
            <Button asChild>
              <Link href="/admin/papers/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Paper
              </Link>
            </Button>
             <Button asChild variant="outline">
              <Link href="/admin/categories/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Category
              </Link>
            </Button>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <Link href="/admin/papers">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Papers</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPapers}</div>
              <p className="text-xs text-muted-foreground">Published and unpublished</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/categories">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paper Categories</CardTitle>
              <Folder className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPaperCategories}</div>
              <p className="text-xs text-muted-foreground">For organizing papers</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/questions">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
              <Library className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalQuestions}</div>
              <p className="text-xs text-muted-foreground">In the central question bank</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/question-categories">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Question Categories</CardTitle>
              <Tags className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalQuestionCategories}</div>
              <p className="text-xs text-muted-foreground">For organizing questions</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/users">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-xs text-muted-foreground">Registered users (mock data)</p>
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
                        <CardTitle>Recent Papers</CardTitle>
                        <CardDescription>The last 5 papers added to the system.</CardDescription>
                    </div>
                    <Button asChild size="sm" className="ml-auto gap-1">
                        <Link href="/admin/papers">View All <ArrowUpRight className="h-4 w-4" /></Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50%]">Title</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Questions</TableHead>
                                <TableHead className="text-right">Duration</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentPapers.map((paper) => {
                                const addedQuestions = questionCounts[paper.id] || 0;
                                const categoryPath = getCategoryPath(paper.categoryId, allCategories);
                                const categoryName = categoryPath?.map(c => c.name).join(' / ') || 'N/A';
                                return (
                                <TableRow key={paper.id}>
                                    <TableCell>
                                        <Link href={`/admin/papers/${paper.id}/edit`} className="font-medium hover:underline">{paper.title}</Link>
                                        <div className="hidden text-sm text-muted-foreground md:inline">
                                            {categoryName}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={paper.published ? "default" : "secondary"} className={cn(paper.published && "bg-green-600 hover:bg-green-700")}>
                                            {paper.published ? 'Published' : 'Draft'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {addedQuestions} / {paper.questionCount}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {paper.duration} min
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center">
                <div className="grid gap-2">
                  <CardTitle>Recent Users</CardTitle>
                  <CardDescription>The newest users who have signed up.</CardDescription>
                </div>
                <Button asChild size="sm" className="ml-auto gap-1">
                  <Link href="/admin/users">
                    View All
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center gap-4">
                      <Avatar className="hidden h-9 w-9 sm:flex">
                        <AvatarImage src={`https://placehold.co/40x40.png?text=${user.name.charAt(0)}`} data-ai-hint="letter avatar" alt="Avatar" />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="grid gap-1">
                        <p className="text-sm font-medium leading-none">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="ml-auto font-medium text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
        </div>
    </div>
  );
}
