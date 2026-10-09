import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

export const metadata = { title: "Admin Sign In" };

export default function AdminSignInPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-grid-pattern px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <header className="text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-lg border bg-card text-primary">
            <img src="/innov8it-logo.svg" alt="" className="size-8 rounded-md" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Innov8IT Admin</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Admin portal sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">Use your existing Innov8IT administrator account.</p>
        </header>

        <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
          <SignIn routing="path" path="/admin/sign-in" forceRedirectUrl="/admin" signUpUrl="/sign-up" />
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Need the regular workspace? <Link href="/sign-in" className="font-medium text-primary hover:underline">Workspace sign in</Link>
        </p>
      </div>
    </main>
  );
}