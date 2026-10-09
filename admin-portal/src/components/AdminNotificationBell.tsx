"use client";

import { useState, useTransition } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { markAdminNotificationRead, markAllAdminNotificationsRead } from "@/app/(portal)/admin/notifications/actions";

export type AdminNotification = {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function AdminNotificationBell({
  notifications: initialNotifications,
  unreadCount: initialUnreadCount,
  loadError,
}: {
  notifications: AdminNotification[];
  unreadCount: number;
  loadError: boolean;
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(loadError ? "Notifications could not be loaded." : null);
  const [pending, startTransition] = useTransition();

  function markRead(notificationId: string) {
    setError(null);
    startTransition(async () => {
      const result = await markAdminNotificationRead(notificationId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setNotifications((current) => current.map((notification) =>
        notification.id === notificationId ? { ...notification, is_read: true } : notification,
      ));
      setUnreadCount((count) => Math.max(0, count - 1));
    });
  }

  function markAllRead() {
    setError(null);
    startTransition(async () => {
      const result = await markAllAdminNotificationsRead();
      if (result.error) {
        setError(result.error);
        return;
      }
      setNotifications((current) => current.map((notification) => ({ ...notification, is_read: true })));
      setUnreadCount(0);
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        className="relative grid size-10 place-items-center rounded-md border bg-card hover:bg-muted"
      >
        <Bell className="size-4" aria-hidden="true" />
        {unreadCount > 0 && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>
      {open && (
        <section role="dialog" aria-label="Notifications" className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border bg-card shadow-xl">
          <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <div><h2 className="text-sm font-semibold">Notifications</h2><p className="text-xs text-muted-foreground">{unreadCount} unread</p></div>
            {unreadCount > 0 && <button type="button" disabled={pending} onClick={markAllRead} className="inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-primary hover:bg-muted disabled:opacity-50"><CheckCheck className="size-3.5" aria-hidden="true" />Mark all read</button>}
          </header>
          {error && <p role="alert" className="border-b bg-rose-50 px-4 py-2 text-xs text-rose-800">{error}</p>}
          {notifications.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">You’re all caught up.</p> : (
            <ul className="max-h-[min(70vh,28rem)] divide-y overflow-y-auto">
              {notifications.map((notification) => (
                <li key={notification.id} className={`flex gap-3 p-4 ${notification.is_read ? "opacity-70" : "bg-primary/[0.04]"}`}>
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${notification.is_read ? "bg-transparent" : "bg-primary"}`} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-muted-foreground">{notification.message}</p>
                    <time className="mt-2 block text-[11px] text-muted-foreground" dateTime={notification.created_at}>{dateFormat.format(new Date(notification.created_at))}</time>
                  </div>
                  {!notification.is_read && <button type="button" aria-label={`Mark ${notification.title} as read`} disabled={pending} onClick={() => markRead(notification.id)} className="grid size-8 shrink-0 place-items-center self-start rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"><Check className="size-4" aria-hidden="true" /></button>}
                </li>
              ))}
            </ul>
          )}
          <footer className="border-t px-4 py-2 text-[11px] text-muted-foreground">Showing your 20 most recent notifications.</footer>
        </section>
      )}
    </div>
  );
}
