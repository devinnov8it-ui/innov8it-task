"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarRange, Columns3, List, Users } from "lucide-react";
import { KanbanBoard, type BoardTask } from "./KanbanBoard";
import { deadlineStyles, getDeadlineState } from "@/lib/deadline";
import { formatPhilippineDate, formatPhilippineDateTime, formatPhilippineTime } from "@/lib/time";

type Project = { id: string; name: string };
type ViewTask = BoardTask;
type Tab = "board" | "list" | "timeline" | "workload";

const tabs: { id: Tab; label: string; icon: typeof List }[] = [
  { id: "board", label: "Board", icon: Columns3 },
  { id: "list", label: "List", icon: List },
  { id: "timeline", label: "Timeline", icon: CalendarRange },
  { id: "workload", label: "Workload", icon: Users },
];

const statusLabel = { TODO: "To do", IN_PROGRESS: "In progress", REVIEW: "Review", DONE: "Done" } as const;
const priorityClass = { LOW: "text-muted-foreground", MEDIUM: "text-primary", HIGH: "text-brand-gold", CRITICAL: "text-destructive" } as const;
const statusClass = { TODO: "bg-primary", IN_PROGRESS: "bg-brand-teal", REVIEW: "bg-brand-gold", DONE: "bg-muted-foreground" } as const;

function formatDate(value: string | null) {
  if (!value) return "No due date";
  return formatPhilippineDateTime(value);
}

function ListView({ tasks, todayKey }: { tasks: ViewTask[]; todayKey: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b bg-muted/35 text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-3 font-medium">Task</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Priority</th><th className="px-4 py-3 font-medium">Due</th><th className="px-4 py-3 font-medium">Assignees</th><th className="px-4 py-3 font-medium">Progress</th><th className="px-4 py-3" /></tr></thead>
        <tbody className="divide-y">
          {tasks.map((task) => { const deadline = getDeadlineState(task.dueDate, task.status, todayKey); return <tr key={task.id} className="transition hover:bg-muted/20"><td className="max-w-[300px] px-4 py-3"><Link href={`/dashboard/tasks/${task.id}`} className="font-medium hover:text-primary hover:underline">{task.title}</Link></td><td className="px-4 py-3"><span className="inline-flex items-center gap-2 text-xs"><span className={`size-2 rounded-full ${statusClass[task.status]}`} />{statusLabel[task.status]}</span></td><td className={`px-4 py-3 text-xs font-semibold uppercase ${priorityClass[task.priority]}`}>{task.priority}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${deadlineStyles[deadline.state]}`}>{deadline.label}{task.dueDate ? ` · ${formatPhilippineTime(task.dueDate)}` : ""}</span></td><td className="max-w-[220px] px-4 py-3 text-xs text-muted-foreground">{task.assignees?.map((assignee) => assignee.name).join(", ") || task.assigneeName || "Unassigned"}</td><td className="px-4 py-3 text-xs text-muted-foreground">{task.progress ?? 0}%</td><td className="px-4 py-3 text-right"><Link href={`/dashboard/tasks/${task.id}`} className="text-xs font-medium text-primary hover:underline">Open</Link></td></tr>; })}
        </tbody>
      </table>
      {tasks.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No tasks match this view.</p>}
    </div>
  );
}

function TimelineView({ tasks }: { tasks: ViewTask[] }) {
  const [now, setNow] = useState(0);
  useEffect(() => setNow(Date.now()), []);
  const datedTasks = tasks.filter((task) => task.dueDate);
  const dates = datedTasks.map((task) => new Date(task.dueDate as string).getTime());
  const referenceTime = now || (dates.length ? Math.min(...dates) : 0);
  const start = dates.length ? Math.min(...dates, referenceTime) : referenceTime;
  const end = dates.length ? Math.max(...dates, start + 86_400_000 * 14) : start + 86_400_000 * 14;
  const span = Math.max(end - start, 86_400_000);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{formatPhilippineDate(start)}</span><span>Project horizon</span><span>{formatPhilippineDate(end)}</span></div>
      <div className="overflow-x-auto rounded-xl border p-4"><div className="min-w-[680px] space-y-3">{tasks.map((task) => { const due = task.dueDate ? new Date(task.dueDate).getTime() : end; const left = task.dueDate ? Math.max(0, ((due - start) / span) * 100) : 0; const width = task.dueDate ? Math.max(8, 100 - left) : 12; return <div key={task.id} className="grid grid-cols-[minmax(160px,220px)_1fr] items-center gap-4"><Link href={`/dashboard/tasks/${task.id}`} className="truncate text-sm font-medium hover:text-primary hover:underline">{task.title}</Link><div className="relative h-8 rounded-md bg-muted/45"><span className={`absolute top-1 h-6 rounded-md ${statusClass[task.status]} opacity-80`} style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }} /><span className="absolute inset-y-0 flex items-center px-2 text-[11px] font-medium text-foreground">{task.dueDate ? formatDate(task.dueDate) : "Unscheduled"}</span></div></div>; })}{tasks.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No tasks to plot yet.</p>}</div></div>
    </div>
  );
}

function WorkloadView({ tasks }: { tasks: ViewTask[] }) {
  const groups = new Map<string, ViewTask[]>();
  tasks.forEach((task) => { (task.assignees?.length ? task.assignees : [{ name: task.assigneeName ?? "Unassigned", progress: task.progress ?? 0 }]).forEach((assignee) => groups.set(assignee.name, [...(groups.get(assignee.name) ?? []), task])); });
  const rows = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  const max = Math.max(...rows.map(([, group]) => group.length), 1);

  return <div className="space-y-3">{rows.length === 0 ? <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">No workload data yet.</div> : rows.map(([name, group]) => { const overloaded = group.length >= 6; const done = group.filter((task) => task.status === "DONE").length; return <div key={name} className="rounded-xl border bg-background/35 p-4"><div className="flex items-center justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><div className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${overloaded ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>{name.charAt(0).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-semibold">{name}</p><p className="text-xs text-muted-foreground">{group.length} open task{group.length === 1 ? "" : "s"}{done ? ` · ${done} completed` : ""}</p></div></div>{overloaded && <span className="rounded-full bg-destructive/10 px-2 py-1 text-[11px] font-semibold text-destructive">Overloaded</span>}</div><div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${overloaded ? "bg-destructive" : "bg-primary"}`} style={{ width: `${(group.length / max) * 100}%` }} /></div><div className="mt-3 flex flex-wrap gap-2">{group.slice(0, 5).map((task) => <Link key={task.id} href={`/dashboard/tasks/${task.id}`} className="rounded-md border px-2 py-1 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-primary">{task.title}</Link>)}</div></div>; })}</div>;
}

export function TaskWorkspaceViews({ tasks, projects, todayKey }: { tasks: ViewTask[]; projects: Project[]; todayKey: string }) {
  const [activeTab, setActiveTab] = useState<Tab>("board");
  return <div className="space-y-4"><div role="tablist" aria-label="Task views" className="inline-flex max-w-full overflow-x-auto rounded-lg border bg-card/60 p-1">{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)} className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium transition ${activeTab === id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon className="size-4" aria-hidden="true" />{label}</button>)}</div>{activeTab === "board" && <KanbanBoard projects={projects} tasks={tasks} todayKey={todayKey} />}{activeTab === "list" && <ListView tasks={tasks} todayKey={todayKey} />}{activeTab === "timeline" && <TimelineView tasks={tasks} />}{activeTab === "workload" && <WorkloadView tasks={tasks} />}</div>;
}
