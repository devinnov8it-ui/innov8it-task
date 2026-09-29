import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { getAppOrigin } from "@/features/auth/config";
import { authRedirect } from "@/features/auth/response";

afterEach(() => vi.unstubAllEnvs());

it.each([
  "https://user:secret@app.example.com",
  "http://app.example.com",
  "https://app.example.com/path",
  "https://app.example.com?next=evil",
  "javascript:alert(1)",
])("rejects unsafe APP_URL %s", (value) => {
  vi.stubEnv("APP_URL", value);
  expect(() => getAppOrigin()).toThrow();
});
it("requires a canonical origin in production", () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("APP_URL", "");
  expect(() => getAppOrigin()).toThrow();
  const response = authRedirect("/login");
  expect(response.status).toBe(503);
  expect(response.headers.get("cache-control")).toContain("no-store");
});
it("allows localhost development and a secure deployment origin", () => {
  vi.stubEnv("APP_URL", "http://localhost:3000");
  expect(getAppOrigin()).toBe("http://localhost:3000");
  vi.stubEnv("APP_URL", "https://tasks.example.com/");
  expect(getAppOrigin()).toBe("https://tasks.example.com");
});
