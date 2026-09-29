import Link from "next/link";
import { Bell } from "lucide-react";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/notifications/actions";
import { formatPhilippineDateTime } from "@/lib/time";

type Notification = {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export function NotificationBell({
  notifications,
}: {
  notifications: Notification[];
}) {
  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  return (
    <details className="group relative">
      <summary
        aria-label={`Open notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        className="flex size-11 cursor-pointer list-none items-center justify-center rounded-lg hover:bg-muted [&::-webkit-details-marker]:hidden"
      >
        <span className="relative">
          <Bell className="size-5 text-muted-foreground" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -right-2 -top-2 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-5 text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </span>
      </summary>
      <div className="glass-surface absolute right-0 top-12 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border p-2 shadow-lg">
        <div className="flex items-center justify-between gap-3 px-3 py-2">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount === 0 ? "All caught up" : `${unreadCount} unread`}
            </p>
          </div>
          {unreadCount > 0 && (
            <form action={markAllNotificationsRead}>
              <button type="submit" className="text-xs font-medium text-primary hover:underline">
                Mark all read
              </button>
            </form>
          )}
        </div>
        <div className="max-h-96 space-y-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            notifications.map((notification) => (
              <div key={notification.id} className={`rounded-lg border p-3 ${notification.is_read ? "bg-card/40" : "bg-primary/5"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{notification.message}</p>
                    <time className="mt-2 block text-[11px] text-muted-foreground">{formatPhilippineDateTime(notification.created_at)}</time>
                  </div>
                  {!notification.is_read && (
                    <form action={markNotificationRead}>
                      <input type="hidden" name="notificationId" value={notification.id} />
                      <button type="submit" className="shrink-0 text-xs font-medium text-primary hover:underline">Read</button>
                    </form>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="mt-2 border-t px-3 pt-2">
          <Link href="/dashboard/activity" className="flex min-h-10 items-center justify-between text-xs font-medium text-primary hover:underline">
            View all activity
            <span aria-hidden="true">-&gt;</span>
          </Link>
        </div>
      </div>
    </details>
  );
}
