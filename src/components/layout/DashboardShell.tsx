"use client";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { UIProvider, useUIStore } from "@/components/providers/UIProvider";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { QuickActions } from "./QuickActions";
import { GlobalSearch } from "./GlobalSearch";
import { cn } from "@/lib/utils";
import { DashboardRealtime } from "@/components/providers/DashboardRealtime";

const pageTitles = [
  ["/dashboard/projects", "Projects"],
  ["/dashboard/tasks", "Tasks"],
  ["/dashboard/calendar", "Calendar"],
  ["/dashboard/analytics", "Analytics"],
  ["/dashboard/settings", "Settings"],
] as const;

function Shell({
  children,
  name,
  email,
  avatar,
  headerActions,
  teamPresence,
  realtimeWorkspaceId,
  preview = false,
}: {
  children: ReactNode;
  name: string;
  email: string;
  avatar?: string;
  headerActions?: ReactNode;
  teamPresence?: ReactNode;
  realtimeWorkspaceId?: string;
  preview?: boolean;
}) {
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const pageTitle = pageTitles.find(([path]) => pathname.startsWith(path))?.[1] ?? "Dashboard";
  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (query.matches) setMobileOpen(false);
    };
    query.addEventListener("change", closeOnDesktop);
    return () => query.removeEventListener("change", closeOnDesktop);
  }, []);
  return (
    <div className="min-h-svh bg-grid-pattern">
      {realtimeWorkspaceId && <DashboardRealtime workspaceId={realtimeWorkspaceId} />}
      <a
        href="#main-content"
        className="sr-only z-[60] rounded-md bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <aside
        id="dashboard-sidebar"
        aria-label="Workspace sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden overflow-y-auto border-r bg-card/70 backdrop-blur-xl lg:block motion-safe:transition-[width]",
          sidebarOpen ? "w-64" : "w-20",
        )}
      >
        <Sidebar
          collapsed={!sidebarOpen}
          dashboardHref={preview ? "/preview" : "/dashboard"}
            teamPresence={teamPresence}
        />
      </aside>
      <div
        className={cn(
          "min-w-0 motion-safe:transition-[padding]",
          sidebarOpen ? "lg:pl-64" : "lg:pl-20",
        )}
      >
        <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between gap-2 border-b bg-card/65 px-4 backdrop-blur-xl sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              aria-expanded={sidebarOpen}
              aria-controls="dashboard-sidebar"
              className="hidden size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted lg:inline-flex"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="size-5" aria-hidden="true" />
              ) : (
                <PanelLeftOpen className="size-5" aria-hidden="true" />
              )}
            </button>
            <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
              <Dialog.Trigger asChild>
                <button
                  aria-label="Open navigation"
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted lg:hidden"
                >
                  <Menu className="size-5" aria-hidden="true" />
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
                <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] overflow-y-auto border-r bg-card shadow-xl">
                  <Dialog.Title className="sr-only">
                    Workspace navigation
                  </Dialog.Title>
                  <Dialog.Description className="sr-only">
                    Navigate your Innov8IT workspace.
                  </Dialog.Description>
                  <Sidebar
                    onNavigate={() => setMobileOpen(false)}
                    dashboardHref={preview ? "/preview" : "/dashboard"}
                    teamPresence={teamPresence}
                  />
                  <Dialog.Close asChild>
                    <button
                      aria-label="Close navigation"
                      className="absolute right-2 top-5 flex size-10 items-center justify-center rounded-lg bg-card hover:bg-muted"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </Dialog.Close>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
            <p className="truncate text-sm font-medium">{pageTitle}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            {!preview && <GlobalSearch />}
            {headerActions}
            <ThemeToggle />
            <span className="hidden h-7 w-px bg-border sm:block" />
            {preview ? (
              <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
                Preview
              </span>
            ) : (
              <UserMenu name={name} email={email} avatar={avatar} />
            )}
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto max-w-7xl p-4 outline-none sm:p-8 lg:p-10"
        >
          {children}
        </main>
      </div>
      {!preview && <QuickActions />}
    </div>
  );
}
export function DashboardShell(props: {
  children: ReactNode;
  name: string;
  email: string;
  avatar?: string;
  headerActions?: ReactNode;
  teamPresence?: ReactNode;
  realtimeWorkspaceId?: string;
  preview?: boolean;
}) {
  return (
    <UIProvider>
      <Shell {...props} />
    </UIProvider>
  );
}
