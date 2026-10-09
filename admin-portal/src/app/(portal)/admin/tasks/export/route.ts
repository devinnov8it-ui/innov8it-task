import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { loadAdminTasks } from "@/features/admin/admin-data";
import { getTaskPeriodRange } from "@/features/admin/task-period";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { cookies } from "next/headers";

function csvCell(value: string | number | null) {
  const text = value === null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: NextRequest) {
  await requireAdmin();
  const employeeId = request.nextUrl.searchParams.get("employeeId");
  if (!employeeId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(employeeId)) {
    return NextResponse.json({ error: "A valid employee ID is required." }, { status: 400 });
  }
  const period = request.nextUrl.searchParams.get("period") ?? "";
  const date = request.nextUrl.searchParams.get("date") ?? "";
  const cookieStore = await cookies();
  const weekStart = cookieStore.get("admin-week-start")?.value === "Monday" ? "Monday" : "Sunday";
  const range = getTaskPeriodRange(period, date, weekStart);
  if (!range) return NextResponse.json({ error: "Choose a valid day, week, or month and date." }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const [tasksResult, employeeResult] = await Promise.all([
    loadAdminTasks(supabase, range),
    supabase.from("users").select("id, name, email").eq("id", employeeId).maybeSingle(),
  ]);
  if (tasksResult.error || employeeResult.error) {
    return NextResponse.json({ error: "Employee tasks could not be loaded." }, { status: 500 });
  }
  if (!employeeResult.data) return NextResponse.json({ error: "Employee not found." }, { status: 404 });

  const employee = employeeResult.data;
  const rows = tasksResult.tasks.flatMap((task) => task.assignments
    .filter((assignment) => assignment.userId === employeeId)
    .map((assignment) => [
      task.title,
      task.projectName,
      task.status,
      task.priority,
      assignment.status,
      assignment.status === "DONE" ? 100 : assignment.progress,
      task.due_date,
      task.updated_at,
    ]));
  const headers = ["Task", "Project", "Task status", "Priority", "Employee status", "Progress (%)", "Due date", "Last updated"];
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const filename = `tasks-${employee.email.replace(/[^a-zA-Z0-9._-]/g, "_")}-${period}-${date}.csv`;

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
