"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, LayoutDashboard, ShieldCheck, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const adminLinks = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: UsersRound },
] as const;

export function AdminShell({ children, name }: { children: ReactNode; name: string }) {
  const pathname = usePathname();

  return (
    <div className="min-h-svh bg-grid-pattern">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-card/80 backdrop-blur-xl lg:flex">
        <Link href="/admin" className="flex h-20 items-center gap-3 border-b px-6">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>
          <span className="font-semibold tracking-wide">INNOV8IT<span className="mt-0.5 block text-xs font-normal tracking-normal text-muted-foreground">Administration</span></span>
        </Link>
        <nav aria-label="Admin navigation" className="flex-1 space-y-1 px-3 py-6">
          <p className="mb-4 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Manage</p>
          {adminLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-4">
          <Link href="/dashboard" className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to workspace
          </Link>
        </div>
      </aside>

      <div className="min-w-0 lg:pl-64">
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-4 border-b bg-card/80 px-4 backdrop-blur-xl sm:px-8">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Admin portal</p>
            <p className="truncate text-sm font-medium">{name}</p>
          </div>
          <Link href="/dashboard" className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-muted lg:hidden">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Workspace
          </Link>
          <Link href="/dashboard" className="hidden min-h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-muted lg:inline-flex">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to workspace
          </Link>
        </header>
        <nav aria-label="Admin sections" className="flex gap-2 overflow-x-auto border-b bg-card/50 px-4 py-2 lg:hidden">
          {adminLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>
        <main className="mx-auto w-full max-w-7xl p-4 sm:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
