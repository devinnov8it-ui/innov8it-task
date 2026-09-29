import { NextResponse } from "next/server";
import { requireUser } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await requireUser();
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 80) ?? "";
  if (query.length < 2) return NextResponse.json({ tasks: [], projects: [], people: [], comments: [], files: [] });

  const supabase = await createClient({ readOnly: true });
  const pattern = `%${query}%`;
  const [{ data: tasks }, { data: projects }, { data: people }, { data: comments }] = await Promise.all([
    supabase.from("tasks").select("id, title, status, priority").ilike("title", pattern).limit(6),
    supabase.from("projects").select("id, name, status").ilike("name", pattern).limit(6),
    supabase.from("users").select("id, name, email, role").or(`name.ilike.${pattern},email.ilike.${pattern}`).limit(6),
    supabase.from("comments").select("id, content, attachment_url, task_id, task:tasks(id, title)").ilike("content", pattern).limit(6),
  ]);

  const commentRows = (comments ?? []).map((comment) => ({
    id: comment.id,
    content: comment.content,
    taskId: comment.task_id,
    taskTitle: Array.isArray(comment.task) ? comment.task[0]?.title : undefined,
    attachmentUrl: comment.attachment_url,
  }));

  return NextResponse.json({
    tasks: tasks ?? [],
    projects: projects ?? [],
    people: people ?? [],
    comments: commentRows,
    files: commentRows.filter((comment) => comment.attachmentUrl),
  });
}
