"use client";

import { useClerk } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

export function DeletedSessionRecovery({ children }: { children: ReactNode }) {
  const { signOut } = useClerk();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void signOut()
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [signOut]);

  if (!ready) {
    return <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">Preparing sign-in...</p>;
  }

  return children;
}
