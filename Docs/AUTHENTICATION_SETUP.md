# Phase 2: Authentication

Implemented: email/password login, registration, email confirmation, Google OAuth with PKCE, session refresh, protected `/dashboard` routes, and current-session sign-out. Phase 3 adds the shared dashboard shell; sign-out is available from the account menu in its header.

## Local configuration

Copy `.env.example` to `.env` and configure the public Supabase URL and anon key. Set `APP_URL=http://localhost:3000`. Use that exact origin in the browser throughout sign-in, including the hostname and port, so the PKCE verifier cookie is available when Google redirects back. Restart Next.js after changing environment variables. Database connection strings are not required for authentication; Supabase Auth owns credentials and sessions.

Without configuration, the public auth pages render an unavailable message with disabled submit buttons. Protected pages redirect to login. The application never grants access from an unverified cookie or from an unavailable auth service.

## Supabase configuration

1. Enable the Email provider. Enable email confirmation and configure the password minimum to at least 12 characters, matching application registration validation.
2. Set Authentication → URL Configuration → Site URL to the same origin as `APP_URL`.
3. Add `http://localhost:3000/auth/callback` to the allowed redirect URLs. Add the exact production callback URL before deploying. Avoid wildcard production redirects.
4. Under Email Templates → Confirm signup, use this link to support confirmation across browsers:

   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirm your email</a>
   ```

   The default PKCE email redirect also works through `/auth/callback` when opened in the browser that registered. The token-hash template supports opening confirmation in another browser. Use separate Supabase projects for development and production to keep Site URL settings consistent.
5. Configure a production SMTP sender and appropriate Supabase Auth rate limits before public use. Supabase enforces the authentication rate limits; this app does not use an ineffective per-process in-memory limiter. Enable leaked-password protection where your Supabase plan supports it.

## Google OAuth

1. Create a Google OAuth web client and configure its consent screen (including test users if it is in testing mode).
2. In Google, register the callback URL shown by Supabase, typically `https://PROJECT_REF.supabase.co/auth/v1/callback`. This is the Google-to-Supabase callback, distinct from the application's `/auth/callback` URL.
3. Enable the Google provider in Supabase and enter the Google client ID and client secret there. Do not put the Google secret or a Supabase service-role key in public environment variables.
4. Ensure the application callback is allowed in Supabase as described above.

## Security and persistence

Server Actions handle authentication mutations with Next.js same-origin checks. Inputs are validated again on the server. Return paths are restricted to `/dashboard` and its descendants; OAuth redirects use configured `APP_URL`, never an untrusted forwarded host header. Callback failures do not echo provider error text, tokens, or authorization codes.

Middleware verifies sessions using `getUser`, forwards refreshed cookies to both the server request and browser response, preserves cookie removals on redirects, and disables caching. The dashboard layout and page independently require a verified user; future data-access functions and Server Actions must also enforce authorization themselves.

Supabase stores the auth identity in its managed `auth.users` table. Registration stores only a display name in user metadata; it never accepts a client-supplied role. User-editable metadata must not be used for authorization. Domain user profiles and workspace membership will be introduced with database-backed features according to `DATABASE_SCHEMA.md`; this phase does not create an unsynchronized second credential store or assign administrator privileges. No database migrations are needed for these Supabase-managed auth flows.

## Verification

Run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`. Automated tests mock Supabase and cover validation, redirect attacks, provider failures, sign-out, callback token exchange, email verification, and middleware cookie propagation. They do not replace a real Supabase integration test.

After configuring a test project, verify:

- Logged-out `/dashboard` redirects to `/login`; public login and registration remain accessible.
- Register an email, receive its confirmation, open the link, and reach the signed-in page. Reusing or expiring the link shows a recoverable error.
- Wrong credentials show a generic error; valid credentials sign in. Reloading preserves the session.
- Google success reaches the signed-in page; cancelling Google does not grant access.
- Sign out and reload `/dashboard`; it must redirect to login.
- With an expired access token and valid refresh token, reloading refreshes the browser session. An invalid refresh token must return to login.

Live email delivery, Google provider authorization, and token refresh require project credentials and provider setup. They cannot be verified with the placeholder environment file.

References: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google).
