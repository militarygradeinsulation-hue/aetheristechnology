## Goal

Make the HubSpot OAuth install bulletproof: never fail again because a "Required" scope is missing from the authorize URL. Request the full read/write surface so the app can read and connect to anything in HubSpot.

## Why it's failing now

HubSpot enforces this rule: **every scope marked "Required" in the app config (HubSpot Developer Portal → Auth tab) MUST appear in the `scope` query parameter of the authorize URL**. If even one is missing, the install fails with the giant "Authorization failed because the provided scopes are missing [...]" error you saw.

The current `hubspot-oauth-start` only requests 12 scopes. Your app config has ~150 marked Required, so HubSpot rejects the install.

There's a second rule that matters: scopes for **add-on hubs** (Marketing Hub, CMS Hub, Service Hub Pro, Commerce, custom industry objects) cannot go in `scope` — they must go in `optional_scope`, otherwise the install fails on portals that don't have those hubs. Since you said "everything is turned on," they'll all be granted, but using `optional_scope` keeps the integration safe for any future portal you connect.

## What we'll change

### 1. `supabase/functions/hubspot-oauth-start/index.ts`

Replace the 12-scope list with two lists:

**`REQUIRED_SCOPES`** — always-available CRM + core platform (~30 scopes):
- `oauth`
- All core CRM objects: contacts, companies, deals, owners (read + write)
- All core CRM schemas: contacts, companies, deals (read + write)
- Lists, imports, exports
- Files, timeline, settings/users/teams, account-info
- Sales-email-read, communication preferences

**`OPTIONAL_SCOPES`** — add-on hubs and premium objects (~110 scopes), sent via `optional_scope=`:
- Tickets (full)
- Quotes / line items / products
- Invoices / subscriptions / orders / carts / commerce / payments / e-commerce / tax_rates
- Goals
- Custom objects (read/write + schemas)
- Marketing Hub: content, social, forms, hubdb, marketing-email, campaigns, transactional-email, automation, business-intelligence
- Conversations / inbox / visitor identification
- CMS / Content Hub: knowledge_base, domains, functions, performance, membership
- Calls / meetings / scheduler
- Industry objects: appointments, services, courses, listings (HubSpot's vertical bundles)
- Users object, partner-clients, partner-services
- Actions, integration-sync, external_integrations.forms.access, GraphQL collector
- Media bridge, record_images.signed_urls.read
- Accounting

### 2. Build the authorize URL with both params

```
?client_id=...
&redirect_uri=...
&scope=<required, space-separated>
&optional_scope=<optional, space-separated>
&state=...
```

Both lists deduped before encoding (some scopes appear in multiple categories above for readability).

### 3. Logging

Update the existing `console.log` to print `required_count` and `optional_count` instead of dumping the full string, so future debugging is fast.

## What you'll need to do in HubSpot (one time)

In the **HubSpot Developer Portal** → your app → **Auth** tab:

1. Make sure every scope you want the app to be able to request is **enabled** (checked at all). If a scope isn't enabled here, no install can grant it regardless of what we send.
2. For scopes that are not on every portal (anything in Marketing Hub, CMS, Commerce, custom industry objects): move them out of "Required scopes" and into "Optional scopes" / "Conditionally required" — because we're sending them as `optional_scope`. If they stay marked Required, HubSpot will still reject the install on any portal missing that hub.
3. Keep core CRM scopes in **Required** — that matches our `REQUIRED_SCOPES` list.
4. Save.

Then click "Reconnect HubSpot" and the install should sail through.

## Out of scope

- Token-storage schema changes (existing `accounts.hubspot_*` columns already store the access/refresh tokens regardless of how many scopes were granted).
- Granted-scopes tracking (HubSpot returns the actual granted scopes on the token exchange — we can add that to a follow-up if you want feature gating).
- Edge functions that USE the new scopes (we're just unlocking the connection here; functions can be added per-feature later).

## Files changing

- `supabase/functions/hubspot-oauth-start/index.ts` — rewritten with the two scope lists and the new URL builder.

No DB changes, no other files affected.
