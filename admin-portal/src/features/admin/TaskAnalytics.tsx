import { BarChart3, CircleCheck, Clock3, ListChecks, TriangleAlert } from "lucide-react";
import type { AdminTask } from "./admin-data";
import { formatTaskStatus } from "./admin-data";

const statusOrder: AdminTask["status"][] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];
const priorityOrder: AdminTask["priority"][] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export function TaskAnalytics({ tasks, error }: { tasks: AdminTask[]; error: boolean }) {
  const statusCounts = new Map(statusOrder.map((status) => [status, 0]));
  const priorityCounts = new Map(priorityOrder.map((priority) => [priority, 0]));
  const people = new Map<string, { name: string; completed: number; assigned: number; progress: number }>();
  let overdue = 0;
  const today = new Date().toISOString().slice(0, 10);

  for (const task of tasks) {
    statusCounts.set(task.status, (statusCounts.get(task.status) ?? 0) + 1);
    priorityCounts.set(task.priority, (priorityCounts.get(task.priority) ?? 0) + 1);
    if (task.status !== "DONE" && task.due_date && task.due_date.slice(0, 10) < today) overdue += 1;
    for (const assignment of task.assignments) {
      const person = people.get(assignment.userId) ?? {
        name: assignment.name?.trim() || assignment.email,
        completed: 0,
        assigned: 0,
        progress: 0,
      };
      person.assigned += 1;
      person.progress += assignment.status === "DONE" ? 100 : assignment.progress;
      if (assignment.status === "DONE") person.completed += 1;
      people.set(assignment.userId, person);
    }
  }

  const completed = statusCounts.get("DONE") ?? 0;
  const completionRate = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const workload = [...people.entries()]
    .map(([id, person]) => ({ id, ...person, averageProgress: Math.round(person.progress / person.assigned) }))
    .sort((a, b) => b.assigned - a.assigned || a.name.localeCompare(b.name))
    .slice(0, 10);
  const metrics = [
    { label: "Total tasks", value: tasks.length, icon: ListChecks, tone: "text-primary" },
    { label: "Completed", value: completed, icon: CircleCheck, tone: "text-emerald-700" },
    { label: "Completion rate", value: `${completionRate}%`, icon: BarChart3, tone: "text-sky-700" },
    { label: "Overdue", value: overdue, icon: TriangleAlert, tone: "text-rose-700" },
  ];

  return (
    <div className="space-y-8">
      <header>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">System insights</p>
        <h1 className="text-3xl font-semibold tracking-tight">Task analytics</h1>
        <p className="mt-2 text-sm text-muted-foreground">All-time task health, status breakdown, and assignee workload.</p>
      </header>
      {error && <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">Some analytics data could not be loaded; displayed totals may be incomplete.</p>}
      <section aria-label="Task metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon, tone }) => <article key={label} className="rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{label}</p><Icon className={`size-5 ${tone}`} aria-hidden="true" /></div>
          <p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p>
        </article>)}
      </section>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-lg border bg-card">
          <header className="border-b px-5 py-4"><h2 className="font-semibold">Tasks by status</h2><p className="mt-1 text-sm text-muted-foreground">Distribution across current workflow stages.</p></header>
          <ul className="space-y-4 p-5">
            {statusOrder.map((status) => {
              const count = statusCounts.get(status) ?? 0;
              const percent = tasks.length ? Math.round(count / tasks.length * 100) : 0;
              return <li key={status}>
                <div className="mb-1.5 flex justify-between text-sm"><span>{formatTaskStatus(status)}</span><span className="text-muted-foreground">{count} · {percent}%</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} /></div>
              </li>;
            })}
          </ul>
          <div className="border-t px-5 py-4">
            <h3 className="mb-3 text-sm font-medium">Priority breakdown</h3>
            <div className="grid grid-cols-2 gap-3">
              {priorityOrder.map((priority) => <div key={priority} className="rounded-md bg-muted/70 p-3">
                <p className="text-xs text-muted-foreground">{priority}</p><p className="mt-1 text-lg font-semibold">{priorityCounts.get(priority) ?? 0}</p>
              </div>)}
            </div>
          </div>
        </section>
        <section className="rounded-lg border bg-card">
          <header className="flex items-center gap-3 border-b px-5 py-4"><Clock3 className="size-5 text-primary" aria-hidden="true" /><div><h2 className="font-semibold">Assignee workload</h2><p className="mt-1 text-sm text-muted-foreground">People with the most assigned tasks.</p></div></header>
          {workload.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No task assignments yet.</p> : <ol className="divide-y px-5">
            {workload.map((person, index) => <li key={person.id} className="flex items-center gap-3 py-4">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">{index + 1}</span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{person.name}</p><p className="mt-1 text-xs text-muted-foreground">{person.completed} completed of {person.assigned} assigned</p></div>
              <span className="text-sm font-semibold">{person.averageProgress}%</span>
            </li>)}
          </ol>}
        </section>
      </div>
    </div>
  );
}
