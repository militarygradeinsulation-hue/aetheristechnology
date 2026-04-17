---
name: Admin & Infrastructure
description: Hardcoded credentials, integration IDs, and internal systems
type: feature
---

# Admin & Infrastructure

## Admin Auth (PIN-only)
- The ONLY admin login is PIN **9822**. No email/password, no Supabase Auth user, no `admin_users` table involvement at runtime.
- `/admin/login` and `/admin` are rendered **outside** `<AuthProvider>` in `src/App.tsx` so the public auth system never touches them.
- PIN flow: `admin-pin-login` edge function validates `pin === "9822"` and returns a 12h HMAC token (signed with `SUPABASE_SERVICE_ROLE_KEY`). Client stores it in `localStorage` as `aetheris_admin_token`.
- Admin token helpers live in `src/lib/adminAuth.ts` (`getAdminToken`, `setAdminToken`, `clearAdminToken`, `hasValidAdminToken`).
- Admin edge functions (`admin-data`, `admin-library`, `admin-insights`) verify the token via `x-admin-token` header using `supabase/functions/_shared/admin-token.ts`. They use the service role for DB access — admin UI does NOT query tables directly.
- Logout = `clearAdminToken()` + redirect. No `supabase.auth.signOut()` on admin pages.

## Other
- HubSpot meeting embed ID and notify domain unchanged.
