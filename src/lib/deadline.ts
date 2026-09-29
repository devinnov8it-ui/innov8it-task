import { formatPhilippineDate, getPhilippineDateKey, getPhilippineTodayKey } from "./time";

export type DeadlineState = "overdue" | "today" | "tomorrow" | "soon" | "scheduled" | "none";

export function getDeadlineState(value: string | null, status: string, todayKey = getPhilippineTodayKey()) {
  if (!value || status === "DONE") return { state: "none" as const, label: status === "DONE" ? "Completed" : "No due date" };
  const dueDay = Date.parse(`${getPhilippineDateKey(value)}T00:00:00Z`);
  const todayDay = Date.parse(`${todayKey}T00:00:00Z`);
  const days = Math.round((dueDay - todayDay) / 86_400_000);
  if (days < 0) return { state: "overdue" as const, label: `${Math.abs(days)}d overdue` };
  if (days === 0) return { state: "today" as const, label: "Due today" };
  if (days === 1) return { state: "tomorrow" as const, label: "Due tomorrow" };
  if (days <= 3) return { state: "soon" as const, label: `Due in ${days}d` };
  return { state: "scheduled" as const, label: `Due ${formatPhilippineDate(value)}` };
}

export const deadlineStyles: Record<DeadlineState, string> = {
  overdue: "border-destructive/30 bg-destructive/10 text-destructive",
  today: "border-brand-gold/40 bg-brand-gold/10 text-brand-gold",
  tomorrow: "border-brand-gold/30 bg-brand-gold/5 text-brand-gold",
  soon: "border-primary/30 bg-primary/5 text-primary",
  scheduled: "border-border bg-muted/40 text-muted-foreground",
  none: "border-border bg-muted/30 text-muted-foreground",
};
