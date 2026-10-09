"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const taskIdSchema = z.string().uuid();
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

function finish(month: string, notice: string): never {
  redirect(`/admin/calendar?month=${encodeURIComponent(month)}&notice=${encodeURIComponent(notice)}`);
}

export async function notifyTaskAssignees(formData: FormData): Promise<void> {
  const taskId = taskIdSchema.safeParse(formData.get("taskId"));
  const month = monthSchema.safeParse(formData.get("month"));
  if (!taskId.success || !month.success) finish("invalid", "error");

  await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("id, title, status, due_date")
    .eq("id", taskId.data)
    .maybeSingle();
  if (taskError) {
    console.error("Failed to load task for admin reminder", { code: taskError.code });
    finish(month.data, "error");
  }
  if (!task) finish(month.data, "missing");
  if (task.status === "DONE") finish(month.data, "completed");

  const { data: assignees, error: assigneesError } = await supabase
    .from("task_assignees")
    .select("user_id")
    .eq("task_id", task.id);
  if (assigneesError) {
    console.error("Failed to load task assignees for admin reminder", { code: assigneesError.code, taskId: task.id });
    finish(month.data, "error");
  }

  const userIds = [...new Set(assignees.map((assignee) => assignee.user_id))];
  if (userIds.length === 0) finish(month.data, "unassigned");

  const dueText = task.due_date
    ? ` It is due ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(task.due_date))}.`
    : "";
  const { error: notificationError } = await supabase.from("notifications").insert(
    userIds.map((userId) => ({
      user_id: userId,
      title: "Task reminder",
      message: `Reminder: "${task.title}" is still ${task.status.toLowerCase().replaceAll("_", " ")}.${dueText}`,
    })),
  );
  if (notificationError) {
    console.error("Failed to notify task assignees", { code: notificationError.code, taskId: task.id });
    finish(month.data, "error");
  }

  revalidatePath("/admin/calendar");
  revalidatePath("/admin", "layout");
  finish(month.data, "sent");
}
