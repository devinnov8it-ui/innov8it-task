import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: mocks }),
}));
vi.mock("@/features/auth/config", () => ({
  getAppOrigin: () => "https://app.example.com",
}));
import { GET as callback } from "@/app/auth/callback/route";
import { GET as confirm } from "@/app/auth/confirm/route";

beforeEach(() => vi.resetAllMocks());

it("exchanges OAuth codes and rejects external return URLs", async () => {
  mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
  const response = await callback(
    new NextRequest(
      "https://untrusted.example/auth/callback?code=test&next=https://evil.test",
    ),
  );
  expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("test");
  expect(response.headers.get("location")).toBe(
    "https://app.example.com/dashboard",
  );
  expect(response.headers.get("cache-control")).toContain("no-store");
});
it("handles expired codes without including the code in the redirect", async () => {
  mocks.exchangeCodeForSession.mockResolvedValue({
    error: new Error("expired"),
  });
  const response = await callback(
    new NextRequest("https://app.example.com/auth/callback?code=secret"),
  );
  expect(response.headers.get("location")).toBe(
    "https://app.example.com/login?error=callback",
  );
});
it("rejects callbacks without a code", async () => {
  expect(
    (
      await callback(new NextRequest("https://app.example.com/auth/callback"))
    ).headers.get("location"),
  ).toContain("error=callback");
  expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
});
it("verifies email confirmation tokens", async () => {
  mocks.verifyOtp.mockResolvedValue({ error: null });
  expect(
    (
      await confirm(
        new NextRequest(
          "https://app.example.com/auth/confirm?token_hash=hash&type=email",
        ),
      )
    ).headers.get("location"),
  ).toBe("https://app.example.com/dashboard");
  expect(mocks.verifyOtp).toHaveBeenCalledWith({
    token_hash: "hash",
    type: "email",
  });
});
it("rejects unsupported token purposes and expired confirmation links", async () => {
  await confirm(
    new NextRequest(
      "https://app.example.com/auth/confirm?token_hash=hash&type=recovery",
    ),
  );
  expect(mocks.verifyOtp).not.toHaveBeenCalled();
  mocks.verifyOtp.mockResolvedValue({ error: new Error("expired") });
  expect(
    (
      await confirm(
        new NextRequest(
          "https://app.example.com/auth/confirm?token_hash=hash&type=email",
        ),
      )
    ).headers.get("location"),
  ).toContain("error=confirmation");
});
