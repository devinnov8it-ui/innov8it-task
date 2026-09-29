"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";
import { philippineDateToUtcStart } from "@/lib/time";

const taskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(1).max(240),
  description: z.string().trim().max(5_000).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  dueDate: z.string().date().optional(),
});

const idSchema = z.string().uuid();
const assigneeIdsSchema = z.array(idSchema).max(20);
const assigneeProgressSchema = z.object({
  taskId: idSchema,
  userId: idSchema,
  progress: z.coerce.number().int().min(0).max(100),
});
const taskStatuses = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"] as const;
type TaskStatus = typeof taskStatuses[number];

function statusForProgress(progress: number): TaskStatus {
  if (progress >= 100) return "DONE";
  if (progress >= 75) return "REVIEW";
  if (progress > 0) return "IN_PROGRESS";
  return "TODO";
}
const read = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
};

async function createNotification(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  title: string,
  message: string,
) {
  await supabase.from("notifications").insert({
    user_id: userId,
    title,
    message,
  });
}

function finish(message: string, redirectPath = "/dashboard/tasks"): never {
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/board");
  revalidatePath("/dashboard/activity");
  revalidatePath("/dashboard");
  redirect(`${redirectPath}?notice=${encodeURIComponent(message)}`);
}

function buildActivityMessages(before: {
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  projectId: string;
}, after: {
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  projectId: string;
}) {
  const messages: string[] = [];

  if (before.title !== after.title) {
    messages.push(`updated the title from "${before.title}" to "${after.title}"`);
  }
  if ((before.description ?? "") !== (after.description ?? "")) {
    messages.push(`updated the description`);
  }
  if (before.status !== after.status) {
    messages.push(`changed status from ${before.status} to ${after.status}`);
  }
  if (before.priority !== after.priority) {
    messages.push(`changed priority from ${before.priority} to ${after.priority}`);
  }
  if ((before.dueDate ?? "") !== (after.dueDate ?? "")) {
    const beforeDue = before.dueDate ? before.dueDate.slice(0, 10) : "no due date";
    const afterDue = after.dueDate ? after.dueDate.slice(0, 10) : "no due date";
    messages.push(`updated the due date from ${beforeDue} to ${afterDue}`);
  }
  if (before.projectId !== after.projectId) {
    messages.push(`moved this task to a different project`);
  }

  return messages;
}

export async function createTask(form: FormData) {
  const assigneeIdsResult = assigneeIdsSchema.safeParse(
    form.getAll("assigneeIds").filter((value): value is string => typeof value === "string"),
  );
  if (!assigneeIdsResult.success || assigneeIdsResult.data.length === 0) {
    finish("Please assign this task to at least one team member.");
  }
  const assigneeIds = assigneeIdsResult.data;
  const parsed = taskSchema.safeParse({
    projectId: read(form, "projectId"), title: read(form, "title"),
    description: read(form, "description") || undefined, status: read(form, "status"),
    priority: read(form, "priority"), dueDate: read(form, "dueDate") || undefined,
  });
  if (!parsed.success) finish("Please check the task details.");
  const user = await requireUser();
  const supabase = await createClient();
  const selectedAssigneeIds = [...new Set(assigneeIds.length ? assigneeIds : [user.id])];
  const { data: task, error } = await supabase.from("tasks").insert({
    project_id: parsed.data.projectId, title: parsed.data.title,
    description: parsed.data.description ?? null, status: parsed.data.status,
    priority: parsed.data.priority,
    due_date: parsed.data.dueDate ? philippineDateToUtcStart(parsed.data.dueDate) : null,
    created_by_id: user.id,
  }).select("id").single();
  if (error || !task) finish("Unable to create task.");
  const { error: assigneeError } = await supabase.from("task_assignees").insert(
    selectedAssigneeIds.map((userId) => ({ task_id: task.id, user_id: userId, assigned_by_id: user.id })),
  );
  if (assigneeError) {
    await supabase.from("tasks").delete().eq("id", task.id);
    finish("Unable to assign the selected employees. Please try again.");
  }
  await Promise.all([
    supabase.from("activity_logs").insert({ task_id: task.id, user_id: user.id, action: "created this task" }),
    ...selectedAssigneeIds.map((assigneeId) => createNotification(supabase, assigneeId, "Task assigned", `You are assigned to ${parsed.data.title}.`)),
  ]);
  finish(`Task created and assigned to ${selectedAssigneeIds.length} employee${selectedAssigneeIds.length === 1 ? "" : "s"}.`);
}

export async function updateAssigneeProgress(form: FormData) {
  const parsed = assigneeProgressSchema.safeParse({
    taskId: read(form, "taskId"),
    userId: read(form, "userId"),
    progress: read(form, "progress"),
  });

  if (!parsed.success) {
    finish("Please provide a valid assignee progress value.");
  }

  const user = await requireUser();
  const supabase = await createClient();
  const { data: assignments, error: assignmentLookupError } = await supabase
    .from("task_assignees")
    .select("user_id")
    .eq("task_id", parsed.data.taskId);
  if (assignmentLookupError || (assignments ?? []).length < 2) {
    finish("Per-assignee progress is only available for shared tasks.");
  }

  const progress = parsed.data.progress;
  const { error } = await supabase
    .from("task_assignees")
    .update({ progress, status: statusForProgress(progress) })
    .eq("task_id", parsed.data.taskId)
    .eq("user_id", parsed.data.userId);

  if (error) {
    const legacyUpdate = await supabase
      .from("task_assignees")
      .update({ progress })
      .eq("task_id", parsed.data.taskId)
      .eq("user_id", parsed.data.userId);
    if (legacyUpdate?.error) finish("Unable to update assignee progress. Apply the latest Supabase schema first.");
  }

  const { data: updatedAssignments } = await supabase
    .from("task_assignees")
    .select("status, progress")
    .eq("task_id", parsed.data.taskId);
  const assignmentRows = updatedAssignments ?? [];
  const allAssigneesDone = assignmentRows.length > 1 && assignmentRows.every(
    (assignment) => assignment.status === "DONE" || Number(assignment.progress ?? 0) >= 100,
  );
  const someAssigneeStarted = assignmentRows.some((assignment) => Number(assignment.progress ?? 0) > 0);
  const overallStatus = allAssigneesDone
    ? "DONE"
    : someAssigneeStarted
      ? "IN_PROGRESS"
      : "TODO";
  await supabase
    .from("tasks")
    .update({ status: overallStatus })
    .eq("id", parsed.data.taskId);

  await createNotification(
    supabase,
    parsed.data.userId,
    "Progress updated",
    `${user.user_metadata?.name || user.email || "A team member"} updated your task progress to ${progress}%`,
  );

  const returnTo = read(form, "returnTo");
  const redirectTarget = returnTo && returnTo.startsWith("/dashboard/tasks") ? returnTo : "/dashboard/tasks";
  revalidatePath(`/dashboard/tasks/${parsed.data.taskId}`);
  finish("Assignee progress updated.", redirectTarget);
}

export async function updateTask(form: FormData) {
  const id = idSchema.safeParse(read(form, "id"));
  const parsed = taskSchema.safeParse({
    projectId: read(form, "projectId"), title: read(form, "title"),
    description: read(form, "description") || undefined, status: read(form, "status"),
    priority: read(form, "priority"), dueDate: read(form, "dueDate") || undefined,
  });
  if (!id.success || !parsed.success) finish("Please check the task details.");

  const user = await requireUser();
  const supabase = await createClient();
  const { data: currentTask, error: currentTaskError } = await supabase
    .from("tasks")
    .select("id, title, description, status, priority, due_date, project_id")
    .eq("id", id.data)
    .single();

  if (currentTaskError || !currentTask) finish("Unable to find the task.");

  const before = {
    title: currentTask.title,
    description: currentTask.description,
    status: currentTask.status,
    priority: currentTask.priority,
    dueDate: currentTask.due_date,
    projectId: currentTask.project_id,
  };

  const after = {
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    status: parsed.data.status,
    priority: parsed.data.priority,
    dueDate: parsed.data.dueDate ? philippineDateToUtcStart(parsed.data.dueDate) : null,
    projectId: parsed.data.projectId,
  };

  const { error } = await supabase.from("tasks").update({
    project_id: after.projectId,
    title: after.title,
    description: after.description,
    status: after.status,
    priority: after.priority,
    due_date: after.dueDate,
  }).eq("id", id.data);

  if (error) finish("Unable to update task.");

  const messages = buildActivityMessages(before, after);
  const activityWrites = messages.length > 0
    ? messages.map((message) =>
        supabase.from("activity_logs").insert({
          task_id: id.data,
          user_id: user.id,
          action: message,
        }),
      )
    : [
        supabase.from("activity_logs").insert({
          task_id: id.data,
          user_id: user.id,
          action: "updated this task",
        }),
      ];
  const notificationMessage = messages.length > 0
    ? messages.join(". ")
    : `Updated ${after.title}`;

  await Promise.all([
    ...activityWrites,
    createNotification(supabase, user.id, "Task updated", notificationMessage),
  ]);

  const returnTo = read(form, "returnTo");
  const redirectTarget = returnTo && returnTo.startsWith("/dashboard/tasks/") ? returnTo : "/dashboard/tasks";
  finish("Task updated.", redirectTarget);
}

export async function deleteTask(form: FormData) {
  const id = idSchema.safeParse(read(form, "id"));
  if (!id.success) finish("Invalid task.");
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id.data);
  if (error) finish("Unable to delete task.");
  finish("Task deleted.");
}
