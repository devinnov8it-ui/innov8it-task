"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { GripVertical } from "lucide-react";
import { moveTask } from "../actions";
import { deadlineStyles, getDeadlineState } from "@/lib/deadline";
import { formatPhilippineDate } from "@/lib/time";

export type BoardTask = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  dueDate: string | null;
  createdAt: string;
  assigneeName: string | null;
  assigneeAvatar?: string | null;
  assignedByName: string | null;
  assignedAt: string | null;
  labels?: string[];
  estimateHours?: number;
  progress?: number;
  assignees?: { name: string; progress: number }[];
};

type BoardProject = { id: string; name: string };

const columns = [
  { id: "TODO", title: "To do" },
  { id: "IN_PROGRESS", title: "In progress" },
  { id: "REVIEW", title: "Review" },
  { id: "DONE", title: "Done" },
] as const;

const priorityClass = {
  LOW: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  MEDIUM: "bg-primary/10 text-primary",
  HIGH: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  CRITICAL: "bg-destructive/10 text-destructive",
};

function shortDate(value: string) {
  return formatPhilippineDate(value);
}

function estimateHours(task: BoardTask) {
  if (task.estimateHours) return task.estimateHours;
  const base = { LOW: 12, MEDIUM: 8, HIGH: 6, CRITICAL: 4 }[task.priority];
  return base + (task.description && task.description.length > 300 ? 4 : 0);
}

function taskProgress(task: BoardTask) {
  return task.progress ?? { TODO: 0, IN_PROGRESS: 50, REVIEW: 80, DONE: 100 }[task.status];
}

export function KanbanBoard({
  tasks,
  projects,
  todayKey,
}: {
  tasks: BoardTask[];
  projects: BoardProject[];
  todayKey: string;
}) {
  const router = useRouter();
  const [optimisticTasks, moveOptimistically] = useOptimistic(
    tasks,
    (current, move: { id: string; status: BoardTask["status"] }) =>
      current.map((task) =>
        task.id === move.id ? { ...task, status: move.status } : task,
      ),
  );
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function drop(status: BoardTask["status"]) {
    if (!draggedId) return;
    const task = optimisticTasks.find(({ id }) => id === draggedId);
    setDraggedId(null);
    if (!task || task.status === status) return;
    setError(null);
    startTransition(async () => {
      moveOptimistically({ id: task.id, status });
      const result = await moveTask({ taskId: task.id, status });
      if (!result.ok) {
        setError(result.message ?? "Unable to update task status.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      {error && <p role="alert" className="rounded-lg border border-destructive/30 px-4 py-3 text-sm text-destructive">{error}</p>}
      <div className="grid gap-4 xl:grid-cols-4">
        {columns.map((column) => {
          const cards = optimisticTasks.filter((task) => task.status === column.id);
          return (
            <section
              key={column.id}
              aria-labelledby={`column-${column.id}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => drop(column.id)}
              className="min-h-64 rounded-xl border bg-muted/30 p-3 backdrop-blur-sm"
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 id={`column-${column.id}`} className="text-sm font-semibold">{column.title}</h2>
                <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">{cards.length}</span>
              </div>
              <div className="space-y-3">
                {cards.map((task) => (
                  <article
                    key={task.id}
                    draggable={!pending}
                    onDragStart={() => setDraggedId(task.id)}
                    onDragEnd={() => setDraggedId(null)}
                    className="glass-surface cursor-grab rounded-lg border p-4 shadow-sm active:cursor-grabbing"
                  >
                    {(() => { const deadline = getDeadlineState(task.dueDate, task.status, todayKey); return <span className={`mb-3 inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold ${deadlineStyles[deadline.state]}`}>{deadline.label}</span>; })()}
                    <div className="flex items-start gap-2"><GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><div className="min-w-0 flex-1"><span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${priorityClass[task.priority]}`}>{task.priority}</span><p className="mt-2 text-sm font-medium">{task.title}</p>{task.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{task.description}</p>}</div></div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1.5"><span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-semibold text-primary">{task.assigneeName?.charAt(0).toUpperCase() ?? "?"}</span>{task.assignees && task.assignees.length > 1 ? `${task.assignees.length} assignees` : task.assigneeName ?? "Unassigned"}</span><span>{task.dueDate ? `Due ${shortDate(task.dueDate)}` : "No due date"}</span><span>AI est. {estimateHours(task)}h</span></div>
                    <div className="mt-3"><div className="flex items-center justify-between text-[10px] text-muted-foreground"><span>Progress</span><span>{taskProgress(task)}%</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${taskProgress(task)}%` }} /></div></div>
                    {(task.labels?.length ?? 0) > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{task.labels?.map((label) => <span key={label} className="rounded-md border bg-background/60 px-2 py-1 text-[10px] text-muted-foreground">{label}</span>)}</div>}
                    <div className="mt-3">
                      <Link
                        href={`/dashboard/tasks/${task.id}`}
                        className="inline-flex items-center text-xs font-medium text-primary hover:underline"
                        onClick={(event) => event.stopPropagation()}
                      >
                        View task details
                      </Link>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 text-[11px]">
                      <div className="min-w-0"><dt className="text-muted-foreground">Assignees</dt><dd className="mt-0.5 break-words font-medium">{task.assignees && task.assignees.length > 1 ? task.assignees.map((assignee) => assignee.name).join(", ") : task.assigneeName ?? "Unassigned"}</dd></div>
                      <div className="min-w-0"><dt className="text-muted-foreground">Assigned by</dt><dd className="mt-0.5 break-words font-medium">{task.assignedByName ?? "Unassigned"}</dd></div>
                      <div><dt className="text-muted-foreground">Assigned</dt><dd className="mt-0.5 font-medium">{task.assignedAt ? shortDate(task.assignedAt) : "—"}</dd></div>
                      <div><dt className="text-muted-foreground">Created</dt><dd className="mt-0.5 font-medium">{shortDate(task.createdAt)}</dd></div>
                    </dl>
                  </article>
                ))}
                {cards.length === 0 && <p className="rounded-lg border border-dashed bg-background/50 px-3 py-6 text-center text-xs text-muted-foreground">No tasks here</p>}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
