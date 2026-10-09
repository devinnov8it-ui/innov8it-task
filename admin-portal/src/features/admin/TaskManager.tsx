"use client";

import Link from "next/link";
import { useState } from "react";
import { Activity, CircleCheck, Clock3, Download, LayoutGrid, List, ListChecks, Pencil, Plus, Trash2, X } from "lucide-react";
import type { AdminActivity, AdminTask } from "./admin-data";
import { formatTaskStatus, taskStatusStyles } from "./admin-data";
import { AdminTaskBoard } from "./AdminTaskBoard";
import { createAdminTask, deleteAdminTask, updateAdminTask } from "@/app/(portal)/admin/tasks/actions";

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

type ProjectOption = { id: string; name: string; status: string };
type EmployeeOption = { id: string; name: string | null; email: string };

const errorMessages: Record<string, string> = {
  invalid: "Check the task details and selected assignees.",
  data: "Could not load or validate the selected project or employees. Refresh and try again.",
  references: "Choose an existing project and valid employee accounts.",
  assignees: "The task changed, but its assignees could not be fully updated. Review the task and try again.",
  "assignee-status": "The task status changed, but employee status could not be synchronized. Review its assignments.",
  create: "The task could not be created.",
  update: "The task could not be updated.",
  missing: "That task could not be found.",
  delete: "The task could not be deleted.",
};

export function TaskManager({ tasks, projects, employees: employeeList, activity, selectedEmployeeId, selectedPeriod, selectedDate, notice, errorCode, error }: {
  tasks: AdminTask[];
  projects: ProjectOption[];
  employees: EmployeeOption[];
  activity: AdminActivity[];
  selectedEmployeeId?: string;
  selectedPeriod: "day" | "week" | "month";
  selectedDate: string;
  notice?: string;
  errorCode?: string;
  error: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "board">("list");
  const employees = new Map<string, { name: string | null; email: string }>();
  for (const task of tasks) {
    for (const assignment of task.assignments) {
      employees.set(assignment.userId, { name: assignment.name, email: assignment.email });
    }
  }
  const employeeOptions = employeeList
    .map((employee) => [employee.id, employee] as const)
    .sort((a, b) => {
    const aName = a[1].name?.trim() || a[1].email;
    const bName = b[1].name?.trim() || b[1].email;
    return aName.localeCompare(bName);
  });
  const selectedEmployee = selectedEmployeeId ? employees.get(selectedEmployeeId) : undefined;
  const visibleTasks = selectedEmployeeId
    ? tasks.filter((task) => task.assignments.some((assignment) => assignment.userId === selectedEmployeeId))
    : tasks;

  return (
    <div className="space-y-8">
      <header>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Work monitoring</p>
        <h1 className="text-3xl font-semibold tracking-tight">Task manager</h1>
        <p className="mt-2 text-sm text-muted-foreground">Monitor task status, assignee progress, and recent activity across the system.</p>
      </header>
      {error && <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">Some task or activity data could not be loaded.</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}
      {errorCode && <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">{errorMessages[errorCode] ?? "The requested task change could not be completed."}</p>}
      <section className="rounded-lg border bg-card">
        <header className="flex items-center gap-3 border-b px-5 py-4"><Plus className="size-5 text-primary" aria-hidden="true" /><div><h2 className="font-semibold">Create task</h2><p className="mt-1 text-sm text-muted-foreground">Add work to any project and assign employees.</p></div></header>
        {projects.filter((project) => project.status !== "ARCHIVED").length === 0
          ? <p className="p-5 text-sm text-muted-foreground">Create or activate a project before adding tasks.</p>
          : <form action={createAdminTask} className="grid gap-3 p-5 md:grid-cols-2">
            <input name="title" required maxLength={240} placeholder="Task title" className="min-h-10 rounded-md border bg-background px-3 text-sm md:col-span-2" />
            <textarea name="description" maxLength={5000} rows={2} placeholder="Description (optional)" className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-2" />
            <select name="projectId" required defaultValue="" className="min-h-10 rounded-md border bg-background px-3 text-sm">
              <option value="" disabled>Select project</option>
              {projects.filter((project) => project.status !== "ARCHIVED").map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <select name="status" defaultValue="TODO" className="min-h-10 rounded-md border bg-background px-2 text-sm"><option value="TODO">To do</option><option value="IN_PROGRESS">In progress</option><option value="REVIEW">Review</option><option value="DONE">Done</option></select>
              <select name="priority" defaultValue="MEDIUM" className="min-h-10 rounded-md border bg-background px-2 text-sm"><option value="LOW">Low priority</option><option value="MEDIUM">Medium priority</option><option value="HIGH">High priority</option><option value="CRITICAL">Critical priority</option></select>
            </div>
            <label className="grid gap-1 text-xs text-muted-foreground"><span>Due date and time (UTC)</span><input name="dueDate" type="datetime-local" className="min-h-10 rounded-md border bg-background px-3 text-sm text-foreground" /></label>
            <fieldset className="space-y-2 md:col-span-2">
              <legend className="text-sm font-medium">Assign employees</legend>
              <div className="grid max-h-40 gap-2 overflow-auto rounded-md border p-3 sm:grid-cols-2">
                {employeeList.map((employee) => <label key={employee.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="assigneeIds" value={employee.id} className="accent-primary" />{employee.name?.trim() || employee.email}<span className="truncate text-xs text-muted-foreground">{employee.email}</span></label>)}
              </div>
            </fieldset>
            <button type="submit" className="min-h-10 justify-self-start rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">Create task</button>
          </form>}
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-lg border bg-card">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b px-5 py-4">
            <div className="flex items-center gap-3">
              <ListChecks className="size-5 text-primary" aria-hidden="true" />
              <div><h2 className="font-semibold">Tasks</h2><p className="mt-1 text-sm text-muted-foreground">{selectedEmployee ? `All assigned tasks for ${selectedEmployee.name?.trim() || selectedEmployee.email}.` : "All tasks and assignee progress."}</p></div>
            </div>
            {selectedEmployeeId && selectedEmployee && <a href={`/admin/tasks/export?employeeId=${encodeURIComponent(selectedEmployeeId)}&period=${selectedPeriod}&date=${encodeURIComponent(selectedDate)}`} className="inline-flex min-h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-muted"><Download className="size-4" aria-hidden="true" />Download {selectedPeriod} CSV</a>}
          </header>
          <form method="get" className="flex flex-wrap items-end gap-3 border-b px-5 py-4">
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              Employee
              <select name="employeeId" defaultValue={selectedEmployeeId ?? ""} className="min-h-10 min-w-56 rounded-md border bg-background px-3 text-sm text-foreground">
                <option value="">All employees and tasks</option>
                {employeeOptions.map(([id, employee]) => <option key={id} value={id}>{employee.name?.trim() || employee.email} ({employee.email})</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              Download period
              <select name="period" defaultValue={selectedPeriod} className="min-h-10 min-w-32 rounded-md border bg-background px-3 text-sm text-foreground">
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              Date in period
              <input name="date" type="date" defaultValue={selectedDate} required className="min-h-10 rounded-md border bg-background px-3 text-sm text-foreground" />
            </label>
            <button type="submit" className="min-h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">View tasks</button>
            {selectedEmployeeId && <Link href="/admin/tasks" className="inline-flex min-h-10 items-center rounded-md border px-3 text-sm font-medium hover:bg-muted">Clear filter</Link>}
            <p className="ml-auto self-center text-xs text-muted-foreground">{visibleTasks.length} {visibleTasks.length === 1 ? "task" : "tasks"}</p>
          </form>
          <div className="flex justify-end gap-2 border-b px-5 py-3">
            <button type="button" onClick={() => setView("list")} aria-pressed={view === "list"} className={`inline-flex min-h-9 items-center gap-2 rounded-md border px-3 text-sm ${view === "list" ? "bg-muted font-medium" : "hover:bg-muted"}`}><List className="size-4" aria-hidden="true" />List</button>
            <button type="button" onClick={() => setView("board")} aria-pressed={view === "board"} className={`inline-flex min-h-9 items-center gap-2 rounded-md border px-3 text-sm ${view === "board" ? "bg-muted font-medium" : "hover:bg-muted"}`}><LayoutGrid className="size-4" aria-hidden="true" />Board</button>
          </div>
          {visibleTasks.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">{selectedEmployeeId && !selectedEmployee ? "That employee was not found among the task assignees." : "No tasks found for this employee."}</p> : view === "board" ? (
            <div className="p-4">
              <AdminTaskBoard
                tasks={visibleTasks}
                onEdit={(taskId) => {
                  setEditingId(taskId);
                  setView("list");
                }}
              />
            </div>
          ) : (
            <ul className="divide-y">
              {visibleTasks.map((task) => {
                const taskAssignments = selectedEmployeeId
                  ? task.assignments.filter((assignment) => assignment.userId === selectedEmployeeId)
                  : task.assignments;
                const progress = taskAssignments.length
                  ? Math.round(taskAssignments.reduce((sum, assignment) => sum + assignment.progress, 0) / taskAssignments.length)
                  : task.status === "DONE" ? 100 : 0;
                return (
                  <li key={task.id} className="space-y-3 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-medium">{task.title}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">{task.projectName} · {task.priority} priority</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${taskStatusStyles[task.status]}`}>{formatTaskStatus(task.status)}</span>
                        <button type="button" onClick={() => setEditingId(editingId === task.id ? null : task.id)} aria-label={`${editingId === task.id ? "Close" : "Edit"} ${task.title}`} className="grid size-8 place-items-center rounded-md border hover:bg-muted">{editingId === task.id ? <X className="size-4" /> : <Pencil className="size-4" />}</button>
                        <form action={deleteAdminTask} onSubmit={(event) => { if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) event.preventDefault(); }}>
                          <input type="hidden" name="id" value={task.id} />
                          <button type="submit" aria-label={`Delete ${task.title}`} className="grid size-8 place-items-center rounded-md border border-rose-300 text-rose-700 hover:bg-rose-50"><Trash2 className="size-4" /></button>
                        </form>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`${task.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                        <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="w-10 text-right text-xs font-medium text-muted-foreground">{progress}%</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <p>{taskAssignments.length ? taskAssignments.map((a) => `${a.name?.trim() || a.email} (${a.progress}%)`).join(", ") : "Unassigned"}</p>
                      <p>{task.due_date ? `Due ${dateFormat.format(new Date(task.due_date))}` : "No due date"}</p>
                    </div>
                    {editingId === task.id && <form action={updateAdminTask} className="grid gap-3 rounded-lg border bg-muted/30 p-4 md:grid-cols-2">
                      <input type="hidden" name="id" value={task.id} />
                      <input name="title" required maxLength={240} defaultValue={task.title} aria-label="Task title" className="min-h-10 rounded-md border bg-background px-3 text-sm md:col-span-2" />
                      <textarea name="description" maxLength={5000} rows={2} defaultValue={task.description ?? ""} aria-label="Task description" className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-2" />
                      <select name="projectId" required defaultValue={task.projectId} aria-label="Project" className="min-h-10 rounded-md border bg-background px-3 text-sm">{projects.map((project) => <option key={project.id} value={project.id}>{project.name}{project.status === "ARCHIVED" ? " (archived)" : ""}</option>)}</select>
                      <div className="grid grid-cols-2 gap-2">
                        <select name="status" defaultValue={task.status} aria-label="Task status" className="min-h-10 rounded-md border bg-background px-2 text-sm"><option value="TODO">To do</option><option value="IN_PROGRESS">In progress</option><option value="REVIEW">Review</option><option value="DONE">Done</option></select>
                        <select name="priority" defaultValue={task.priority} aria-label="Task priority" className="min-h-10 rounded-md border bg-background px-2 text-sm"><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select>
                      </div>
                      <label className="grid gap-1 text-xs text-muted-foreground"><span>Due date and time (UTC)</span><input name="dueDate" type="datetime-local" defaultValue={task.due_date?.slice(0, 16) ?? ""} className="min-h-10 rounded-md border bg-background px-3 text-sm text-foreground" /></label>
                      <fieldset className="space-y-2 md:col-span-2">
                        <legend className="text-sm font-medium">Assigned employees</legend>
                        <div className="grid max-h-40 gap-2 overflow-auto rounded-md border bg-background p-3 sm:grid-cols-2">
                          {employeeList.map((employee) => <label key={employee.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="assigneeIds" value={employee.id} defaultChecked={task.assignments.some((assignment) => assignment.userId === employee.id)} className="accent-primary" />{employee.name?.trim() || employee.email}<span className="truncate text-xs text-muted-foreground">{employee.email}</span></label>)}
                        </div>
                      </fieldset>
                      <button type="submit" className="min-h-10 justify-self-start rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">Save task changes</button>
                    </form>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section className="rounded-lg border bg-card">
          <header className="flex items-center gap-3 border-b px-5 py-4">
            <Activity className="size-5 text-primary" aria-hidden="true" />
            <div><h2 className="font-semibold">Recent activity</h2><p className="mt-1 text-sm text-muted-foreground">Latest task updates and comments.</p></div>
          </header>
          {activity.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No activity recorded yet.</p> : (
            <ol className="divide-y">
              {activity.map((item) => (
                <li key={item.id} className="flex gap-3 p-4">
                  {item.action.includes("completed") ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" /> : <Clock3 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
                  <div className="min-w-0">
                    <p className="text-sm"><span className="font-medium">{item.userName?.trim() || item.userEmail}</span> {item.action}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{item.taskTitle}</p>
                    <time className="mt-1 block text-[11px] text-muted-foreground" dateTime={item.createdAt}>{dateFormat.format(new Date(item.createdAt))}</time>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
