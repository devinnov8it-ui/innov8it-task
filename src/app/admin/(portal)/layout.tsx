import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { getCurrentUser } from "@/features/auth/session";

export const metadata = { title: { default: "Admin Portal", template: "%s | Innov8IT Admin" } };
export const dynamic = "force-dynamic";

export default async function AdminPortalLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/sign-in");
  if (user.role !== "OWNER" && user.role !== "ADMIN") redirect("/admin/access-denied");

  const name = user.user_metadata?.name?.trim() || user.email || "Administrator";
  return <AdminShell name={name}>{children}</AdminShell>;
}