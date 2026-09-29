// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { TaskActivityPanel } from "@/features/tasks/components/TaskActivityPanel";

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
});

function setup() {
  return render(
    <ThemeProvider>
      <DashboardShell name="Ada Lovelace" email="ada@example.com">
        <h1>Workspace content</h1>
      </DashboardShell>
    </ThemeProvider>,
  );
}

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
