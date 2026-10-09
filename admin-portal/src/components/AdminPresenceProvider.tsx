"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type PresenceState = {
  onlineUserIds: ReadonlySet<string>;
  connected: boolean;
  error: boolean;
};

const AdminPresenceContext = createContext<PresenceState>({
  onlineUserIds: new Set(),
  connected: false,
  error: false,
});

export function AdminPresenceProvider({
  children,
  user,
}: {
  children: ReactNode;
  user: { id: string; name: string | null; email: string; avatar: string | null };
}) {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(!supabaseUrl || !supabaseKey);

  useEffect(() => {
    if (!supabaseUrl || !supabaseKey) return;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const channel = supabase.channel("system-presence", {
      config: { presence: { key: user.id } },
    });
    const syncPresence = () => {
      const ids = new Set(
        Object.values(channel.presenceState<{ user_id: string }>())
          .flatMap((entries) => entries.map((entry) => entry.user_id)),
      );
      setOnlineUserIds(ids);
    };

    channel
      .on("presence", { event: "sync" }, syncPresence)
      .on("presence", { event: "join" }, syncPresence)
      .on("presence", { event: "leave" }, syncPresence)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setConnected(true);
          setError(false);
          const trackStatus = await channel.track({
            user_id: user.id,
            name: user.name ?? user.email,
            avatar: user.avatar,
          });
          if (trackStatus !== "ok") setError(true);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setConnected(false);
          setError(true);
          setOnlineUserIds(new Set());
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user.id, user.name, user.email, user.avatar]);

  const value = useMemo(() => ({ onlineUserIds, connected, error }), [onlineUserIds, connected, error]);
  return <AdminPresenceContext.Provider value={value}>{children}</AdminPresenceContext.Provider>;
}

export function useAdminPresence() {
  return useContext(AdminPresenceContext);
}
