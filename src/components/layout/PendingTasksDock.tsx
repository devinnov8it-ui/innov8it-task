"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, BellRing, Clock3 } from "lucide-react";
import { getDeadlineState } from "@/lib/deadline";
import { formatPhilippineTime } from "@/lib/time";

export type PendingTask = {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  due_date: string | null;
};

const statusLabels = { TODO: "To do", IN_PROGRESS: "In progress", REVIEW: "In review", DONE: "Completed" } as const;
const priorityStyles = { LOW: "text-muted-foreground", MEDIUM: "text-primary", HIGH: "text-brand-gold", CRITICAL: "text-destructive" } as const;

function formatReminderBody(tasks: PendingTask[], pendingTaskCount: number) {
  const lines = tasks.slice(0, 4).map((task) => {
    const deadline = getDeadlineState(task.due_date, task.status);
    const dueLabel = task.due_date
      ? `${deadline.label} at ${formatPhilippineTime(task.due_date)}`
      : deadline.label;
    return `${task.title}: ${dueLabel} · ${statusLabels[task.status]}`;
  });
  const remainingCount = Math.max(0, pendingTaskCount - lines.length);
  if (remainingCount > 0) {
    lines.push(`${remainingCount} more assigned task${remainingCount === 1 ? "" : "s"}`);
  }
  return lines.join(" • ") || "No unfinished tasks are currently assigned to you.";
}

export function TaskReminderControl({
  tasks,
  pendingTaskCount,
  overdueTaskCount,
}: {
  tasks: PendingTask[];
  pendingTaskCount: number;
  overdueTaskCount: number;
}) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported" | "error" | null>(null);

  useEffect(() => {
    setPermission("Notification" in window ? Notification.permission : "unsupported");
  }, []);

  useEffect(() => {
    if (pendingTaskCount === 0) return;

    const confirmLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const confirmAppExit = () => window.removeEventListener("beforeunload", confirmLeave);

    window.addEventListener("beforeunload", confirmLeave);
    window.addEventListener("pending-task-exit-confirmed", confirmAppExit);
    return () => {
      window.removeEventListener("beforeunload", confirmLeave);
      window.removeEventListener("pending-task-exit-confirmed", confirmAppExit);
    };
  }, [pendingTaskCount, permission]);

  const enableReminders = async () => {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setPermission("denied");
      return;
    }

    try {
      if (Notification.permission === "granted") {
        new Notification("Reminders are on", {
          body: formatReminderBody(tasks, pendingTaskCount),
          tag: "innov8it-reminders-test",
        });
        return;
      }

      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission === "granted") {
        new Notification("Task reminders enabled", {
          body: formatReminderBody(tasks, pendingTaskCount),
          tag: "innov8it-reminders-enabled",
        });
      }
    } catch {
      setPermission("error");
    }
  };

  const label = permission === "granted"
    ? "Reminders on"
    : permission === "denied"
      ? "Notifications blocked. Allow them in this site's browser settings."
      : permission === "unsupported"
        ? "Notifications unavailable"
        : permission === "error"
          ? "Could not enable reminders. Try again."
          : "Enable reminders";
  const compactLabel = permission === "granted"
    ? "On"
    : permission === "denied"
      ? "Blocked"
      : permission === "unsupported"
        ? "Unavailable"
        : permission === "error"
          ? "Retry"
          : "Enable";

  return (
    <button
      type="button"
      onClick={enableReminders}
      disabled={permission === "unsupported"}
      aria-label={label}
      title={label}
      aria-pressed={permission === "granted"}
      className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border bg-card px-2.5 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 sm:px-3 sm:text-sm"
    >
      <BellRing className="size-4" aria-hidden="true" />
      <span className="sm:hidden">{compactLabel}</span>
      <span className="hidden sm:inline">{permission === "denied" ? "Blocked" : permission === "unsupported" ? "Unavailable" : permission === "error" ? "Retry" : label}</span>
    </button>
  );
}

function formatTaskDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function PendingTasksDock({
  tasks: forcedTasks,
  pendingTaskCount = forcedTasks?.length ?? 0,
  overdueTaskCount = 0,
}: {
  tasks?: PendingTask[];
  pendingTaskCount?: number;
  overdueTaskCount?: number;
}) {
  const [tasks, setTasks] = useState<PendingTask[]>(forcedTasks ?? []);
  const [isMinimized, setIsMinimized] = useState(false);
  const [mounted, setMounted] = useState(false);
  const notificationSent = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (forcedTasks) {
      setTasks(forcedTasks);
      return;
    }

    const content = document.getElementById("main-content");
    if (!content) return;

    const extractTasks = (): PendingTask[] => {
      const anchors = Array.from(content.querySelectorAll('a[href*="/dashboard/tasks/"]')) as HTMLAnchorElement[];
      const titles = new Map<string, PendingTask>();

      anchors.forEach((anchor) => {
        const title = anchor.textContent?.trim();
        if (!title) return;

        const href = anchor.getAttribute("href") || "";
        const id = href.split("/dashboard/tasks/").at(-1)?.split("?")[0] || title;

        if (!titles.has(id)) {
          titles.set(id, {
            id,
            title,
            status: "TODO",
            priority: "MEDIUM",
            due_date: null,
          });
        }
      });

      const fallback: PendingTask[] = [
        {
          id: "pending-tasks-overview",
          title: "Review pending tasks",
          status: "IN_PROGRESS",
          priority: "HIGH",
          due_date: null,
        },
      ];

      const nextTasks = Array.from(titles.values()).slice(0, 4);
      return nextTasks.length > 0 ? nextTasks : fallback;
    };

    const syncTasks = () => {
      const nextTasks = extractTasks();
      setTasks((currentTasks) => {
        const unchanged = currentTasks.length === nextTasks.length && currentTasks.every((task, index) => {
          const nextTask = nextTasks[index];
          if (!nextTask) return false;
          return task.id === nextTask.id
            && task.title === nextTask.title
            && task.status === nextTask.status
            && task.priority === nextTask.priority
            && task.due_date === nextTask.due_date;
        });
        return unchanged ? currentTasks : nextTasks;
      });
    };
    syncTasks();

    const observer = new MutationObserver(syncTasks);
    observer.observe(content, { childList: true, subtree: true, characterData: true });

    return () => observer.disconnect();
  }, [forcedTasks]);

  useEffect(() => {
    const initiallyMinimized = document.visibilityState === "hidden" || !document.hasFocus();
    setIsMinimized(initiallyMinimized);
    notificationSent.current = initiallyMinimized;

    const updateVisibility = () => {
      const shouldShow = document.visibilityState === "hidden" || !document.hasFocus();
      setIsMinimized(shouldShow);

      if (!shouldShow) {
        notificationSent.current = false;
        return;
      }
      if (notificationSent.current) return;
      notificationSent.current = true;
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      if (pendingTaskCount === 0) return;

      const title = overdueTaskCount > 0
        ? `You have ${overdueTaskCount} overdue task${overdueTaskCount === 1 ? "" : "s"}`
        : `You have ${pendingTaskCount} pending task${pendingTaskCount === 1 ? "" : "s"}`;
      new Notification(title, {
        body: formatReminderBody(tasks, pendingTaskCount),
        tag: "innov8it-pending-tasks",
      });
    };

    document.addEventListener("visibilitychange", updateVisibility);
    window.addEventListener("blur", updateVisibility);
    window.addEventListener("focus", updateVisibility);

    return () => {
      document.removeEventListener("visibilitychange", updateVisibility);
      window.removeEventListener("blur", updateVisibility);
      window.removeEventListener("focus", updateVisibility);
    };
  }, [overdueTaskCount, pendingTaskCount, tasks]);

  const visibleTasks = tasks.slice(0, 4);

  if (!mounted || !isMinimized || visibleTasks.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100] w-[min(92vw,22rem)] rounded-2xl border border-border bg-card/95 p-3 shadow-2xl shadow-black/20 backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Pending tasks
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          {pendingTaskCount}
        </span>
      </div>

      <div className="space-y-2">
        {visibleTasks.map((task) => (
          <Link
            key={task.id}
            href={`/dashboard/tasks/${task.id}`}
            className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/70 p-2.5 transition hover:border-primary/40 hover:bg-muted/40"
          >
            <span
              className={`mt-0.5 size-2 shrink-0 rounded-full ${
                task.status === "REVIEW"
                  ? "bg-brand-gold"
                  : task.status === "IN_PROGRESS"
                    ? "bg-brand-teal"
                    : "bg-primary"
              }`}
              aria-hidden="true"
            />

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-foreground">{task.title}</span>
                <span className={`text-[9px] font-semibold uppercase ${priorityStyles[task.priority]}`}>
                  {task.priority}
                </span>
              </div>

              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span>{statusLabels[task.status]}</span>
                {formatTaskDate(task.due_date) ? (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="size-3" aria-hidden="true" />
                      {formatTaskDate(task.due_date)}
                    </span>
                  </>
                ) : null}
              </div>
            </div>

            <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </div>
  );
}
