import Link from "next/link";

export default function ProfileUnavailablePage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-16">
      <section className="w-full max-w-lg rounded-md border bg-card p-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Workspace unavailable
        </p>
        <h1 className="mt-4 text-2xl font-semibold">You are signed in</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          We could not connect to your workspace data service. Check the
          Supabase project URL and network connection, then retry. If the
          problem continues, contact your workspace administrator.
        </p>
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <Link
            href="/dashboard"
            className="inline-flex min-h-10 items-center rounded-md bg-primary px-4 font-medium text-primary-foreground"
          >
            Retry dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-10 items-center font-medium text-primary underline underline-offset-4"
          >
            Return home
          </Link>
        </div>
      </section>
    </main>
  );
}