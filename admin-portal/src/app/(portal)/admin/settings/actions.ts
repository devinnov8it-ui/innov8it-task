"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";

export async function saveCalendarPreference(formData: FormData) {
  await requireAdmin();
  const weekStart = formData.get("weekStart");
  if (weekStart !== "Sunday" && weekStart !== "Monday") {
    redirect("/admin/settings?error=preference");
  }

  const cookieStore = await cookies();
  cookieStore.set("admin-week-start", weekStart, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/admin",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  redirect("/admin/settings?notice=saved");
}
