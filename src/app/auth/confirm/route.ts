import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authRedirect } from "@/features/auth/response";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  let path = "/login?error=confirmation";
  if (tokenHash && type === "email") {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "email",
      });
      if (!error) path = "/dashboard";
    } catch {
      /* Expired or invalid tokens get the same recoverable error. */
    }
  }
  return authRedirect(path);
}
