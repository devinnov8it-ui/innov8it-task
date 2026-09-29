"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";

const projectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required.").max(160),
  description: z.string().trim().max(5_000).optional(),
  status: z.enum(["PLANNING", "ACTIVE", "COMPLETED", "ARCHIVED"]),
});

const projectIdSchema = z.string().uuid();

function value(form: FormData, name: string) {
  const field = form.get(name);
  return typeof field === "string" ? field : "";
}

async function getOrCreateWorkspace() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: workspace, error: readError } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (readError) throw new Error("Unable to load your workspace.");
  if (workspace) return workspace;

  const displayName =
    typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name.trim()
      : "";
  const { data: created, error: createError } = await supabase
    .from("workspaces")
    .insert({
      name: displayName ? `${displayName}'s workspace` : "My workspace",
      owner_id: user.id,
    })
    .select("id")
    .single();

  if (createError || !created) throw new Error("Unable to create your workspace.");
  return created;
}

function refreshProjects(notice: string): never {
  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard");
  redirect(`/dashboard/projects?notice=${encodeURIComponent(notice)}`);
}

export async function createProject(form: FormData) {
  const parsed = projectSchema.safeParse({
    name: value(form, "name"),
    description: value(form, "description") || undefined,
    status: "PLANNING",
  });
  if (!parsed.success) refreshProjects("Project name must be 1–160 characters.");

  const [workspace, supabase] = await Promise.all([
    getOrCreateWorkspace(),
    createClient(),
  ]);
  const { error } = await supabase.from("projects").insert({
    workspace_id: workspace.id,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    status: parsed.data.status,
  });
  if (error) refreshProjects("Unable to create project. Check that the database schema is applied.");
  refreshProjects("Project created.");
}

export async function updateProject(form: FormData) {
  const id = projectIdSchema.safeParse(value(form, "id"));
  const parsed = projectSchema.safeParse({
    name: value(form, "name"),
    description: value(form, "description") || undefined,
    status: value(form, "status"),
  });
  if (!id.success || !parsed.success) refreshProjects("Please check the project details.");

  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      status: parsed.data.status,
    })
    .eq("id", id.data);
  if (error) refreshProjects("Unable to update project.");
  refreshProjects("Project updated.");
}

export async function archiveProject(form: FormData) {
  const id = projectIdSchema.safeParse(value(form, "id"));
  if (!id.success) refreshProjects("Invalid project.");
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ status: "ARCHIVED" })
    .eq("id", id.data);
  if (error) refreshProjects("Unable to archive project.");
  refreshProjects("Project archived.");
}

export async function deleteProject(form: FormData) {
  const id = projectIdSchema.safeParse(value(form, "id"));
  if (!id.success) refreshProjects("Invalid project.");
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id.data);
  if (error) refreshProjects("Unable to delete project.");
  refreshProjects("Project deleted.");
}
