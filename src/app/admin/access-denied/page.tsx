import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { ShieldAlert } from "lucide-react";

export const metadata = { title: "Admin Access Required" };

export default function AdminAccessDeniedPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-grid-pattern px-4 py-10">
      <section className="w-full max-w-lg rounded-xl border bg-card p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <ShieldAlert className="size-6" aria-hidden="true" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Innov8IT Admin</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Admin access required</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          This account doesn’t have the OWNER or ADMIN role. Ask an existing administrator to grant access, or switch to an administrator account.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <SignOutButton redirectUrl="/admin/sign-in">
            <button type="button" className="min-h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
              Switch account
            </button>
          </SignOutButton>
          <Link href="/dashboard" className="inline-flex min-h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted">
            Back to workspace
          </Link>
        </div>
      </section>
    </main>
  );
}