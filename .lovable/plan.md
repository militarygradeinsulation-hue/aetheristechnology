# Enable HubSpot Write-Back

## Audit results

**1. OAuth scopes (the actual blocker)**
`supabase/functions/hubspot-oauth-start/index.ts` requests **read-only** scopes today:
- `crm.objects.{contacts,deals,companies,owners}.read`
- `crm.schemas.{contacts,deals,companies}.read`
- `crm.lists.read`, `oauth`

No `.write` scopes. Any PATCH/DELETE/merge call from `hygiene-execute` will return **403 from HubSpot** even though the token decrypts fine. This is why write-back appears "wired but not working."

**2. Connect card** (`src/app/components/HubSpotConnectCard.tsx`)
Currently says *"Nothing is written back without your approval"* but doesn't show whether write permission was actually granted. No way for a user to tell if their token can write.

**3. hygiene-execute path**
Recent edge logs show only `hubspot-sync` running (read flow). No recent `hygiene-execute` invocations to trace — meaning no one has approved a hygiene action lately. The code path itself is intact (verified earlier): defensive ID sanitization, rate-limited PATCH, before/after logging to `hygiene_log`.

## Changes

### A. Add write scopes to OAuth (`hubspot-oauth-start/index.ts`)
Add to the `SCOPES` array:
```
crm.objects.contacts.write
crm.objects.deals.write
crm.objects.companies.write
```
After deploy, **existing connected accounts must reconnect** — old tokens were issued with read-only scopes and HubSpot won't upgrade them silently. The connect card needs a "Reconnect to enable write-back" affordance.

### B. Surface scope status on `HubSpotConnectCard.tsx`
- On mount, query `accounts` for the current user: `hubspot_access_token_expires_at`, `hubspot_scopes` (new column, see C).
- Three UI states:
  1. **Not connected** — current "Connect HubSpot" button.
  2. **Connected, read-only** — amber notice: *"Read-only access. Reconnect to enable write-back (required for Hygiene fixes)."* + Reconnect button.
  3. **Connected, write enabled** — green check: *"Write-back enabled."*
- Uses existing semantic tokens (no new colors). Crimson is reserved per brand rules — use amber for the warning.

### C. Persist granted scopes (`hubspot-oauth-callback/index.ts` + migration)
- Migration: `ALTER TABLE accounts ADD COLUMN hubspot_scopes text;`
- In the callback, after the token exchange, call HubSpot's `GET /oauth/v1/access-tokens/{token}` to read the actual granted scopes (HubSpot returns this even if your app requested more), and store the space-joined string on `accounts.hubspot_scopes`.
- This is the source of truth for the UI badge — never trust what was requested, only what was granted.

### D. Defensive 403 messaging in `hygiene-execute`
When a PATCH/DELETE returns 403, log a friendlier `error_message` on `hygiene_log`:
> *"HubSpot rejected write (403). Reconnect HubSpot to grant write scopes."*
Also flip the action's `error_message` to the same so it shows up in the Hygiene Queue without the user digging into logs. No business-logic or data-model changes.

## Out of scope (per prior constraints)
- No UI restructure beyond the three-state badge on the connect card.
- No changes to report structure, hygiene business logic, or data models other than the one nullable text column.
- No automatic forced reconnect — user-initiated only.

## Verification after deploy
1. `tsc --noEmit` clean.
2. Deploy `hubspot-oauth-start`, `hubspot-oauth-callback`, `hygiene-execute`.
3. Reconnect HubSpot from the connect card; confirm `accounts.hubspot_scopes` contains `*.write` entries; confirm badge flips to green.
4. Approve one trivial hygiene action (e.g. a `trim_whitespace` on a single contact); tail `hygiene-execute` logs and confirm a successful row in `hygiene_log` with `success=true`.
