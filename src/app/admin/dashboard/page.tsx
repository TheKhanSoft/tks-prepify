"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  PlusCircle,
  ArrowUpRight,
  Loader2,
  Library,
  Bell,
  ClipboardCheck,
  ShieldCheck,
  Coins,
  Star,
  Mail,
  Database,
  MessageCircle,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  FileText,
  CheckCircle,
  XCircle,
  Folder,
  RefreshCw,
  UserCheck,
  AlertOctagon,
  Clock,
  BookOpenCheck,
} from "lucide-react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
  Legend,
  Line,
} from "recharts";
import Link from "next/link";
import { useState, useEffect, useMemo, useCallback } from "react";
import type {
  Category,
  Paper,
  Question,
  QuestionCategory,
  User,
  TestAttempt,
  Plan,
  ContactSubmission,
  Bookmark,
  Download,
} from "@/types";
import { cn } from "@/lib/utils";
import {
  subDays,
  formatDistanceToNow,
  isAfter,
  isBefore,
  addDays,
  format,
  startOfDay,
  formatDistance,
} from "date-fns";

// Data fetching imports (no changes)
import { fetchCategories } from "@/lib/category-service";
import { fetchPapers } from "@/lib/paper-service";
import { fetchAllQuestions } from "@/lib/question-service";
import { fetchQuestionCategories } from "@/lib/question-category-service";
import { getDescendantQuestionCategoryIds as getDescendantQCategoryIds } from "@/lib/question-category-helpers";
import { fetchUserProfiles } from "@/lib/user-service";
import {
  fetchAllTestAttempts,
  fetchAllTestAttemptsForAdmin,
} from "@/lib/test-attempt-service";
import { fetchPlans } from "@/lib/plan-service";
import { fetchContactSubmissions } from "@/lib/contact-service";
import { fetchAllDownloads } from "@/lib/download-service";

// --- Reusable UI Elements (for internal use) ---
const StatCard = ({ title, value, icon: Icon, href, colorClass, children }) => (
  <Link href={href} className="group">
    <Card
      className={cn(
        "overflow-hidden transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1",
        colorClass
      )} >
      
      <CardContent className="p-4 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-white/90">{title}</p>
          <div className="text-3xl font-bold text-white/90">{value}</div>
          <Badge variant="secondary" className="bg-white/20 text-white border-none text-xs">
              {children}
          </Badge>
        </div>
        <Icon className="h-12 w-12 text-white/20" />
      </CardContent>
    </Card>
  </Link>
);

const PriorityAction = ({
  icon: Icon,
  title,
  description,
  href,
  colorClass,
}) => (
  <Link
    href={href}
    className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/10 transition-colors"
  >
    <div className={cn("p-2.5 rounded-full", colorClass)}>
      <Icon className="h-5 w-5 text-white" />
    </div>
    <div>
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-gray-300">{description}</p>
    </div>
    <ArrowUpRight className="ml-auto h-5 w-5 text-gray-400" />
  </Link>
);

// --- Main Dashboard Page Component ---
export default function AdminDashboardPage() {
  // --- STATE AND DATA FETCHING ---
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allPapers, setAllPapers] = useState<Paper[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<TestAttempt[]>([]);
  const [allTestAttempts, setAllTestAttempts] = useState<TestAttempt[]>([]);
  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [contactSubmissions, setContactSubmissions] = useState<
    ContactSubmission[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [expiringFilter, setExpiringFilter] = useState("7d");

  const [allDownloads, setTotalDownloadsCount] = useState<Download[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        cats,
        papersData,
        questionsData,
        usersData,
        recentAttemptsData,
        allAttemptsData,
        plansData,
        submissionsData,
        totalDownloads,
      ] = await Promise.all([
        fetchCategories(),
        fetchPapers(),
        fetchAllQuestions(),
        fetchUserProfiles(),
        fetchAllTestAttempts(5),
        fetchAllTestAttemptsForAdmin(),
        fetchPlans(),
        fetchContactSubmissions(),
        fetchAllDownloads(),
      ]);
      setAllCategories(cats);
      setAllPapers(papersData);
      setAllQuestions(questionsData);
      setAllUsers(usersData);
      setRecentAttempts(recentAttemptsData);
      setAllTestAttempts(allAttemptsData);
      setAllPlans(plansData);
      setContactSubmissions(submissionsData);
      setLastUpdated(new Date());
      setTotalDownloadsCount(totalDownloads);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- DERIVED DATA & MEMOS ---
  const {
    totalUsers,
    newUsersThisWeek,
    newUserGrowth,
    totalPapers,
    totalQuestions,
    passedCount,
    failedCount,
    averageScore,
    successRate,
    openTickets,
    completedAttemptsCount,
    priorityOpenTickets,
    unreadMessages,
    totalDownloadsCount, 
    newDownloadThisWeek,
    newDownloadsGrowth,
  } = useMemo(() => {
    const oneWeekAgo = subDays(new Date(), 7);
    const twoWeeksAgo = subDays(new Date(), 14);
    const newThisWeek = allUsers.filter(
      (u) => u.createdAt && isAfter(new Date(u.createdAt), oneWeekAgo)
    ).length;
    const newLastWeek = allUsers.filter(
      (u) =>
        u.createdAt &&
        isAfter(new Date(u.createdAt), twoWeeksAgo) &&
        isBefore(new Date(u.createdAt), oneWeekAgo)
    ).length;
    const growth =
      newLastWeek > 0
        ? ((newThisWeek - newLastWeek) / newLastWeek) * 100
        : newThisWeek > 0
        ? 100
        : 0;

    const completedAttempts = allTestAttempts.filter(
      (a) => a.status === "completed"
    );
    const passed = completedAttempts.filter((a) => a.passed).length;
    const avgScore =
      completedAttempts.length > 0
        ? completedAttempts.reduce(
            (acc, attempt) => acc + attempt.percentage,
            0
          ) / completedAttempts.length
        : 0;
    const rate =
      completedAttempts.length > 0
        ? (passed / completedAttempts.length) * 100
        : 0;

      const newDownThisWeek = allDownloads.filter(
          (u) => u.createdAt && isAfter(new Date(u.createdAt), oneWeekAgo)
        ).length;
        const newDownloadLastWeek = allDownloads.filter(
          (u) =>
            u.createdAt &&
            isAfter(new Date(u.createdAt), twoWeeksAgo) &&
            isBefore(new Date(u.createdAt), oneWeekAgo)
        ).length;

    const downloadsGrowth =
      newDownloadLastWeek > 0
        ? ((newDownThisWeek - newDownloadLastWeek) / newDownloadLastWeek) * 100
        : newDownThisWeek > 0
        ? 100
        : 0;

    return {
      totalUsers: allUsers.length,
      newUsersThisWeek: newThisWeek,
      newUserGrowth: growth,
      totalPapers: allPapers.length,
      totalQuestions: allQuestions.length,
      completedAttemptsCount: completedAttempts.length,
      passedCount: passed,
      failedCount: completedAttempts.length - passed,
      averageScore: avgScore,
      successRate: rate,
      openTickets: contactSubmissions.filter((s) => s.status === "open").length,
      priorityOpenTickets: contactSubmissions.filter(
        (s) => s.status === "open" && s.priority
      ).length,
      unreadMessages: contactSubmissions.filter((s) => !s.isRead).length,
      totalDownloadsCount: allDownloads.length,
      newDownloadsGrowth: downloadsGrowth,
      newDownloadThisWeek: newDownThisWeek
    };
  }, [allUsers, allPapers, allQuestions, allTestAttempts, contactSubmissions]);

  const papersPerCategory = useMemo(() => {
    if (allPapers.length === 0 || allCategories.length === 0) return [];
    const topLevelCategories = allCategories.filter((c) => !c.parentId);
    const getDescendantIds = (
      startId: string,
      allCats: Category[]
    ): string[] => {
      const children = allCats
        .filter((c) => c.parentId === startId)
        .map((c) => c.id);
      return [
        startId,
        ...children.flatMap((childId) => getDescendantIds(childId, allCats)),
      ];
    };
    return topLevelCategories
      .map((category) => ({
        name: category.name,
        value: allPapers.filter(
          (p) =>
            p.categoryId &&
            getDescendantIds(category.id, allCategories).includes(p.categoryId)
        ).length,
      }))
      .filter((c) => c.value > 0);
  }, [allCategories, allPapers]);

  const userMap = useMemo(
    () => new Map(allUsers.map((u) => [u.id, u])),
    [allUsers]
  );
  const plansMap = useMemo(
    () => new Map(allPlans.map((p) => [p.id, p])),
    [allPlans]
  );

  const { activeSubscribers, expiringUsers } = useMemo(() => {
    const now = new Date();
    const sevenDaysFromNow = addDays(now, 7);
    const active = allUsers.filter(
      (u) =>
        u.planId &&
        (!u.planExpiryDate || isAfter(new Date(u.planExpiryDate), now))
    );
    const expiring = active.filter(
      (u) =>
        u.planExpiryDate &&
        isAfter(new Date(u.planExpiryDate), now) &&
        isBefore(new Date(u.planExpiryDate), sevenDaysFromNow)
    );
    expiring.sort(
      (a, b) =>
        new Date(a.planExpiryDate!).getTime() -
        new Date(b.planExpiryDate!).getTime()
    );
    return { activeSubscribers: active, expiringUsers: expiring };
  }, [allUsers]);

  const planDistribution = useMemo(() => {
    const counts = activeSubscribers.reduce((acc, user) => {
      const planName = plansMap.get(user.planId)?.name || "Unknown Plan";
      acc[planName] = (acc[planName] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [activeSubscribers, plansMap]);

  const weeklyStats = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => ({
      day: format(subDays(new Date(), 6 - i), "E"),
      users: 0,
      tests: 0,
      papers: 0,
    }));
    const dayMap = new Map(
      last7Days.map((d, i) => [
        format(subDays(new Date(), 6 - i), "yyyy-MM-dd"),
        i,
      ])
    );
    allUsers.forEach((u) => {
      if (u.createdAt) {
        const dayKey = format(new Date(u.createdAt), "yyyy-MM-dd");
        if (dayMap.has(dayKey)) last7Days[dayMap.get(dayKey)!].users++;
      }
    });
    allTestAttempts.forEach((a) => {
      if (a.startTime) {
        const dayKey = format(new Date(a.startTime), "yyyy-MM-dd");
        if (dayMap.has(dayKey)) last7Days[dayMap.get(dayKey)!].tests++;
      }
    });
    // Assuming papers have a createdAt field
    allPapers.forEach((p) => {
      if ((p as any).createdAt) {
        const dayKey = format(new Date((p as any).createdAt), "yyyy-MM-dd");
        if (dayMap.has(dayKey)) last7Days[dayMap.get(dayKey)!].papers++;
      }
    });
    return last7Days;
  }, [allUsers, allTestAttempts, allPapers]);

  // --- RENDER LOGIC ---

  // if (loading && !lastUpdated) {
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-full min-h-[calc(100vh-10rem)] bg-slate-50">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <h2 className="mt-6 text-xl font-semibold text-slate-700">
          Assembling Your Dashboard
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Just a moment, crunching the latest numbers...
        </p>
      </div>
    );
  }

  const PIE_COLORS = ["#0ea5e9", "#10b981", "#f97316", "#8b5cf6", "#ec4899"];

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-screen-2xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <span>Welcome back, Admin.</span>
              {lastUpdated && (
                <span className="text-xs flex items-center">
                  Last updated:{" "}
                  {formatDistanceToNow(lastUpdated, { addSuffix: true })}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={loadData}
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />{" "}
              Refresh
            </Button>
            <Button
              asChild
              className="bg-primary hover:bg-primary/90 shadow-sm"
            >
              <Link href="/admin/papers/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Paper
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/messages">
                <Bell className="mr-2 h-4 w-4" />
                Notifications{" "}
                {unreadMessages > 0 && (
                  <Badge className="ml-2" variant="destructive">
                    {unreadMessages > 0 && unreadMessages}
                  </Badge>
                )}
              </Link>
            </Button>
          </div>
        </header>

        {/* Main Content Grid */}
        <main className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left/Main Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Hero Stats */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 lg:grid-cols-2 gap-4">
                <StatCard
                  title="Total Users"
                  value={totalUsers.toLocaleString()}
                  icon={Users}
                  colorClass="bg-gradient-to-br from-indigo-600 to-blue-500"
                  href="/admin/users"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex items-center font-semibold",
                        newUserGrowth >= 0 ? "text-green-800" : "text-red-600"
                      )}
                    >
                      <TrendingUp
                        className={cn(
                          "h-4 w-4",
                          newUserGrowth < 0 && "rotate-180"
                        )}
                      />
                      {newUserGrowth.toFixed(1)}%
                    </span>
                    <span>vs. previous 7 days ({newUsersThisWeek} new)</span>
                  </div>
                </StatCard>

                <StatCard
                  title="Test Attempts"
                  // value={`${successRate.toFixed(1)}%`}
                  // value={completedAttemptsCount + " (" +`${successRate.toFixed(1)}%`+ ")"}
                  value={completedAttemptsCount}
                  icon={BookOpenCheck}
                  colorClass="bg-gradient-to-br from-emerald-600 to-green-500"
                  href="/admin/results"
                >
                  <div className="grid grid-cols-2 gap-6">
                    <span>
                      {passedCount} passed | {failedCount} failed
                    </span>
                    <span className="font-semibold">
                      Avg. Score: {averageScore.toFixed(1)}%
                    </span>
                  </div>
                </StatCard>

                <StatCard
                  title="Dowanloads"
                  value={totalDownloadsCount.toLocaleString()}
                  icon={Users}
                  colorClass="bg-gradient-to-br from-amber-600 to-yellow-500"
                  href="/admin/downloads"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex items-center font-semibold",
                        newDownloadsGrowth >= 0 ? "text-green-700" : "text-red-600"
                      )}
                    >
                      <TrendingUp
                        className={cn(
                          "h-4 w-4",
                          newDownloadsGrowth < 0 && "rotate-180"
                        )}
                      />
                      {newDownloadsGrowth.toFixed(1)}%
                    </span>
                    <span>vs. previous 7 days ({newDownloadThisWeek} new)</span>
                  </div>
                </StatCard>
                <StatCard
                  title="Test Success Rate"
                  value={`${successRate.toFixed(1)}%`}
                  icon={ShieldCheck}
                  colorClass="bg-gradient-to-br from-pink-500 to-rose-500"
                  href="/admin/tests"
                >
                  <div className="flex items-center justify-between">
                    <span>
                      {passedCount} passed / {failedCount} failed
                    </span>
                    <span className="font-semibold">
                      Avg. Score: {averageScore.toFixed(1)}%
                    </span>
                  </div>
                </StatCard>
              </div>
            </div>

            {/* Weekly plateform activity */}
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>Weekly Platform Activity</CardTitle>
                <CardDescription>
                  A comparative look at key metrics over the last 7 days.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={weeklyStats}>
                    <XAxis
                      dataKey="day"
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.5rem",
                      }}
                    />
                    <Legend iconType="circle" iconSize={8} />
                    <Line
                      type="monotone"
                      dataKey="users"
                      stroke="#4f46e5"
                      strokeWidth={2}
                      name="New Users"
                    />
                    <Line
                      type="monotone"
                      dataKey="tests"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Tests Taken"
                    />
                    <Line
                      type="monotone"
                      dataKey="papers"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      name="Papers Added"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Recent Test Activity Section */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Recent Test Activity</span>
                  <Link
                    href="/admin/results"
                    className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                  >
                    View All <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </CardTitle>
                <CardDescription>
                  The last 5 tests completed by users across the platform.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentAttempts.length > 0 ? (
                  <div className="space-y-3">
                    {recentAttempts.map((attempt) => {
                      const user = userMap.get(attempt.userId);
                      const duration =
                        attempt.endTime && attempt.startTime
                          ? formatDistance(
                              new Date(attempt.endTime),
                              new Date(attempt.startTime)
                            )
                          : "N/A";
                      return (
                        <Link
                          key={attempt.id}
                          href={`/results/test/${attempt.id}`}
                          className="grid grid-cols-[auto,1fr,auto] items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <Avatar className="h-10 w-10 border">
                            <AvatarImage src={user?.photoURL || ""} />
                            <AvatarFallback>
                              {user?.name?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-semibold text-sm">
                              {user?.name || "Unknown User"}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {attempt.testConfigName}
                            </p>
                          </div>
                          <div className="text-right" right>
                            <div
                              className={cn(
                                "font-bold text-lg flex items-center gap-1.5",
                                attempt.passed
                                  ? "text-green-600"
                                  : "text-red-600"
                              )}
                            >
                              {attempt.passed ? (
                                <CheckCircle className="h-5 w-5" />
                              ) : (
                                <XCircle className="h-5 w-5" />
                              )}
                              {attempt.percentage.toFixed(1)}%
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 flex items-center justify-end gap-1">
                              <Clock className="h-3 w-3" /> {duration}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-10 flex flex-col items-center gap-4">
                    <ClipboardCheck className="h-12 w-12 text-muted-foreground/30" />
                    <p>No test activity has been recorded yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-sm bg-gray-800 text-white">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertOctagon /> Priority Actions
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Address these items to keep the platform healthy.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {priorityOpenTickets > 0 && (
                  <PriorityAction
                    icon={Mail}
                    title="Review Priority Messages"
                    description={`${priorityOpenTickets} ticket(s) waiting`}
                    href="/admin/messages"
                    colorClass="bg-red-500"
                  />
                )}
                {expiringUsers.length > 0 && (
                  <PriorityAction
                    icon={Users}
                    title="Manage Expiring Subscriptions"
                    description={`${expiringUsers.length} user(s) expiring soon`}
                    href="/admin/users"
                    colorClass="bg-orange-500"
                  />
                )}
                {priorityOpenTickets === 0 && expiringUsers.length === 0 && (
                  <div className="flex items-center gap-4 p-3 text-center text-gray-300">
                    <CheckCircle className="h-6 w-6 text-emerald-400" />
                    <p>No high-priority items. Great job!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Content Repository</CardTitle>
                <CardDescription>
                  An overview of all platform content.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-sky-500" />
                    <span className="font-medium">Papers</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-lg">{totalPapers}</span>
                    <Link
                      href="/admin/papers"
                      className="text-primary text-sm hover:underline"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-emerald-500" />
                    <span className="font-medium">Questions</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-lg">{totalQuestions}</span>
                    <Link
                      href="/admin/questions"
                      className="text-primary text-sm hover:underline"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Folder className="h-5 w-5 text-violet-500" />
                    <span className="font-medium">Categories</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-lg">
                      {allCategories.length}
                    </span>
                    <Link
                      href="/admin/categories"
                      className="text-primary text-sm hover:underline"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle>Expiring Subscriptions</CardTitle>
                  <CardDescription>
                    Users needing attention soon.
                  </CardDescription>
                </div>
                <Select
                  value={expiringFilter}
                  onValueChange={setExpiringFilter}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">In 24h</SelectItem>
                    <SelectItem value="3d">In 3 days</SelectItem>
                    <SelectItem value="7d">In 1 week</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                {expiringUsers.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                    {expiringUsers.map((user) => {
                      const plan = plansMap.get(user.planId);
                      const expiryDate = new Date(user.planExpiryDate!);
                      const daysLeft = Math.ceil(
                        (expiryDate.getTime() - new Date().getTime()) /
                          (1000 * 3600 * 24)
                      );
                      const urgencyColor =
                        daysLeft <= 1
                          ? "bg-red-500"
                          : daysLeft <= 3
                          ? "bg-orange-500"
                          : "bg-yellow-400";
                      return (
                        <Link
                          key={user.id}
                          href={`/admin/users/${user.id}/subscription`}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                        >
                          <div className="relative">
                            <Avatar className="h-9 w-9 border">
                              <AvatarImage src={user?.photoURL || ""} />
                              <AvatarFallback>
                                {user?.name?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <span
                              className={cn(
                                "absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-background",
                                urgencyColor
                              )}
                            />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium leading-tight">
                              {user.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">
                              {formatDistanceToNow(expiryDate, {
                                addSuffix: true,
                              })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(expiryDate, "MMM d")}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-10 flex flex-col items-center gap-4">
                    <UserCheck className="h-12 w-12 text-muted-foreground/30" />
                    <p>No subscriptions are expiring soon.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
