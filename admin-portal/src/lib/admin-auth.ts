import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export type AdminIdentity = {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role: "OWNER" | "ADMIN";
};

export async function requireAdmin(): Promise<AdminIdentity> {
  const { userId } = await auth();
  if (!userId) redirect("/admin/sign-in");

  const clerkUser = await currentUser();
  const email = clerkUser?.primaryEmailAddress?.emailAddress;
  if (!email) redirect("/admin/access-denied");

  const supabase = createSupabaseAdminClient();
  const { data: profile, error } = await supabase
    .from("users")
    .select("id, email, name, avatar, role")
    .eq("email", email)
    .maybeSingle();

  if (error || !profile || (profile.role !== "OWNER" && profile.role !== "ADMIN")) {
    redirect("/admin/access-denied");
  }

  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    avatar: profile.avatar,
    role: profile.role,
  };
}
