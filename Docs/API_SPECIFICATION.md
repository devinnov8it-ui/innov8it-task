# Implemented authentication flows

Phase 2 uses Next.js Server Actions for mutations. The REST authentication paths proposed in the build guide are not implemented; clients should use the forms and actions below.

| Surface | Input | Result |
| --- | --- | --- |
| `/login` form → `login` | Email, password, optional safe dashboard return path | Session cookies and redirect, or generic validation/authentication error |
| `/register` form → `register` | Name (1–100 characters), email, password (12–128 characters) | Confirmation notice; immediate signed-in redirect only if Supabase returns a session |
| Google form → `signInWithGoogle` | Optional safe dashboard return path | PKCE verifier cookie and redirect to Supabase's Google authorization endpoint |
| `GET /auth/callback` | OAuth/PKCE `code`, optional `next` | Exchange code for session; redirect to dashboard or login error |
| `GET /auth/confirm` | `token_hash`, `type=email` | Verify confirmation token; redirect to dashboard or login error |
| Dashboard form → `signOut` | No input | Remove current session and redirect to login; display error if sign-out fails |

`/dashboard` and all its descendants require a verified Supabase user. Auth responses are not cached. Return URLs cannot leave the dashboard namespace. Provider error messages and token values are never reflected into error pages.

See [authentication setup](AUTHENTICATION_SETUP.md) for provider configuration and integration verification.
