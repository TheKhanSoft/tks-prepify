
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { FileText, Users, Folder, PlusCircle, ArrowUpRight, HelpCircle, Loader2, Library } from 'lucide-react';
import { users } from '@/lib/data';
import { fetchCategories, getCategoryPath, getFlattenedCategories } from '@/lib/category-service';
import { fetchPapers } from '@/lib/paper-service';
import { fetchAllQuestions } from '@/lib/question-service';
import type { Category, Paper, Question } from '@/types';
import Link from 'next/link';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function AdminDashboardPage() {
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allPapers, setAllPapers] = useState<Paper[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
        const [cats, papersData, questionsData] = await Promise.all([
            fetchCategories(),
            fetchPapers(),
            fetchAllQuestions()
        ]);
        setAllCategories(cats);
        setAllPapers(papersData);
        setAllQuestions(questionsData);
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
  const totalCategories = useMemo(() => getFlattenedCategories(allCategories).length, [allCategories]);
  const totalQuestions = allQuestions.length;
  const totalUsers = users.length;

  const papersPerCategory = useMemo(() => allCategories
    .filter(c => !c.parentId) // only top level
    .map(category => ({
      name: category.name,
      total: allPapers.filter(paper => paper.categoryId.startsWith(category.id)).length,
  })), [allCategories, allPapers]);

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
    <div className="space-y-6">
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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/papers">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Papers</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPapers}</div>
              <p className="text-xs text-muted-foreground">Published and unpublished papers</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/categories">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
              <Folder className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCategories}</div>
              <p className="text-xs text-muted-foreground">All paper categories</p>
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
              <p className="text-xs text-muted-foreground">Questions in the central bank</p>
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

       <div className="grid gap-6 md:grid-cols-2">
            <Card className="md:col-span-1">
                <CardHeader>
                    <CardTitle>Papers Overview</CardTitle>
                    <CardDescription>Number of papers per top-level category.</CardDescription>
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
            <div className="space-y-6 md:col-span-1">
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
                                  <TableHead>Title</TableHead>
                                  <TableHead className="text-right">Category</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {recentPapers.map((paper) => {
                                  const categoryPath = getCategoryPath(paper.categoryId, allCategories);
                                  const categoryName = categoryPath?.map(c => c.name).join(' / ') || 'N/A';
                                  return (
                                  <TableRow key={paper.id}>
                                      <TableCell>
                                          <div className="font-medium">{paper.title}</div>
                                          <div className="hidden text-sm text-muted-foreground md:inline">
                                              {paper.questionCount} questions
                                          </div>
                                      </TableCell>
                                      <TableCell className="text-right">
                                          <Badge variant="outline">{categoryName}</Badge>
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
    </div>
  );
}
