import { CheckSquare } from "lucide-react";
import { requireUser } from "@/features/auth/session";
import { createTask } from "@/features/tasks/actions";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskWorkspaceViews } from "@/features/kanban/components/TaskWorkspaceViews";
import { getPhilippineTodayKey } from "@/lib/time";

export const metadata = { title: "Tasks" };
export const dynamic = "force-dynamic";

type Project = { id: string; name: string };
type Employee = { id: string; name: string | null; email: string; role: "OWNER" | "ADMIN" | "MEMBER" };
type TaskAssignee = { user_id: string; status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE"; progress: number; created_at: string; assigned_by_id: string | null; user: { name: string | null; email: string } | null; assigned_by: { name: string | null; email: string } | null };
type Task = { id: string; project_id: string; title: string; description: string | null; status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE"; priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; due_date: string | null; created_at: string; created_by_id: string; task_assignees: TaskAssignee[] };
type TaskRow = Omit<Task, "task_assignees"> & { task_assignees: { user_id: string; status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE"; progress: number; created_at: string; assigned_by_id: string | null; user: { name: string | null; email: string }[]; assigned_by: { name: string | null; email: string }[] }[] };
const statuses = [["TODO", "To do"], ["IN_PROGRESS", "In progress"], ["REVIEW", "Review"], ["DONE", "Done"]] as const;
const priorities = [["LOW", "Low"], ["MEDIUM", "Medium"], ["HIGH", "High"], ["CRITICAL", "Critical"]] as const;

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const currentUser = await requireUser();
  const supabase = await createClient({ readOnly: true });
  const taskQuery = (async () => {
    const withProgress = await supabase.from("tasks").select("id, project_id, title, description, status, priority, due_date, created_at, created_by_id, task_assignees(user_id, status, progress, created_at, assigned_by_id, user:users!task_assignees_user_id_fkey(name, email), assigned_by:users!task_assignees_assigned_by_id_fkey(name, email))").order("created_at", { ascending: false });
    if (!withProgress?.error) return withProgress;
    const legacy = await supabase.from("tasks").select("id, project_id, title, description, status, priority, due_date, created_at, created_by_id, task_assignees(user_id, created_at, assigned_by_id, user:users!task_assignees_user_id_fkey(name, email), assigned_by:users!task_assignees_assigned_by_id_fkey(name, email))").order("created_at", { ascending: false });
    return { data: (legacy?.data ?? []).map((task) => ({ ...task, task_assignees: (task.task_assignees ?? []).map((assignee) => ({ ...assignee, status: "TODO", progress: 0 })) })), error: legacy?.error ?? null };
  })();
  const [{ data: projectRows }, { data: taskRows, error }, { data: employeeRows }] = await Promise.all([
    supabase.from("projects").select("id, name").neq("status", "ARCHIVED").order("created_at", { ascending: false }),
    taskQuery,
    supabase.from("users").select("id, name, email, role").order("name", { ascending: true }),
  ]);
  const projects = (projectRows ?? []) as Project[];
  const employees = (employeeRows ?? []) as Employee[];
  const employeeNames = new Map(employees.map((employee) => [employee.id, employee.name?.trim() || employee.email]));
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));
  const assignerName = currentUser.user_metadata?.name || currentUser.email || "Current user";
  const tasks = ((taskRows ?? []) as TaskRow[]).map((task) => ({
    ...task,
    task_assignees: task.task_assignees.map((assignee) => ({
      ...assignee,
      user: assignee.user?.[0] ?? null,
      assigned_by: assignee.assigned_by?.[0] ?? null,
    })),
  })) as Task[];
  const notice = (await searchParams).notice;
  const viewTasks = tasks.map((task) => {
    const assignees = task.task_assignees.map((assignment) => ({
      name: assignment.user?.name?.trim() || assignment.user?.email || employeeNames.get(assignment.user_id) || assignment.user_id,
      status: assignment.status,
      progress: Math.min(100, Math.max(0, Number(assignment.progress ?? 0))),
    }));
    return {
      id: task.id, projectId: task.project_id, title: task.title, description: task.description,
      status: task.status, priority: task.priority, dueDate: task.due_date, createdAt: task.created_at,
      assigneeName: assignees[0]?.name ?? null,
      assignedByName: employeeNames.get(task.created_by_id) || task.task_assignees[0]?.assigned_by?.name?.trim() || task.task_assignees[0]?.assigned_by?.email || task.created_by_id,
      assignedAt: task.task_assignees[0]?.created_at ?? null,
      assignees,
      progress: assignees.length > 1 ? Math.round(assignees.reduce((sum, item) => sum + item.progress, 0) / assignees.length) : undefined,
      labels: projectNames.has(task.project_id) ? [projectNames.get(task.project_id)!] : [],
    };
  });

  return <div className="space-y-8">
    <div><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Workspace</p><h1 className="text-3xl font-semibold tracking-tight">Tasks</h1><p className="mt-2 text-sm text-muted-foreground">Capture the next action and keep it on track.</p></div>
    {notice && <p role="status" className="rounded-lg border bg-card px-4 py-3 text-sm">{notice}</p>}
    {error && <p role="alert" className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive">Tasks are unavailable until the Supabase schema is applied.</p>}
    <Card id="new-task"><CardHeader><CardTitle>Create a task</CardTitle><p className="text-sm text-muted-foreground">Assign one or more people from your workspace.</p></CardHeader><CardContent>{projects.length === 0 ? <p className="text-sm text-muted-foreground">Create a project before adding tasks.</p> : <form action={createTask} className="grid gap-3 md:grid-cols-2"><input name="title" required maxLength={240} placeholder="Task title" className="min-h-11 rounded-md border bg-background px-3 text-sm md:col-span-2" /><textarea name="description" maxLength={5000} rows={3} placeholder="Description (optional)" className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-2" /><select name="projectId" required className="min-h-11 rounded-md border bg-background px-3 text-sm">{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><div className="grid grid-cols-3 gap-2"><select name="status" defaultValue="TODO" className="min-h-11 rounded-md border bg-background px-2 text-sm">{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select name="priority" defaultValue="MEDIUM" className="min-h-11 rounded-md border bg-background px-2 text-sm">{priorities.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input name="dueDate" type="date" aria-label="Due date" className="min-h-11 rounded-md border bg-background px-2 text-sm" /></div><label className="space-y-2"><span className="text-sm font-medium">Assigned by</span><input value={assignerName} readOnly aria-label="Assigned by" className="min-h-11 w-full rounded-md border bg-muted px-3 text-sm text-muted-foreground" /></label><div className="space-y-2 md:col-span-2"><div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">Assignees</span><span className="text-xs text-muted-foreground">Select multiple teammates</span></div><div className="grid max-h-52 grid-cols-1 gap-2 overflow-auto rounded-md border bg-background p-2 sm:grid-cols-2">{employees.map((employee) => { const selected = employee.id === currentUser.id; return <label key={employee.id} className="flex cursor-pointer items-center gap-2 rounded-md border bg-background px-2 py-2 text-sm transition hover:bg-muted/60"><input type="checkbox" name="assigneeIds" value={employee.id} defaultChecked={selected} className="h-4 w-4 rounded border-muted-foreground/50 text-primary focus:ring-primary" /><span className="flex-1 truncate">{employee.name?.trim() || employee.email}</span><span className="text-[10px] uppercase tracking-wider text-muted-foreground">{employee.role}</span></label>; })}</div><span className="block text-xs text-muted-foreground">Your account is selected by default, and you can add more assignees before submitting.</span></div><button className="min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 md:col-span-2">Create task</button></form>}</CardContent></Card>
    <section aria-labelledby="task-views" className="space-y-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Workflow</p><h2 id="task-views" className="mt-1 text-xl font-semibold">Task views</h2><p className="mt-1 text-sm text-muted-foreground">Switch between the board, a power-user list, a project timeline, and team workload.</p></div>{tasks.length === 0 ? <Card><CardContent className="flex min-h-48 flex-col items-center justify-center text-center"><CheckSquare className="mb-4 size-8 text-primary" /><p className="font-medium">Nothing on the board yet.</p><p className="mt-1 text-sm text-muted-foreground">Create a task above to get started.</p></CardContent></Card> : <TaskWorkspaceViews projects={projects} todayKey={getPhilippineTodayKey()} tasks={viewTasks} />}</section>
  </div>;
}
