import type { ReactNode } from "react";
import { requireUser } from "@/features/auth/session";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { TeamPresence } from "@/components/layout/TeamPresence";
import type { PendingTask } from "@/components/layout/PendingTasksDock";
import { createClient } from "@/lib/supabase/server";
import { getPhilippineTodayKey, philippineDateToUtcStart } from "@/lib/time";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();
  const metadataName: unknown = user.user_metadata?.name;
  const name =
    typeof metadataName === "string" && metadataName.trim()
      ? metadataName.trim().slice(0, 100)
      : user.email?.split("@")[0] || "Your account";
  const metadataAvatar = user.user_metadata?.avatar_url;
  const avatar = typeof metadataAvatar === "string" ? metadataAvatar : undefined;

  const supabase = await createClient({ readOnly: true });
  const todayStart = philippineDateToUtcStart(getPhilippineTodayKey());
  const [
    { data: notifications },
    { data: membership },
    { data: allUsers },
    { data: reminderTaskRows, count: pendingTaskCount },
    { count: overdueTaskCount },
  ] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, title, message, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("users")
      .select("id, name, email, avatar")
      .order("name", { ascending: true })
      .limit(200),
    supabase
      .from("tasks")
      .select("id, title, status, priority, due_date, task_assignees!inner(user_id)", { count: "exact" })
      .eq("task_assignees.user_id", user.id)
      .neq("status", "DONE")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(4),
    supabase
      .from("tasks")
      .select("id, task_assignees!inner(user_id)", { count: "exact", head: true })
      .eq("task_assignees.user_id", user.id)
      .neq("status", "DONE")
      .lt("due_date", todayStart),
  ]);
  const reminderTasks = (reminderTaskRows ?? []) as PendingTask[];
  const { data: ownedWorkspace } = membership
    ? { data: null }
    : await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
  const workspaceId = membership?.workspace_id ?? ownedWorkspace?.id;
  const { data: memberRows } = workspaceId
    ? await supabase
        .from("workspace_members")
        .select("user:users!inner(id, name, email, avatar)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true })
    : { data: [] };
  const members = (memberRows ?? [])
    .map((row) => Array.isArray(row.user) ? row.user[0] : row.user)
    .filter((member): member is { id: string; name: string | null; email: string; avatar: string | null } => Boolean(member));
  const userAvatar = typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null;
  const owner = {
    id: user.id,
    name: typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null,
    email: user.email ?? "",
    avatar: userAvatar,
  };
  const teamMembers = members.some((member) => member.id === owner.id)
    ? members
    : [owner, ...members];
  const allMembers = (allUsers ?? [])
    .filter((member): member is { id: string; name: string | null; email: string; avatar: string | null } => Boolean(member?.id && member?.email));
  const presenceMembers = allMembers.length > 0 ? allMembers : teamMembers;
  const presenceWorkspaceId = workspaceId ?? "system-presence";

  return (
    <DashboardShell
      name={name}
      email={user.email || ""}
      avatar={avatar}
      headerActions={<NotificationBell notifications={notifications ?? []} />}
      teamPresence={<TeamPresence compact workspaceId={presenceWorkspaceId} userId={user.id} userName={name} userAvatar={userAvatar} members={presenceMembers} />}
      realtimeWorkspaceId={workspaceId}
      reminderTasks={reminderTasks}
      pendingTaskCount={pendingTaskCount ?? 0}
      overdueTaskCount={overdueTaskCount ?? 0}
      isAdmin={user.role === "OWNER" || user.role === "ADMIN"}
    >
      {children}
    </DashboardShell>
  );
}
