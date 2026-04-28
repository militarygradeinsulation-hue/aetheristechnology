# Sync HubSpot OAuth Request to Match Portal Config

## Problem

Your HubSpot Developer Portal now lists **every scope as Required** (~140 scopes). HubSpot's rule: every scope marked Required in the portal MUST appear in the `scope=` parameter of the authorize URL — `optional_scope` is not enough. The current edge function sends only ~30 in `scope` and ~110 in `optional_scope`, so the install will fail with the same "missing scopes" error.

Additionally, your portal includes ~25 scopes that aren't in our code at all (e.g. `analytics.behavioral_events.send`, `behavioral_events.event_definitions.read_write`, `business_units_view.read`, `crm.dealsplits.read_write`, `crm.extensions_calling_transcripts.*`, `crm.objects.forecasts.read`, `crm.objects.leads.*`, `crm.objects.marketing_events.*`, `crm.objects.projects.*`, `crm.pipelines.orders.*`, `crm.schemas.commercepayments.*`, `crm.schemas.feedback_submissions.*`, `crm.schemas.forecasts.read`, `crm.schemas.line_items.read`, `crm.schemas.projects.*`, `ctas.read`, `data_integration.data_source.file.*`, `conversations.custom_channels.*`, `communication_preferences.statuses.batch.*`, `integrations.zoom-app.playbooks.read`, `mcp.users.read`, `settings.billing.write`, `settings.currencies.*`, `settings.security.security_health.read`, `crm.objects.commercepayments.write`, `crm.objects.partner-services.write`).

## What Will Change

### 1. `supabase/functions/hubspot-oauth-start/index.ts`

- Collapse `REQUIRED_SCOPES` and `OPTIONAL_SCOPES` into one **single source of truth** array containing all ~140 scopes from your Portal.
- Add the ~25 missing scopes listed above.
- Build the authorize URL with all scopes in `scope=` (drop `optional_scope=` entirely, since nothing is optional now).
- Keep dedupe + alphabetical sort for stability and easier diffing against the Portal.
- Log scope count + final URL byte length so we can verify we're under HubSpot's URL length cap (~8KB; ~140 scopes ≈ 5KB encoded — safe).

### 2. `src/app/components/HubSpotConnectCard.tsx`

- The `WRITE_SCOPES` check (used to show "Write-back enabled") stays as-is — it only checks the 3 core CRM write scopes against `accounts.hubspot_scopes` returned by HubSpot, which is independent of what we request.

### 3. No DB or callback changes

- `hubspot-oauth-callback` already stores the **granted** scope list returned by HubSpot's `/oauth/v1/access-tokens/{token}` endpoint, so it auto-adapts.
- No migration needed.

## Maintenance Note

Going forward, the scope list in the edge function = the scope list in the HubSpot Developer Portal. If you add a scope in the Portal, add it here too (and reconnect). I'll add a code comment with that rule + a link to the Portal at the top of the file.

## Post-Deploy Steps

1. After the function deploys, click **Reconnect HubSpot** on the Connect card.
2. HubSpot's consent screen should now display all ~140 scopes for approval (long scroll — expected).
3. On success, the dashboard will show `?connected=1` and trigger an initial sync.

## Risk

- **URL length**: ~5KB encoded — well under HubSpot's limit. Logged on each call so we'll see if it ever creeps up.
- **User consent screen length**: Long, but unavoidable when all scopes are Required in the Portal. If you want to shorten it, the fix is in HubSpot (move scopes back to Optional/Conditionally Required), not in code.
