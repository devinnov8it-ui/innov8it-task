import { Card, CardContent } from "@/components/ui/card";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-16">
      <Card className="w-full max-w-xl rounded-2xl p-0">
        <CardContent className="p-8 sm:p-12">
          <div className="mb-8 flex items-center gap-3 text-sm font-semibold tracking-widest text-primary">
            <img src="/innov8it-logo.svg" alt="Innov8IT" className="size-12 rounded-xl" />
            <span>INNOV8IT</span>
          </div>
          <h1
            id="welcome-heading"
            className="text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            A shared space for great work.
          </h1>
          <p className="mt-5 text-base leading-7 text-muted-foreground">
            Bring your team, projects, and priorities together.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4 border-t pt-6 text-sm">
            <Show when="signed-out">
              <SignInButton mode="redirect" forceRedirectUrl="/dashboard">
                <button className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-medium text-primary-foreground">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="redirect" forceRedirectUrl="/dashboard">
                <button className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4">
                  Create an account
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Link
                href="/dashboard"
                className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-medium text-primary-foreground"
              >
                Open dashboard
              </Link>
              <UserButton afterSignOutUrl="/" />
            </Show>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
