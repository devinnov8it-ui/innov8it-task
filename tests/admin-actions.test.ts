import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  createAdminClient: vi.fn(),
  clerkClient: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: mocks.clerkClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

import { deleteAdminUser, updateAdminUser } from "@/features/admin/actions";

const adminId = "11111111-1111-4111-8111-111111111111";
const memberId = "22222222-2222-4222-8222-222222222222";

function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

function configureAdminClient(target: { id: string; email: string; role: string }, ownerCount = 1) {
  const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
  const from = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn((column: string) => column === "id"
        ? { maybeSingle: vi.fn().mockResolvedValue({ data: target, error: null }) }
        : Promise.resolve({ count: ownerCount, error: null })),
    })),
    update,
  }));
  const deleteUser = vi.fn().mockResolvedValue({ error: null });
  const getUserByEmail = vi.fn().mockResolvedValue({ data: { user: { id: memberId } }, error: null });
  mocks.createAdminClient.mockReturnValue({
    from,
    auth: { admin: { getUserByEmail, deleteUser } },
  });
  return { from, update, deleteUser, getUserByEmail };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("admin user management actions", () => {
  it("rejects a non-admin caller before opening the service-role client", async () => {
    mocks.requireUser.mockResolvedValue({ id: memberId, role: "MEMBER" });

    await expect(updateAdminUser(form({ userId: memberId, name: "Member", avatar: "", role: "MEMBER" })))
      .rejects.toThrow("REDIRECT:/admin/access-denied");
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("updates profile name, avatar, and role for an administrator", async () => {
    mocks.requireUser.mockResolvedValue({ id: adminId, role: "ADMIN" });
    const { update } = configureAdminClient({ id: memberId, email: "member@example.com", role: "MEMBER" });

    await expect(updateAdminUser(form({
      userId: memberId,
      name: "Ada Lovelace",
      avatar: "https://cdn.example.com/ada.png",
      role: "ADMIN",
    }))).rejects.toThrow("REDIRECT:/admin/users?notice=updated");

    expect(update).toHaveBeenCalledWith({ name: "Ada Lovelace", avatar: "https://cdn.example.com/ada.png", role: "ADMIN" });
  });

  it("does not allow an administrator to modify an owner", async () => {
    mocks.requireUser.mockResolvedValue({ id: adminId, role: "ADMIN" });
    const { update } = configureAdminClient({ id: memberId, email: "owner@example.com", role: "OWNER" }, 2);

    await expect(updateAdminUser(form({ userId: memberId, name: "Owner", avatar: "", role: "OWNER" })))
      .rejects.toThrow("REDIRECT:/admin/users?error=Only%20an%20OWNER%20can%20edit%20an%20OWNER%20account.");
    expect(update).not.toHaveBeenCalled();
  });

  it("prevents deleting the last owner", async () => {
    mocks.requireUser.mockResolvedValue({ id: adminId, role: "OWNER" });
    const { deleteUser, getUserByEmail } = configureAdminClient({ id: memberId, email: "owner@example.com", role: "OWNER" }, 1);

    await expect(deleteAdminUser(form({ userId: memberId, confirmation: "owner@example.com" })))
      .rejects.toThrow(/last%20OWNER%20account/);
    expect(getUserByEmail).not.toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("prevents an administrator from deleting their own account", async () => {
    mocks.requireUser.mockResolvedValue({ id: adminId, role: "ADMIN" });
    const { getUserByEmail } = configureAdminClient({ id: adminId, email: "admin@example.com", role: "ADMIN" });

    await expect(deleteAdminUser(form({ userId: adminId, confirmation: "admin@example.com" })))
      .rejects.toThrow("REDIRECT:/admin/users?error=You%20can%E2%80%99t%20delete%20your%20own%20account%20from%20the%20admin%20portal.");
    expect(getUserByEmail).not.toHaveBeenCalled();
  });

  it("deletes both linked sign-in accounts after email confirmation", async () => {
    mocks.requireUser.mockResolvedValue({ id: adminId, role: "ADMIN" });
    const { deleteUser: deleteSupabaseUser } = configureAdminClient({ id: memberId, email: "member@example.com", role: "MEMBER" });
    const deleteClerkUser = vi.fn().mockResolvedValue(undefined);
    mocks.clerkClient.mockResolvedValue({
      users: {
        getUserList: vi.fn().mockResolvedValue({ data: [{ id: "clerk-user-id" }] }),
        deleteUser: deleteClerkUser,
      },
    });

    await expect(deleteAdminUser(form({ userId: memberId, confirmation: "member@example.com" })))
      .rejects.toThrow("REDIRECT:/admin/users?notice=deleted");
    expect(deleteClerkUser).toHaveBeenCalledWith("clerk-user-id");
    expect(deleteSupabaseUser).toHaveBeenCalledWith(memberId);
  });
});
