# Phase 3: Dashboard layout

The protected dashboard now uses a shared sidebar, sticky header, content region, and account menu. Existing authentication checks remain in both the server layout and page.

- Desktop (1024px+): collapsible 256px sidebar, or an 80px icon rail. Zustand stores the state within the mounted dashboard layout, preserving it across child navigation. Reloading starts expanded.
- Mobile and tablet: navigation opens in a Radix modal drawer with a backdrop, focus trap, Escape dismissal, close button, and focus return to its trigger. Selecting Dashboard closes it; crossing into the desktop breakpoint dismisses it as well.
- Navigation: Dashboard is active. Projects, Tasks, Calendar, Analytics, and Settings are labeled as coming soon and disabled. No placeholder feature routes or fake data are introduced.
- Header: sidebar controls, page label, appearance selector, and account menu with sign-out. Long names and emails are truncated in the menu without widening the page.
- Appearance: Light, Dark, and System are supported via `next-themes`. The choice persists under `innov8it-theme` in local storage and applies across the application. The provider sets the root theme before paint; the control waits for hydration before becoming interactive.
- Accessibility: skip link, one main landmark, named navigation and dialogs, active-page semantics, labeled icon controls, visible focus indicators, native keyboard-operable theme selection, and reduced-motion-aware layout transitions.

The welcome content uses the existing ShadCN Card component and brand tokens. No Prisma schema changes are needed for this layout phase.

## Verification

Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run format:check`, and `npm run build`.

DOM component tests cover sidebar expansion, drawer dismissal and focus return, navigation close behavior, theme changes and persistence, and the sign-out action. The Phase 2 authentication regression suite remains enabled.

For a real browser check, configure Supabase as described in `AUTHENTICATION_SETUP.md`, sign in, and inspect `/dashboard` at 375px, 768px, and 1440px widths. Verify keyboard access, no horizontal overflow, all three theme choices, persisted appearance after reload, account menu dismissal, and sign-out. This requires a valid Supabase session; there is no development authentication bypass.
