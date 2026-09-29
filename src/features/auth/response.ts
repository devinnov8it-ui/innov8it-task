import { NextResponse } from "next/server";
import { getAppOrigin } from "./config";

export function authRedirect(path: string) {
  const headers = {
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
  };
  try {
    return NextResponse.redirect(new URL(path, getAppOrigin()), { headers });
  } catch {
    return new NextResponse(
      "Sign-in is temporarily unavailable. Please try again later.",
      { status: 503, headers },
    );
  }
}
