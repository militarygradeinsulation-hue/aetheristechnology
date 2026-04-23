

# CTOguy Revenue Recovery Engine — Phase 1

## Critical Architecture Decision (please read first)

You chose "use the existing HubSpot connector," but that connector authenticates **YOUR** HubSpot account (Joseph's HubSpot). It is a single-tenant credential — every user of the app would read/write the same HubSpot portal. That breaks the entire multi-tenant SaaS premise.

**To support multiple client tenants, each connecting their own HubSpot portal, we need a real per-user HubSpot OAuth app.** This requires:

1. You create a HubSpot Developer app at https://developers.hubspot.com → get a Client ID + Client Secret
2. Set the redirect URI to `https://ihdjpxhcaiaixmqxyqoe.supabase.co/functions/v1/hubspot-oauth-callback`
3. Add these scopes to the app: `crm.objects.contacts.read`, `crm.objects.contacts.write`, `crm.objects.deals.read`, `crm.objects.deals.write`, `crm.objects.companies.read`, `crm.schemas.contacts.read`, `crm.schemas.deals.read`, `automation`, `oauth`
4. I'll request `HUBSPOT_CLIENT_ID` and `HUBSPOT_CLIENT_SECRET` as backend secrets

**Alternative:** If this tool is admin-only (you running audits for clients), the existing connector works and we skip per-tenant OAuth. Let me know if you want to pivot.

The plan below assumes per-tenant OAuth (proper multi-tenant SaaS).

## What Phase 1 Delivers

A working `/app` SaaS area, isolated from your marketing site, where a client can sign up, connect their own HubSpot, and watch their CRM data sync into your Supabase. No audit engine, no Claude analysis yet — those come in Phase 2.

```text
/app/login      → email + password (Google optional)
/app/signup     → creates account row tied to user
/app/dashboard  → "Connect HubSpot" CTA OR sync stats + Sync Now button
/app/settings   → portal info, disconnect, manual sync
```

## Scope Boundary

| In Phase 1 | Deferred to later phases |
|------------|--------------------------|
| Auth & multi-tenant accounts with RLS | Pattern detection (8 SQL queries) |
| Per-user HubSpot OAuth flow | Claude/GPT-5 audit pipeline (Stages A–E) |
| Mirror schema (accounts, contacts, deals, engagements, owners) | Report rendering + PDF |
| Initial sync + scheduled 6-hour incremental sync + Sync Now | Action queue, write-back |
| Dashboard shell with sync status & quick stats | Settings polish, billing |
| Settings page (portal info, disconnect, manual sync) | Audit reports & findings tables |

## Files Created

### Frontend (`src/app/...` — fully isolated from marketing site)

| File | Purpose |
|------|---------|
| `src/app/AppLayout.tsx` | Minimal layout: sidebar + header, dark mode default, no marketing nav |
| `src/app/AppRouter.tsx` | Nested router for `/app/*` mounted in `App.tsx` |
| `src/app/pages/AppLogin.tsx` | Email/password sign-in |
| `src/app/pages/AppSignup.tsx` | Email/password sign-up; creates `accounts` row on first login |
| `src/app/pages/AppDashboard.tsx` | Connect-HubSpot CTA OR stats grid + sync controls |
| `src/app/pages/AppSettings.tsx` | Portal info, disconnect, manual sync, account info |
| `src/app/components/HubSpotConnectCard.tsx` | Empty-state card with OAuth launcher |
| `src/app/components/SyncStatusCard.tsx` | Last sync time, progress bar during sync |
| `src/app/components/StatCard.tsx` | Reusable metric card (contacts, deals, pipeline value) |
| `src/app/lib/useAccount.ts` | Hook: fetches the user's `accounts` row + sync status |
| `src/app/lib/useHubSpotConnect.ts` | Hook: launches OAuth popup, polls for completion |

### Backend (Supabase Edge Functions)

| Function | Purpose |
|----------|---------|
| `hubspot-oauth-start` | Returns the HubSpot authorize URL with state token tied to the user |
| `hubspot-oauth-callback` | Exchanges code → tokens, stores encrypted in `accounts`, redirects back to `/app/dashboard?connected=1` |
| `hubspot-sync` | Pulls contacts, deals, companies, engagements, owners into mirror tables. Handles initial (18 months) vs incremental. Refreshes access token if expired. |
| `hubspot-sync-cron` | Cron-callable: iterates all connected accounts and triggers incremental sync |
| `hubspot-disconnect` | Revokes refresh token with HubSpot, clears tokens from `accounts` |

### Database Migrations

One migration creating these tables, all with RLS enforcing `account_id` belongs to `auth.uid()`:

| Table | Key columns |
|-------|-------------|
| `accounts` | `user_id` (unique, FK→auth.users), `hubspot_portal_id`, `hubspot_refresh_token_encrypted`, `hubspot_access_token_encrypted`, `hubspot_access_token_expires_at`, `last_sync_at`, `last_sync_status`, `sync_progress` jsonb |
| `mirror_contacts` | `account_id`, `hubspot_id`, `email`, `first_name`, `last_name`, `lifecycle_stage`, `lead_status`, `owner_id`, `created_date`, `last_activity_date`, `properties` jsonb. Unique on `(account_id, hubspot_id)` |
| `mirror_deals` | `account_id`, `hubspot_id`, `deal_name`, `amount`, `stage`, `pipeline`, `close_date`, `owner_id`, `created_date`, `last_activity_date`, `days_in_current_stage`, `properties` jsonb |
| `mirror_engagements` | `account_id`, `hubspot_id`, `contact_id`, `deal_id`, `type`, `timestamp`, `properties` jsonb |
| `mirror_owners` | `account_id`, `hubspot_id`, `email`, `first_name`, `last_name` |

All `mirror_*` tables: indexed on `(account_id, hubspot_id)` for fast upserts.

RLS pattern: `USING (account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid()))` — service role bypasses for sync writes.

Token encryption: AES-GCM via `pgcrypto` with a 32-byte key stored in `HUBSPOT_TOKEN_ENCRYPTION_KEY` secret. Access via security-definer functions `encrypt_token(text)` / `decrypt_token(text)` callable only from edge functions.

### Cron

`pg_cron` job calling `hubspot-sync-cron` every 6 hours.

## Sync Engine Behavior

1. **Initial sync** (triggered after OAuth callback): paginated pulls from HubSpot — `/crm/v3/objects/contacts`, `/deals`, `/companies`, `/owners`, `/crm/v3/objects/{contacts,deals}/search` filtered to last 18 months for `lastmodifieddate`. Engagements via `/crm/v3/objects/{calls,emails,meetings,notes}`. 100 records/page, sleeps on 429. Writes progress to `accounts.sync_progress` jsonb every page so the UI progress bar updates in real time (polled by frontend).
2. **Incremental sync**: filters by `lastmodifieddate >= last_sync_at - 5min`. Upserts on `(account_id, hubspot_id)`.
3. **Token refresh**: before each call, if `hubspot_access_token_expires_at < now() + 5min`, exchange refresh token for new access token and store encrypted.
4. **Rate limits**: respects `X-HubSpot-RateLimit-Remaining` header; sleeps when low.

## Design

- Dark mode default (already your brand). Primary `#1e40af` deep blue, accent `#06b6d4` cyan — added as new tokens `--app-primary` / `--app-accent` in `index.css` so they don't conflict with your existing amber/crimson forensic palette.
- Inter font (already loaded).
- Skeleton loading states; no spinners.
- Mobile responsive, desktop-optimized.

## Secrets I'll Need You to Add

| Secret | Purpose |
|--------|---------|
| `HUBSPOT_CLIENT_ID` | From your HubSpot developer app |
| `HUBSPOT_CLIENT_SECRET` | From your HubSpot developer app |
| `HUBSPOT_TOKEN_ENCRYPTION_KEY` | I'll generate a random 32-byte key for you to copy in |

`LOVABLE_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` are already configured. Not needed in Phase 1: `ANTHROPIC_API_KEY` (Phase 2 uses Lovable AI / GPT-5).

## Build Order (sequential, confirm each before next)

1. Migration: tables, RLS, encryption helpers, cron extension
2. Auth pages + AppLayout + routing under `/app`
3. HubSpot OAuth start/callback edge functions + Connect button + Settings disconnect
4. Sync engine edge function + manual Sync Now + progress UI
5. Cron job for incremental sync
6. Dashboard stats + polish

## What I Need From You Before Starting

1. **Confirm per-tenant OAuth path** (you create the HubSpot dev app) vs. **admin-only** (use existing connector, single tenant — much simpler).
2. **HubSpot developer app credentials** (if going per-tenant). I'll request them as secrets at the right step — you don't need to share them now.

