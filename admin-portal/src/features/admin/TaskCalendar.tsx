import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays, Bell, Clock3 } from "lucide-react";
import type { AdminTask } from "./admin-data";
import { formatTaskStatus, taskStatusStyles } from "./admin-data";
import { notifyTaskAssignees } from "@/app/(portal)/admin/calendar/actions";

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function TaskCalendar({ tasks, month, weekStart, error, notice }: { tasks: AdminTask[]; month: Date; weekStart: "Sunday" | "Monday"; error: boolean; notice?: string }) {
  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const offset = (start.getUTCDay() - (weekStart === "Monday" ? 1 : 0) + 7) % 7;
  const days = Array.from({ length: 42 }, (_, index) => new Date(Date.UTC(year, monthIndex, 1 - offset + index)));
  const byDate = new Map<string, AdminTask[]>();
  for (const task of tasks) {
    if (!task.due_date) continue;
    const key = task.due_date.slice(0, 10);
    byDate.set(key, [...(byDate.get(key) ?? []), task]);
  }
  const previous = new Date(Date.UTC(year, monthIndex - 1, 1));
  const next = new Date(Date.UTC(year, monthIndex + 1, 1));
  const monthHref = (value: Date) => `/admin/calendar?month=${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
  const weekDays = weekStart === "Monday" ? [...weekdayNames.slice(1), weekdayNames[0]] : weekdayNames;
  const pendingTasks = tasks
    .filter((task) => task.status !== "DONE")
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? "") || a.title.localeCompare(b.title));
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Schedule</p>
          <h1 className="text-3xl font-semibold tracking-tight">Task calendar</h1>
          <p className="mt-2 text-sm text-muted-foreground">Tasks with due dates across the system.</p>
        </div>
        <nav aria-label="Calendar month navigation" className="flex items-center gap-3">
          <Link href={monthHref(previous)} aria-label="Previous month" className="grid size-10 place-items-center rounded-md border bg-card hover:bg-muted"><ChevronLeft className="size-4" /></Link>
          <h2 className="min-w-36 text-center font-semibold">{monthFormatter.format(month)}</h2>
          <Link href={monthHref(next)} aria-label="Next month" className="grid size-10 place-items-center rounded-md border bg-card hover:bg-muted"><ChevronRight className="size-4" /></Link>
        </nav>
      </header>
      {error && <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">Calendar tasks could not be fully loaded.</p>}
      {notice && <p role={notice.startsWith("Reminder sent") ? "status" : "alert"} className={`rounded-lg border px-4 py-3 text-sm ${notice.startsWith("Reminder sent") ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-amber-300 bg-amber-50 text-amber-900"}`}>{notice}</p>}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section aria-label={`${monthFormatter.format(month)} tasks`} className="overflow-hidden rounded-lg border bg-card">
        <div className="grid grid-cols-7 border-b bg-muted/60">
          {weekDays.map((day) => <p key={day} className="px-2 py-3 text-center text-xs font-semibold text-muted-foreground sm:px-4">{day}</p>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = `${day.getUTCFullYear()}-${String(day.getUTCMonth() + 1).padStart(2, "0")}-${String(day.getUTCDate()).padStart(2, "0")}`;
            const dayTasks = byDate.get(key) ?? [];
            const inMonth = day.getUTCMonth() === monthIndex;
            const today = key === new Date().toISOString().slice(0, 10);
            return (
              <div key={key} className={`min-h-28 border-b border-r p-1.5 sm:min-h-36 sm:p-2 ${inMonth ? "" : "bg-muted/30"}`}>
                <p className={`mb-1 grid size-7 place-items-center text-xs ${today ? "rounded-full bg-primary font-semibold text-primary-foreground" : inMonth ? "text-foreground" : "text-muted-foreground"}`}>{day.getUTCDate()}</p>
                <ul className="space-y-1">
                  {dayTasks.slice(0, 3).map((task) => (
                    <li key={task.id}>
                      <div title={`${task.title} · ${formatTaskStatus(task.status)}`} className={`truncate rounded border px-1.5 py-1 text-[10px] leading-tight sm:text-xs ${taskStatusStyles[task.status]}`}>
                        <span className="hidden sm:inline">{task.title}</span><span className="sm:hidden">{task.title.slice(0, 12)}</span>
                      </div>
                    </li>
                  ))}
                  {dayTasks.length > 3 && <li className="px-1 text-[10px] text-muted-foreground">+{dayTasks.length - 3} more</li>}
                </ul>
              </div>
            );
          })}
        </div>
        {tasks.length === 0 && <div className="flex items-center justify-center gap-2 p-5 text-sm text-muted-foreground"><CalendarDays className="size-4" />No tasks due this month.</div>}
      </section>
      <aside aria-label="Pending tasks this month" className="rounded-lg border bg-card">
        <header className="flex items-center justify-between gap-3 border-b px-5 py-4">
          <div className="flex items-center gap-3"><Clock3 className="size-5 text-amber-600" aria-hidden="true" /><div><h2 className="font-semibold">Pending tasks</h2><p className="mt-1 text-sm text-muted-foreground">Due this month</p></div></div>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">{pendingTasks.length}</span>
        </header>
        {pendingTasks.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">No pending tasks this month.</p> : (
          <ul className="divide-y">
            {pendingTasks.map((task) => (
              <li key={task.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><h3 className="text-sm font-medium">{task.title}</h3><p className="mt-1 text-xs text-muted-foreground">{task.projectName} · {formatTaskStatus(task.status)}</p></div>
                  <span className="shrink-0 text-xs text-muted-foreground">{task.due_date ? dateFormat.format(new Date(task.due_date)) : "No date"}</span>
                </div>
                <p className="text-xs text-muted-foreground">{task.assignments.length ? task.assignments.map((assignment) => assignment.name?.trim() || assignment.email).join(", ") : "Unassigned"}</p>
                {task.assignments.length > 0 ? (
                  <form action={notifyTaskAssignees}>
                    <input type="hidden" name="taskId" value={task.id} />
                    <input type="hidden" name="month" value={monthKey} />
                    <button type="submit" className="inline-flex min-h-8 items-center gap-2 rounded-md border px-2.5 text-xs font-medium hover:bg-muted"><Bell className="size-3.5" aria-hidden="true" />Notify assignees</button>
                  </form>
                ) : <p className="text-xs text-amber-700">Assign an employee before sending a reminder.</p>}
              </li>
            ))}
          </ul>
        )}
      </aside>
      </div>
      <p className="text-xs text-muted-foreground">Week starts on {weekStart}. Change this in <Link href="/admin/settings" className="font-medium text-primary hover:underline">Settings</Link>.</p>
    </div>
  );
}
