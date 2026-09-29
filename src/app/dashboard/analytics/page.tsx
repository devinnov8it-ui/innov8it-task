import { Activity, CheckCircle2, Clock3, Target } from "lucide-react";
import { requireUser } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

const statuses = [
  { value: "TODO", label: "To do", color: "bg-slate-400" },
  { value: "IN_PROGRESS", label: "In progress", color: "bg-brand-teal" },
  { value: "REVIEW", label: "Review", color: "bg-brand-gold" },
  { value: "DONE", label: "Done", color: "bg-green-500" },
] as const;

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function formatDate(value: Date) {
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default async function AnalyticsPage() {
  await requireUser();
  const supabase = await createClient({ readOnly: true });
  const now = new Date();
  const lastThirtyDays = new Date(now);
  lastThirtyDays.setUTCDate(lastThirtyDays.getUTCDate() - 30);
  const [totalResult, completedResult, overdueResult, recentResult, ...statusResults] = await Promise.all([
    supabase.from("tasks").select("id", { count: "exact", head: true }),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "DONE"),
    supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "DONE").lt("due_date", now.toISOString()),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "DONE").gte("updated_at", lastThirtyDays.toISOString()),
    ...statuses.map(({ value }) => supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", value)),
  ]);

  const results = [totalResult, completedResult, overdueResult, recentResult, ...statusResults];
  const error = results.find((result) => result?.error)?.error ?? null;
  const totalTasks = totalResult?.count ?? 0;
  const completedTasks = completedResult?.count ?? 0;
  const completionRate = totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;
  const overdueTasks = overdueResult?.count ?? 0;
  const recentlyCompleted = recentResult?.count ?? 0;
  const statusCounts = Object.fromEntries(statuses.map(({ value }, index) => [value, statusResults[index]?.count ?? 0])) as Record<(typeof statuses)[number]["value"], number>;
  const highestStatusCount = Math.max(1, ...statuses.map(({ value }) => statusCounts[value]));

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Workspace insights
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          See how work is moving across your task pipeline.
        </p>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive">
          Analytics are unavailable until the Supabase schema is applied.
        </p>
      ) : (
        <>
          <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Completion rate", value: formatPercent(completionRate), detail: `${completedTasks} of ${totalTasks} tasks done`, icon: Target },
              { label: "Completed in 30 days", value: String(recentlyCompleted), detail: "Recently finished tasks", icon: CheckCircle2 },
              { label: "Overdue tasks", value: String(overdueTasks), detail: "Open tasks past due", icon: Clock3 },
              { label: "Total tasks", value: String(totalTasks), detail: "Across active work", icon: Activity },
            ].map(({ label, value, detail, icon: Icon }) => (
              <Card key={label}>
                <CardContent>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <Icon className="size-4 text-primary" aria-hidden="true" />
                  </div>
                  <p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
                </CardContent>
              </Card>
            ))}
          </section>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle>Work by status</CardTitle>
                <p className="text-sm text-muted-foreground">Current distribution of your tasks.</p>
              </CardHeader>
              <CardContent className="space-y-5">
                {statuses.map(({ value, label, color }) => {
                  const count = statusCounts[value];
                  const width = `${(count / highestStatusCount) * 100}%`;
                  return (
                    <div key={value}>
                      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium">{label}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                        <div className={`h-full rounded-full ${color}`} style={{ width }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Productivity snapshot</CardTitle>
                <p className="text-sm text-muted-foreground">A quick view of recent momentum.</p>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border bg-muted/25 p-4">
                  <p className="text-sm font-medium">Last 30 days</p>
                  <p className="mt-2 text-4xl font-semibold text-primary">{recentlyCompleted}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {recentlyCompleted === 1 ? "task completed" : "tasks completed"} since {formatDate(lastThirtyDays)}.
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm">
                  <span className="text-muted-foreground">Open work</span>
                  <span className="font-semibold">{totalTasks - completedTasks}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
