import { AdminOverview } from "@/features/admin/AdminOverview";
import { createClient } from "@/lib/supabase/server";
import { getPhilippineTodayKey, philippineDateToUtcStart } from "@/lib/time";

type AdminMember = {
  id: string;
  name: string | null;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  created_at: string;
};

export const metadata = { title: "Overview" };

export default async function AdminPage() {
  const supabase = await createClient({ readOnly: true });
  const todayStart = philippineDateToUtcStart(getPhilippineTodayKey());
  const [peopleResult, membersResult, projectsResult, openTasksResult, overdueResult] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase.from("users").select("id, name, email, role, created_at").order("created_at", { ascending: false }).limit(8),
    supabase.from("projects").select("id", { count: "exact", head: true }).neq("status", "ARCHIVED"),
    supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "DONE"),
    supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "DONE").lt("due_date", todayStart),
  ]);
  const members = (membersResult?.data ?? []) as AdminMember[];

  return (
    <AdminOverview
      members={members}
      stats={{
        memberCount: peopleResult?.count ?? 0,
        projectCount: projectsResult?.count ?? 0,
        openTaskCount: openTasksResult?.count ?? 0,
        overdueTaskCount: overdueResult?.count ?? 0,
      }}
      hasDataError={[peopleResult, membersResult, projectsResult, openTasksResult, overdueResult].some((result) => Boolean(result?.error))}
    />
  );
}