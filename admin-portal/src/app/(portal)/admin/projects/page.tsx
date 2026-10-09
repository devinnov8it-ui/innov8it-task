import { AdminProjectManager } from "@/features/admin/AdminProjectManager";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const metadata = { title: "Projects" };

const errorMessages: Record<string, string> = {
  invalid: "Check the project details and try again.",
  data: "Project data could not be accessed. Refresh and try again.",
  workspace: "Choose a valid workspace.",
  create: "The project could not be created.",
  update: "The project could not be updated.",
  missing: "That project could not be found.",
  confirmation: "Type the project name exactly to confirm deletion.",
  delete: "The project could not be deleted.",
};

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const supabase = createSupabaseAdminClient();
  const [projectsResult, workspacesResult, params] = await Promise.all([
    supabase.from("projects").select("id, workspace_id, name, description, status, created_at").order("created_at", { ascending: false }),
    supabase.from("workspaces").select("id, name, owner_id").order("name"),
    searchParams,
  ]);
  const workspaceIds = [...new Set([
    ...(workspacesResult.data ?? []).map((workspace) => workspace.owner_id),
  ])];
  const ownersResult = workspaceIds.length
    ? await supabase.from("users").select("id, name, email").in("id", workspaceIds)
    : { data: [], error: null };
  const owners = new Map((ownersResult.data ?? []).map((owner) => [owner.id, owner]));
  const workspaces = (workspacesResult.data ?? []).map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    ownerName: owners.get(workspace.owner_id)?.name?.trim() || owners.get(workspace.owner_id)?.email || "Unknown owner",
  }));
  const error = projectsResult.error || workspacesResult.error || ownersResult.error
    ? "Project and workspace data could not be fully loaded."
    : params.error ? errorMessages[params.error] ?? "The project change could not be completed." : undefined;

  return <AdminProjectManager
    projects={projectsResult.data ?? []}
    workspaces={workspaces}
    notice={params.notice}
    error={error}
  />;
}
