import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  loginSchema,
  registrationSchema,
  safeNext,
} from "@/features/auth/validation";

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signInWithOAuth: vi.fn(),
  signOut: vi.fn(),
  auth: vi.fn(),
  clerkClient: {
    users: {
      deleteUser: vi.fn(),
    },
  },
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  getUserByEmail: vi.fn(),
  from: vi.fn(),
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
  requireUser: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock("@/features/auth/session", () => ({ requireUser: mocks.requireUser }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
  clerkClient: mocks.clerkClient,
}));
vi.mock("@/features/auth/config", () => ({
  getAppOrigin: () => "https://app.example.com",
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import {
  login,
  register,
  signInWithGoogle,
  signOut,
  updateProfile,
  deleteAccount,
} from "@/features/auth/actions";

function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}
const idle = { status: "idle" as const };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.createClient.mockResolvedValue({ auth: mocks, from: mocks.from });
  mocks.from.mockReturnValue({ update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })) });
  mocks.createAdminClient.mockReturnValue({
    auth: {
      admin: {
        deleteUser: mocks.deleteUser,
        getUserByEmail: mocks.getUserByEmail,
      },
    },
  });
  mocks.getUserByEmail.mockResolvedValue({ data: { user: null }, error: null });
  mocks.requireUser.mockResolvedValue({ id: "user-123", email: "ada@example.com" });
  mocks.auth.mockResolvedValue({ userId: "clerk-user-123" });
});

describe("auth validation and redirects", () => {
  it.each([
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/dashboard/../../evil",
    "/dashboard/%2e%2e/evil",
    "/dashboard\n",
    "/login",
    null,
  ])("rejects unsafe destination %s", (value) => {
    expect(safeNext(value)).toBe("/dashboard");
  });
  it("preserves a safe dashboard destination", () =>
    expect(safeNext("/dashboard/tasks?status=open")).toBe(
      "/dashboard/tasks?status=open",
    ));
  it("validates registration without changing passwords", () => {
    const password = " a long passphrase ";
    expect(
      registrationSchema.parse({
        name: " Ada ",
        email: " ada@example.com ",
        password,
      }),
    ).toEqual({ name: "Ada", email: "ada@example.com", password });
    expect(
      registrationSchema.safeParse({
        name: "Ada",
        email: "bad",
        password: "short",
      }).success,
    ).toBe(false);
    expect(
      loginSchema.safeParse({ email: "ada@example.com", password: "existing" })
        .success,
    ).toBe(true);
  });
});

describe("authentication actions", () => {
  it("rejects invalid input before contacting Supabase", async () => {
    const state = await login(idle, form({ email: "bad", password: "" }));
    expect(state.errors?.email).toBeDefined();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
  it("does not reveal provider errors", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      error: { message: "private internal error" },
    });
    const state = await login(
      idle,
      form({ email: "ada@example.com", password: "password" }),
    );
    expect(state.status).toBe("error");
    expect(JSON.stringify(state)).not.toContain("private internal");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
  it("redirects successful login only to a safe destination", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    await expect(
      login(
        idle,
        form({
          email: "ada@example.com",
          password: "password",
          next: "https://evil.test",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/dashboard");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
  it("waits for email confirmation and never accepts a submitted role", async () => {
    mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
    const state = await register(
      idle,
      form({
        name: "Ada",
        email: "ada@example.com",
        password: "long passphrase",
        role: "Admin",
      }),
    );
    expect(state.status).toBe("success");
    expect(mocks.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: {
          data: { name: "Ada" },
          emailRedirectTo: "https://app.example.com/auth/callback",
        },
      }),
    );
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
  it("directs existing emails to sign in instead of creating a duplicate account", async () => {
    mocks.getUserByEmail.mockResolvedValue({
      data: { user: { id: "user-123", email: "ada@example.com" } },
      error: null,
    });

    const state = await register(
      idle,
      form({
        name: "Ada",
        email: "ada@example.com",
        password: "long passphrase",
      }),
    );

    expect(state.status).toBe("success");
    expect(state.message).toContain("sign in");
    expect(mocks.signUp).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
  it("handles registration when email confirmation is disabled", async () => {
    mocks.signUp.mockResolvedValue({
      data: { session: { access_token: "test" } },
      error: null,
    });
    await expect(
      register(
        idle,
        form({
          name: "Ada",
          email: "ada@example.com",
          password: "long passphrase",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/dashboard");
  });
  it("uses the configured origin for Google OAuth", async () => {
    mocks.signInWithOAuth.mockResolvedValue({
      data: { url: "https://auth.example.com/authorize" },
      error: null,
    });
    await expect(
      signInWithGoogle(idle, form({ next: "//evil.test" })),
    ).rejects.toThrow("REDIRECT:https://auth.example.com/authorize");
    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "https://app.example.com/auth/callback?next=%2Fdashboard",
        skipBrowserRedirect: true,
      },
    });
  });
  it("handles unavailable auth without leaking exceptions", async () => {
    mocks.createClient.mockRejectedValue(new Error("secret configuration"));
    expect(
      (
        await login(
          idle,
          form({ email: "ada@example.com", password: "password" }),
        )
      ).message,
    ).not.toContain("secret");
  });
  it("does not claim logout succeeded when the provider rejects it", async () => {
    mocks.signOut.mockResolvedValue({ error: new Error("failed") });
    await expect(signOut()).rejects.toThrow(
      "REDIRECT:/dashboard?error=signout",
    );
  });
  it("clears the current session on signout", async () => {
    mocks.signOut.mockResolvedValue({ error: null });
    await expect(signOut()).rejects.toThrow("REDIRECT:/login");
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
  it("updates both auth metadata and the public profile", async () => {
    mocks.updateUser.mockResolvedValue({ error: null });
    await expect(
      updateProfile(form({ name: "Ada Lovelace", avatar: "https://cdn.example/avatar.png" })),
    ).rejects.toThrow("REDIRECT:/dashboard/settings?notice=profile");
    expect(mocks.updateUser).toHaveBeenCalledWith({
      data: { name: "Ada Lovelace", avatar_url: "https://cdn.example/avatar.png" },
    });
    expect(mocks.from).toHaveBeenCalledWith("users");
  });
  it("requires the explicit account deletion confirmation", async () => {
    await expect(deleteAccount(form({ confirmation: "delete" }))).rejects.toThrow(
      "REDIRECT:/dashboard/settings?error=delete",
    );
    expect(mocks.requireUser).not.toHaveBeenCalled();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
  it("resolves the Supabase auth id before deleting a mismatched session user", async () => {
    mocks.requireUser.mockResolvedValue({ id: "clerk-user-123", email: "ada@example.com" });
    mocks.getUserByEmail.mockResolvedValue({
      data: { user: { id: "supabase-user-456", email: "ada@example.com" } },
      error: null,
    });
    mocks.deleteUser.mockResolvedValue({ error: null });
    const remove = vi.fn().mockResolvedValue({ error: null });
    const userSelect = vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: "supabase-user-456" }, error: null }) })) }));
    const from = vi.fn((table: string) => {
      if (table === "users") {
        return {
          select: userSelect,
          delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
        };
      }
      return { delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })) };
    });
    mocks.createAdminClient.mockReturnValue({
      auth: { admin: { deleteUser: mocks.deleteUser, getUserByEmail: mocks.getUserByEmail } },
      from,
      storage: { from: vi.fn(() => ({ list: vi.fn().mockResolvedValue({ data: [], error: null }), remove })) },
    });

    await expect(deleteAccount(form({ confirmation: "DELETE" }))).rejects.toThrow(
      "REDIRECT:/login?notice=deleted",
    );
    expect(mocks.deleteUser).toHaveBeenCalledWith("supabase-user-456");
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
  it("clears the Clerk session when deleting the account so it cannot return to the dashboard", async () => {
    mocks.deleteUser.mockResolvedValue({ error: null });
    const remove = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => ({ delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })), list: vi.fn().mockResolvedValue({ data: [], error: null }), remove }));
    mocks.createAdminClient.mockReturnValue({
      auth: { admin: { deleteUser: mocks.deleteUser } },
      from,
      storage: { from: vi.fn(() => ({ list: vi.fn().mockResolvedValue({ data: [], error: null }), remove })) },
    });

    await expect(deleteAccount(form({ confirmation: "DELETE" }))).rejects.toThrow(
      "REDIRECT:/login?notice=deleted",
    );
    expect(mocks.deleteUser).toHaveBeenCalledWith("user-123");
    expect(mocks.clerkClient.users.deleteUser).toHaveBeenCalledWith("clerk-user-123");
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});
