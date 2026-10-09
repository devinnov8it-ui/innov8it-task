"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const notificationIdSchema = z.string().uuid();

export async function markAdminNotificationRead(notificationId: string): Promise<{ error?: string }> {
  const parsedId = notificationIdSchema.safeParse(notificationId);
  if (!parsedId.success) return { error: "Invalid notification." };

  const admin = await requireAdmin();
  const { error } = await createSupabaseAdminClient()
    .from("notifications")
    .update({ is_read: true })
    .eq("id", parsedId.data)
    .eq("user_id", admin.id)
    .eq("is_read", false);

  if (error) {
    console.error("Failed to mark admin notification as read", { code: error.code });
    return { error: "Could not update this notification. Try again." };
  }

  revalidatePath("/admin", "layout");
  return {};
}

export async function markAllAdminNotificationsRead(): Promise<{ error?: string }> {
  const admin = await requireAdmin();
  const { error } = await createSupabaseAdminClient()
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", admin.id)
    .eq("is_read", false);

  if (error) {
    console.error("Failed to mark admin notifications as read", { code: error.code });
    return { error: "Could not update notifications. Try again." };
  }

  revalidatePath("/admin", "layout");
  return {};
}
