"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const projectSchema = z.object({
  id: z.string().uuid().optional(),
  workspaceId: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(5000),
  status: z.enum(["PLANNING", "ACTIVE", "COMPLETED", "ARCHIVED"]),
});
const uuidSchema = z.string().uuid();

function field(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

function fail(code: string): never {
  redirect(`/admin/projects?error=${encodeURIComponent(code)}`);
}

function finish(notice: string): never {
  for (const path of ["/admin", "/admin/projects", "/admin/tasks", "/admin/calendar", "/admin/analytics", "/dashboard/projects", "/dashboard/tasks", "/dashboard/board"]) {
    revalidatePath(path);
  }
  redirect(`/admin/projects?notice=${encodeURIComponent(notice)}`);
}

function parseProject(form: FormData) {
  return projectSchema.safeParse({
    id: field(form, "id") || undefined,
    workspaceId: field(form, "workspaceId"),
    name: field(form, "name"),
    description: field(form, "description"),
    status: field(form, "status"),
  });
}

export async function createAdminProject(form: FormData): Promise<void> {
  const parsed = parseProject(form);
  if (!parsed.success || parsed.data.id) fail("invalid");
  await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const { data: workspace, error: workspaceError } = await supabase.from("workspaces").select("id").eq("id", parsed.data.workspaceId).maybeSingle();
  if (workspaceError) fail("data");
  if (!workspace) fail("workspace");
  const { error } = await supabase.from("projects").insert({
    workspace_id: parsed.data.workspaceId,
    name: parsed.data.name,
    description: parsed.data.description || null,
    status: parsed.data.status,
  });
  if (error) {
    console.error("Admin project creation failed", { code: error.code });
    fail("create");
  }
  finish("Project created.");
}

export async function updateAdminProject(form: FormData): Promise<void> {
  const parsed = parseProject(form);
  if (!parsed.success || !parsed.data.id) fail("invalid");
  await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const { data: workspace, error: workspaceError } = await supabase.from("workspaces").select("id").eq("id", parsed.data.workspaceId).maybeSingle();
  if (workspaceError) fail("data");
  if (!workspace) fail("workspace");
  const { error } = await supabase.from("projects").update({
    workspace_id: parsed.data.workspaceId,
    name: parsed.data.name,
    description: parsed.data.description || null,
    status: parsed.data.status,
  }).eq("id", parsed.data.id);
  if (error) {
    console.error("Admin project update failed", { code: error.code, projectId: parsed.data.id });
    fail("update");
  }
  finish("Project updated.");
}

export async function deleteAdminProject(form: FormData): Promise<void> {
  const id = uuidSchema.safeParse(field(form, "id"));
  const confirmation = z.string().trim().max(160).safeParse(field(form, "confirmation"));
  if (!id.success || !confirmation.success) fail("invalid");
  await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const { data: project, error: lookupError } = await supabase.from("projects").select("name").eq("id", id.data).maybeSingle();
  if (lookupError || !project) fail("missing");
  if (confirmation.data !== project.name) fail("confirmation");
  const { error } = await supabase.from("projects").delete().eq("id", id.data);
  if (error) {
    console.error("Admin project deletion failed", { code: error.code, projectId: id.data });
    fail("delete");
  }
  finish("Project and its tasks were deleted.");
}
