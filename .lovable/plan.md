# Why your formatting fix is stuck at 870 / 5000

## What's actually happening

I pulled the action row and the execution log:

- Action `0cb171ad…` shows `status: executing`, `progress: 870 / 5000`, with **789 failures** so far.
- The edge function has been **booted/shutdown** repeatedly and auto-recovered twice — meaning the long-running job keeps timing out and a watchdog flips it back to `pending`, but the UI is still showing the last `executing` snapshot.
- Looking at `hygiene_log` for this action, **every single failure is the same HubSpot error**:

  ```
  403 MISSING_SCOPES
  Required: crm.objects.contacts.write (and sensitive variants)
  ```

So it isn't really "stuck" — it's burning through records but **HubSpot is rejecting every write** because the connected HubSpot app token does not have contact write scopes. The job will never succeed in its current state.

Also: the action targets **18,777 records** but `affected_record_ids` was capped at 5,000 — so the rest are silently truncated, which is its own problem.

## The fix — three parts

### 1. Stop the stuck job right now (one-click, no code)

Run this from the queue page after the changes below ship. In the meantime I'll mark the current action as `failed` so the UI unblocks and you can re-approve once HubSpot is reconnected.

### 2. Add a "Stop / Cancel" button to executing rows in the Action Queue

Right now `AppHygieneScan.tsx` has a Stop button for the *scan*, but `AppHygieneQueue.tsx` has no equivalent for *executing actions*. I'll add one next to the "Processing X of Y" indicator that:

- Updates `hygiene_actions.status → 'cancelled'`
- Sets `error_message: 'Cancelled by user'`
- Stamps `executed_at`
- The background loop in `hygiene-execute` will see the cancel on its next progress write and bail (I'll add a status check inside the per-record loop so it actually exits within ~1 second instead of grinding through all 5,000).

### 3. Fail-fast on missing scopes (don't burn 800 records to learn the same thing)

In `hygiene-execute/index.ts`, the first time a record returns `403 MISSING_SCOPES`, instead of logging and continuing, the function will:

- Mark the action `status: 'failed'`
- Set `error_message: 'HubSpot is missing write scopes — reconnect HubSpot from Settings to grant contact write access.'`
- Exit the loop immediately

This way if scopes are missing, you see one clean error in 2 seconds instead of waiting 9 minutes for 5,000 silent rejections.

### 4. Surface the "reconnect HubSpot" CTA

When a hygiene action fails with a scope error, the queue card will show a **"Reconnect HubSpot"** button that deep-links to `/app/settings` (where `HubSpotConnectCard` lives). Re-running OAuth will re-prompt for the missing `crm.objects.contacts.write` scope.

## What you need to do (the human part)

The code fixes above won't grant the scope on their own — HubSpot has to issue a new token. After I ship the changes:

1. Click **Stop** on the stuck row (or I'll auto-fail it on deploy).
2. Go to **Settings → HubSpot** and click **Reconnect HubSpot**.
3. On the HubSpot consent screen, make sure **Contacts → Write** is checked. (Your install was done with read-only scopes.)
4. Re-approve the "Formatting inconsistencies" action from the queue.

## Technical changes

- **`supabase/functions/hygiene-execute/index.ts`**
  - Inside the `for (const rawId of ids)` loop, after every progress write, re-fetch `hygiene_actions.status`; if `cancelled`, break out and write a final `status: 'cancelled'` row.
  - On first `403 MISSING_SCOPES` from `applyOne`, abort the loop, set `status: 'failed'`, `error_message` with a human-readable scope hint, and a new `progress.error_kind: 'missing_scopes'` flag.
  - Same treatment in `runMerges`.

- **`src/app/pages/AppHygieneQueue.tsx`**
  - Add a `cancelAction(a)` handler that updates the row to `cancelled`.
  - Render a **Stop** button (Lucide `StopCircle`, rose styling matching the scan page) inside the executing-progress block.
  - When `error_message` includes `MISSING_SCOPES` or `missing write scopes`, render a **Reconnect HubSpot** button linking to `/app/settings`.

- **One-off DB cleanup** (run on deploy): mark action `0cb171ad-09f2-4009-a514-b1122a5c06e4` as `failed` with the scope-error message so the queue isn't blocked.

No schema changes, no new tables.
