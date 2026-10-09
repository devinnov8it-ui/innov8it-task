"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const userIdSchema = z.string().uuid();
const roleSchema = z.enum(["OWNER", "ADMIN", "MEMBER"]);

function fail(code: string): never {
  redirect(`/admin/users?error=${encodeURIComponent(code)}`);
}

export async function updateUser(form: FormData): Promise<void> {
  const userId = userIdSchema.safeParse(form.get("userId"));
  const name = z.string().trim().min(1).max(100).safeParse(form.get("name"));
  const avatar = z.string().trim().url().max(2000).optional().or(z.literal("")).safeParse(form.get("avatar"));
  const role = roleSchema.safeParse(form.get("role"));
  if (!userId.success || !name.success || !avatar.success || !role.success) fail("invalid");

  const actor = await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const { data: target, error: lookupError } = await supabase.from("users").select("id, role").eq("id", userId.data).maybeSingle();
  if (lookupError || !target) fail("missing");
  if (target.role === "OWNER" && actor.role !== "OWNER") fail("protected");
  if (target.id === actor.id && role.data !== target.role) fail("self");
  if (role.data === "OWNER" && actor.role !== "OWNER") fail("protected");

  if (target.role === "OWNER" && role.data !== "OWNER") {
    const { count, error } = await supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "OWNER");
    if (error || (count ?? 0) < 2) fail("owner");
  }

  const { error: updateError } = await supabase.from("users").update({ name: name.data, avatar: avatar.data || null, role: role.data }).eq("id", target.id);
  if (updateError) fail("update");
  revalidatePath("/admin", "layout");
  redirect("/admin/users?notice=updated");
}

export async function deleteUser(form: FormData): Promise<void> {
  const userId = userIdSchema.safeParse(form.get("userId"));
  const confirmation = z.string().trim().max(320).safeParse(form.get("confirmation"));
  if (!userId.success || !confirmation.success) fail("confirmation");

  const actor = await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const { data: target, error: lookupError } = await supabase.from("users").select("id, email, role").eq("id", userId.data).maybeSingle();
  if (lookupError || !target) fail("missing");
  if (target.id === actor.id) fail("self");
  if (confirmation.data !== target.email) fail("confirmation");
  if (target.role === "OWNER" && actor.role !== "OWNER") fail("protected");
  if (target.role === "OWNER") {
    const { count, error } = await supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "OWNER");
    if (error || (count ?? 0) < 2) fail("owner");
  }

  const { data: authAccount, error: authLookupError } = await supabase.auth.admin.getUserById(target.id);
  if (authLookupError || !authAccount.user) fail("account");
  const clerk = await clerkClient();
  const { data: clerkAccounts } = await clerk.users.getUserList({ emailAddress: [target.email], limit: 1 });
  const clerkAccount = clerkAccounts[0];
  if (!clerkAccount) fail("account");

  try {
    await clerk.users.deleteUser(clerkAccount.id);
  } catch {
    fail("delete");
  }
  const { error: deleteError } = await supabase.auth.admin.deleteUser(authAccount.user.id);
  if (deleteError) {
    console.error("Admin account deletion left a Supabase account after Clerk deletion", { targetUserId: target.id, code: deleteError.code });
    fail("delete");
  }

  revalidatePath("/admin", "layout");
  redirect("/admin/users?notice=deleted");
}
