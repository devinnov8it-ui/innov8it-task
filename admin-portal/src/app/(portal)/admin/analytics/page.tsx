import { TaskAnalytics } from "@/features/admin/TaskAnalytics";
import { loadAdminTasks } from "@/features/admin/admin-data";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const metadata = { title: "Analytics" };

export default async function AdminAnalyticsPage() {
  const result = await loadAdminTasks(createSupabaseAdminClient());
  return <TaskAnalytics tasks={result.tasks} error={result.error} />;
}
