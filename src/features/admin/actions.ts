"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/features/auth/session";
import { createAdminClient, findAuthUserByEmail } from "@/lib/supabase/admin";

const userIdSchema = z.string().uuid();
const roleSchema = z.enum(["OWNER", "ADMIN", "MEMBER"]);

async function requireAdmin() {
  const actor = await requireUser();
  if (actor.role !== "OWNER" && actor.role !== "ADMIN") redirect("/admin/access-denied");
  return actor;
}

function redirectUserError(message: string): never {
  redirect(`/admin/users?error=${encodeURIComponent(message)}`);
}

export async function updateAdminUser(form: FormData): Promise<void> {
  const userId = userIdSchema.safeParse(form.get("userId"));
  const name = z.string().trim().min(1).max(100).safeParse(form.get("name"));
  const avatar = z.string().trim().url().max(2_000).optional().or(z.literal("")).safeParse(form.get("avatar"));
  const role = roleSchema.safeParse(form.get("role"));
  if (!userId.success || !name.success || !avatar.success || !role.success) redirectUserError("Check the profile fields and try again.");

  const actor = await requireAdmin();
  const admin = createAdminClient();
  const { data: target, error: lookupError } = await admin
    .from("users")
    .select("id, email, role")
    .eq("id", userId.data)
    .maybeSingle();
  if (lookupError || !target) redirectUserError("That account could not be found.");

  if (target.role === "OWNER" && actor.role !== "OWNER") {
    redirectUserError("Only an OWNER can edit an OWNER account.");
  }
  if (target.id === actor.id && role.data !== target.role) {
    redirectUserError("You can’t change your own access role.");
  }
  if (role.data === "OWNER" && actor.role !== "OWNER") {
    redirectUserError("Only an OWNER can grant the OWNER role.");
  }
  if (target.role === "OWNER" && role.data !== "OWNER") {
    const { count, error } = await admin.from("users").select("id", { count: "exact", head: true }).eq("role", "OWNER");
    if (error || (count ?? 0) < 2) redirectUserError("The last OWNER account can’t be demoted.");
  }

  const { error: updateError } = await admin
    .from("users")
    .update({ name: name.data, avatar: avatar.data || null, role: role.data })
    .eq("id", target.id);
  if (updateError) redirectUserError("The profile could not be updated.");

  revalidatePath("/admin", "layout");
  revalidatePath("/dashboard", "layout");
  redirect("/admin/users?notice=updated");
}

export async function deleteAdminUser(form: FormData): Promise<void> {
  const userId = userIdSchema.safeParse(form.get("userId"));
  const confirmation = z.string().trim().min(1).max(320).safeParse(form.get("confirmation"));
  if (!userId.success || !confirmation.success) redirectUserError("Confirm the account email to continue.");

  const actor = await requireAdmin();
  const admin = createAdminClient();
  const { data: target, error: lookupError } = await admin
    .from("users")
    .select("id, email, role")
    .eq("id", userId.data)
    .maybeSingle();
  if (lookupError || !target) redirectUserError("That account could not be found.");
  if (target.id === actor.id) redirectUserError("You can’t delete your own account from the admin portal.");
  if (confirmation.data !== target.email) redirectUserError("The confirmation email didn’t match.");
  if (target.role === "OWNER" && actor.role !== "OWNER") {
    redirectUserError("Only an OWNER can delete another OWNER account.");
  }
  if (target.role === "OWNER") {
    const { count, error } = await admin.from("users").select("id", { count: "exact", head: true }).eq("role", "OWNER");
    if (error || (count ?? 0) < 2) redirectUserError("The last OWNER account can’t be deleted.");
  }

  const { user: authUser, error: authLookupError } = await findAuthUserByEmail(admin, target.email);
  if (authLookupError || !authUser) redirectUserError("The linked Supabase account could not be found; nothing was deleted.");

  let clerk;
  try {
    clerk = await clerkClient();
    const { data: clerkUsers } = await clerk.users.getUserList({ emailAddress: [target.email], limit: 1 });
    const clerkUser = clerkUsers[0];
    if (!clerkUser) redirectUserError("The linked sign-in account could not be found; nothing was deleted.");
    await clerk.users.deleteUser(clerkUser.id);
  } catch {
    redirectUserError("The sign-in account could not be deleted. Nothing else was changed.");
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(authUser.id);
  if (deleteError) {
    console.error("Admin account deletion left a Supabase account after Clerk deletion", {
      userId: target.id,
      code: deleteError.code,
      status: deleteError.status,
    });
    redirectUserError("The sign-in account was removed, but its data cleanup failed. Contact the system administrator.");
  }

  revalidatePath("/admin", "layout");
  revalidatePath("/dashboard", "layout");
  redirect("/admin/users?notice=deleted");
}
