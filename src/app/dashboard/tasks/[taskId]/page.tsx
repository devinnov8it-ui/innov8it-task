import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/features/auth/session";
import { deleteTask, updateAssigneeProgress, updateTask } from "@/features/tasks/actions";
import { addComment, toggleCommentReaction } from "@/features/tasks/comments";
import { TaskActivityPanel } from "@/features/tasks/components/TaskActivityPanel";
import { createClient } from "@/lib/supabase/server";
import { formatPhilippineDateTime, getPhilippineDateTimeInputValue } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function TaskDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ taskId: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const currentUser = await requireUser();
  const { taskId } = await params;
  const notice = (await searchParams).notice;
  const supabase = await createClient({ readOnly: true });

  const taskQuery = (async () => {
    const withProgress = await supabase
      .from("tasks")
      .select(
        "id, title, description, status, priority, due_date, created_at, project_id, task_assignees(user_id, status, progress, created_at, assigned_by_id, user:users!task_assignees_user_id_fkey(name, email), assigned_by:users!task_assignees_assigned_by_id_fkey(name, email)), project:projects(id, name)",
      )
      .eq("id", taskId)
      .single();
    if (!withProgress?.error) return withProgress;
    const legacy = await supabase
      .from("tasks")
      .select(
        "id, title, description, status, priority, due_date, created_at, project_id, task_assignees(user_id, created_at, assigned_by_id, user:users!task_assignees_user_id_fkey(name, email), assigned_by:users!task_assignees_assigned_by_id_fkey(name, email)), project:projects(id, name)",
      )
      .eq("id", taskId)
      .single();
    return {
      data: legacy?.data
      ? { ...legacy.data, task_assignees: (legacy.data.task_assignees ?? []).map((assignee) => ({ ...assignee, status: "TODO", progress: 0 })) }
        : legacy?.data,
      error: legacy?.error ?? null,
    };
  })();
  const [{ data: projectsData }, { data: task, error: taskError }] = await Promise.all([
    supabase.from("projects").select("id, name").neq("status", "ARCHIVED").order("created_at", { ascending: false }),
    taskQuery,
  ]);

  const projects = (projectsData ?? []) as { id: string; name: string }[];

  if (taskError || !task) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/tasks" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to tasks
        </Link>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          Task could not be found.
        </div>
      </div>
    );
  }

  const firstAssignment = task.task_assignees?.[0];
  const assigneeProfile = Array.isArray(firstAssignment?.user) ? firstAssignment.user[0] : firstAssignment?.user;
  const assignedByProfile = Array.isArray(firstAssignment?.assigned_by) ? firstAssignment.assigned_by[0] : firstAssignment?.assigned_by;
  const assigneeNames = [...new Set((task.task_assignees ?? []).map((assignment) => {
    const profile = Array.isArray(assignment.user) ? assignment.user[0] : assignment.user;
    return profile?.name?.trim() || profile?.email || assignment.user_id;
  }))];
  const assignedByNames = [...new Set((task.task_assignees ?? []).map((assignment) => {
    const profile = Array.isArray(assignment.assigned_by) ? assignment.assigned_by[0] : assignment.assigned_by;
    return profile?.name?.trim() || profile?.email || "";
  }).filter(Boolean))];
  const assigneeName = assigneeNames.join(", ") || (firstAssignment ? "Assigned" : "Unassigned");
  const assignedByName = assignedByNames.join(", ") || assignedByProfile?.name?.trim() || assignedByProfile?.email || firstAssignment?.assigned_by_id || "Unassigned";
  const assigneeProgress = (task.task_assignees ?? []).map((assignment) => {
    const profile = Array.isArray(assignment.user) ? assignment.user[0] : assignment.user;
    return {
      userId: assignment.user_id,
      name: profile?.name?.trim() || profile?.email || assignment.user_id,
      status: assignment.status ?? "TODO",
      progress: Number.isFinite(assignment.progress) ? Math.min(100, Math.max(0, Number(assignment.progress))) : 0,
    };
  });
  const overallProgress = assigneeProgress.length > 1
    ? Math.round(assigneeProgress.reduce((total, assignee) => total + assignee.progress, 0) / assigneeProgress.length)
    : 0;

  const [commentsResult, activityResult] = await Promise.all([
    supabase
      .from("comments")
      .select("id, content, created_at, attachment_url, mentions, user:users(name, avatar, email), reactions:comment_reactions(emoji, user_id)")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false }),
    supabase
      .from("activity_logs")
      .select("id, action, created_at, user:users(name, avatar, email)")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false }),
  ]);
  const commentsData = commentsResult?.data ?? [];
  const activityData = activityResult?.data ?? [];

  const comments = commentsData.map((comment) => ({
    id: comment.id,
    content: comment.content,
    createdAt: comment.created_at,
    user: (Array.isArray(comment.user) ? comment.user[0] : comment.user) ?? { name: null, avatar: null, email: "" },
    attachmentUrl: comment.attachment_url,
    mentions: comment.mentions ?? [],
    reactions: ["👍", "🎉", "❤️", "🚀", "👀"].map((emoji) => ({
      emoji,
      count: comment.reactions.filter((reaction) => reaction.emoji === emoji).length,
      reacted: comment.reactions.some((reaction) => reaction.emoji === emoji && reaction.user_id === currentUser.id),
    })),
  }));

  const activity = activityData.map((entry) => ({
    id: entry.id,
    action: entry.action,
    createdAt: entry.created_at,
    user: (Array.isArray(entry.user) ? entry.user[0] : entry.user) ?? { name: null, avatar: null, email: "" },
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/dashboard/tasks" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to tasks
        </Link>
        {notice && (
          <p className="rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground">
            {notice}
          </p>
        )}
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Task detail
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{task.title}</h1>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">{task.status}</span>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">{task.priority}</span>
            {task.due_date && (
              <span className="rounded-full border px-2.5 py-1">
                Due {formatPhilippineDateTime(task.due_date)}
              </span>
            )}
          </div>
        </div>

        <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
          {task.description || "No description provided yet."}
        </p>
        <dl className="mt-5 grid gap-3 border-t pt-4 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-muted-foreground">Assignee</dt><dd className="mt-1 font-medium">{assigneeName}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Assigned by</dt><dd className="mt-1 font-medium">{assignedByName}</dd></div>
        </dl>
      </div>

      {assigneeProgress.length > 1 && <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Shared progress</p>
          <h2 className="mt-2 text-xl font-semibold">Per-assignee progress</h2>
        </div>
        <div className="mb-5 rounded-lg border bg-background/50 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Overall task progress</span>
            <span className="font-semibold text-primary">{overallProgress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${overallProgress}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">This reaches 100% when every assignee completes their part.</p>
        </div>

        <div className="space-y-4">
          {assigneeProgress.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assignees are linked to this task yet.</p>
          ) : (
            assigneeProgress.map((assignee) => (
              <form key={assignee.userId} action={updateAssigneeProgress} className="rounded-lg border bg-background/50 p-3">
                <input type="hidden" name="taskId" value={taskId} />
                <input type="hidden" name="userId" value={assignee.userId} />
                <input type="hidden" name="returnTo" value={`/dashboard/tasks/${taskId}`} />
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{assignee.name}</span>
                  <span className="text-right text-sm font-medium text-primary">{assignee.progress}%<span className="block text-[10px] font-normal text-muted-foreground">{assignee.status.replace("_", " ")}</span></span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    name="progress"
                    defaultValue={assignee.progress}
                    className="h-2 w-full accent-primary"
                    aria-label={`${assignee.name} progress`}
                  />
                  <button type="submit" className="min-h-9 rounded-md border px-2 text-xs font-medium hover:bg-muted">
                    Save
                  </button>
                </div>
              </form>
            ))
          )}
        </div>
      </div>}

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Update task
          </p>
          <h2 className="mt-2 text-xl font-semibold">Task details</h2>
        </div>

        <form action={updateTask} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="id" value={taskId} />
          <input type="hidden" name="returnTo" value={`/dashboard/tasks/${taskId}`} />

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-foreground">Title</span>
            <input
              name="title"
              defaultValue={task.title}
              required
              maxLength={240}
              className="min-h-11 w-full rounded-md border bg-background px-3 text-sm"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-foreground">Description</span>
            <textarea
              name="description"
              defaultValue={task.description ?? ""}
              rows={4}
              maxLength={5000}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">Project</span>
            <select
              name="projectId"
              defaultValue={task.project_id}
              className="min-h-11 w-full rounded-md border bg-background px-3 text-sm"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">Status</span>
            <select
              name="status"
              defaultValue={task.status}
              className="min-h-11 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="TODO">To do</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="REVIEW">Review</option>
              <option value="DONE">Done</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">Priority</span>
            <select
              name="priority"
              defaultValue={task.priority}
              className="min-h-11 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">Due date and time (Manila)</span>
            <input
              name="dueDate"
              type="datetime-local"
              defaultValue={task.due_date ? getPhilippineDateTimeInputValue(task.due_date) : ""}
              className="min-h-11 w-full rounded-md border bg-background px-3 text-sm"
            />
          </label>

          <div className="md:col-span-2 flex flex-wrap justify-end gap-3">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Save changes
            </button>
          </div>
        </form>

        <form action={deleteTask} className="mt-4 flex justify-end">
          <input type="hidden" name="id" value={taskId} />
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-destructive/30 px-4 text-sm font-medium text-destructive hover:bg-destructive/10"
          >
            Delete task
          </button>
        </form>
      </div>

      <div id="comments"><TaskActivityPanel
        taskId={taskId}
        title={task.title}
        comments={comments}
        activity={activity}
        dataError={Boolean(commentsResult?.error || activityResult?.error)}
        commentAction={addComment}
        reactionAction={toggleCommentReaction}
      /></div>
    </div>
  );
}
