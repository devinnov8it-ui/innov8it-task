import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminTask = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  due_date: string | null;
  updated_at: string;
  projectName: string;
  assignments: {
    userId: string;
    name: string | null;
    email: string;
    status: string;
    progress: number;
  }[];
};

export type AdminActivity = {
  id: string;
  taskId: string;
  taskTitle: string;
  userName: string | null;
  userEmail: string;
  action: string;
  createdAt: string;
};

type TaskQuery = {
  from?: string;
  before?: string;
  limit?: number;
  recent?: boolean;
};

export async function loadAdminTasks(supabase: SupabaseClient, options: TaskQuery = {}) {
  const pageSize = 1000;
  const limit = options.limit ?? Number.POSITIVE_INFINITY;
  const tasks: { id: string; title: string; description: string | null; status: AdminTask["status"]; priority: AdminTask["priority"]; due_date: string | null; updated_at: string; project_id: string }[] = [];
  let offset = 0;

  while (tasks.length < limit) {
    const pageLimit = Math.min(pageSize, limit - tasks.length);
    let query = supabase
      .from("tasks")
      .select("id, title, description, status, priority, due_date, updated_at, project_id")
      .order(options.recent ? "updated_at" : "id", { ascending: !options.recent })
      .order(options.recent ? "id" : "updated_at", { ascending: true })
      .range(offset, offset + pageLimit - 1);
    if (options.from) query = query.gte("due_date", options.from);
    if (options.before) query = query.lt("due_date", options.before);
    const { data, error } = await query;
    if (error) return { tasks: [] as AdminTask[], error: true };

    tasks.push(...data);
    if (data.length < pageLimit) break;
    offset += data.length;
  }

  if (tasks.length === 0) return { tasks: [] as AdminTask[], error: false };

  const ids = tasks.map((task) => task.id);
  const projectIds = [...new Set(tasks.map((task) => task.project_id))];
  const projects: { id: string; name: string }[] = [];
  const assignments: { task_id: string; user_id: string; status: string; progress: number }[] = [];
  for (let index = 0; index < projectIds.length; index += 500) {
    const { data, error } = await supabase.from("projects").select("id, name").in("id", projectIds.slice(index, index + 500));
    if (error) return { tasks: [] as AdminTask[], error: true };
    projects.push(...data);
  }
  for (let index = 0; index < ids.length; index += 500) {
    const { data, error } = await supabase.from("task_assignees").select("task_id, user_id, status, progress").in("task_id", ids.slice(index, index + 500));
    if (error) return { tasks: [] as AdminTask[], error: true };
    assignments.push(...data);
  }

  const userIds = [...new Set(assignments.map((assignment) => assignment.user_id))];
  const users: { id: string; name: string | null; email: string }[] = [];
  for (let index = 0; index < userIds.length; index += 500) {
    const { data, error } = await supabase.from("users").select("id, name, email").in("id", userIds.slice(index, index + 500));
    if (error) return { tasks: [] as AdminTask[], error: true };
    users.push(...data);
  }

  const projectNames = new Map(projects.map((project) => [project.id, project.name]));
  const usersById = new Map(users.map((user) => [user.id, user]));
  const assignmentsByTask = new Map<string, AdminTask["assignments"]>();
  for (const assignment of assignments) {
    const user = usersById.get(assignment.user_id);
    const current = assignmentsByTask.get(assignment.task_id) ?? [];
    current.push({
      userId: assignment.user_id,
      name: user?.name ?? null,
      email: user?.email ?? "Unknown account",
      status: assignment.status,
      progress: assignment.status === "DONE" ? 100 : assignment.progress,
    });
    assignmentsByTask.set(assignment.task_id, current);
  }

  return {
    tasks: tasks.map((task) => ({
      id: task.id,
      projectId: task.project_id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      due_date: task.due_date,
      updated_at: task.updated_at,
      projectName: projectNames.get(task.project_id) ?? "Unknown project",
      assignments: assignmentsByTask.get(task.id) ?? [],
    })),
    error: false,
  };
}

export async function loadAdminActivity(supabase: SupabaseClient, limit = 40) {
  const { data: activity, error } = await supabase
    .from("activity_logs")
    .select("id, task_id, user_id, action, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return { activity: [] as AdminActivity[], error: true };
  if (activity.length === 0) return { activity: [] as AdminActivity[], error: false };

  const taskIds = [...new Set(activity.map((item) => item.task_id))];
  const userIds = [...new Set(activity.map((item) => item.user_id))];
  const [tasksResult, usersResult] = await Promise.all([
    supabase.from("tasks").select("id, title").in("id", taskIds),
    supabase.from("users").select("id, name, email").in("id", userIds),
  ]);
  if (tasksResult.error || usersResult.error) return { activity: [] as AdminActivity[], error: true };

  const tasks = new Map(tasksResult.data.map((task) => [task.id, task.title]));
  const users = new Map(usersResult.data.map((user) => [user.id, user]));
  return {
    activity: activity.map((item) => {
      const user = users.get(item.user_id);
      return {
        id: item.id,
        taskId: item.task_id,
        taskTitle: tasks.get(item.task_id) ?? "Deleted task",
        userName: user?.name ?? null,
        userEmail: user?.email ?? "Unknown account",
        action: item.action,
        createdAt: item.created_at,
      };
    }),
    error: false,
  };
}

export const taskStatusStyles: Record<AdminTask["status"], string> = {
  TODO: "border-slate-200 bg-slate-50 text-slate-700",
  IN_PROGRESS: "border-blue-200 bg-blue-50 text-blue-700",
  REVIEW: "border-amber-200 bg-amber-50 text-amber-800",
  DONE: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

export function formatTaskStatus(status: string) {
  return status.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
