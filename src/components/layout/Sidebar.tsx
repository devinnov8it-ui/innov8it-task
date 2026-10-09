"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  CalendarDays,
  Activity,
  ChartNoAxesCombined,
  ShieldCheck,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
const items = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Projects", icon: FolderKanban, href: "/dashboard/projects" },
  { label: "Tasks", icon: CheckSquare, href: "/dashboard/tasks" },
  { label: "Activity", icon: Activity, href: "/dashboard/activity" },
  { label: "Calendar", icon: CalendarDays, href: "/dashboard/calendar" },
  { label: "Analytics", icon: ChartNoAxesCombined, href: "/dashboard/analytics" },
  { label: "Admin", icon: ShieldCheck, href: "/admin", adminOnly: true, external: true },
  { label: "Settings", icon: Settings, href: "/dashboard/settings" },
];
export function Sidebar({
  collapsed = false,
  onNavigate,
  dashboardHref = "/dashboard",
  teamPresence,
  isAdmin = false,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
  dashboardHref?: "/dashboard" | "/preview";
  teamPresence?: ReactNode;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col bg-card/65 backdrop-blur-xl">
      <Link
        href={dashboardHref}
        aria-label="Innov8IT dashboard"
        onClick={onNavigate}
        className={cn(
          "flex h-20 shrink-0 items-center gap-3 border-b px-6",
          collapsed && "justify-center px-2",
        )}
      >
        <img src="/innov8it-logo.svg" alt="Innov8IT" className="size-9 shrink-0 rounded-xl" />
        {!collapsed && (
          <span className="text-base font-bold tracking-wide">
            INNOV8IT
            <span className="block text-xs font-normal tracking-normal text-muted-foreground">
              Task manager
            </span>
          </span>
        )}
      </Link>
      <nav aria-label="Main navigation" className="flex-1 space-y-1 px-3 py-6">
        {!collapsed && (
          <p className="mb-4 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Workspace
          </p>
        )}
        {items.filter((item) => !item.adminOnly || isAdmin).map(({ label, icon: Icon, href: itemHref, external }) => {
          const href = itemHref
            ? itemHref === "/dashboard" ? dashboardHref : itemHref === "/admin" ? process.env.NEXT_PUBLIC_ADMIN_PORTAL_URL || "http://localhost:3001" : itemHref
            : undefined;
          const content = (
            <>
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              <span className={collapsed ? "sr-only" : "truncate"}>
                {label}
              </span>
            </>
          );
          const style = cn(
            "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium",
            collapsed && "justify-center px-0",
          );
          return href ? (
            <Link
              key={label}
              href={href}
              onClick={onNavigate}
              title={collapsed ? label : undefined}
              target={external ? "_blank" : undefined}
              rel={external ? "noreferrer" : undefined}
              aria-current={!external && (pathname === href || (href !== dashboardHref && pathname.startsWith(`${href}/`))) ? "page" : undefined}
              className={cn(
                style,
                pathname === href || (href !== dashboardHref && pathname.startsWith(`${href}/`))
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {content}
            </Link>
          ) : (
            <button
              key={label}
              type="button"
              disabled
              title={`${label} — coming soon`}
              className={cn(
                style,
                "cursor-not-allowed text-muted-foreground/70",
              )}
              aria-label={`${label}, coming soon`}
            >
              {content}
              {!collapsed && (
                <span className="ml-auto text-[10px] font-normal">Soon</span>
              )}
            </button>
          );
        })}
      </nav>
      {!collapsed && (
        <div className="m-4 rounded-xl border bg-background p-4">
          <p className="text-sm font-medium">Room for great work.</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            One place for your team’s projects and priorities.
          </p>
        </div>
      )}
      {!collapsed && teamPresence}
      <div
        className={cn(
          "border-t px-6 py-4 text-xs text-muted-foreground",
          collapsed && "px-2 text-center",
        )}
      >
        {collapsed ? "I8" : "Innov8IT · Work together"}
      </div>
    </div>
  );
}
