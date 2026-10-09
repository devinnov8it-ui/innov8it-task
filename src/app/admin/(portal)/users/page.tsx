import { AdminUsersManager, type ManagedUser } from "@/features/admin/AdminUsersManager";
import { getCurrentUser } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "User Management" };

const errorMessages: Record<string, string> = {
  invalid: "Check the profile fields and try again.",
  missing: "That account could not be found.",
  protected: "You don’t have permission to make that change.",
  self: "You can’t change or delete your own access role here.",
  owner: "The last OWNER account can’t be demoted or deleted.",
  confirmation: "The confirmation email didn’t match.",
  account: "A linked sign-in account could not be found; nothing was deleted.",
  update: "The profile could not be updated.",
  delete: "The account could not be fully deleted. Contact the system administrator.",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient({ readOnly: true });
  const [{ data, error }] = await Promise.all([
    supabase
      .from("users")
      .select("id, name, email, avatar, role, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);
  const params = await searchParams;
  const notice = params.notice === "updated"
    ? "Profile updated."
    : params.notice === "deleted"
      ? "Account deleted."
      : undefined;

  return (
    <AdminUsersManager
      users={(data ?? []) as ManagedUser[]}
      currentUserId={user.id}
      currentUserRole={user.role === "OWNER" ? "OWNER" : "ADMIN"}
      notice={notice}
      error={params.error ? errorMessages[params.error] ?? "The requested user change could not be completed." : error ? "User accounts could not be loaded." : undefined}
    />
  );
}
