import { afterEach, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
vi.mock("@/components/layout/DashboardShell", () => ({
  DashboardShell: () => null,
}));
vi.mock("@/components/layout/DashboardOverview", () => ({
  DashboardOverview: () => null,
}));
import PreviewPage from "@/app/preview/page";

afterEach(() => vi.unstubAllEnvs());
it("makes the preview unavailable in production", () => {
  vi.stubEnv("NODE_ENV", "production");
  expect(() => PreviewPage()).toThrow("NOT_FOUND");
});
it("renders the isolated preview in development", () => {
  vi.stubEnv("NODE_ENV", "development");
  expect(PreviewPage()).toBeTruthy();
});
