import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authRedirect } from "@/features/auth/response";
import { safeNext } from "@/features/auth/validation";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  let path = "/login?error=callback";
  if (code && !request.nextUrl.searchParams.has("error")) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) path = safeNext(request.nextUrl.searchParams.get("next"));
    } catch {
      /* Never expose provider errors or authorization codes. */
    }
  }
  return authRedirect(path);
}
