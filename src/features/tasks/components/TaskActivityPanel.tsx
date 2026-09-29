import { MessageSquareText, Clock3, Paperclip } from "lucide-react";
import { formatPhilippineDateTime } from "@/lib/time";

export type TaskComment = {
  id: string;
  content: string;
  createdAt: string;
  user: { name: string | null; avatar: string | null; email: string };
  attachmentUrl?: string | null;
  mentions?: string[];
  reactions?: { emoji: string; count: number; reacted: boolean }[];
};

export type TaskActivityEntry = {
  id: string;
  action: string;
  createdAt: string;
  user: { name: string | null; avatar: string | null; email: string };
};

const reactionOptions = ["👍", "🎉", "❤️", "🚀", "👀"] as const;

export function TaskActivityPanel({
  taskId,
  title,
  comments,
  activity,
  commentAction,
  reactionAction,
}: {
  taskId: string;
  title: string;
  comments: TaskComment[];
  activity: TaskActivityEntry[];
  commentAction?: (formData: FormData) => void | Promise<void>;
  reactionAction?: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Task activity
          </p>
          <h3 className="mt-2 text-lg font-semibold text-foreground">{title}</h3>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          <MessageSquareText className="size-3.5" aria-hidden="true" />
          {comments.length} comments
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <MessageSquareText className="size-4 text-primary" aria-hidden="true" />
            Discussion
          </div>

          <div className="space-y-3 rounded-lg border bg-muted/25 p-3">
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet. Start the discussion.</p>
            ) : (
              comments.map((comment) => (
                <article key={comment.id} className="rounded-md border bg-background p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {comment.user?.name?.charAt(0)?.toUpperCase() ?? "T"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {comment.user?.name ?? "Team member"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatPhilippineDateTime(comment.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">{comment.content}</p>
                  {comment.mentions && comment.mentions.length > 0 && <p className="mt-2 text-xs text-primary">Mentions: {comment.mentions.map((mention) => `@${mention}`).join(" ")}</p>}
                  {comment.attachmentUrl && <a href={comment.attachmentUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"><Paperclip className="size-3.5" aria-hidden="true" />Open attachment</a>}
                  <div className="mt-3 flex flex-wrap gap-1.5">{reactionOptions.map((emoji) => { const reaction = comment.reactions?.find((item) => item.emoji === emoji); return <form key={emoji} action={reactionAction}><input type="hidden" name="commentId" value={comment.id} /><input type="hidden" name="taskId" value={taskId} /><input type="hidden" name="returnTo" value={`/dashboard/tasks/${taskId}`} /><input type="hidden" name="emoji" value={emoji} /><button type="submit" className={`rounded-full border px-2 py-1 text-xs ${reaction?.reacted ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/40"}`}>{emoji}{reaction?.count ? ` ${reaction.count}` : ""}</button></form>; })}</div>
                </article>
              ))
            )}
          </div>

          <form action={commentAction} className="space-y-3 rounded-lg border bg-muted/25 p-3">
            <input type="hidden" name="taskId" value={taskId} />
            <input type="hidden" name="returnTo" value={`/dashboard/tasks/${taskId}`} />
            <label htmlFor={`comment-${taskId}`} className="text-sm font-medium text-foreground">
              Add a comment
            </label>
            <textarea
              id={`comment-${taskId}`}
              name="content"
              rows={3}
              placeholder="Share an update, question, or next step..."
              aria-label="Add a comment"
              className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-primary"
              required
            />
            <input name="attachmentUrl" type="url" placeholder="Attachment URL (optional)" aria-label="Attachment URL" className="min-h-10 w-full rounded-md border bg-background px-3 text-sm" />
            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Post comment
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Clock3 className="size-4 text-primary" aria-hidden="true" />
            History
          </div>

          <div className="space-y-3 rounded-lg border bg-muted/25 p-3">
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No task history yet.</p>
            ) : (
              activity.map((entry) => (
                <div key={entry.id} className="flex gap-3 rounded-md border bg-background p-3">
                  <div className="mt-0.5 flex size-7 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-secondary-foreground">
                    {entry.user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">{entry.action}</p>
                    <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span>{entry.user?.name ?? "Team member"}</span>
                      <time>{formatPhilippineDateTime(entry.createdAt)}</time>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
