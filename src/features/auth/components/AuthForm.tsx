"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, register, signInWithGoogle, verifyMfa } from "../actions";
import type { AuthState } from "../validation";

const initialState: AuthState = { status: "idle" };
const buttonClass =
  "inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50";
const inputClass =
  "mt-2 min-h-11 w-full rounded-md border bg-background px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-ring aria-invalid:border-destructive";

export function AuthForm({
  mode,
  next,
  configured,
}: {
  mode: "login" | "register";
  next: string;
  configured: boolean;
}) {
  const registering = mode === "register";
  const [state, action, pending] = useActionState(
    registering ? register : login,
    initialState,
  );
  const [googleState, googleAction, googlePending] = useActionState(
    signInWithGoogle,
    initialState,
  );
  const [mfaState, mfaAction, mfaPending] = useActionState(verifyMfa, initialState);
  const fields = registering
    ? (["name", "email", "password"] as const)
    : (["email", "password"] as const);

  return (
    <div className="space-y-6">
      {!configured && (
        <p
          role="status"
          className="rounded-md border p-3 text-sm text-muted-foreground"
        >
          Sign-in is temporarily unavailable. Please try again later.
        </p>
      )}
      {state.mfa ? (
        <form action={mfaAction} className="space-y-5" aria-label="Authenticator verification">
          <input type="hidden" name="factorId" value={state.mfa.factorId} />
          <input type="hidden" name="challengeId" value={state.mfa.challengeId} />
          <input type="hidden" name="next" value={state.mfa.next} />
          <div><label htmlFor="mfa-code" className="text-sm font-medium">Google Authenticator code</label><input id="mfa-code" name="code" inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" maxLength={6} required className={inputClass} /></div>
          <p className="text-sm text-muted-foreground">{state.message}</p>
          {mfaState.message && <p role="alert" className="text-sm text-destructive">{mfaState.message}</p>}
          <button className={buttonClass} disabled={mfaPending}>{mfaPending ? "Verifying…" : "Verify and sign in"}</button>
        </form>
      ) : <form
        action={action}
        className="space-y-5"
        aria-label={registering ? "Create account" : "Sign in"}
      >
        <input type="hidden" name="next" value={next} />
        {fields.map((field) => (
          <div key={field}>
            <label htmlFor={field} className="text-sm font-medium">
              {field === "name"
                ? "Full name"
                : field === "email"
                  ? "Email address"
                  : "Password"}
            </label>
            <input
              id={field}
              name={field}
              type={
                field === "password"
                  ? "password"
                  : field === "email"
                    ? "email"
                    : "text"
              }
              autoComplete={
                field === "password"
                  ? registering
                    ? "new-password"
                    : "current-password"
                  : field
              }
              required
              maxLength={
                field === "name"
                  ? 100
                  : field === "email"
                    ? 254
                    : registering
                      ? 128
                      : 1024
              }
              minLength={field === "password" && registering ? 12 : undefined}
              aria-invalid={Boolean(state.errors?.[field])}
              aria-describedby={
                state.errors?.[field]
                  ? `${field}-error`
                  : field === "password" && registering
                    ? "password-help"
                    : undefined
              }
              className={inputClass}
            />
            {state.errors?.[field] && (
              <p
                id={`${field}-error`}
                className="mt-2 text-sm text-destructive"
              >
                {state.errors[field]?.[0]}
              </p>
            )}
            {field === "password" && registering && (
              <p
                id="password-help"
                className="mt-2 text-sm text-muted-foreground"
              >
                Use 12–128 characters. A long, unique passphrase works well.
              </p>
            )}
          </div>
        ))}
        <div aria-live="polite" aria-atomic="true">
          {state.message && (
            <p
              role={state.status === "error" ? "alert" : "status"}
              className={
                state.status === "error"
                  ? "text-sm text-destructive"
                  : "text-sm text-muted-foreground"
              }
            >
              {state.message}
            </p>
          )}
        </div>
        <button
          className={buttonClass}
          disabled={!configured || pending || googlePending}
        >
          {pending
            ? "Please wait…"
            : registering
              ? "Create account"
              : "Sign in"}
        </button>
      </form>}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <form action={googleAction}>
        <input type="hidden" name="next" value={next} />
        <button
          className={`${buttonClass} border bg-background text-foreground`}
          disabled={!configured || pending || googlePending}
        >
          {googlePending ? "Connecting…" : "Continue with Google"}
        </button>
        <div aria-live="polite">
          {googleState.message && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {googleState.message}
            </p>
          )}
        </div>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        {registering ? "Already have an account? " : "New to Innov8IT? "}
        <Link
          className="font-medium text-primary underline underline-offset-4"
          href={
            registering
              ? `/login?next=${encodeURIComponent(next)}`
              : `/register?next=${encodeURIComponent(next)}`
          }
        >
          {registering ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}
