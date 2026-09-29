"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getPrisma } from "@/lib/prisma";

const schema = z.object({
  taskId: z.string().uuid(),
  content: z.string().trim().min(1).max(5_000),
  attachmentUrl: z.string().trim().url().max(2_000).optional().or(z.literal("")),
});

const read = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
};

export async function addComment(form: FormData) {
  const parsed = schema.safeParse({ taskId: form.get("taskId"), content: form.get("content"), attachmentUrl: read(form, "attachmentUrl") });
  const returnTo = read(form, "returnTo");
  const targetPath = returnTo && returnTo.startsWith("/dashboard/tasks/") ? returnTo : "/dashboard/tasks";

  if (!parsed.success) redirect(`${targetPath}?notice=${encodeURIComponent("Comment could not be saved.")}`);
  const user = await requireUser();
  const mentions = [...new Set([...parsed.data.content.matchAll(/@([\w.-]+)/g)].map((match) => match[1]).filter((mention): mention is string => Boolean(mention)))];
  const supabase = await createClient();
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("id")
    .eq("id", parsed.data.taskId)
    .single();
  if (taskError || !task) redirect(`${targetPath}?notice=${encodeURIComponent("Unable to find this task.")}`);

  try {
    const prisma = getPrisma();
    await Promise.all([
      prisma.comment.create({
        data: {
          taskId: task.id,
          userId: user.id,
          content: parsed.data.content,
          mentions,
          attachmentUrl: parsed.data.attachmentUrl || null,
        },
      }),
      prisma.activityLog.create({
        data: { taskId: task.id, userId: user.id, action: "added a comment" },
      }),
      prisma.notification.create({
        data: {
          userId: user.id,
          title: "New comment added",
          message: `A comment was added to your task: ${parsed.data.content.slice(0, 120)}`,
        },
      }),
    ]);
  } catch {
    redirect(`${targetPath}?notice=${encodeURIComponent("Unable to save comment to the database.")}`);
  }
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/board");
  revalidatePath("/dashboard/activity");
  revalidatePath(targetPath);
  redirect(`${targetPath}?notice=${encodeURIComponent("Comment added.")}`);
}

export async function toggleCommentReaction(form: FormData) {
  const commentId = z.string().uuid().safeParse(read(form, "commentId"));
  const taskId = z.string().uuid().safeParse(read(form, "taskId"));
  const emoji = z.enum(["👍", "🎉", "❤️", "🚀", "👀"]).safeParse(read(form, "emoji"));
  const returnTo = read(form, "returnTo");
  const targetPath = returnTo && returnTo.startsWith("/dashboard/tasks/") ? returnTo : "/dashboard/tasks";
  if (!commentId.success || !taskId.success || !emoji.success) redirect(`${targetPath}?notice=${encodeURIComponent("Reaction could not be saved.")}`);
  const user = await requireUser();
  const supabase = await createClient();
  const { data: existing } = await supabase.from("comment_reactions").select("id").eq("comment_id", commentId.data).eq("user_id", user.id).eq("emoji", emoji.data).maybeSingle();
  const result = existing
    ? await supabase.from("comment_reactions").delete().eq("id", existing.id)
    : await supabase.from("comment_reactions").insert({ comment_id: commentId.data, user_id: user.id, emoji: emoji.data });
  if (result?.error) redirect(`${targetPath}?notice=${encodeURIComponent("Reaction could not be saved.")}`);
  revalidatePath(targetPath);
  redirect(`${targetPath}#comments`);
}
