"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";

const inputSchema = z.object({
  taskId: z.string().uuid(),
  status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]),
});

const progressForStatus = {
  TODO: 0,
  IN_PROGRESS: 50,
  REVIEW: 80,
  DONE: 100,
} as const;

export async function moveTask(input: { taskId: string; status: string }) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid task move." };

  const user = await requireUser();
  const supabase = await createClient();
  const { data: assignment } = await supabase
    .from("task_assignees")
    .select("user_id, progress")
    .eq("task_id", parsed.data.taskId)
    .eq("user_id", user.id)
    .maybeSingle();
  const { data: allAssignments } = await supabase
    .from("task_assignees")
    .select("user_id")
    .eq("task_id", parsed.data.taskId);
  const isSharedTask = (allAssignments ?? []).length > 1;
  const { error: assignmentError } = isSharedTask && assignment
    ? await supabase.from("task_assignees").update({ status: parsed.data.status, progress: progressForStatus[parsed.data.status] }).eq("task_id", parsed.data.taskId).eq("user_id", user.id)
    : { error: null };
  if (assignmentError) {
    const legacyTask = await supabase
      .from("tasks")
      .update({ status: parsed.data.status })
      .eq("id", parsed.data.taskId)
      .select("id")
      .maybeSingle();
    if (legacyTask?.error || !legacyTask?.data) return { ok: false, message: "Unable to update task status." };
  }

  const { data: assignments } = isSharedTask ? await supabase
    .from("task_assignees")
    .select("status")
    .eq("task_id", parsed.data.taskId) : { data: [] };
  const statuses = (assignments ?? []).map((item) => item.status);
  const overallStatus = statuses.length > 0
    ? statuses.every((status) => status === "DONE")
      ? "DONE"
      : statuses.every((status) => status === "TODO")
        ? "TODO"
        : statuses.every((status) => status === "DONE" || status === "REVIEW")
          ? "REVIEW"
          : "IN_PROGRESS"
    : parsed.data.status;
  const { data: updatedTask, error } = await supabase
    .from("tasks")
    .update({ status: overallStatus })
    .eq("id", parsed.data.taskId)
    .select("id")
    .maybeSingle();
  if (error || !updatedTask) return { ok: false, message: "Unable to update task status." };
  await supabase.from("activity_logs").insert({
    task_id: parsed.data.taskId,
    user_id: user.id,
    action: `moved task to ${parsed.data.status.toLowerCase().replace("_", " ")}`,
  });
  await supabase.from("notifications").insert({
    user_id: user.id,
    title: "Task status updated",
    message: `A task was moved to ${parsed.data.status.toLowerCase().replace("_", " ")}.`,
  });

  revalidatePath("/dashboard/board");
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/activity");
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
