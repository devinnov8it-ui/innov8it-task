import { FolderKanban, Plus } from "lucide-react";
import { requireUser } from "@/features/auth/session";
import {
  archiveProject,
  createProject,
  deleteProject,
  updateProject,
} from "@/features/projects/actions";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: "PLANNING" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
  created_at: string;
};

const statusLabel = {
  PLANNING: "Planning",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
} as const;

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  await requireUser();
  const supabase = await createClient({ readOnly: true });
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, description, status, created_at")
    .order("created_at", { ascending: false });
  const projects = (data ?? []) as Project[];
  const notice = (await searchParams).notice;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Workspace</p>
          <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-2 text-sm text-muted-foreground">Plan, track, and keep the work moving.</p>
        </div>
      </div>
      {notice && <p role="status" className="rounded-lg border bg-card px-4 py-3 text-sm">{notice}</p>}
      {error && <p role="alert" className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive">Projects are unavailable until the Supabase schema is applied.</p>}
      <Card id="new-project">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Plus className="size-5 text-primary" />Create a project</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createProject} className="grid gap-3 sm:grid-cols-[1fr_1.5fr_auto]">
            <input name="name" required maxLength={160} placeholder="Project name" className="min-h-11 rounded-md border bg-background px-3 text-sm" />
            <input name="description" maxLength={5000} placeholder="What is this project about? (optional)" className="min-h-11 rounded-md border bg-background px-3 text-sm" />
            <button className="min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">Create project</button>
          </form>
        </CardContent>
      </Card>
      <section aria-labelledby="project-list" className="space-y-4">
        <h2 id="project-list" className="text-base font-semibold">Your projects</h2>
        {projects.length === 0 ? (
          <Card><CardContent className="flex min-h-48 flex-col items-center justify-center text-center"><FolderKanban className="mb-4 size-8 text-primary" /><p className="font-medium">Start with a project.</p><p className="mt-1 text-sm text-muted-foreground">Create your first project above to organize upcoming work.</p></CardContent></Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {projects.map((project) => (
              <Card id={`project-${project.id}`} key={project.id} className="gap-0">
                <CardContent className="p-5">
                  <form id={`project-${project.id}`} action={updateProject} className="space-y-3">
                    <input type="hidden" name="id" value={project.id} />
                    <div className="flex items-center gap-3"><input name="name" defaultValue={project.name} required maxLength={160} aria-label="Project name" className="min-h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm font-medium" /><select name="status" defaultValue={project.status} aria-label="Project status" className="min-h-10 rounded-md border bg-background px-2 text-sm">{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                    <textarea name="description" defaultValue={project.description ?? ""} maxLength={5000} rows={3} placeholder="Add a project description" className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
                  </form>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button form={`project-${project.id}`} className="min-h-10 rounded-md border px-3 text-sm font-medium hover:bg-muted">Save changes</button>
                    <form action={archiveProject}><input type="hidden" name="id" value={project.id} /><button className="min-h-10 rounded-md border px-3 text-sm hover:bg-muted">Archive</button></form>
                    <form action={deleteProject}><input type="hidden" name="id" value={project.id} /><button className="min-h-10 rounded-md border border-destructive/30 px-3 text-sm text-destructive hover:bg-destructive/10">Delete</button></form>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
