import Link from "next/link";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, Clock3, ListFilter } from "lucide-react";
import { requireUser } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deadlineStyles, getDeadlineState } from "@/lib/deadline";
import { formatPhilippineDateTime, getPhilippineDateKey, getPhilippineTodayKey, philippineDateToUtcStart } from "@/lib/time";

export const metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const statusLabels = { TODO: "To do", IN_PROGRESS: "In progress", REVIEW: "Review", DONE: "Done" } as const;
const statusStyles = { TODO: "border-primary/20 bg-primary/5 text-primary", IN_PROGRESS: "border-brand-teal/30 bg-brand-teal/10 text-brand-teal", REVIEW: "border-brand-gold/30 bg-brand-gold/10 text-brand-gold", DONE: "border-muted bg-muted text-muted-foreground" } as const;
type TaskStatus = keyof typeof statusLabels;
type CalendarTask = { id: string; title: string; status: TaskStatus; priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; due_date: string };

function monthKey(year: number, month: number) { return `${year}-${String(month + 1).padStart(2, "0")}`; }
function dateKey(year: number, month: number, day: number) { return `${monthKey(year, month)}-${String(day).padStart(2, "0")}`; }
function parseMonth(value: string | undefined) {
  const today = getPhilippineTodayKey();
  const fallbackValue = {
    year: Number(today.slice(0, 4)),
    month: Number(today.slice(5, 7)) - 1,
  };
  if (!value) return fallbackValue;
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return fallbackValue;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12 || year < 2000 || year > 2100) return fallbackValue;
  return { year, month: month - 1 };
}
function formatDate(value: string) { return formatPhilippineDateTime(value); }
function href(month: string, status?: string) { const params = new URLSearchParams({ month }); if (status) params.set("status", status); return `/dashboard/calendar?${params.toString()}`; }

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string; status?: string }> }) {
  await requireUser();
  const params = await searchParams;
  const { year, month } = parseMonth(params.month);
  const selectedStatus = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"].includes(params.status ?? "") ? params.status as TaskStatus : undefined;
  const supabase = await createClient({ readOnly: true });
  const todayKey = getPhilippineTodayKey();
  const today = new Date(`${todayKey}T00:00:00Z`);
  const tomorrowDate = new Date(`${todayKey}T00:00:00Z`);
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
  const tomorrowKey = tomorrowDate.toISOString().slice(0, 10);
  const todayStart = philippineDateToUtcStart(todayKey);
  const tomorrowStart = philippineDateToUtcStart(tomorrowKey);
  const nextMonthDate = new Date(Date.UTC(year, month + 1, 1));
  const selectedMonthStart = philippineDateToUtcStart(`${monthKey(year, month)}-01`);
  const selectedMonthEnd = philippineDateToUtcStart(`${monthKey(nextMonthDate.getUTCFullYear(), nextMonthDate.getUTCMonth())}-01`);
  const [{ data, error }, { count: dueToday }, { count: overdue }] = await Promise.all([
    supabase.from("tasks").select("id, title, status, priority, due_date").gte("due_date", selectedMonthStart).lt("due_date", selectedMonthEnd).order("due_date", { ascending: true }),
    supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "DONE").gte("due_date", todayStart).lt("due_date", tomorrowStart),
    supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "DONE").lt("due_date", todayStart),
  ]);
  const tasks = (data ?? []) as CalendarTask[];
  const selectedMonth = monthKey(year, month);
  const monthTasks = tasks.filter((task) => getPhilippineDateKey(task.due_date).startsWith(selectedMonth) && (!selectedStatus || task.status === selectedStatus));
  const completed = monthTasks.filter((task) => task.status === "DONE").length;
  const monthName = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month, 1)));
  const leadingDays = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (number | null)[] = Array.from({ length: leadingDays + daysInMonth }, (_, index) => index < leadingDays ? null : index - leadingDays + 1);
  while (cells.length % 7 !== 0) cells.push(null);
  const tasksByDay = new Map<string, CalendarTask[]>();
  monthTasks.forEach((task) => { const key = getPhilippineDateKey(task.due_date); tasksByDay.set(key, [...(tasksByDay.get(key) ?? []), task]); });
  const previous = new Date(Date.UTC(year, month - 1, 1));
  const next = new Date(Date.UTC(year, month + 1, 1));
  const agenda = monthTasks.filter((task) => getPhilippineDateKey(task.due_date) >= todayKey).slice(0, 8);

  return <div className="space-y-8">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Workspace planning</p><h1 className="text-3xl font-semibold tracking-tight">Calendar</h1><p className="mt-2 text-sm text-muted-foreground">Plan deadlines, spot risk, and open work directly from the date it matters.</p></div><Link href="/dashboard/tasks#new-task" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90">Add task with due date</Link></div>
    {error && <p role="alert" className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive">Calendar data is unavailable until the Supabase schema is applied.</p>}
    <section aria-label="Calendar summary" className="grid gap-4 sm:grid-cols-3"><Link href={`${href(selectedMonth)}#calendar`} className="glass-surface rounded-xl border p-4"><p className="text-xs text-muted-foreground">Due today</p><p className="mt-2 text-2xl font-semibold">{dueToday ?? 0}</p><p className="mt-1 text-xs text-muted-foreground">Open deadlines</p></Link><Link href={`${href(selectedMonth)}#calendar`} className="glass-surface rounded-xl border p-4"><p className="text-xs text-muted-foreground">Overdue</p><p className="mt-2 text-2xl font-semibold text-destructive">{overdue ?? 0}</p><p className="mt-1 text-xs text-muted-foreground">Needs attention</p></Link><div className="glass-surface rounded-xl border p-4"><p className="text-xs text-muted-foreground">This month</p><p className="mt-2 text-2xl font-semibold">{monthTasks.length}</p><p className="mt-1 text-xs text-muted-foreground">{completed} completed</p></div></section>
    <div id="calendar" className="grid gap-6 xl:grid-cols-[1fr_20rem]"><Card><CardHeader className="flex-row items-center justify-between gap-3"><CardTitle className="flex items-center gap-2"><CalendarDays className="size-5 text-primary" aria-hidden="true" />{monthName}</CardTitle><div className="flex items-center gap-1"><Link aria-label="Previous month" href={href(monthKey(previous.getUTCFullYear(), previous.getUTCMonth()), selectedStatus)} className="flex size-9 items-center justify-center rounded-md border hover:bg-muted"><ChevronLeft className="size-4" aria-hidden="true" /></Link><Link href={href(monthKey(today.getUTCFullYear(), today.getUTCMonth()), selectedStatus)} className="hidden min-h-9 items-center rounded-md border px-3 text-xs font-medium hover:bg-muted sm:inline-flex">Today</Link><Link aria-label="Next month" href={href(monthKey(next.getUTCFullYear(), next.getUTCMonth()), selectedStatus)} className="flex size-9 items-center justify-center rounded-md border hover:bg-muted"><ChevronRight className="size-4" aria-hidden="true" /></Link></div></CardHeader><CardContent><div className="mb-3 flex flex-wrap items-center gap-2"><ListFilter className="size-4 text-muted-foreground" aria-hidden="true" /><span className="text-xs text-muted-foreground">Filter:</span><Link href={href(selectedMonth)} className={`rounded-full border px-2.5 py-1 text-xs ${!selectedStatus ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>All</Link>{Object.entries(statusLabels).map(([value, label]) => <Link key={value} href={href(selectedMonth, value)} className={`rounded-full border px-2.5 py-1 text-xs ${selectedStatus === value ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>{label}</Link>)}</div><div className="grid grid-cols-7 border-b pb-2 text-center text-xs font-semibold text-muted-foreground">{weekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}</div><div className="mt-2 grid grid-cols-7 overflow-hidden rounded-lg border">{cells.map((day, index) => { const key = day ? dateKey(year, month, day) : `empty-${index}`; const dayTasks = day ? tasksByDay.get(key) ?? [] : []; const isToday = key === todayKey; return <div key={key} className={`min-h-28 border-b border-r p-2 sm:min-h-32 ${isToday ? "bg-primary/[0.04]" : "bg-background"}`}>{day && <p className={`mb-2 text-xs font-semibold ${isToday ? "flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{day}</p>}<div className="space-y-1">{dayTasks.slice(0, 3).map((task) => <Link key={task.id} href={`/dashboard/tasks/${task.id}`} className={`block truncate rounded border px-1.5 py-1 text-[11px] font-medium ${statusStyles[task.status]}`} title={`${task.title} - ${statusLabels[task.status]}`}>{task.title}</Link>)}{dayTasks.length > 3 && <span className="block px-1 text-[10px] text-muted-foreground">+{dayTasks.length - 3} more</span>}</div></div>; })}</div></CardContent></Card>
      <Card><CardHeader><CardTitle>Upcoming in {monthName}</CardTitle><p className="text-sm text-muted-foreground">Your next scheduled actions.</p></CardHeader><CardContent>{agenda.length === 0 ? <div className="flex min-h-40 flex-col items-center justify-center text-center"><CheckCircle2 className="mb-3 size-7 text-brand-teal" aria-hidden="true" /><p className="text-sm font-medium">Nothing upcoming.</p><p className="mt-1 text-xs text-muted-foreground">Your schedule is clear for this month.</p></div> : <div className="space-y-3">{agenda.map((task) => { const deadline = getDeadlineState(task.due_date, task.status); return <Link key={task.id} href={`/dashboard/tasks/${task.id}`} className="flex gap-3 rounded-lg border p-3 hover:border-primary/40"><Clock3 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{task.title}</span><span className="mt-1 block text-xs text-muted-foreground">{formatDate(task.due_date)} · {statusLabels[task.status]}</span></span><span className={`self-start rounded-full border px-2 py-1 text-[10px] font-semibold ${deadlineStyles[deadline.state]}`}>{deadline.label}</span></Link>; })}</div>}{(overdue ?? 0) > 0 && <div className="mt-5 flex gap-2 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-xs text-destructive"><CircleAlert className="size-4 shrink-0" aria-hidden="true" />{overdue ?? 0} overdue {(overdue ?? 0) === 1 ? "task needs" : "tasks need"} attention.</div>}</CardContent></Card></div>
  </div>;
}
