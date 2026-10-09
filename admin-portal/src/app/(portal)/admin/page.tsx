import { AdminOverview } from "@/features/admin/AdminOverview";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const metadata = { title: "Overview" };

async function getTaskLeaderboard(supabase: ReturnType<typeof createSupabaseAdminClient>) {
  const counts = new Map<string, { name: string | null; email: string; completedTasks: number }>();
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("task_assignees")
      .select("id, user_id, users!task_assignees_user_id_fkey(name, email)")
      .eq("status", "DONE")
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) return { leaderboard: [], error: true };

    for (const assignment of data) {
      const profile = assignment.users[0];
      const current = counts.get(assignment.user_id);
      if (current) {
        current.completedTasks += 1;
      } else if (profile) {
        counts.set(assignment.user_id, {
          name: profile.name,
          email: profile.email,
          completedTasks: 1,
        });
      }
    }

    if (data.length < pageSize) break;
    offset += data.length;
  }

  const leaderboard = [...counts.entries()]
    .map(([id, person]) => ({ id, ...person }))
    .sort((a, b) => b.completedTasks - a.completedTasks || (a.name ?? a.email).localeCompare(b.name ?? b.email))
    .slice(0, 10);

  return { leaderboard, error: false };
}

export default async function AdminPage() {
  const supabase = createSupabaseAdminClient();
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Manila",
  }).formatToParts(new Date());
  const dateParts = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const todayStart = new Date(`${dateParts.year}-${dateParts.month}-${dateParts.day}T00:00:00+08:00`).toISOString();
  const [people, members, projects, openTasks, overdueTasks, taskLeaderboard] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase.from("users").select("id, name, email, role, created_at").order("created_at", { ascending: false }).limit(8),
    supabase.from("projects").select("id", { count: "exact", head: true }).neq("status", "ARCHIVED"),
    supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "DONE"),
    supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "DONE").lt("due_date", todayStart),
    getTaskLeaderboard(supabase),
  ]);

  return <AdminOverview
    members={members.data ?? []}
    taskLeaderboard={taskLeaderboard.leaderboard}
    stats={{ people: people.count ?? 0, projects: projects.count ?? 0, openTasks: openTasks.count ?? 0, overdueTasks: overdueTasks.count ?? 0 }}
    dataError={[people, members, projects, openTasks, overdueTasks].some((result) => Boolean(result.error)) || taskLeaderboard.error}
  />;
}