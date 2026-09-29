import { LayoutDashboard } from "lucide-react";
import { requireUser } from "@/features/auth/session";
import { KanbanBoard, type BoardTask } from "@/features/kanban/components/KanbanBoard";
import { createClient } from "@/lib/supabase/server";
import { getPhilippineTodayKey } from "@/lib/time";

export const metadata = { title: "Kanban board" };
export const dynamic = "force-dynamic";

type Project = { id: string; name: string };

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  await requireUser();
  const supabase = await createClient({ readOnly: true });
  const { data: projectRows } = await supabase
    .from("projects")
    .select("id, name")
    .neq("status", "ARCHIVED")
    .order("created_at", { ascending: false });
  const projects = (projectRows ?? []) as Project[];
  const requested = (await searchParams).project;
  const projectId = projects.some((project) => project.id === requested)
    ? requested
    : projects[0]?.id;
  const { data: taskRows, error } = projectId
    ? await (async () => {
        const withProgress = await supabase.from("tasks").select("id, project_id, title, description, priority, status, due_date, created_at, created_by_id, creator:users!tasks_created_by_id_fkey(name, email), task_assignees(user_id, status, progress, created_at, assigned_by_id, user:users!task_assignees_user_id_fkey(name, email), assigned_by:users!task_assignees_assigned_by_id_fkey(name, email))").eq("project_id", projectId).order("created_at");
        if (!withProgress?.error) return withProgress;
        const legacy = await supabase.from("tasks").select("id, project_id, title, description, priority, status, due_date, created_at, created_by_id, creator:users!tasks_created_by_id_fkey(name, email), task_assignees(user_id, created_at, assigned_by_id, user:users!task_assignees_user_id_fkey(name, email), assigned_by:users!task_assignees_assigned_by_id_fkey(name, email))").eq("project_id", projectId).order("created_at");
        return { data: (legacy?.data ?? []).map((task) => ({ ...task, task_assignees: (task.task_assignees ?? []).map((assignee) => ({ ...assignee, status: "TODO", progress: 0 })) })), error: legacy?.error ?? null };
      })()
    : { data: [], error: null };
  const boardTasks = (taskRows ?? []).map((task) => {
    const assignment = task.task_assignees?.[0];
    const assignee = Array.isArray(assignment?.user) ? assignment.user[0] : assignment?.user;
    const creator = Array.isArray(task.creator) ? task.creator[0] : task.creator;
    const assignees = (task.task_assignees ?? []).map((item) => {
      const profile = Array.isArray(item.user) ? item.user[0] : item.user;
      return { name: profile?.name?.trim() || profile?.email || item.user_id, status: item.status ?? "TODO", progress: Math.min(100, Math.max(0, Number(item.progress ?? 0))) };
    });
    const assignedByName = creator?.name?.trim() || creator?.email || assignment?.assigned_by_id || "Unassigned";
    const projectName = projects.find((project) => project.id === task.project_id)?.name;
    return {
      ...task,
      projectId: task.project_id,
      dueDate: task.due_date,
      createdAt: task.created_at,
      assigneeName: assignee?.name?.trim() || assignee?.email || assignment?.user_id || null,
      assignedByName,
      assignedAt: assignment?.created_at ?? null,
      labels: projectName ? [projectName] : [],
      assignees,
      progress: assignees.length > 1 ? Math.round(assignees.reduce((sum, item) => sum + item.progress, 0) / assignees.length) : undefined,
    };
  }) as BoardTask[];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Workspace</p><h1 className="text-3xl font-semibold tracking-tight">Kanban board</h1><p className="mt-2 text-sm text-muted-foreground">Move tasks through the work that matters.</p></div>
        {projects.length > 0 && (
          <form className="flex gap-2">
            <label className="sr-only" htmlFor="project">Project</label>
            <select id="project" name="project" defaultValue={projectId} className="min-h-11 rounded-md border bg-background px-3 text-sm">
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            <button className="min-h-11 rounded-md border px-3 text-sm font-medium hover:bg-muted">View board</button>
          </form>
        )}
      </div>
      {error && <p role="alert" className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive">Tasks are unavailable until the Supabase schema is applied.</p>}
      {projects.length === 0 ? <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border bg-card text-center"><LayoutDashboard className="mb-4 size-9 text-primary" /><h2 className="font-semibold">Create a project first</h2><p className="mt-2 text-sm text-muted-foreground">Your Kanban board will be ready when your project is.</p></div> : <KanbanBoard projects={projects} tasks={boardTasks} todayKey={getPhilippineTodayKey()} />}
    </div>
  );
}
