import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig, getSupabaseServiceRoleKey } from "./env";

export function createAdminClient() {
  const { url } = getSupabaseConfig();

  return createClient(url, getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export async function findAuthUserByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
) {
  const normalizedEmail = email.trim().toLowerCase();
  const perPage = 1000;

  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) return { user: null, error };

    const user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === normalizedEmail,
    );
    if (user) return { user, error: null };
    if (data.users.length < perPage) return { user: null, error: null };
  }
}