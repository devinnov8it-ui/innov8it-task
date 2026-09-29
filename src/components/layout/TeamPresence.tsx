"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Member = { id: string; name: string | null; email: string; avatar: string | null };
type Presence = { user_id: string; name: string; avatar: string | null };

export function TeamPresence({
  workspaceId,
  userId,
  userName,
  userAvatar,
  members,
  compact = false,
}: {
  workspaceId: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  members: Member[];
  compact?: boolean;
}) {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();
    const channelName = workspaceId === "system-presence" ? "system-presence" : `workspace-presence:${workspaceId}`;
    const channel = supabase.channel(channelName, {
      config: { presence: { key: userId } },
    });
    const syncPresence = () => {
      const state = channel.presenceState<Presence>();
      const ids = new Set(
        Object.values(state).flatMap((entries) => entries.map((entry) => entry.user_id)),
      );
      setOnlineIds(ids);
    };

    channel
      .on("presence", { event: "sync" }, syncPresence)
      .on("presence", { event: "join" }, syncPresence)
      .on("presence", { event: "leave" }, syncPresence);
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ user_id: userId, name: userName, avatar: userAvatar });
      }
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [workspaceId, userId, userName, userAvatar]);

  if (!mounted) {
    return compact ? (
      <div className="border-t px-4 py-4"><div className="mb-3 flex items-center justify-between gap-2"><p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Team presence</p><span className="text-[11px] text-muted-foreground">Loading</span></div><p className="text-xs text-muted-foreground">Checking active members...</p></div>
    ) : (
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Users className="size-5 text-brand-teal" aria-hidden="true" />Team presence</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Checking active members...</p></CardContent></Card>
    );
  }

  const onlineMembers = members.filter((member) => onlineIds.has(member.id));
  const displayMembers = [...onlineMembers, ...members.filter((member) => !onlineIds.has(member.id))].slice(0, 8);

  if (compact) {
    return (
      <div className="border-t px-4 py-4">
        <div className="mb-3 flex items-center justify-between gap-2"><p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Team presence</p><span className="text-[11px] text-muted-foreground">{onlineMembers.length} active</span></div>
        <div className="space-y-2">{displayMembers.slice(0, 5).map((member) => { const online = onlineIds.has(member.id); const label = member.name?.trim() || member.email; return <div key={member.id} className="flex items-center gap-2"><span className="relative flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-[11px] font-semibold text-primary">{member.avatar ? <img src={member.avatar} alt="" className="size-full object-cover" /> : label.charAt(0).toUpperCase()}<span className={`absolute bottom-0 right-0 size-2 rounded-full border border-card ${online ? "bg-brand-teal" : "bg-muted-foreground/40"}`} /></span><span className="min-w-0 truncate text-xs text-muted-foreground">{label}</span><span className="sr-only">{online ? "Active" : "Inactive"}</span></div>; })}</div>
        {displayMembers.length === 0 && <p className="text-xs text-muted-foreground">No members yet.</p>}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3"><CardTitle className="flex items-center gap-2"><Users className="size-5 text-brand-teal" aria-hidden="true" />Team presence</CardTitle><span className="text-xs text-muted-foreground">{onlineMembers.length} active</span></CardHeader>
      <CardContent>
        {displayMembers.length === 0 ? <p className="text-sm text-muted-foreground">No workspace members yet.</p> : <div className="grid gap-3 sm:grid-cols-2">{displayMembers.map((member) => { const online = onlineIds.has(member.id); const label = member.name?.trim() || member.email; return <div key={member.id} className="flex items-center gap-3 rounded-lg border bg-background/40 p-3"><span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary">{member.avatar ? <img src={member.avatar} alt="" className="size-full object-cover" /> : label.charAt(0).toUpperCase()}<span aria-label={online ? "Active" : "Inactive"} className={`absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-card ${online ? "bg-brand-teal" : "bg-muted-foreground/40"}`} /></span><span className="min-w-0"><span className="block truncate text-sm font-medium">{label}</span><span className="block text-xs text-muted-foreground">{online ? "Active now" : "Inactive"}</span></span></div>; })}</div>}
      </CardContent>
    </Card>
  );
}
