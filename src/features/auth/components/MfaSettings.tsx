"use client";

import { useActionState } from "react";
import { enrollMfa, verifyMfaEnrollment } from "@/features/auth/actions";
import type { AuthState } from "@/features/auth/validation";

const initialState: AuthState = { status: "idle" };

export function MfaSettings({ enabled }: { enabled: boolean }) {
  const [state, enrollAction, enrolling] = useActionState(enrollMfa, initialState);
  const [verifyState, verifyAction, verifying] = useActionState(verifyMfaEnrollment, initialState);
  if (enabled && !state.enrollment) return <p className="text-sm text-green-700 dark:text-green-300">Google Authenticator is active.</p>;
  return <div className="space-y-4">
    {!state.enrollment ? <form action={enrollAction}><button type="submit" disabled={enrolling} className="min-h-11 rounded-md border px-4 text-sm font-medium hover:bg-muted disabled:opacity-50">{enrolling ? "Preparing setup…" : "Set up Google Authenticator"}</button></form> : <form action={verifyAction} className="space-y-3"><p className="text-sm text-muted-foreground">Scan this QR code in Google Authenticator.</p><div role="img" aria-label="Google Authenticator setup QR code" className="size-48 rounded-md border bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${JSON.stringify(state.enrollment.qrCode)})` }} /><p className="break-all text-xs text-muted-foreground">Manual key: {state.enrollment.secret}</p><input type="hidden" name="factorId" value={state.enrollment.factorId} /><label className="block space-y-2"><span className="text-sm font-medium">Verification code</span><input name="code" inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" maxLength={6} required className="min-h-11 w-full rounded-md border bg-background px-3 text-sm" /></label><button type="submit" disabled={verifying} className="min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50">{verifying ? "Verifying…" : "Activate authenticator"}</button></form>}
    {(state.message || verifyState.message) && <p role={state.status === "error" || verifyState.status === "error" ? "alert" : "status"} className={`text-sm ${state.status === "error" || verifyState.status === "error" ? "text-destructive" : "text-muted-foreground"}`}>{verifyState.message || state.message}</p>}
  </div>;
}