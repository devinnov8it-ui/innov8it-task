import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  CirclePlus,
  Clock3,
  Flame,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  Target,
  Users,
} from "lucide-react";
import { requireUser } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deadlineStyles, getDeadlineState } from "@/lib/deadline";
import { formatPhilippineDate } from "@/lib/time";

type DashboardTask = {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  due_date: string | null;
};

type DashboardActivity = {
  id: string;
  action: string;
  created_at: string;
  user: { name: string | null; email: string } | null;
  task: { id: string; title: string } | null;
};

type DashboardActivityRow = {
  id: string;
  action: string;
  created_at: string;
  user: { name: string | null; email: string }[];
  task: { id: string; title: string }[];
};

const statusLabels = { TODO: "To do", IN_PROGRESS: "In progress", REVIEW: "Review", DONE: "Done" } as const;
const priorityStyles = { LOW: "text-muted-foreground", MEDIUM: "text-primary", HIGH: "text-brand-gold", CRITICAL: "text-destructive" } as const;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return formatPhilippineDate(date);
}

function actorName(user: DashboardActivity["user"]) {
  return user?.name?.trim() || user?.email?.split("@")[0] || "Team member";
}

export async function DashboardOverview({ error, preview = false }: { error?: string; preview?: boolean }) {
  if (preview) {
    return (
      <div className="space-y-8">
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your workspace</p><h1 className="text-3xl font-semibold tracking-tight">A little clarity. A lot of possibility.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">A connected command center for projects, tasks, deadlines, and team momentum.</p></div>
        <Card className="overflow-hidden p-0"><CardContent className="grid gap-8 p-6 sm:p-8 md:grid-cols-[1fr_auto] md:items-center"><div><span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"><span className="size-1.5 rounded-full bg-current" />Layout preview</span><h2 className="mt-5 text-2xl font-semibold tracking-tight">Your work, at a glance.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">The dashboard brings active work, deadlines, and recent team movement into one focused view.</p></div><div aria-hidden="true" className="hidden size-28 items-center justify-center rounded-3xl border border-primary/10 bg-primary/5 md:flex"><LayoutDashboard className="size-12 text-primary" strokeWidth={1.25} /></div></CardContent></Card>
      </div>
    );
  }

  const user = await requireUser();
  const supabase = await createClient({ readOnly: true });
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);
  const weekStart = new Date(todayStart);
  weekStart.setUTCDate(weekStart.getUTCDate() - ((todayStart.getUTCDay() + 6) % 7));
  const iso = (date: Date) => date.toISOString();

  const [
    { count: dueTodayCount }, { count: overdueCount }, { count: completedWeekCount },
    { count: activeTaskCount }, { count: projectCount }, { data: myTaskRows },
    { data: upcomingRows }, { data: activityRows },
  ] = await Promise.all([
    supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "DONE").gte("due_date", iso(todayStart)).lt("due_date", iso(tomorrowStart)),
    supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "DONE").lt("due_date", iso(todayStart)),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "DONE").gte("updated_at", iso(weekStart)),
    supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "DONE"),
    supabase.from("projects").select("id", { count: "exact", head: true }).neq("status", "ARCHIVED"),
    supabase.from("tasks").select("id, title, status, priority, due_date, task_assignees!inner(user_id)").eq("task_assignees.user_id", user.id).neq("status", "DONE").order("due_date", { ascending: true, nullsFirst: false }).limit(6),
    supabase.from("tasks").select("id, title, status, priority, due_date").neq("status", "DONE").not("due_date", "is", null).order("due_date", { ascending: true }).limit(5),
    supabase.from("activity_logs").select("id, action, created_at, user:users(name, email), task:tasks(id, title)").order("created_at", { ascending: false }).limit(5),
  ]);

  const myTasks = (myTaskRows ?? []) as DashboardTask[];
  const upcoming = (upcomingRows ?? []) as DashboardTask[];
  const activity = ((activityRows ?? []) as DashboardActivityRow[]).map((entry) => ({
    id: entry.id,
    action: entry.action,
    created_at: entry.created_at,
    user: entry.user?.[0] ?? null,
    task: entry.task?.[0] ?? null,
  }));
  const activeTasks = activeTaskCount ?? 0;
  const completedThisWeek = completedWeekCount ?? 0;
  const workloadPercent = activeTasks ? Math.min(100, Math.round((myTasks.length / activeTasks) * 100)) : 0;
  const displayName = user.user_metadata?.name?.split(" ")[0] || user.email?.split("@")[0] || "there";
  const metrics = [
    { label: "Due today", value: dueTodayCount ?? 0, detail: "Open tasks needing action", icon: CalendarClock, href: "/dashboard/calendar", tone: "text-primary" },
    { label: "Overdue", value: overdueCount ?? 0, detail: "Open tasks past their date", icon: Flame, href: "/dashboard/tasks", tone: "text-destructive" },
    { label: "Completed this week", value: completedThisWeek, detail: "Tasks moved to done", icon: CheckCircle2, href: "/dashboard/analytics", tone: "text-brand-teal" },
    { label: "Active tasks", value: activeTasks, detail: `${projectCount ?? 0} active projects`, icon: ListTodo, href: "/dashboard/tasks", tone: "text-brand-gold" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Command center</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Welcome back, {displayName}.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Here is what needs your attention today, what is moving, and where your team is gaining momentum.</p></div><Link href="/dashboard/tasks" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/15 transition hover:-translate-y-0.5 hover:opacity-90"><CirclePlus className="size-4" aria-hidden="true" />Quick create task</Link></div>
      {error === "signout" && <p role="alert" className="rounded-lg border border-destructive/30 bg-card p-4 text-sm text-destructive">We couldn’t sign you out. Open your account menu to try again.</p>}

      <section aria-label="Action metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value, detail, icon: Icon, href, tone }) => <Link key={label} href={href} className="glass-surface rounded-xl border p-5 transition hover:-translate-y-0.5 hover:border-primary/40"><div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{label}</p><Icon className={`size-5 ${tone}`} aria-hidden="true" /></div><p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></Link>)}</section>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"><Card><CardHeader className="flex-row items-center justify-between gap-3"><div><CardTitle>My work</CardTitle><p className="mt-1 text-sm text-muted-foreground">Your next tasks, sorted by urgency.</p></div><Link href="/dashboard/tasks" className="text-xs font-semibold text-primary hover:underline">Open board</Link></CardHeader><CardContent>{myTasks.length === 0 ? <div className="flex min-h-48 flex-col items-center justify-center text-center"><Target className="mb-3 size-7 text-primary" aria-hidden="true" /><p className="text-sm font-medium">Your queue is clear.</p><p className="mt-1 text-sm text-muted-foreground">Create a task or ask a teammate what needs help.</p></div> : <div className="space-y-2">{myTasks.map((task) => { const deadline = getDeadlineState(task.due_date, task.status); return <Link key={task.id} href={`/dashboard/tasks/${task.id}`} className="flex items-center gap-3 rounded-lg border bg-background/40 p-3 transition hover:border-primary/40"><span className={`size-2 shrink-0 rounded-full ${task.status === "REVIEW" ? "bg-brand-gold" : task.status === "IN_PROGRESS" ? "bg-brand-teal" : "bg-primary"}`} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{task.title}</span><span className="mt-1 block text-xs text-muted-foreground">{statusLabels[task.status]}</span></span><span className={`hidden rounded-full border px-2 py-1 text-[10px] font-semibold sm:inline-flex ${deadlineStyles[deadline.state]}`}>{deadline.label}</span><span className={`text-[11px] font-semibold uppercase ${priorityStyles[task.priority]}`}>{task.priority}</span><ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /></Link>; })}</div>}</CardContent></Card>
        <Card><CardHeader className="flex-row items-center justify-between gap-3"><div><CardTitle>Recent activity</CardTitle><p className="mt-1 text-sm text-muted-foreground">The latest movement across the workspace.</p></div><Link href="/dashboard/activity" className="text-xs font-semibold text-primary hover:underline">View all</Link></CardHeader><CardContent>{activity.length === 0 ? <div className="flex min-h-48 flex-col items-center justify-center text-center"><Activity className="mb-3 size-7 text-primary" aria-hidden="true" /><p className="text-sm font-medium">No activity yet.</p><p className="mt-1 text-sm text-muted-foreground">Updates will appear here as work moves.</p></div> : <div className="space-y-4">{activity.map((entry) => <div key={entry.id} className="flex gap-3"><div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">{actorName(entry.user).charAt(0).toUpperCase()}</div><div className="min-w-0"><p className="text-sm leading-5"><span className="font-semibold">{actorName(entry.user)}</span> <span className="text-muted-foreground">{entry.action}</span></p>{entry.task && <Link href={`/dashboard/tasks/${entry.task.id}`} className="mt-1 block truncate text-xs font-medium text-primary hover:underline">{entry.task.title}</Link>}<time className="mt-1 block text-[11px] text-muted-foreground">{formatDate(entry.created_at)}</time></div></div>)}</div>}</CardContent></Card></div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"><Card><CardHeader><CardTitle>Personal workload</CardTitle><p className="mt-1 text-sm text-muted-foreground">Your share of the open task queue.</p></CardHeader><CardContent><div className="flex items-end justify-between gap-4"><div><p className="text-4xl font-semibold tracking-tight">{myTasks.length}</p><p className="mt-1 text-sm text-muted-foreground">assigned open tasks</p></div><Users className="mb-2 size-8 text-brand-teal" aria-hidden="true" /></div><div className="mt-6 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-brand-teal transition-all" style={{ width: `${workloadPercent}%` }} /></div><div className="mt-3 flex justify-between text-xs text-muted-foreground"><span>{workloadPercent}% of active queue</span><span>{activeTasks} total open</span></div></CardContent></Card>
        <Card><CardHeader className="flex-row items-center justify-between gap-3"><div><CardTitle>Team productivity</CardTitle><p className="mt-1 text-sm text-muted-foreground">A quick read on this week’s momentum.</p></div><Link href="/dashboard/analytics" className="text-xs font-semibold text-primary hover:underline">Open insights</Link></CardHeader><CardContent><div className="grid gap-4 sm:grid-cols-3"><div className="rounded-lg border bg-background/40 p-4"><p className="text-xs text-muted-foreground">Completed</p><p className="mt-2 text-2xl font-semibold">{completedThisWeek}</p><p className="mt-1 text-xs text-brand-teal">This week</p></div><div className="rounded-lg border bg-background/40 p-4"><p className="text-xs text-muted-foreground">In progress</p><p className="mt-2 text-2xl font-semibold">{myTasks.filter((task) => task.status === "IN_PROGRESS").length}</p><p className="mt-1 text-xs text-primary">Your tasks</p></div><div className="rounded-lg border bg-background/40 p-4"><p className="text-xs text-muted-foreground">Projects</p><p className="mt-2 text-2xl font-semibold">{projectCount ?? 0}</p><p className="mt-1 text-xs text-brand-gold">Active workspace</p></div></div></CardContent></Card></div>

      <Card><CardHeader className="flex-row items-center justify-between gap-3"><div><CardTitle>Upcoming deadlines</CardTitle><p className="mt-1 text-sm text-muted-foreground">The next dates your team should keep visible.</p></div><Link href="/dashboard/calendar" className="text-xs font-semibold text-primary hover:underline">Open calendar</Link></CardHeader><CardContent>{upcoming.length === 0 ? <div className="flex min-h-28 items-center gap-3 text-sm text-muted-foreground"><CalendarDays className="size-5 text-primary" aria-hidden="true" />No upcoming deadlines. Add due dates to keep work moving.</div> : <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">{upcoming.map((task) => <Link key={task.id} href={`/dashboard/tasks/${task.id}`} className="rounded-lg border bg-background/40 p-3 transition hover:border-primary/40"><div className="flex items-center justify-between gap-2"><Clock3 className="size-4 text-primary" aria-hidden="true" /><span className="text-[11px] font-medium text-muted-foreground">{task.due_date ? formatDate(task.due_date) : "No date"}</span></div><p className="mt-3 truncate text-sm font-medium">{task.title}</p><p className="mt-1 text-xs text-muted-foreground">{statusLabels[task.status]}</p></Link>)}</div>}</CardContent></Card>

      <section aria-label="Quick actions" className="grid gap-3 sm:grid-cols-3"><Link href="/dashboard/tasks" className="flex items-center gap-3 rounded-xl border bg-card/45 p-4 transition hover:border-primary/40"><CheckSquare className="size-5 text-primary" aria-hidden="true" /><span><span className="block text-sm font-semibold">Manage tasks</span><span className="block text-xs text-muted-foreground">Open the Kanban board</span></span></Link><Link href="/dashboard/projects" className="flex items-center gap-3 rounded-xl border bg-card/45 p-4 transition hover:border-primary/40"><FolderKanban className="size-5 text-brand-gold" aria-hidden="true" /><span><span className="block text-sm font-semibold">Organize projects</span><span className="block text-xs text-muted-foreground">Plan the work ahead</span></span></Link><Link href="/dashboard/calendar" className="flex items-center gap-3 rounded-xl border bg-card/45 p-4 transition hover:border-primary/40"><CalendarDays className="size-5 text-brand-teal" aria-hidden="true" /><span><span className="block text-sm font-semibold">Plan the week</span><span className="block text-xs text-muted-foreground">Review every deadline</span></span></Link></section>
    </div>
  );
}
