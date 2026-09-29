import Link from "next/link";
import { Activity, ArrowRight, MessageSquareText } from "lucide-react";
import { requireUser } from "@/features/auth/session";
import { markAllNotificationsRead, markNotificationRead } from "@/features/notifications/actions";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPhilippineDateTime } from "@/lib/time";

export const metadata = { title: "Activity" };
export const dynamic = "force-dynamic";

type ActivityRow = {
  id: string;
  action: string;
  created_at: string;
  user: { name: string | null; email: string } | null;
  task: { id: string; title: string } | null;
};

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

function actorName(user: ActivityRow["user"]) {
  return user?.name?.trim() || user?.email?.split("@")[0] || "A team member";
}

function actionLabel(action: string) {
  return action.endsWith(".") ? action : `${action}.`;
}

export default async function ActivityPage() {
  const user = await requireUser();
  const supabase = await createClient({ readOnly: true });
  const [{ data, error }, { data: notificationData, error: notificationError }] = await Promise.all([
    supabase
      .from("activity_logs")
      .select("id, action, created_at, user:users(name, email), task:tasks(id, title)")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("notifications")
      .select("id, title, message, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const activity = (data ?? []) as ActivityRow[];
  const notifications = (notificationData ?? []) as NotificationRow[];
  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Workspace pulse</p>
        <h1 className="text-3xl font-semibold tracking-tight">Activity</h1>
        <p className="mt-2 text-sm text-muted-foreground">See the latest movement across the work you can access.</p>
      </div>

      {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Activity is unavailable until the Supabase schema is applied.</p>}

      {notificationError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Notifications are unavailable until the Supabase schema is applied.</p>}

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle>Notifications</CardTitle>
          {unreadCount > 0 && (
            <form action={markAllNotificationsRead}>
              <button type="submit" className="text-xs font-medium text-primary hover:underline">Mark all read</button>
            </form>
          )}
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {notifications.map((notification) => (
                <div key={notification.id} className={`rounded-xl border p-4 ${notification.is_read ? "bg-background/40" : "bg-primary/5"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{notification.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                      <time className="mt-2 block text-xs text-muted-foreground" dateTime={notification.created_at}>{formatPhilippineDateTime(notification.created_at)}</time>
                    </div>
                    {!notification.is_read && (
                      <form action={markNotificationRead}>
                        <input type="hidden" name="notificationId" value={notification.id} />
                        <button type="submit" className="text-xs font-medium text-primary hover:underline">Read</button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2"><Activity className="size-5 text-primary" aria-hidden="true" />Recent activity</CardTitle>
          <span className="text-xs text-muted-foreground">{activity.length} events</span>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center text-center">
              <MessageSquareText className="mb-3 size-8 text-primary" aria-hidden="true" />
              <p className="font-medium">No activity yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">Task updates, comments, and status changes will appear here.</p>
            </div>
          ) : (
            <div className="relative space-y-3 before:absolute before:bottom-3 before:left-4 before:top-3 before:w-px before:bg-border">
              {activity.map((entry) => (
                <article key={entry.id} className="relative flex gap-3 rounded-xl border bg-background/45 p-4 backdrop-blur-sm">
                  <div className="z-10 flex size-8 shrink-0 items-center justify-center rounded-full border bg-card text-xs font-semibold text-primary">
                    {actorName(entry.user).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-6">
                      <span className="font-semibold">{actorName(entry.user)}</span>{" "}
                      <span className="text-muted-foreground">{actionLabel(entry.action)}</span>
                    </p>
                    {entry.task ? (
                      <Link href={`/dashboard/tasks/${entry.task.id}`} className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-sm font-medium text-primary hover:underline">
                        <span className="truncate">{entry.task.title}</span>
                        <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
                      </Link>
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">Task unavailable</p>
                    )}
                    <time className="mt-2 block text-xs text-muted-foreground" dateTime={entry.created_at}>{formatPhilippineDateTime(entry.created_at)}</time>
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
