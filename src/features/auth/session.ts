import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const getCurrentUser = cache(async () => {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  if (!user) return null;
  const email = user.primaryEmailAddress?.emailAddress ?? null;
  if (!email) return null;

  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || null;
  const admin = createAdminClient();
  const { data: existing, error: lookupError } = await admin
    .from("users")
    .select("id, name, avatar, role")
    .eq("email", email)
    .maybeSingle();
  if (lookupError) return null;

  let profile = existing;
  if (!profile) {
    const { data: authUsers, error: authUsersError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (authUsersError) return null;

    let databaseUser = authUsers.users.find((candidate) => candidate.email === email);
    if (!databaseUser) {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { name },
      });
      if (createError || !created.user) return null;
      databaseUser = created.user;
    }

    const { data: createdProfile, error: profileError } = await admin
      .from("users")
      .upsert(
        { id: databaseUser.id, name, email, avatar: user.imageUrl },
        { onConflict: "id" },
      )
      .select("id, name, avatar, role")
      .single();
    if (profileError) return null;
    profile = createdProfile;
  }
  if (!profile) return null;
  return {
    id: profile.id,
    email,
    role: profile.role,
    user_metadata: {
      name: profile.name ?? name ?? undefined,
      avatar_url: profile.avatar ?? user.imageUrl,
    },
  };
});

export async function requireUser(redirectTo = "/dashboard") {
  const { userId } = await auth();
  if (!userId) redirect(`/sign-in?redirect_url=${encodeURIComponent(redirectTo)}`);

  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  try {
    user = await getCurrentUser();
  } catch (error) {
    console.error("Signed-in user profile lookup failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
  }
  if (!user) redirect("/auth/profile-unavailable");
  return user;
}
