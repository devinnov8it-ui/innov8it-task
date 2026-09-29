"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const realtimeTables = ["tasks", "task_assignees", "comments", "activity_logs", "notifications", "projects"] as const;

export function DashboardRealtime({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`workspace-updates:${workspaceId}`);
    realtimeTables.forEach((table) => {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => router.refresh());
    });
    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router, workspaceId]);

  return null;
}
