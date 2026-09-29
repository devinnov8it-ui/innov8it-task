import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254),
  password: z.string().min(1, "Enter your password.").max(1024),
});

export const registrationSchema = loginSchema.extend({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(100, "Use at most 100 characters."),
  password: z
    .string()
    .min(12, "Use at least 12 characters.")
    .max(128, "Use at most 128 characters."),
});

export type AuthState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Partial<Record<"name" | "email" | "password", string[]>>;
  mfa?: { factorId: string; challengeId: string; next: string };
  enrollment?: { factorId: string; qrCode: string; secret: string };
};

// Only dashboard destinations are accepted, including from tampered hidden inputs.
export function safeNext(value: unknown): string {
  if (typeof value !== "string" || /[\\\s%]/.test(value)) return "/dashboard";
  try {
    const url = new URL(value, "https://local.invalid");
    if (
      url.origin !== "https://local.invalid" ||
      !value.startsWith("/") ||
      !(url.pathname === "/dashboard" || url.pathname.startsWith("/dashboard/"))
    )
      return "/dashboard";
    return url.pathname + url.search;
  } catch {
    return "/dashboard";
  }
}
