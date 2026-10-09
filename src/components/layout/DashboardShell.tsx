"use client";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { UIProvider, useUIStore } from "@/components/providers/UIProvider";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { QuickActions } from "./QuickActions";
import { GlobalSearch } from "./GlobalSearch";
import { PendingTasksDock, TaskReminderControl, type PendingTask } from "./PendingTasksDock";
import { cn } from "@/lib/utils";
import { DashboardRealtime } from "@/components/providers/DashboardRealtime";

const pageTitles = [
  ["/dashboard/projects", "Projects"],
  ["/dashboard/tasks", "Tasks"],
  ["/dashboard/calendar", "Calendar"],
  ["/dashboard/analytics", "Analytics"],
  ["/dashboard/settings", "Settings"],
] as const;

type ExitTarget =
  | { kind: "link"; href: string }
  | { kind: "button"; element: HTMLButtonElement };

function Shell({
  children,
  name,
  email,
  avatar,
  headerActions,
  teamPresence,
  realtimeWorkspaceId,
  reminderTasks = [],
  pendingTaskCount = 0,
  overdueTaskCount = 0,
  isAdmin = false,
  preview = false,
}: {
  children: ReactNode;
  name: string;
  email: string;
  avatar?: string;
  headerActions?: ReactNode;
  teamPresence?: ReactNode;
  realtimeWorkspaceId?: string;
  reminderTasks?: PendingTask[];
  pendingTaskCount?: number;
  overdueTaskCount?: number;
  isAdmin?: boolean;
  preview?: boolean;
}) {
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);
  const exitTarget = useRef<ExitTarget | null>(null);
  const bypassExitGuard = useRef<HTMLButtonElement | null>(null);
  const router = useRouter();
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

  const guardAppExit = (event: MouseEvent<HTMLDivElement>) => {
    if (pendingTaskCount === 0 || !(event.target instanceof Element)) return;

    const exitButton = event.target.closest<HTMLButtonElement>("[data-pending-task-exit]");
    if (exitButton) {
      if (bypassExitGuard.current === exitButton) {
        bypassExitGuard.current = null;
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      exitTarget.current = { kind: "button", element: exitButton };
      setConfirmExitOpen(true);
      return;
    }

    const link = event.target.closest<HTMLAnchorElement>("a[href]");
    if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
    const destination = new URL(link.href, window.location.href);
    const leavesDashboard = destination.origin !== window.location.origin
      || !destination.pathname.startsWith("/dashboard");
    if (!leavesDashboard) return;

    event.preventDefault();
    event.stopPropagation();
    exitTarget.current = { kind: "link", href: destination.href };
    setConfirmExitOpen(true);
  };

  const continueExit = () => {
    const target = exitTarget.current;
    exitTarget.current = null;
    setConfirmExitOpen(false);
    if (!target) return;
    window.dispatchEvent(new Event("pending-task-exit-confirmed"));

    if (target.kind === "button") {
      bypassExitGuard.current = target.element;
      target.element.click();
      return;
    }

    const destination = new URL(target.href);
    if (destination.origin === window.location.origin) {
      router.push(`${destination.pathname}${destination.search}${destination.hash}`);
    } else {
      window.location.assign(destination.href);
    }
  };

  return (
    <div className="min-h-svh bg-grid-pattern" onClickCapture={guardAppExit}>
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
          isAdmin={isAdmin}
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
                    isAdmin={isAdmin}
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
            {!preview && <TaskReminderControl tasks={reminderTasks} pendingTaskCount={pendingTaskCount} overdueTaskCount={overdueTaskCount} />}
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
      <Dialog.Root open={confirmExitOpen} onOpenChange={setConfirmExitOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[80] w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-6 shadow-2xl">
            <Dialog.Title className="text-lg font-semibold">Leave with tasks unfinished?</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">
              You have {pendingTaskCount} unfinished task{pendingTaskCount === 1 ? "" : "s"} assigned to you
              {overdueTaskCount > 0
                ? `, including ${overdueTaskCount} overdue task${overdueTaskCount === 1 ? "" : "s"}.`
                : "."}
              {" "}Would you like to stay and review them?
            </Dialog.Description>
            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close asChild>
                <button type="button" className="min-h-10 rounded-md border px-4 text-sm font-medium hover:bg-muted">
                  Stay here
                </button>
              </Dialog.Close>
              <button type="button" onClick={continueExit} className="min-h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
                Continue
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {!preview && <PendingTasksDock tasks={reminderTasks} pendingTaskCount={pendingTaskCount} overdueTaskCount={overdueTaskCount} />}
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
  reminderTasks?: PendingTask[];
  pendingTaskCount?: number;
  overdueTaskCount?: number;
  isAdmin?: boolean;
  preview?: boolean;
}) {
  return (
    <UIProvider>
      <Shell {...props} />
    </UIProvider>
  );
}
