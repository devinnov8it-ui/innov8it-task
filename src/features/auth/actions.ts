"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, findAuthUserByEmail } from "@/lib/supabase/admin";
import { requireUser } from "./session";
import { getAppOrigin } from "./config";
import {
  loginSchema,
  registrationSchema,
  safeNext,
  type AuthState,
} from "./validation";

const unavailable: AuthState = {
  status: "error",
  message: "Sign-in is temporarily unavailable. Please try again later.",
};

export async function inviteMember(
  _previous: AuthState,
  form: FormData,
): Promise<AuthState> {
  const email = form.get("email");
  if (typeof email !== "string" || !loginSchema.shape.email.safeParse(email).success) {
    return { status: "error", message: "Enter a valid email address." };
  }

  try {
    await requireUser();
    const { error } = await createAdminClient().auth.admin.inviteUserByEmail(email.trim(), {
      redirectTo: `${getAppOrigin()}/auth/callback`,
    });
    if (error) {
      console.error("Supabase invitation rejected", { status: error.status, code: error.code, message: error.message });
      return {
        status: "error",
        message: process.env.NODE_ENV === "development"
          ? `Unable to send invitation: ${error.message}`
          : "Unable to send the invitation. Check the email and try again.",
      };
    }
    return { status: "success", message: "Invitation sent." };
  } catch (error) {
    console.error("Supabase invitation failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return unavailable;
  }
}

export async function uploadAvatar(form: FormData): Promise<{ url?: string; error?: string }> {
  const file = form.get("file");
  if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function" || typeof file.type !== "string" || !file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
    return { error: "Choose an image smaller than 5 MB." };
  }

  try {
    const user = await requireUser();
    const extensionByType: Record<string, string> = {
      "image/gif": "gif",
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const extension = extensionByType[file.type] ?? "jpg";
    const path = `${user.id}/avatar-${crypto.randomUUID()}.${extension}`;
    const admin = createAdminClient();
    const { error: bucketLookupError } = await admin.storage.getBucket("avatars");
    if (bucketLookupError) {
      const { error: bucketCreateError } = await admin.storage.createBucket("avatars", { public: true });
      if (bucketCreateError && !bucketCreateError.message.toLowerCase().includes("already exists")) {
        return { error: `Unable to initialize avatar storage: ${bucketCreateError.message}` };
      }
    }
    const { error: uploadError } = await admin.storage.from("avatars").upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

    if (uploadError) return { error: uploadError.message || "Unable to upload the picture." };
    return { url: admin.storage.from("avatars").getPublicUrl(path).data.publicUrl };
  } catch (error) {
    console.error("Avatar upload failed", error);
    const message = error instanceof Error ? error.message : "Unknown storage error";
    return { error: `Server image storage is unavailable: ${message}` };
  }
}

export async function login(
  _previous: AuthState,
  form: FormData,
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!parsed.success)
    return {
      status: "error",
      message: "Check the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors,
    };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error)
      return {
        status: "error",
        message:
          "Unable to sign in. Check your email and password and confirm your email before trying again.",
      };
      const { data: assurance } = supabase.auth.mfa
        ? await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        : { data: null };
      if (assurance && assurance.currentLevel !== "aal2" && assurance.nextLevel === "aal2") {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const factor = factors?.totp.find((item) => item.status === "verified");
        if (!factor) return { status: "error", message: "Your account requires an authenticator, but no verified factor is available." };
        const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
        if (challengeError || !challenge) return { status: "error", message: "Unable to start authenticator verification. Try again." };
        return { status: "success", message: "Enter the six-digit code from Google Authenticator.", mfa: { factorId: factor.id, challengeId: challenge.id, next: safeNext(form.get("next")) } };
      }
  } catch {
    return unavailable;
  }
  revalidatePath("/", "layout");
  redirect(safeNext(form.get("next")));
}

export async function verifyMfa(_previous: AuthState, form: FormData): Promise<AuthState> {
  const factorId = form.get("factorId");
  const challengeId = form.get("challengeId");
  const code = form.get("code");
  if (typeof factorId !== "string" || typeof challengeId !== "string" || typeof code !== "string" || !/^\d{6}$/.test(code)) {
    return { status: "error", message: "Enter the six-digit authenticator code." };
  }
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
    if (error) return { status: "error", message: "That authenticator code is invalid or expired." };
  } catch {
    return unavailable;
  }
  revalidatePath("/", "layout");
  redirect(safeNext(form.get("next")));
}

export async function enrollMfa(): Promise<AuthState> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Google Authenticator" });
    if (error || !data) return { status: "error", message: "Unable to create an authenticator setup. Try again." };
    return { status: "success", message: "Scan the QR code with Google Authenticator, then enter the six-digit code.", enrollment: { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret } };
  } catch {
    return unavailable;
  }
}

export async function verifyMfaEnrollment(_previous: AuthState, form: FormData): Promise<AuthState> {
  const factorId = form.get("factorId");
  const code = form.get("code");
  if (typeof factorId !== "string" || typeof code !== "string" || !/^\d{6}$/.test(code)) return { status: "error", message: "Enter the six-digit authenticator code." };
  try {
    const supabase = await createClient();
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challenge) return { status: "error", message: "Unable to verify the authenticator setup." };
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
    if (error) return { status: "error", message: "That authenticator code is invalid." };
  } catch {
    return unavailable;
  }
  revalidatePath("/dashboard", "layout");
  return { status: "success", message: "Google Authenticator is now active on your account." };
}

export async function register(
  _previous: AuthState,
  form: FormData,
): Promise<AuthState> {
  const parsed = registrationSchema.safeParse({
    name: form.get("name"),
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!parsed.success)
    return {
      status: "error",
      message: "Check the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors,
    };
  let signedIn = false;
  try {
    const supabase = await createClient();
    const { name, email, password } = parsed.data;

    const admin = createAdminClient();
    const { user: existingUser, error: existingUserError } =
      await findAuthUserByEmail(admin, email);
    if (existingUserError) {
      console.error("Supabase duplicate-email lookup failed", {
        status: existingUserError.status,
        code: existingUserError.code,
      });
      return unavailable;
    }
    if (existingUser) {
      return {
        status: "success",
        message: "An account with this email already exists. Please sign in instead.",
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${getAppOrigin()}/auth/callback`,
      },
    });
    if (error) {
      console.error("Supabase sign-up failed", {
        status: error.status,
        code: error.code,
      });
      return {
        status: "error",
        message:
          process.env.NODE_ENV === "development"
            ? `Supabase rejected registration${error.code ? ` (${error.code})` : ""}: ${error.message}`
            : "Unable to create an account. Please try again later or sign in if you already have one.",
      };
    }
    signedIn = Boolean(data.session);
  } catch (error) {
    console.error("Supabase sign-up request failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return unavailable;
  }
  if (signedIn) {
    revalidatePath("/", "layout");
    redirect("/dashboard");
  }
  return {
    status: "success",
    message:
      "If your address is eligible, you’ll receive an email to confirm your account. Already registered? Sign in instead.",
  };
}

export async function signInWithGoogle(
  _previous: AuthState,
  form: FormData,
): Promise<AuthState> {
  let destination: string;
  try {
    const supabase = await createClient();
    const callback = new URL("/auth/callback", getAppOrigin());
    callback.searchParams.set("next", safeNext(form.get("next")));
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback.toString(), skipBrowserRedirect: true },
    });
    if (error || !data.url) {
      console.error("Google OAuth start failed", {
        code: error?.code,
        status: error?.status,
        name: error?.name,
      });
      return process.env.NODE_ENV === "development" && error?.code
        ? { status: "error", message: `Google sign-in is unavailable (${error.code}).` }
        : unavailable;
    }
    destination = data.url;
  } catch (error) {
    console.error("Google OAuth configuration failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return unavailable;
  }
  redirect(destination);
}

export async function signOut(): Promise<void> {
  let failed = false;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    failed = Boolean(error);
  } catch {
    failed = true;
  }
  if (failed) redirect("/dashboard?error=signout");
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function updateProfile(form: FormData): Promise<void> {
  const name = form.get("name");
  const avatar = form.get("avatar");
  if (
    typeof name !== "string" ||
    name.trim().length < 1 ||
    name.trim().length > 100 ||
    (typeof avatar !== "string" && avatar !== null) ||
    (typeof avatar === "string" && avatar.length > 2_000)
  ) {
    redirect("/dashboard/settings?error=profile");
  }

  const user = await requireUser();
  const supabase = createAdminClient();
  const { error: profileError } = await supabase
    .from("users")
    .update({ name: name.trim(), avatar: avatar || null })
    .eq("id", user.id);

  if (profileError) redirect("/dashboard/settings?error=profile");

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/settings?notice=profile");
}

export async function deleteAccount(form: FormData): Promise<void> {
  if (form.get("confirmation") !== "DELETE") {
    redirect("/dashboard/settings?error=delete");
  }

  const user = await requireUser();
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) redirect("/dashboard/settings?error=delete");

  let clerk;
  try {
    clerk = await clerkClient();
    await clerk.users.deleteUser(clerkUserId);
  } catch (error) {
    console.error("Clerk account deletion failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : undefined,
    });
    redirect("/dashboard/settings?error=delete");
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
    const email = user.email?.trim();
    const { user: authUser, error: authLookupError } = email
      ? await findAuthUserByEmail(admin, email)
      : { user: null, error: null };
    if (authLookupError) {
      console.error("Supabase account lookup failed during account deletion", {
        status: authLookupError.status,
        code: authLookupError.code,
      });
    }

    const resolvedAuthUserId = authUser?.id ?? user.id;

    let profileRecord: { id?: string } | null = null;
    let profileLookupError: { message?: string; status?: number; code?: string } | null = null;
    if (email && typeof admin.from === "function") {
      const userQuery = admin.from("users");
      if (userQuery && typeof userQuery.select === "function") {
        const filtered = userQuery.select("id").eq("email", email);
        if (filtered && typeof filtered.maybeSingle === "function") {
          const result = await filtered.maybeSingle();
          profileRecord = result?.data ?? null;
          profileLookupError = result?.error ?? null;
        }
      }
    }
    const resolvedProfileUserId = profileRecord?.id ?? resolvedAuthUserId;

    if (authLookupError && !authUser) {
      throw authLookupError;
    }
    if (profileLookupError && !profileRecord) {
      throw profileLookupError;
    }

    const deleteAuthUser = async () => {
      const { error } = await admin.auth.admin.deleteUser(resolvedAuthUserId);
      if (error) throw error;
    };

    try {
      await deleteAuthUser();
    } catch (firstError) {
      const cleanup = [
        admin.from("task_assignees").delete().eq("user_id", resolvedProfileUserId),
        admin.from("comments").delete().eq("user_id", resolvedProfileUserId),
        admin.from("comment_reactions").delete().eq("user_id", resolvedProfileUserId),
        admin.from("activity_logs").delete().eq("user_id", resolvedProfileUserId),
        admin.from("notifications").delete().eq("user_id", resolvedProfileUserId),
        admin.from("workspace_members").delete().eq("user_id", resolvedProfileUserId),
        admin.from("tasks").delete().eq("created_by_id", resolvedProfileUserId),
        admin.from("workspaces").delete().eq("owner_id", resolvedProfileUserId),
      ];
      for (const operation of cleanup) {
        const { error: cleanupError } = await operation;
        if (cleanupError) throw cleanupError;
      }
      try {
        await deleteAuthUser();
      } catch (retryError) {
        throw retryError instanceof Error ? retryError : firstError;
      }
    }

  } catch (error) {
    const missingAdminKey = error instanceof Error && error.message.includes("SUPABASE_SERVICE_ROLE_KEY");
    const providerError = error as { code?: string; status?: number; message?: string };
    const errorCode = providerError.code || (providerError.status ? `status-${providerError.status}` : "admin-operation");
    console.error("Account deletion failed", {
      reason: missingAdminKey ? "missing-service-role-key" : "supabase-admin-operation",
      name: error instanceof Error ? error.name : "UnknownError",
      code: errorCode,
      status: providerError.status,
      message: providerError.message,
    });
    redirect(`/dashboard/settings?error=${missingAdminKey ? "delete-config" : `delete-${encodeURIComponent(errorCode)}`}`);
  }

  try {
    const { data: avatarFiles } = await admin.storage.from("avatars").list(user.id);
    if (avatarFiles && avatarFiles.length > 0) {
      await admin.storage
        .from("avatars")
        .remove(avatarFiles.map((file) => `${user.id}/${file.name}`));
    }
  } catch (error) {
    console.error("Account avatar cleanup failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
  }

  const supabase = await createClient();
  const signOutResult = await supabase.auth.signOut({ scope: "local" });
  const signOutError = signOutResult?.error;
  if (signOutError) {
    console.error("Account deletion local signout failed", { code: signOutError.code, status: signOutError.status });
  }

  revalidatePath("/", "layout");
  redirect("/login?notice=deleted");
}
