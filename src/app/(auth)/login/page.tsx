import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.next) query.set("redirect_url", params.next);
  if (params.notice) query.set("notice", params.notice);
  if (params.error) query.set("error", params.error);

  redirect(`/sign-in${query.size > 0 ? `?${query.toString()}` : ""}`);
}
