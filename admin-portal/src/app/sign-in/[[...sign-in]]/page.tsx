import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";

export const metadata = { title: "Admin Sign In" };

export default function AdminSignInPage() {
  return (
    <main className="grid min-h-svh place-items-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <header className="text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-lg border bg-card text-primary" aria-hidden="true">
            <span className="text-lg font-bold">I8</span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Standalone admin portal</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sign in to Innov8IT Admin</h1>
          <p className="mt-2 text-sm text-muted-foreground">Use your existing Innov8IT administrator account.</p>
        </header>
        <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
          <Suspense fallback={<div className="min-h-96" aria-label="Loading sign in" />}>
            <SignIn
              routing="path"
              path="/sign-in"
              forceRedirectUrl="/admin"
              signUpUrl={`${process.env.NEXT_PUBLIC_WORKSPACE_URL ?? "http://127.0.0.1:3000"}/sign-up`}
            />
          </Suspense>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Need the workspace? <Link href={process.env.NEXT_PUBLIC_WORKSPACE_URL ?? "http://127.0.0.1:3000"} className="font-medium text-primary hover:underline">Open workspace</Link>
        </p>
      </div>
    </main>
  );
}
