

## Goal
Make PIN 9822 unlock the admin area instantly. Strip every check that's currently slowing it down.

## What's slow today
1. `admin-pin-login` edge function does, in sequence: profile lookup → upsert into `admin_users` → spin up a second Supabase client → `signInWithPassword`. The auth logs show that single password sign-in takes 150–375 ms on its own, plus cold-start.
2. After PIN succeeds, the client calls `setSession(...)` (network round-trip to Supabase Auth) before navigating.
3. `AdminLogin` runs an extra `getSession` + `is_admin` RPC on mount.
4. `AdminDashboard` then re-runs `getSession` + `is_admin` RPC before showing anything.
5. The whole admin tree is wrapped in `AuthProvider`, which on every mount fires `onAuthStateChange` + `getSession` + a `profiles` SELECT + possible `profiles` INSERT — all triggered again by the PIN sign-in event.

That's why "verifying" feels long: 4–6 sequential network calls before the dashboard renders.

## Plan — rip it out

### 1. Replace the edge function with a trivial PIN check
Rewrite `supabase/functions/admin-pin-login/index.ts` to:
- Validate `pin === "9822"`.
- Return `{ ok: true, token: "<server-signed short token>" }` (HMAC of pin + timestamp using `SUPABASE_SERVICE_ROLE_KEY` as secret, valid for ~12h).
- No DB calls. No `signInWithPassword`. No user creation. No `admin_users` table.

This eliminates ~400–800 ms of backend work and a cold-start path.

### 2. Client stores PIN session locally, no Supabase auth involved
In `AdminLogin.tsx`:
- On submit, POST PIN to the function. On `ok`, write `localStorage.setItem('aetheris_admin_token', token)` and `navigate('/admin')`.
- Remove the `useEffect` that calls `getSession` + `is_admin`. Replace with a synchronous check: if `localStorage` has a non-expired token, redirect immediately.
- Keep the "Back to website" link and the PIN input — nothing else.

### 3. Isolate admin from `AuthProvider`
In `App.tsx`:
- Move `<Route path="/admin/*">` and `<Route path="/admin/login">` **outside** `<AuthProvider>` (render them in a parallel `<Routes>` block, or wrap only non-admin routes in `AuthProvider`).
- Result: visiting `/admin/login` no longer triggers `onAuthStateChange`, the `profiles` SELECT/INSERT, or any Supabase auth bootstrapping.

### 4. Strip admin verification from the dashboard
In `AdminDashboard.tsx`:
- Delete the `verifyAndLoad` block that calls `getSession` + `is_admin`.
- Replace with synchronous: read `aetheris_admin_token` from localStorage; if missing/expired → `navigate('/admin/login')`; otherwise call `fetchData()` immediately.
- `handleLogout` becomes `localStorage.removeItem('aetheris_admin_token'); navigate('/admin/login')` — no `supabase.auth.signOut()`.

### 5. Keep the admin-only edge functions working
`admin-library` and `admin-insights` currently expect a Supabase user with `is_admin`. Switch them to accept the PIN token in an `x-admin-token` header and verify it with the same HMAC. Quick, no DB lookup.

### 6. Memory update
Update `mem://features/admin-analytics-hub` to note: PIN 9822 is the only admin auth; admin pages do not use Supabase Auth or `AuthProvider`.

## Files to change
- `supabase/functions/admin-pin-login/index.ts` — rewrite
- `supabase/functions/admin-library/index.ts` — accept PIN token instead of JWT
- `supabase/functions/admin-insights/index.ts` — accept PIN token instead of JWT
- `src/pages/AdminLogin.tsx` — remove session/RPC checks, store token locally
- `src/pages/AdminDashboard.tsx` — remove session/RPC verification, use localStorage
- `src/App.tsx` — move admin routes outside `AuthProvider`
- `mem://features/admin-analytics-hub` — note new auth model

## Trade-off (FYI)
Without a real Supabase session, the admin dashboard's direct DB queries (`contact_submissions`, `site_events`) will run as the **anon role**. Those tables currently rely on RLS that requires `is_admin(auth.uid())`, so they'd return zero rows. Two options:
- **A (recommended for speed):** route those reads through a new `admin-data` edge function that checks the PIN token and uses the service role to fetch.
- **B:** keep an invisible service-account session, but that puts us back where we started.

I'll go with **A** — one extra edge function (`admin-data`) is cheaper than the 4-call verification chain we have now.

## Result
PIN submit → 1 edge call (~50–150 ms) → navigate. Dashboard renders immediately and pulls data in the background. No `getSession`, no `is_admin` RPC, no `AuthProvider` involvement.

