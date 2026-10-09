import { cookies } from "next/headers";
import { TaskManager } from "@/features/admin/TaskManager";
import { loadAdminActivity, loadAdminTasks } from "@/features/admin/admin-data";
import { getTaskPeriodRange } from "@/features/admin/task-period";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const metadata = { title: "Task Manager" };

export default async function AdminTasksPage({ searchParams }: { searchParams: Promise<{ employeeId?: string; period?: string; date?: string; notice?: string; error?: string }> }) {
  const supabase = createSupabaseAdminClient();
  const [params, cookieStore] = await Promise.all([searchParams, cookies()]);
  const period = params.period === "day" || params.period === "month" ? params.period : "week";
  const weekStart = cookieStore.get("admin-week-start")?.value === "Monday" ? "Monday" : "Sunday";
  const today = new Date().toISOString().slice(0, 10);
  const requestedDate = params.date ?? today;
  const validRange = getTaskPeriodRange(period, requestedDate, weekStart);
  const date = validRange ? requestedDate : today;
  const range = validRange ?? getTaskPeriodRange(period, date, weekStart);
  const [tasks, activity, projectsResult, employeesResult] = await Promise.all([
    loadAdminTasks(supabase, params.employeeId && range ? range : {}),
    loadAdminActivity(supabase),
    supabase.from("projects").select("id, name, status").order("name"),
    supabase.from("users").select("id, name, email").order("name"),
  ]);

  return <TaskManager
    tasks={tasks.tasks}
    projects={projectsResult.data ?? []}
    employees={employeesResult.data ?? []}
    activity={activity.activity}
    selectedEmployeeId={params.employeeId}
    selectedPeriod={period}
    selectedDate={date}
    notice={params.notice}
    errorCode={params.error}
    error={tasks.error || activity.error || Boolean(projectsResult.error) || Boolean(employeesResult.error)}
  />;
}
