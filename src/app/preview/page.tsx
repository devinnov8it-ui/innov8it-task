import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { DashboardOverview } from "@/components/layout/DashboardOverview";

export const metadata: Metadata = {
  title: "Dashboard preview",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default function PreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <DashboardShell name="Preview" email="" preview>
      <p
        role="status"
        className="mb-6 rounded-lg border bg-card p-4 text-sm text-muted-foreground"
      >
        Development preview · No account or live data connected.
      </p>
      <DashboardOverview preview />
    </DashboardShell>
  );
}
