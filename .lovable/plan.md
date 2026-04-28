# Make HubSpot Changes Real — and Visible

## The blocker first

You just reconnected HubSpot with a **read-only minimal scope set**:

```
crm.objects.contacts.read   crm.objects.contacts.write
crm.objects.deals.read      crm.objects.deals.write
crm.objects.companies.read  crm.objects.owners.read
automation                  oauth
```

That **is** enough to write contacts and deals, but **companies are read-only** and **engagements are not granted at all**. The Co-Pilot's `update_company` tool and the hygiene engine's `delete_orphan_engagement` will both fail with `MISSING_SCOPES`.

Decision needed (see Open Questions). For now this plan assumes we add `crm.objects.companies.write` back to the OAuth scope list and reconnect once.

## What already works (verified in code)

- `assistant-execute` performs real PATCH calls to `api.hubapi.com` for `update_contact`, `update_deal`, `update_company`, `bulk_update_deals`, `reassign_deals`.
- Every write logs `before_state` + `after_state` + `affected_count` to `assistant_actions`.
- `assistant-undo` reverses any of those within 24h using the stored before-state.
- `hygiene-execute` writes per-record PATCHes and logs every field change to `hygiene_log`.
- A scope guard already exists: if write scopes are missing, the tools throw "Reconnect HubSpot from Settings."

What's missing is **proof and visibility** — you can't tell from the UI that the change actually landed in HubSpot.

## What we will build

### 1. Fix the scope set (one edit + reconnect)

Add `crm.objects.companies.write` back to `REQUIRED_SCOPES` in `hubspot-oauth-start`. Null tokens, you reconnect once. New scope list (7 → 9):

```
crm.objects.contacts.read   crm.objects.contacts.write
crm.objects.deals.read      crm.objects.deals.write
crm.objects.companies.read  crm.objects.companies.write
crm.objects.owners.read     automation                  oauth
```

(We are intentionally NOT re-adding `crm.objects.engagements`. Engagement deletes in hygiene will be marked unsupported until you decide.)

### 2. Verify-after-write in `assistant-execute`

Right after every successful PATCH, immediately GET the same record from HubSpot and store the **verified** properties in `after_state.hubspot_verified`. If a written field doesn't match what HubSpot returned, mark the action `partial` with a note.

This means the "after" state isn't just the API's optimistic response — it's a re-fetched truth from HubSpot.

### 3. Add a "Changes" tab to the app

New page `/app/changes` (and a card on the dashboard) that shows the unified change log across both engines:

- **Source**: Co-Pilot or Hygiene
- **What was changed** (object type, HubSpot ID, deep link to the record in HubSpot using `https://app.hubspot.com/contacts/{portalId}/{type}/{id}`)
- **Field-level diff**: `email: jane@OLD → jane@new`
- **Verified ✓** badge if the post-write GET matched
- **Undo** button (24h window for assistant; existing rollback for hygiene)
- Filters: last 24h / 7d / all, by source, by status

Backed by a single read query that UNIONs `assistant_actions` and `hygiene_log`.

### 4. Show the diff inline in the Co-Pilot

After a confirmed write completes, replace the generic `✓ Updated contact 12345.` message with a compact diff card:

```
✓ Updated contact 12345 — verified in HubSpot
  email:     jane@OLD.com  →  jane@new.com
  lifecyclestage: lead     →  customer
  [Open in HubSpot]   [Undo]
```

Built from `assistant_actions.before_state` + `after_state.hubspot_verified`.

### 5. Toast + dashboard counter

- Global toast on every successful write: "1 contact updated in HubSpot. View change."
- Dashboard widget: "Changes pushed to HubSpot — last 24h: N (M verified, K undone)".

### 6. Self-test button in Settings

A "Test HubSpot write" button that:
1. Picks any one mirrored contact.
2. PATCHes a benign property (`hs_lead_status` to its current value, a true no-op).
3. Re-fetches and confirms the round-trip works.
4. Reports green/red with the raw HubSpot response.

This gives you a one-click sanity check that the connection actually has write access, separate from any AI flow.

## Technical details

**Files touched**

- `supabase/functions/hubspot-oauth-start/index.ts` — add `crm.objects.companies.write`.
- `supabase/functions/assistant-execute/index.ts` — add post-write GET + store `after_state.hubspot_verified`; mark `partial` on mismatch.
- `supabase/functions/assistant-undo/index.ts` — same verify-after-undo treatment.
- `supabase/functions/hubspot-self-test/index.ts` — new function for the Settings self-test.
- New page `src/app/pages/AppChanges.tsx` + route in `AppRouter.tsx`.
- New component `src/app/components/ChangeDiffCard.tsx` (reused by Co-Pilot and Changes page).
- `src/app/components/AssistantPanel.tsx` — render `ChangeDiffCard` for messages tied to an `action_id` instead of plain text.
- `src/app/pages/AppDashboard.tsx` — add "Changes pushed (24h)" stat card linking to `/app/changes`.
- `src/app/pages/AppSettings.tsx` — add "Test HubSpot write" button.
- DB: null tokens once, no schema changes (we already have `before_state`/`after_state` JSONB columns).

**Data model notes**

- We don't need a new table. The diff page is a view on top of `assistant_actions` (joined to `mirror_*` for human-readable names) UNION `hygiene_log`.
- HubSpot record deep-link needs the portal ID, which is already on `accounts.hubspot_portal_id`.

**Verification logic (per write)**

```
PATCH /crm/v3/objects/{type}/{id}  body: { properties: P }
GET   /crm/v3/objects/{type}/{id}?properties={keys(P).join(',')}
for each k in keys(P):
  verified[k] = (returned[k] === P[k])
status = all verified ? 'success' : 'partial'
```

## Open questions

1. **Engagements**: Hygiene has a "delete orphan engagement" flow. Without `crm.objects.engagements` it can't run. Re-add the scope, or hide that fix kind in the UI?
2. **Companies write**: confirm we should add `crm.objects.companies.write` back. (Strongly recommended — the AI already exposes `update_company`.)
3. **Verify GET cost**: each write becomes 2 HubSpot calls. Fine for single writes; for `bulk_update_deals` (up to 500) it doubles the rate-limited time. OK to do, or sample-verify (every 10th)?

