import Link from "next/link";
import { ArrowLeft, BarChart3, CalendarDays, FolderKanban, LayoutDashboard, ListChecks, Settings, ShieldCheck, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import type { AdminIdentity } from "@/lib/admin-auth";
import { AdminNotificationBell, type AdminNotification } from "@/components/AdminNotificationBell";
import { AdminPresenceProvider } from "@/components/AdminPresenceProvider";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const adminLinks = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/admin/tasks", label: "Task manager", icon: ListChecks },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: UsersRound },
  { href: "/admin/settings", label: "Settings", icon: Settings },
] as const;

export async function AdminShell({ children, user }: { children: ReactNode; user: AdminIdentity }) {
  const supabase = createSupabaseAdminClient();
  const [notificationsResult, unreadResult] = await Promise.all([
    supabase.from("notifications").select("id, title, message, is_read, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false),
  ]);
  const notifications = (notificationsResult.data ?? []) as AdminNotification[];
  const notificationsError = Boolean(notificationsResult.error || unreadResult.error);

  return (
    <AdminPresenceProvider user={user}>
    <div className="min-h-svh">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-card/85 backdrop-blur-xl lg:flex">
        <Link href="/admin" className="flex h-20 items-center gap-3 border-b px-6">
          <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><ShieldCheck className="size-5" aria-hidden="true" /></span>
          <span className="font-semibold tracking-wide">INNOV8IT<span className="mt-0.5 block text-xs font-normal tracking-normal text-muted-foreground">Admin portal</span></span>
        </Link>
        <nav aria-label="Admin navigation" className="flex-1 space-y-1 px-3 py-6">
          <p className="mb-4 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Manage</p>
          {adminLinks.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
              <Icon className="size-5" aria-hidden="true" />{label}
            </Link>
          ))}
        </nav>
        <div className="border-t p-4"><a href="/" className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"><ArrowLeft className="size-4" aria-hidden="true" />Workspace app</a></div>
      </aside>

      <div className="min-w-0 lg:pl-64">
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-4 border-b bg-card/90 px-4 backdrop-blur-xl sm:px-8">
          <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Admin portal</p><p className="truncate text-sm font-medium">{user.name || user.email}</p></div>
          <div className="flex shrink-0 items-center gap-3">
            <AdminNotificationBell
              notifications={notifications}
              unreadCount={unreadResult.count ?? 0}
              loadError={notificationsError}
            />
            <a href="/" className="inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-muted"><ArrowLeft className="size-4" aria-hidden="true" /><span className="hidden sm:inline">Workspace app</span><span className="sm:hidden">Workspace</span></a>
          </div>
        </header>
        <nav aria-label="Admin sections" className="flex gap-2 overflow-x-auto border-b bg-card/55 px-4 py-2 lg:hidden">
          {adminLinks.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-muted"><Icon className="size-4" aria-hidden="true" />{label}</Link>)}
        </nav>
        <main className="mx-auto w-full max-w-7xl p-4 sm:p-8 lg:p-10">{children}</main>
      </div>
    </div>
    </AdminPresenceProvider>
  );
}
