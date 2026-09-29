import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { safeNext } from "@/features/auth/validation";

export const metadata: Metadata = { title: "Create account" };
export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNext((await searchParams).next);
  redirect(`/sign-up${next !== "/dashboard" ? `?redirect_url=${encodeURIComponent(next)}` : ""}`);
}
