"use client";

import { useState } from "react";
import { Archive, FolderKanban, Plus, Trash2 } from "lucide-react";
import { createAdminProject, deleteAdminProject, updateAdminProject } from "@/app/(portal)/admin/projects/actions";

type AdminProject = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  status: "PLANNING" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
  created_at: string;
};
type WorkspaceOption = { id: string; name: string; ownerName: string };

const statusLabels = { PLANNING: "Planning", ACTIVE: "Active", COMPLETED: "Completed", ARCHIVED: "Archived" } as const;

export function AdminProjectManager({ projects, workspaces, notice, error }: {
  projects: AdminProject[];
  workspaces: WorkspaceOption[];
  notice?: string;
  error?: string;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const workspaceNames = new Map(workspaces.map((workspace) => [workspace.id, workspace.name]));

  return (
    <div className="space-y-8">
      <header>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">System management</p>
        <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
        <p className="mt-2 text-sm text-muted-foreground">Create, edit, archive, and manage projects across all workspaces.</p>
      </header>
      {notice && <p role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
      {workspaces.length === 0 ? <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">No workspaces are available. A workspace must exist before you can create a project.</p> : (
        <section className="rounded-lg border bg-card">
          <header className="flex items-center gap-3 border-b px-5 py-4"><Plus className="size-5 text-primary" aria-hidden="true" /><div><h2 className="font-semibold">Create project</h2><p className="mt-1 text-sm text-muted-foreground">Choose the workspace this project belongs to.</p></div></header>
          <form action={createAdminProject} className="grid gap-3 p-5 md:grid-cols-2">
            <input name="name" required maxLength={160} placeholder="Project name" className="min-h-10 rounded-md border bg-background px-3 text-sm" />
            <select name="workspaceId" required defaultValue="" className="min-h-10 rounded-md border bg-background px-3 text-sm"><option value="" disabled>Select workspace</option>{workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name} · {workspace.ownerName}</option>)}</select>
            <textarea name="description" maxLength={5000} rows={2} placeholder="Description (optional)" className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-2" />
            <button type="submit" className="min-h-10 justify-self-start rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">Create project</button>
          </form>
        </section>
      )}
      <section className="space-y-4">
        <div className="flex items-center justify-between"><h2 className="font-semibold">All projects</h2><span className="text-sm text-muted-foreground">{projects.length} projects</span></div>
        {projects.length === 0 ? <div className="rounded-lg border bg-card p-10 text-center"><FolderKanban className="mx-auto mb-3 size-8 text-primary" /><p className="font-medium">No projects yet.</p></div> : (
          <div className="grid gap-4 xl:grid-cols-2">
            {projects.map((project) => <article key={project.id} className="space-y-4 rounded-lg border bg-card p-5">
              <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">{workspaceNames.get(project.workspace_id) ?? "Unknown workspace"}</p><h3 className="mt-1 font-semibold">{project.name}</h3></div><span className="rounded-full border bg-muted px-2 py-1 text-[10px] font-semibold">{statusLabels[project.status]}</span></div>
              <form action={updateAdminProject} className="grid gap-3">
                <input type="hidden" name="id" value={project.id} />
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">Project name<input name="name" defaultValue={project.name} required maxLength={160} className="min-h-10 rounded-md border bg-background px-3 text-sm text-foreground" /></label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">Workspace<select name="workspaceId" defaultValue={project.workspace_id} required className="min-h-10 rounded-md border bg-background px-3 text-sm text-foreground">{workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name} · {workspace.ownerName}</option>)}</select></label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">Status<select name="status" defaultValue={project.status} className="min-h-10 rounded-md border bg-background px-3 text-sm text-foreground">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">Description<textarea name="description" defaultValue={project.description ?? ""} maxLength={5000} rows={2} className="rounded-md border bg-background px-3 py-2 text-sm text-foreground" /></label>
                <button type="submit" className="min-h-9 justify-self-start rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90">Save changes</button>
              </form>
              <div className="flex flex-wrap justify-end gap-2">
                {project.status !== "ARCHIVED" && <form action={updateAdminProject}><input type="hidden" name="id" value={project.id} /><input type="hidden" name="name" value={project.name} /><input type="hidden" name="description" value={project.description ?? ""} /><input type="hidden" name="status" value="ARCHIVED" /><input type="hidden" name="workspaceId" value={project.workspace_id} /><button type="submit" className="inline-flex min-h-9 items-center gap-1.5 rounded-md border px-3 text-sm hover:bg-muted"><Archive className="size-3.5" />Archive</button></form>}
                <button type="button" onClick={() => setConfirming(confirming === project.id ? null : project.id)} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-rose-300 px-3 text-sm text-rose-700 hover:bg-rose-50"><Trash2 className="size-3.5" />Delete</button>
              </div>
              {confirming === project.id && <form action={deleteAdminProject} className="flex flex-wrap items-end gap-2 rounded-md border border-rose-200 bg-rose-50/50 p-3">
                <input type="hidden" name="id" value={project.id} />
                <label className="grid flex-1 gap-1 text-xs text-muted-foreground">Type “{project.name}” to delete the project and all its tasks<input name="confirmation" required autoComplete="off" className="min-h-9 rounded-md border bg-background px-3 text-sm text-foreground" /></label>
                <button type="submit" className="min-h-9 rounded-md bg-destructive px-3 text-sm font-medium text-destructive-foreground">Confirm delete</button>
                <button type="button" onClick={() => setConfirming(null)} className="min-h-9 rounded-md border px-3 text-sm">Cancel</button>
              </form>}
            </article>)}
          </div>
        )}
      </section>
    </div>
  );
}
