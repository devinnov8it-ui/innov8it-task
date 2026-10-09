import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  prismaTransaction: vi.fn(),
  requireUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    comment: { create: vi.fn((data) => data) },
    activityLog: { create: vi.fn((data) => data) },
    notification: { create: vi.fn((data) => data) },
  }),
}));
vi.mock("@/features/auth/session", () => ({ requireUser: mocks.requireUser }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import { createTask, updateAssigneeProgress, updateTask } from "@/features/tasks/actions";
import { addComment } from "@/features/tasks/comments";
const user = { id: "11111111-1111-4111-8111-111111111111" };
const taskId = "22222222-2222-4222-8222-222222222222";
const projectId = "33333333-3333-4333-8333-333333333333";

function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

function createClientMock() {
  const inserted: Record<string, unknown[]> = {
    comments: [],
    activity_logs: [],
    notifications: [],
  };
  const task = {
    id: taskId,
    title: "Original title",
    description: "Original description",
    status: "TODO",
    priority: "MEDIUM",
    due_date: null,
    project_id: projectId,
  };
  const taskTable = {
    select: () => ({
      eq: () => ({ single: vi.fn().mockResolvedValue({ data: task, error: null }) }),
    }),
    update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
  };
  const taskAssigneeTable = {
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
  };
  const client = {
    from: vi.fn((table: string) => {
      if (table === "tasks") return taskTable;
      if (table === "task_assignees") return taskAssigneeTable;
      return {
        insert: vi.fn((value: unknown) => {
          inserted[table]?.push(value);
          return Promise.resolve({ error: null });
        }),
      };
    }),
  };
  return { client, inserted, taskTable, taskAssigneeTable };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireUser.mockResolvedValue(user);
});

describe("task detail actions", () => {
  it("requires at least one assignee when creating a task", async () => {
    const { client } = createClientMock();
    mocks.createClient.mockResolvedValue(client);

    await expect(
      createTask(
        form({
          projectId,
          title: "New task without assignee",
          status: "TODO",
          priority: "MEDIUM",
        }),
      ),
    ).rejects.toThrow(
      "REDIRECT:/dashboard/tasks?notice=Please%20assign%20this%20task%20to%20at%20least%20one%20team%20member.",
    );
  });

  it("updates each assignee's own progress without overwriting the rest", async () => {
    const { client, taskAssigneeTable } = createClientMock();
    mocks.createClient.mockResolvedValue(client);

    await expect(
      updateAssigneeProgress(
        form({
          taskId,
          userId: user.id,
          progress: "65",
          returnTo: `/dashboard/tasks/${taskId}`,
        }),
      ),
    ).rejects.toThrow(`REDIRECT:/dashboard/tasks/${taskId}?notice=Assignee%20progress%20updated.`);

    expect(taskAssigneeTable.update).toHaveBeenCalledWith({ progress: 65 });
  });

  it("records comments in activity and notifications", async () => {
    const { client } = createClientMock();
    mocks.createClient.mockResolvedValue(client);

    await expect(
      addComment(
        form({
          taskId,
          content: "I finished the copy review.",
          returnTo: `/dashboard/tasks/${taskId}`,
        }),
      ),
    ).rejects.toThrow(`REDIRECT:/dashboard/tasks/${taskId}?notice=Comment%20added.`);

    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard", "layout");
  });

  it("records edited task fields in activity and notifications", async () => {
    const { client, inserted, taskTable } = createClientMock();
    mocks.createClient.mockResolvedValue(client);

    await expect(
      updateTask(
        form({
          id: taskId,
          projectId,
          title: "Updated title",
          description: "Updated description",
          status: "IN_PROGRESS",
          priority: "HIGH",
          dueDate: "2026-09-20T13:45",
          returnTo: `/dashboard/tasks/${taskId}`,
        }),
      ),
    ).rejects.toThrow(`REDIRECT:/dashboard/tasks/${taskId}?notice=Task%20updated.`);

    expect(taskTable.update).toHaveBeenCalled();
    expect(taskTable.update).toHaveBeenCalledWith({
      project_id: projectId,
      title: "Updated title",
      description: "Updated description",
      status: "IN_PROGRESS",
      priority: "HIGH",
      due_date: "2026-09-20T05:45:00.000Z",
    });
    expect(inserted.activity_logs).toHaveLength(5);
    expect(inserted.activity_logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: expect.stringContaining("1:45 PM") }),
      ]),
    );
    expect(inserted.notifications).toEqual([
      {
        user_id: user.id,
        title: "Task updated",
        message: expect.stringContaining("updated the title"),
      },
    ]);
  });
});
