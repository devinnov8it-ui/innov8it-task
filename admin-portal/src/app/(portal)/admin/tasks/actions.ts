"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const taskIdSchema = z.string().uuid();
const taskStatusSchema = z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]);
const taskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(1).max(240),
  description: z.string().trim().max(5000),
  status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  dueDate: z.string(),
  assigneeIds: z.array(z.string().uuid()).max(100),
});

function field(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

function fail(code: string): never {
  redirect(`/admin/tasks?error=${encodeURIComponent(code)}`);
}

function finish(notice: string): never {
  for (const path of ["/admin", "/admin/tasks", "/admin/calendar", "/admin/analytics", "/dashboard", "/dashboard/tasks", "/dashboard/board", "/dashboard/calendar", "/dashboard/analytics"]) {
    revalidatePath(path);
  }
  redirect(`/admin/tasks?notice=${encodeURIComponent(notice)}`);
}

function parseTask(form: FormData) {
  const assigneeIds = form.getAll("assigneeIds").filter((value): value is string => typeof value === "string");
  return taskSchema.safeParse({
    projectId: field(form, "projectId"),
    title: field(form, "title"),
    description: field(form, "description"),
    status: field(form, "status"),
    priority: field(form, "priority"),
    dueDate: field(form, "dueDate"),
    assigneeIds,
  });
}

function validateDueDate(value: string) {
  if (!value) return null;
  const timestamp = new Date(`${value}:00.000Z`);
  if (Number.isNaN(timestamp.getTime()) || timestamp.toISOString().slice(0, 16) !== value) return undefined;
  return timestamp.toISOString();
}

async function validateReferences(projectId: string, assigneeIds: string[]) {
  const supabase = createSupabaseAdminClient();
  const [projectResult, usersResult] = await Promise.all([
    supabase.from("projects").select("id").eq("id", projectId).maybeSingle(),
    assigneeIds.length ? supabase.from("users").select("id").in("id", assigneeIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (projectResult.error || usersResult.error) fail("data");
  if (!projectResult.data || usersResult.data.length !== assigneeIds.length) fail("references");
  return supabase;
}

async function replaceAssignees(supabase: ReturnType<typeof createSupabaseAdminClient>, taskId: string, assigneeIds: string[], adminId: string, taskStatus: string) {
  const { data: current, error: readError } = await supabase.from("task_assignees").select("user_id").eq("task_id", taskId);
  if (readError) fail("assignees");
  const currentIds = new Set(current.map((assignment) => assignment.user_id));
  const nextIds = new Set(assigneeIds);
  const removedIds = [...currentIds].filter((id) => !nextIds.has(id));
  const addedIds = [...nextIds].filter((id) => !currentIds.has(id));

  if (addedIds.length) {
    const { error } = await supabase.from("task_assignees").insert(
      addedIds.map((userId) => ({
        task_id: taskId,
        user_id: userId,
        assigned_by_id: adminId,
        status: taskStatus,
        progress: taskStatus === "DONE" ? 100 : 0,
      })),
    );
    if (error) fail("assignees");
    const { data: task } = await supabase.from("tasks").select("title").eq("id", taskId).maybeSingle();
    const { error: notificationError } = await supabase.from("notifications").insert(
      addedIds.map((userId) => ({ user_id: userId, title: "Task assigned", message: `You are assigned to ${task?.title ?? "a task"}.` })),
    );
    if (notificationError) console.error("Task was assigned but assignee notifications failed", { code: notificationError.code, taskId });
  }
  if (removedIds.length) {
    const { error } = await supabase.from("task_assignees").delete().eq("task_id", taskId).in("user_id", removedIds);
    if (error) fail("assignees");
  }
}

export async function createAdminTask(form: FormData): Promise<void> {
  const parsed = parseTask(form);
  if (!parsed.success) fail("invalid");
  const dueDate = validateDueDate(parsed.data.dueDate);
  if (dueDate === undefined) fail("invalid");
  const admin = await requireAdmin();
  const supabase = await validateReferences(parsed.data.projectId, parsed.data.assigneeIds);
  const { data: task, error } = await supabase.from("tasks").insert({
    project_id: parsed.data.projectId,
    title: parsed.data.title,
    description: parsed.data.description || null,
    status: parsed.data.status,
    priority: parsed.data.priority,
    due_date: dueDate,
    created_by_id: admin.id,
  }).select("id").single();
  if (error || !task) {
    if (error) console.error("Admin task creation failed", { code: error.code });
    fail("create");
  }
  if (parsed.data.assigneeIds.length) {
    const { error: assignmentError } = await supabase.from("task_assignees").insert(
      parsed.data.assigneeIds.map((userId) => ({
        task_id: task.id,
        user_id: userId,
        assigned_by_id: admin.id,
        status: parsed.data.status,
        progress: parsed.data.status === "DONE" ? 100 : 0,
      })),
    );
    if (assignmentError) {
      await supabase.from("tasks").delete().eq("id", task.id);
      console.error("Admin task creation assignment failed", { code: assignmentError.code, taskId: task.id });
      fail("assignees");
    }
    const { error: notificationError } = await supabase.from("notifications").insert(
      parsed.data.assigneeIds.map((userId) => ({ user_id: userId, title: "Task assigned", message: `You are assigned to ${parsed.data.title}.` })),
    );
    if (notificationError) console.error("Task was created but assignee notifications failed", { code: notificationError.code, taskId: task.id });
  }
  const { error: activityError } = await supabase.from("activity_logs").insert({ task_id: task.id, user_id: admin.id, action: "created this task" });
  if (activityError) console.error("Admin task created but activity logging failed", { code: activityError.code, taskId: task.id });
  finish("Task created.");
}

export async function updateAdminTask(form: FormData): Promise<void> {
  const id = taskIdSchema.safeParse(field(form, "id"));
  const parsed = parseTask(form);
  if (!id.success || !parsed.success) fail("invalid");
  const dueDate = validateDueDate(parsed.data.dueDate);
  if (dueDate === undefined) fail("invalid");
  const admin = await requireAdmin();
  const supabase = await validateReferences(parsed.data.projectId, parsed.data.assigneeIds);
  const { data: currentTask, error: currentTaskError } = await supabase.from("tasks").select("status").eq("id", id.data).maybeSingle();
  if (currentTaskError) {
    console.error("Admin task status lookup failed", { code: currentTaskError.code, taskId: id.data });
    fail("data");
  }

  if (!currentTask) fail("missing");

  const { error } = await supabase.from("tasks").update({
    project_id: parsed.data.projectId,
    title: parsed.data.title,
    description: parsed.data.description || null,
    status: parsed.data.status,
    priority: parsed.data.priority,
    due_date: dueDate,
  }).eq("id", id.data);
  if (error) {
    console.error("Admin task update failed", { code: error.code, taskId: id.data });
    fail("update");
  }

  if (currentTask.status !== parsed.data.status) {
    const { error: assignmentStatusError } = await supabase.from("task_assignees").update({
      status: parsed.data.status,
      progress: parsed.data.status === "DONE" ? 100 : 0,
    }).eq("task_id", id.data);
    if (assignmentStatusError) {
      console.error("Task status changed but assignee statuses could not be synchronized", { code: assignmentStatusError.code, taskId: id.data });
      fail("assignee-status");
    }
  }
  await replaceAssignees(supabase, id.data, parsed.data.assigneeIds, admin.id, parsed.data.status);
  const { error: activityError } = await supabase.from("activity_logs").insert({ task_id: id.data, user_id: admin.id, action: "updated this task" });
  if (activityError) console.error("Admin task updated but activity logging failed", { code: activityError.code, taskId: id.data });
  finish("Task updated.");
}

export async function updateAdminTaskStatus(input: {
  taskId: string;
  status: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const taskId = taskIdSchema.safeParse(input.taskId);
  const status = taskStatusSchema.safeParse(input.status);
  if (!taskId.success || !status.success) {
    return { ok: false, message: "Invalid task status. Refresh and try again." };
  }
  const admin = await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const { data: task, error: lookupError } = await supabase
    .from("tasks")
    .select("status")
    .eq("id", taskId.data)
    .maybeSingle();
  if (lookupError) {
    console.error("Admin board task lookup failed", { code: lookupError.code, taskId: taskId.data });
    return { ok: false, message: "Could not load this task. Refresh and try again." };
  }
  if (!task) return { ok: false, message: "This task no longer exists. Refresh the board." };
  if (task.status === status.data) return { ok: true };

  const { error: taskError } = await supabase
    .from("tasks")
    .update({ status: status.data })
    .eq("id", taskId.data);
  if (taskError) {
    console.error("Admin board task status update failed", { code: taskError.code, taskId: taskId.data });
    return { ok: false, message: "Could not update task status. Refresh and try again." };
  }

  const { error: assigneeError } = await supabase
    .from("task_assignees")
    .update({
      status: status.data,
      progress: status.data === "DONE" ? 100 : 0,
    })
    .eq("task_id", taskId.data);
  if (assigneeError) {
    console.error("Admin board task updated but assignee status synchronization failed", {
      code: assigneeError.code,
      taskId: taskId.data,
    });
    revalidatePath("/admin/tasks");
    return { ok: false, message: "Task status changed, but assignee progress could not be synchronized. Refresh and review this task." };
  }

  const { error: activityError } = await supabase.from("activity_logs").insert({
    task_id: taskId.data,
    user_id: admin.id,
    action: `changed task status to ${status.data.toLowerCase().replaceAll("_", " ")}`,
  });
  if (activityError) {
    console.error("Admin board task status updated but activity logging failed", { code: activityError.code, taskId: taskId.data });
  }
  for (const path of ["/admin", "/admin/tasks", "/admin/calendar", "/admin/analytics", "/dashboard/tasks", "/dashboard/board", "/dashboard/calendar", "/dashboard/analytics"]) {
    revalidatePath(path);
  }
  return { ok: true };
}

export async function deleteAdminTask(form: FormData): Promise<void> {
  const id = taskIdSchema.safeParse(field(form, "id"));
  if (!id.success) fail("invalid");
  await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const { data: task, error: readError } = await supabase.from("tasks").select("title").eq("id", id.data).maybeSingle();
  if (readError || !task) fail("missing");
  const { error } = await supabase.from("tasks").delete().eq("id", id.data);
  if (error) {
    console.error("Admin task deletion failed", { code: error.code, taskId: id.data });
    fail("delete");
  }
  finish("Task deleted.");
}
