# Innov8IT Task Manager

Phases 1–3 are implemented: application foundation, Supabase authentication, and the responsive dashboard shell. The phase order in `Docs/TASK_BREAKDOWN.md` takes precedence over the longer build guide. Project CRUD is Phase 4.

## Development

Use Node.js 22.12+ (Node.js 24 LTS recommended) and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. On Windows with PowerShell script restrictions, use `npm.cmd` instead of `npm`.

The welcome page runs without external services. To configure Supabase, copy `.env.example` to `.env` and replace the placeholders with your project's connection settings. Prisma CLI reads `.env`; Next.js also loads it. Do not commit credentials.

- `DATABASE_URL`: Supabase transaction pooler connection for runtime queries; include `sslmode=require`.
- `DIRECT_URL`: direct database connection or session pooler connection for migrations, using port 5432.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`: public project URL and anon key.
- `APP_URL`: canonical application origin, such as `http://localhost:3000` locally or `https://tasks.example.com` in production. Required for production confirmation and OAuth redirects.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only Supabase service-role key required for account deletion. Never expose it to client code or commit it.

For Google sign-in, enable the Google provider in Supabase Authentication -> Providers and add the Supabase callback URL shown there to Google Cloud Console. The application callback is `${APP_URL}/auth/callback`; add the Supabase project OAuth callback URL (usually `https://<project-ref>.supabase.co/auth/v1/callback`) as the Google authorized redirect URI. Add the application origin to Supabase Authentication -> URL Configuration.

For local development, set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (or `.env`) after copying it from Supabase Project Settings → API. Restart the Next.js server after changing environment variables. Use the service-role key only on the server; never use it as a `NEXT_PUBLIC_*` variable.

## Admin Portal Service

The admin portal lives in `admin-portal/` and runs independently from the workspace app on port 3001 during local development. It reuses Clerk accounts and reads/writes the same Supabase project. Its launcher loads `admin-portal/.env.local` first and then the workspace root `.env.local`; do not copy service-role credentials into source files.

```sh
npm run admin:install
npm run admin:dev
```

Open http://localhost:3001 for the standalone local portal. In Vercel, the root `vercel.json` configures the workspace as the `app` service and this portal as the `admin-portal` service. Requests under `/admin` are routed to the portal; other paths are routed to the workspace. Admin sign-in and access-denied pages are under `/admin/sign-in` and `/admin/access-denied`. Both apps use same-origin paths to link to each other, so no service URL environment variables or service bindings are needed. Configure the required Supabase and Clerk environment variables for both services in Vercel. Only profiles with the `OWNER` or `ADMIN` role in `public.users` can use the portal.

The admin overview includes system metrics and a completed-task leaderboard. Admin navigation also provides all-workspace project and task management (including assignment, editing, archiving, and deletion), list and Kanban task views with drag-and-drop status updates, task progress and activity monitoring, a due-date calendar with pending-task reminders to assignees, task analytics, user management with live online status, and account/calendar preferences. The admin header notification bell shows the signed-in admin's latest notifications and supports marking them as read.

Database clients are initialized on use, so missing credentials do not prevent the static welcome page from building. Database access uses the Node.js runtime. Prisma connects directly to PostgreSQL and does not automatically apply Supabase user authorization; feature implementation must enforce authorization before accessing data.
Run `supabase/schema.sql` after configuring Supabase to create the database tables, RLS policies, and the public `avatars` storage bucket used by profile pictures.
Authenticated users are automatically enrolled as `MEMBER` accounts in the available workspaces when they enter the protected dashboard, which allows them to see workspace tasks and tasks assigned to them.

## Checks

```sh
npm run format:check
npm run lint
npm test
npm run typecheck
npm run db:validate
npm run build
npm start
```

`npm ci` generates the Prisma client. The schema currently configures PostgreSQL without domain models. Models, reviewed migrations, and database-generated Supabase types will be added with their respective features, following `Docs/DATABASE_SCHEMA.md`. No tables or remote resources are created by installation or build. Migration commands require real database credentials.

## Structure

The lockfile pins dependency versions. Overrides for PostCSS, deepmerge-ts, and mysql2 use patched releases to resolve transitive audit findings while retaining Next.js 15 and Prisma 7. Recheck these overrides when upgrading their parent packages.

- `src/app`: App Router pages, root layout, and Tailwind theme tokens; Server Components by default.
- `src/components/ui`: ShadCN UI primitives; configured through `components.json`.
- `src/components/providers`: client-side React Query provider.
- `src/lib`: shared utilities, server-only Prisma factory, browser/server Supabase factories.
- `src/store`: request-safe Zustand store factory used by the dashboard UI provider.
- `src/components/layout`: responsive navigation, header, account menu, and theme selector.
- `src/prisma`: PostgreSQL schema and future migrations.
- `src/generated/prisma`: generated client, ignored by version control.
- `src/features`: future feature modules.
- `src/hooks`, `src/types`: future shared hooks and types.

React Query owns remote client state; Zustand owns sidebar state. The theme provider owns Light/Dark/System appearance and persists the choice in browser storage. The desktop sidebar collapses to an icon rail; screens below 1024px use a modal navigation drawer with keyboard focus management. The header exposes theme selection and the authenticated account menu, including sign-out. Future navigation items are visibly unavailable until their feature phases are implemented.

The dashboard remains protected by verified Supabase authentication. Server Components render its content and retrieve the user; only the display name and email cross into the interactive shell. No authentication bypass or mock production dashboard route is included. Without configured Supabase credentials, component tests exercise the shell in isolation; a signed-in visual check requires a real session.

Documentation: [PRD](Docs/PRD.md), [task breakdown](Docs/TASK_BREAKDOWN.md), [database schema](Docs/DATABASE_SCHEMA.md), [UI guidelines](Docs/UI_UX_GUIDELINES.md), [authentication setup](Docs/AUTHENTICATION_SETUP.md), [implemented API flows](Docs/API_SPECIFICATION.md).
