import { UsersManager, type ManagedUser } from "@/features/admin/UsersManager";
import { requireAdmin } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const metadata = { title: "User Management" };

const errors: Record<string, string> = {
  invalid: "Check the profile fields and try again.",
  missing: "That account could not be found.",
  protected: "You don’t have permission to change that account.",
  self: "You can’t change or delete your own access role here.",
  owner: "The last OWNER account can’t be demoted or deleted.",
  confirmation: "The confirmation email didn’t match.",
  account: "A linked sign-in account could not be found; nothing was deleted.",
  update: "The profile could not be updated.",
  delete: "The account could not be fully deleted. Contact the system administrator.",
};

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const currentUser = await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const [{ data, error }, params] = await Promise.all([
    supabase.from("users").select("id, name, email, avatar, role, created_at").order("created_at", { ascending: false }).limit(500),
    searchParams,
  ]);
  const notice = params.notice === "updated" ? "Profile updated." : params.notice === "deleted" ? "Account deleted." : undefined;

  return <UsersManager
    users={(data ?? []) as ManagedUser[]}
    currentUserId={currentUser.id}
    currentUserRole={currentUser.role}
    notice={notice}
    error={params.error ? errors[params.error] ?? "The requested user change could not be completed." : error ? "User accounts could not be loaded." : undefined}
  />;
}
