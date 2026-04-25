# What's actually happening with your HubSpot connection

## The good news
The OAuth handshake **is working**. Your real HubSpot portal (`244481481`) connected successfully on 2026-04-24 at 22:44 UTC. Tokens (access + refresh) are encrypted and stored, and `hubspot-oauth-callback` did fire `hubspot-sync` immediately after.

## The bad news — why no full scan finished
Your account row currently shows:

```text
last_sync_status: error
last_sync_at:     null
last_sync_error:  "Sync interrupted by edge function timeout..."
sync_progress:    {}     <-- empty
mirror_contacts:  0 rows for this account
mirror_deals:     2 rows
mirror_owners:    50 rows
```

Three things broke the full scan:

### 1. The previous "stalled sync" cleanup wiped the resume cursor
A migration ran on 2026-04-24 that did:
```sql
UPDATE accounts SET last_sync_status='error', sync_progress='{}'
WHERE last_sync_status='running';
```
That cleared the `cursor` field that `hubspot-sync` needs to resume. So when the UI's "Restart sync" button calls `mode: "resume"`, the function logs *"resume requested but no cursor found"* and silently does nothing useful — the SyncStatusCard's restart button can never actually restart this account.

### 2. The auto-reinvocation chain is fragile
`hubspot-sync` is built to yield at 110s and self-re-invoke via `fetch(.../hubspot-sync)`. But:
- The re-invoke uses plain `fetch` with no `EdgeRuntime.waitUntil` wrapping it, so if the parent worker is torn down before the POST flushes, the chain dies.
- The re-invoke posts `mode: "resume"` — which (as above) requires a saved cursor. If anything wipes `sync_progress` between yields (UI writes, the cleanup migration, a manual click), the resume becomes a no-op.

### 3. The "Sync now" button on the dashboard sends `incremental`, not `initial`
For an account that has **never successfully completed an initial sync** (`last_sync_at IS NULL`), an incremental run still works (the function falls back to an 18-month window), but it's the same code path that timed out the first time. There's no UI affordance to explicitly re-trigger a clean **initial** full scan.

### Why this account specifically failed
Portal `244481481` is a real HubSpot portal. The HubSpot Search API returns max 10,000 results per query, so `hubspot-sync` walks date windows. With 18 months of contacts + deals at PAGE_SIZE=100 and aggressive rate limiting, the first invocation hit the 110s budget mid-window, yielded, the re-invoke either never landed or landed before the cursor was committed, and the sync sat in `running` until the cleanup migration killed it.

(For contrast: the demo account `DEMO-12345` shows `success` with 143,223 "contacts" because that data was inserted directly by `seed-demo-data`, not by `hubspot-sync`.)

---

## The fix

### A. Make `hubspot-sync` actually durable
1. **Persist the cursor more aggressively** — write it after every page (not just at yield) so a crashed worker can always be resumed.
2. **Wrap the re-invoke in `EdgeRuntime.waitUntil`** so the parent doesn't tear down before the POST flushes.
3. **Auto-fallback to `initial` when `mode='resume'` is requested but no cursor exists** instead of silently doing nothing — log a warning and start a fresh windowed scan from `last_sync_at` (or 18 months back if null).
4. **Add a watchdog**: if `last_sync_status='running'` and heartbeat is older than 5 min, the next invocation should treat it as crashed and resume/restart instead of refusing.

### B. Reset this specific account so it can sync cleanly
Run a migration that, for account `31916151-ef5b-463f-bc24-2ed1a91ccfee`, clears `last_sync_status`, `last_sync_error`, and `sync_progress` so the next click starts a clean initial scan.

### C. Make the UI honest about state
In `SyncStatusCard`:
1. When `last_sync_at IS NULL` and status is `error` or `idle`, show a **"Run full initial sync"** button that invokes `hubspot-sync` with `mode: "initial"` (not `incremental`).
2. Keep the existing "Sync now" / "Restart sync" buttons for the post-initial case.
3. Show "Never synced" instead of just the error text when `last_sync_at IS NULL`.

### D. Add a simple visible diagnostic
Show portal id, token expiry, last heartbeat timestamp, and counts of mirror_contacts / mirror_deals / mirror_owners on the SyncStatusCard so you can see at a glance whether data is actually flowing.

---

## Files I'll touch

- `supabase/functions/hubspot-sync/index.ts` — durability fixes (A1–A4)
- `supabase/functions/hubspot-oauth-callback/index.ts` — wrap initial-sync trigger in `EdgeRuntime.waitUntil`
- `src/app/components/SyncStatusCard.tsx` — initial-vs-incremental UX, diagnostic block
- `src/app/lib/useAccount.ts` — expose mirror table counts (small select)
- New migration — reset the stuck account row so the next click starts fresh

After this lands, click **Run full initial sync** on the dashboard once and the scan will complete across as many auto-reinvocations as it needs, persisting progress every page.
