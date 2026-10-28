// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PendingTasksDock, TaskReminderControl } from "@/components/layout/PendingTasksDock";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { TaskActivityPanel } from "@/features/tasks/components/TaskActivityPanel";
import { getPhilippineTodayKey, philippineDateToUtcStart } from "@/lib/time";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
const mocks = vi.hoisted(() => ({ signOut: vi.fn() }));
vi.mock("@/features/auth/actions", () => ({ signOut: mocks.signOut }));

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  );
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function setup(isAdmin = false) {
  return render(
    <ThemeProvider>
      <DashboardShell name="Ada Lovelace" email="ada@example.com" isAdmin={isAdmin}>
        <h1>Workspace content</h1>
      </DashboardShell>
    </ThemeProvider>,
  );
}

it("shows the admin navigation only for administrators", () => {
  setup();
  expect(screen.queryByRole("link", { name: "Admin" })).toBeNull();
  cleanup();
  setup(true);
  const adminLink = screen.getByRole("link", { name: "Admin" });
  expect(adminLink.getAttribute("href")).toBe(
    "https://innov8it-task-manager-k4ea.vercel.app/admin",
  );
  expect(adminLink.getAttribute("target")).toBe("_blank");
});

it("collapses and expands the desktop sidebar without losing accessible navigation names", async () => {
  const user = userEvent.setup();
  setup();
  await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));
  expect(
    screen
      .getByRole("button", { name: "Expand sidebar" })
      .getAttribute("aria-expanded"),
  ).toBe("false");
  expect(
    screen
      .getByRole("link", { name: "Dashboard" })
      .getAttribute("aria-current"),
  ).toBe("page");
  expect(
    screen.getByRole("link", { name: "Projects" }).getAttribute("aria-current"),
  ).toBeNull();
  await user.click(screen.getByRole("button", { name: "Expand sidebar" }));
  expect(
    screen
      .getByRole("button", { name: "Collapse sidebar" })
      .getAttribute("aria-expanded"),
  ).toBe("true");
});

it("opens the mobile dialog, closes with Escape, and restores focus", async () => {
  const user = userEvent.setup();
  setup();
  const trigger = screen.getByRole("button", { name: "Open navigation" });
  await user.click(trigger);
  expect(
    screen.getByRole("dialog", { name: "Workspace navigation" }),
  ).toBeTruthy();
  await user.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(document.activeElement).toBe(trigger);
});

it("closes mobile navigation when choosing the current dashboard", async () => {
  const user = userEvent.setup();
  setup();
  await user.click(screen.getByRole("button", { name: "Open navigation" }));
  await user.click(
    within(screen.getByRole("dialog")).getByRole("link", { name: "Dashboard" }),
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

it("changes and persists light, dark, and system appearance", async () => {
  const user = userEvent.setup();
  setup();
  const control = screen.getByRole("combobox", { name: "Color theme" });
  await user.selectOptions(control, "dark");
  expect(document.documentElement.classList.contains("dark")).toBe(true);
  expect(window.localStorage.getItem("innov8it-theme")).toBe("dark");
  await user.selectOptions(control, "light");
  expect(document.documentElement.classList.contains("light")).toBe(true);
  await user.selectOptions(control, "system");
  expect(window.localStorage.getItem("innov8it-theme")).toBe("system");
});

it("provides account details and a working signout action", async () => {
  const user = userEvent.setup();
  setup();
  await user.click(screen.getByRole("button", { name: "Open account menu" }));
  expect(screen.getByText("ada@example.com")).toBeTruthy();
  await user.click(screen.getByRole("menuitem", { name: "Sign out" }));
  await waitFor(() => expect(mocks.signOut).toHaveBeenCalled());
});

it("renders task activity history and the comment form", () => {
  render(
    <TaskActivityPanel
      taskId="11111111-1111-1111-1111-111111111111"
      title="Ship onboarding copy"
      commentAction={async () => undefined}
      comments={[
        {
          id: "comment-1",
          content: "I can draft the final text this afternoon.",
          createdAt: "2024-05-21T12:00:00.000Z",
          user: { name: "Ada Lovelace", avatar: null, email: "ada@example.com" },
        },
      ]}
      activity={[
        {
          id: "activity-1",
          action: "updated this task",
          createdAt: "2024-05-21T11:55:00.000Z",
          user: { name: "Ada Lovelace", avatar: null, email: "ada@example.com" },
        },
      ]}
    />,
  );

  expect(screen.getByText(/task activity/i)).toBeTruthy();
  expect(screen.getByText("I can draft the final text this afternoon.")).toBeTruthy();
  expect(screen.getByText(/updated this task/i)).toBeTruthy();
  expect(screen.getByRole("textbox", { name: /add a comment/i })).toBeTruthy();
});

it("shows the pending tasks overlay when the page is minimized", () => {
  Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });

  render(
    <PendingTasksDock
      tasks={[
        {
          id: "task-1",
          title: "Finalize launch checklist",
          status: "IN_PROGRESS",
          priority: "HIGH",
          due_date: "2026-10-09T00:00:00.000Z",
        },
        {
          id: "task-2",
          title: "Review stakeholder notes",
          status: "TODO",
          priority: "MEDIUM",
          due_date: null,
        },
      ]}
    />,
  );

  expect(screen.getByText(/pending tasks/i)).toBeTruthy();
  expect(screen.getByText("Finalize launch checklist")).toBeTruthy();
  expect(screen.getByText("Review stakeholder notes")).toBeTruthy();
});

it("requests notification permission and confirms leaving when overdue tasks exist", async () => {
  const requestPermission = vi.fn(async () => {
    MockNotification.permission = "granted";
    return "granted" as NotificationPermission;
  });
  const notificationSpy = vi.fn();
  const yesterday = new Date(`${getPhilippineTodayKey()}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);
  class MockNotification {
    static permission: NotificationPermission = "default";
    static requestPermission = requestPermission;

    constructor(title: string, options?: NotificationOptions) {
      notificationSpy(title, options);
    }
  }
  vi.stubGlobal("Notification", MockNotification);
  const user = userEvent.setup();

  render(
    <TaskReminderControl
      pendingTaskCount={4}
      overdueTaskCount={1}
      tasks={[
        {
          id: "task-overdue",
          title: "Ship launch checklist",
          status: "IN_PROGRESS",
          priority: "HIGH",
          due_date: philippineDateToUtcStart(yesterdayKey),
        },
        {
          id: "task-today",
          title: "Review test plan",
          status: "TODO",
          priority: "MEDIUM",
          due_date: philippineDateToUtcStart(getPhilippineTodayKey()),
        },
      ]}
    />,
  );
  await user.click(screen.getByRole("button", { name: "Enable reminders" }));

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Reminders on" })).toBeTruthy();
  });
  const closeEvent = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(closeEvent);

  expect(requestPermission).toHaveBeenCalledOnce();
  expect(notificationSpy).toHaveBeenCalledWith(
    "Task reminders enabled",
    expect.objectContaining({ tag: "innov8it-reminders-enabled" }),
  );
  await user.click(screen.getByRole("button", { name: "Reminders on" }));
  expect(notificationSpy).toHaveBeenCalledWith(
    "Reminders are on",
    expect.objectContaining({
      body: expect.stringContaining("Ship launch checklist: 1d overdue · In progress"),
    }),
  );
  expect(notificationSpy).toHaveBeenCalledWith(
    "Reminders are on",
    expect.objectContaining({ body: expect.stringContaining("Review test plan: Due today · To do") }),
  );
  expect(notificationSpy).toHaveBeenCalledWith(
    "Reminders are on",
    expect.objectContaining({ body: expect.stringContaining("2 more assigned tasks") }),
  );
  expect(closeEvent.defaultPrevented).toBe(true);
});

it("shows accurate assigned-task counts before leaving the dashboard", async () => {
  const user = userEvent.setup();

  render(
    <ThemeProvider>
      <DashboardShell
        name="Ada Lovelace"
        email="ada@example.com"
        pendingTaskCount={3}
        overdueTaskCount={1}
      >
        <a href="/">Return to home</a>
      </DashboardShell>
    </ThemeProvider>,
  );

  await user.click(screen.getByRole("link", { name: "Return to home" }));
  expect(screen.getByRole("dialog")).toBeTruthy();
  expect(screen.getByText(/3 unfinished tasks assigned to you, including 1 overdue task/i)).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Stay here" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

it("notifies once with the overdue count when the tab is hidden", () => {
  const notificationSpy = vi.fn();
  class MockNotification {
    static permission: NotificationPermission = "granted";

    constructor(title: string, options?: NotificationOptions) {
      notificationSpy(title, options);
    }
  }
  vi.stubGlobal("Notification", MockNotification);
  vi.spyOn(document, "hasFocus").mockReturnValue(true);
  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });

  render(
    <PendingTasksDock
      overdueTaskCount={4}
      tasks={[
        {
          id: "task-1",
          title: "Finalize launch checklist",
          status: "IN_PROGRESS",
          priority: "HIGH",
          due_date: "2026-10-01T00:00:00.000Z",
        },
      ]}
    />,
  );

  act(() => {
    window.dispatchEvent(new Event("blur"));
    document.dispatchEvent(new Event("visibilitychange"));
  });

  expect(notificationSpy).toHaveBeenCalledOnce();
  expect(notificationSpy).toHaveBeenCalledWith(
    "You have 4 overdue tasks",
    expect.objectContaining({ body: expect.stringContaining("Finalize launch checklist:") }),
  );
});

it("syncs shell task links without observing its own dock updates", async () => {
  Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });

  render(
    <ThemeProvider>
      <DashboardShell name="Ada Lovelace" email="ada@example.com">
        <a href="/dashboard/tasks/task-1">Finalize launch checklist</a>
      </DashboardShell>
    </ThemeProvider>,
  );

  await waitFor(() => {
    expect(screen.getAllByText("Finalize launch checklist").length).toBeGreaterThan(1);
  });
});
