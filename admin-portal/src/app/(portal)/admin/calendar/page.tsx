import { cookies } from "next/headers";
import { TaskCalendar } from "@/features/admin/TaskCalendar";
import { loadAdminTasks } from "@/features/admin/admin-data";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const metadata = { title: "Task Calendar" };

export default async function AdminCalendarPage({ searchParams }: { searchParams: Promise<{ month?: string; notice?: string }> }) {
  const params = await searchParams;
  const match = params.month?.match(/^(\d{4})-(\d{2})$/);
  const requested = match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)) : new Date();
  const month = Number.isNaN(requested.getTime()) || requested.getUTCMonth() !== (match ? Number(match[2]) - 1 : requested.getUTCMonth())
    ? new Date()
    : requested;
  const from = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1)).toISOString();
  const before = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1)).toISOString();
  const cookieStore = await cookies();
  const preference = cookieStore.get("admin-week-start")?.value;
  const weekStart = preference === "Monday" ? "Monday" : "Sunday";
  const result = await loadAdminTasks(createSupabaseAdminClient(), { from, before });

  const notice = params.notice === "sent"
    ? "Reminder sent to the task assignees."
    : params.notice === "unassigned"
      ? "This task has no assignees to notify."
      : params.notice === "completed"
        ? "Completed tasks do not need reminders."
        : params.notice === "missing"
          ? "That task could not be found."
          : params.notice === "invalid"
            ? "The task reminder request was invalid."
            : params.notice === "error"
              ? "The task reminder could not be sent. Please try again."
              : undefined;

  return <TaskCalendar tasks={result.tasks} month={month} weekStart={weekStart} error={result.error} notice={notice} />;
}
