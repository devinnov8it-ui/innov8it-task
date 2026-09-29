import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-6 flex items-center justify-center gap-2 text-sm font-semibold tracking-widest text-primary"
        >
          <img src="/innov8it-logo.svg" alt="Innov8IT" className="size-9 rounded-xl" />
          <span>INNOV8IT</span>
        </Link>
        <Card>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </main>
  );
}
