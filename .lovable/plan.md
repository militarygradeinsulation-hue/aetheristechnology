## Reality check first — what's actually in your account right now

Pulled live from your database for portal `244481481`:

```text
last_sync_status: NULL  (was reset by the prior migration — clean slate)
last_sync_error:  NULL
sync_progress:    {}
mirror_contacts:  48,675 rows
mirror_deals:     0 rows
mirror_owners:    2 rows
mirror_companies: TABLE DOES NOT EXIST
```

So the picture is a bit different from what you described:

- The previous run actually **did** mirror 48,675 contacts before dying — not 0. Contacts ran first, made deep progress, then the worker tore down.
- Owners is at **2**, not 50. (You may have been looking at the demo account `DEMO-12345`, which is seeded data.) HubSpot says you have very few real owners, or pagination broke after the first page.
- Deals is genuinely **0** — the sync never reached the deals phase.
- **There is no `mirror_companies` table at all.** Companies aren't being synced — they're just not in scope yet. Same for lists, forms, workflows, marketing data.

## What to actually fix

### 1. Add companies sync (currently missing entirely)

Create `mirror_companies` table and add a `companies` phase to `hubspot-sync` between `owners` and `contacts`. Schema mirrors `mirror_deals` shape (id, name, domain, industry, owner_id, created_date, properties JSONB, synced_at). This is the big gap — without it, deal→company associations have nothing to point to.

### 2. Fix sync ordering so associations resolve

Current order: `owners → contacts → deals`. New order:
```text
owners → companies → contacts → deals
```
Owners and companies are reference data — they must exist before contacts/deals so foreign keys resolve. (Today there are no FK constraints between mirror tables, but the audit logic downstream depends on associations being lookup-able.)

### 3. Fix owners pagination

Owners endpoint uses `limit=100` and follows `paging.next.after`. The current code is correct in shape but only landed 2 rows. Add a debug log of `data.paging` per page so we can see whether HubSpot is returning a `next` cursor that we're discarding, or genuinely returning only 2 owners on page 1. If pagination is fine, 2 is the real number.

### 4. Pull deal↔contact and deal↔company associations

The Search API returns objects but **not their associations**. Add a third call per deal page using `/crm/v4/associations/deals/contacts/batch/read` and `/crm/v4/associations/deals/companies/batch/read` (batch size 100, IDs from the page just fetched). Store in two new join tables: `mirror_deal_contacts(account_id, deal_id, contact_id)` and `mirror_deal_companies(account_id, deal_id, company_id)`. This is what makes a "find this deal's contact" spot-check possible.

### 5. Confirm scope coverage

Current OAuth scopes requested by `hubspot-oauth-start`:
```text
crm.objects.contacts.read
crm.objects.deals.read
crm.objects.companies.read
crm.objects.owners.read
crm.schemas.contacts.read
crm.schemas.deals.read
oauth
```

Missing for a complete CRM audit: `crm.lists.read`, `crm.schemas.companies.read`. Marketing/automation scopes (`content`, `forms`, `automation`) are out of scope for the current sync — flagging but not adding unless you want marketing audit too.

Adding scopes requires the user to **re-authorize** HubSpot (disconnect → reconnect). Will make this clear in UI.

### 6. Watchdog & cursor durability — already fixed last round, but verify

The previous round added `EdgeRuntime.waitUntil` on the re-invoke and a 5-min stale-heartbeat takeover. Will spot-check by tailing edge logs after the run starts.

### 7. Account is already reset

Account row for portal `244481481` currently shows `last_sync_status: NULL`, `sync_progress: {}`, no error. The "Run full initial sync" button will fire cleanly. No further reset migration needed.

## Files I'll touch

- **New migration**: create `mirror_companies`, `mirror_deal_contacts`, `mirror_deal_companies` tables with RLS (account-scoped, same policy pattern as `mirror_contacts`)
- `supabase/functions/hubspot-sync/index.ts` — add `companies` phase, reorder phases, add associations fetch after deals page, add pagination debug log on owners
- `supabase/functions/hubspot-oauth-start/index.ts` — add `crm.lists.read` and `crm.schemas.companies.read` scopes
- `src/app/components/SyncStatusCard.tsx` — show companies count in diagnostic strip (4 cells instead of 3); show a "Reconnect for new permissions" hint when scopes have expanded
- `src/integrations/supabase/types.ts` — auto-regenerated after migration

## What I'm explicitly not doing

- Not adding marketing/forms/workflows sync. That's a separate phase and would double the function runtime. Flag for follow-up.
- Not changing the 110s budget or self-reinvocation logic — last round's fix is sound; just verifying it works under load.
- Not pulling engagement objects beyond what `mirror_engagements` already covers (table exists but isn't populated by this function — separate job).

## After you click "Run full initial sync"

I'll watch edge function logs in real time and report back: per-phase counts as they land, any 429 backoffs, any window-halving events, and the final tally vs what HubSpot's UI shows.
