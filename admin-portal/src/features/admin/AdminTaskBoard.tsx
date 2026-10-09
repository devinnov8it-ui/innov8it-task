"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Pencil } from "lucide-react";
import type { AdminTask } from "./admin-data";
import { formatTaskStatus, taskStatusStyles } from "./admin-data";
import { updateAdminTaskStatus } from "@/app/(portal)/admin/tasks/actions";

const columns: { id: AdminTask["status"]; title: string }[] = [
  { id: "TODO", title: "To do" },
  { id: "IN_PROGRESS", title: "In progress" },
  { id: "REVIEW", title: "Review" },
  { id: "DONE", title: "Done" },
];

const priorityStyles: Record<AdminTask["priority"], string> = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-amber-100 text-amber-800",
  CRITICAL: "bg-rose-100 text-rose-800",
};

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function AdminTaskBoard({ tasks, onEdit }: { tasks: AdminTask[]; onEdit: (taskId: string) => void }) {
  const router = useRouter();
  const [optimisticTasks, moveOptimistically] = useOptimistic(
    tasks,
    (current, move: { id: string; status: AdminTask["status"] }) =>
      current.map((task) => task.id === move.id ? { ...task, status: move.status } : task),
  );
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function moveTask(taskId: string, status: AdminTask["status"]) {
    const task = optimisticTasks.find((item) => item.id === taskId);
    if (!task || task.status === status) return;
    setError(null);
    startTransition(async () => {
      moveOptimistically({ id: taskId, status });
      const result = await updateAdminTaskStatus({ taskId, status });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
      <div className="grid gap-4 xl:grid-cols-4">
        {columns.map((column) => {
          const cards = optimisticTasks.filter((task) => task.status === column.id);
          return (
            <section
              key={column.id}
              aria-labelledby={`admin-task-column-${column.id}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (draggedId) moveTask(draggedId, column.id);
                setDraggedId(null);
              }}
              className="min-h-64 rounded-xl border bg-muted/30 p-3"
            >
              <header className="mb-3 flex items-center justify-between px-1">
                <h3 id={`admin-task-column-${column.id}`} className="text-sm font-semibold">{column.title}</h3>
                <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">{cards.length}</span>
              </header>
              <div className="space-y-3">
                {cards.map((task) => {
                  const progress = task.assignments.length
                    ? Math.round(task.assignments.reduce((total, assignment) => total + assignment.progress, 0) / task.assignments.length)
                    : task.status === "DONE" ? 100 : 0;
                  return (
                    <article
                      key={task.id}
                      draggable={!pending}
                      onDragStart={() => setDraggedId(task.id)}
                      onDragEnd={() => setDraggedId(null)}
                      className="cursor-grab rounded-lg border bg-card p-4 shadow-sm active:cursor-grabbing"
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${priorityStyles[task.priority]}`}>{task.priority}</span>
                          <h4 className="mt-2 text-sm font-medium">{task.title}</h4>
                          <p className="mt-1 truncate text-xs text-muted-foreground">{task.projectName}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onEdit(task.id)}
                          aria-label={`Edit ${task.title}`}
                          className="grid size-8 shrink-0 place-items-center rounded-md border hover:bg-muted"
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                      {task.description && <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>}
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${taskStatusStyles[task.status]}`}>{formatTaskStatus(task.status)}</span>
                        <label className="sr-only" htmlFor={`admin-status-${task.id}`}>Change status for {task.title}</label>
                        <select
                          id={`admin-status-${task.id}`}
                          value={task.status}
                          disabled={pending}
                          onChange={(event) => moveTask(task.id, event.target.value as AdminTask["status"])}
                          className="max-w-32 rounded-md border bg-background px-2 py-1 text-xs"
                        >
                          {columns.map((option) => <option key={option.id} value={option.id}>{option.title}</option>)}
                        </select>
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground"><span>Assignee progress</span><span>{progress}%</span></div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} /></div>
                      </div>
                      <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                        <p className="line-clamp-2">{task.assignments.length ? task.assignments.map((assignment) => assignment.name?.trim() || assignment.email).join(", ") : "Unassigned"}</p>
                        <p>{task.due_date ? `Due ${dateFormat.format(new Date(task.due_date))}` : "No due date"}</p>
                      </div>
                    </article>
                  );
                })}
                {cards.length === 0 && <p className="rounded-lg border border-dashed bg-background/50 px-3 py-6 text-center text-xs text-muted-foreground">No tasks here</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
