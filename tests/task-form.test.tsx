import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/features/tasks/actions", () => ({ createTask: vi.fn() }));
vi.mock("@/features/kanban/components/TaskWorkspaceViews", () => ({
  TaskWorkspaceViews: () => <div>Task views</div>,
}));

import TasksPage from "@/app/dashboard/tasks/page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({
    id: "user-1",
    email: "owner@example.com",
    user_metadata: { name: "Alex Owner" },
  });

  mocks.createClient.mockResolvedValue({
    from: (table: string) => {
      if (table === "projects") {
        return {
          select: () => ({
            neq: () => ({
              order: () => Promise.resolve({ data: [{ id: "project-1", name: "Website redesign" }], error: null }),
            }),
          }),
        };
      }

      if (table === "tasks") {
        return {
          select: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      }

      if (table === "users") {
        return {
          select: () => ({
            order: () => Promise.resolve({
              data: [
                { id: "user-1", name: "Alex Owner", email: "owner@example.com", role: "OWNER" },
                { id: "user-2", name: "Jamie Smith", email: "jamie@example.com", role: "MEMBER" },
                { id: "user-3", name: "Priya Patel", email: "priya@example.com", role: "MEMBER" },
              ],
              error: null,
            }),
          }),
        };
      }

      return {
        select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
      };
    },
  });
});

describe("task creation form", () => {
  it("shows assignee checkboxes so multiple teammates can be selected", async () => {
    const page = await TasksPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('type="checkbox"');
    expect(html).toContain('name="assigneeIds"');
    expect(html).toContain("Jamie Smith");
    expect(html).toContain("Priya Patel");
  });
});
