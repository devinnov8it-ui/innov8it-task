import type { Metadata } from "next";
import { requireUser } from "@/features/auth/session";
import { DashboardOverview } from "@/components/layout/DashboardOverview";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  return <DashboardOverview error={(await searchParams).error} />;
}
