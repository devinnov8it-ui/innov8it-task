import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  configured: vi.fn(),
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}));
vi.mock("@/lib/supabase/env", () => ({
  isSupabaseConfigured: mocks.configured,
  getSupabaseConfig: () => ({
    url: "https://example.supabase.co",
    key: "test",
  }),
}));
import { updateSession } from "@/lib/supabase/middleware";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.configured.mockReturnValue(true);
});

it("rejects forged session cookies when user verification fails", async () => {
  mocks.createServerClient.mockReturnValue({
    auth: {
      getUser: async () => ({
        data: { user: null },
        error: new Error("invalid"),
      }),
    },
  });
  const response = await updateSession(
    new NextRequest("https://app.example.com/dashboard/tasks", {
      headers: { cookie: "sb-test-auth-token=forged" },
    }),
  );
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe(
    "https://app.example.com/login?next=%2Fdashboard%2Ftasks",
  );
  expect(response.headers.get("cache-control")).toContain("no-store");
});

it("preserves refreshed cookies on a redirect", async () => {
  mocks.createServerClient.mockImplementation((_url, _key, options) => ({
    auth: {
      getUser: async () => {
        options.cookies.setAll(
          [
            {
              name: "sb-session",
              value: "",
              options: { path: "/", maxAge: 0 },
            },
          ],
          { "Cache-Control": "private, no-store" },
        );
        return { data: { user: null }, error: null };
      },
    },
  }));
  const response = await updateSession(
    new NextRequest("https://app.example.com/dashboard"),
  );
  expect(response.cookies.get("sb-session")?.value).toBe("");
  expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
});

it("passes verified users and fresh cookies through to the page", async () => {
  mocks.createServerClient.mockImplementation((_url, _key, options) => ({
    auth: {
      getUser: async () => {
        options.cookies.setAll(
          [
            {
              name: "sb-session",
              value: "fresh",
              options: { path: "/", httpOnly: true },
            },
          ],
          {},
        );
        return { data: { user: { id: "user-id" } }, error: null };
      },
    },
  }));
  const request = new NextRequest("https://app.example.com/dashboard");
  const response = await updateSession(request);
  expect(response.status).toBe(200);
  expect(request.cookies.get("sb-session")?.value).toBe("fresh");
  expect(response.cookies.get("sb-session")?.value).toBe("fresh");
  expect(response.headers.get("cache-control")).toContain("no-store");
});

it("fails closed when Supabase is unconfigured", async () => {
  mocks.configured.mockReturnValue(false);
  expect(
    (await updateSession(new NextRequest("https://app.example.com/dashboard")))
      .status,
  ).toBe(307);
  expect(
    (await updateSession(new NextRequest("https://app.example.com/login")))
      .status,
  ).toBe(200);
});

it("fails closed on network errors", async () => {
  mocks.createServerClient.mockReturnValue({
    auth: {
      getUser: async () => {
        throw new Error("offline");
      },
    },
  });
  expect(
    (await updateSession(new NextRequest("https://app.example.com/dashboard")))
      .status,
  ).toBe(307);
});
