"use client";

import { useActionState } from "react";
import { inviteMember } from "@/features/auth/actions";

const initialState = { status: "idle" as const };

export function InviteMemberForm() {
  const [state, action, pending] = useActionState(inviteMember, initialState);

  return (
    <form id="invite-member" action={action} className="space-y-4">
      {state.message && <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "text-sm text-destructive" : "text-sm text-green-700 dark:text-green-300"}>{state.message}</p>}
      <label className="block space-y-2">
        <span className="text-sm font-medium">Email address</span>
        <input name="email" type="email" required maxLength={254} placeholder="teammate@example.com" className="min-h-11 w-full rounded-md border bg-background px-3 text-sm" />
      </label>
      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
          {pending ? "Sending invitation..." : "Send invitation"}
        </button>
      </div>
    </form>
  );
}