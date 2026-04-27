## Goal

Stop Action Queue rows from jumping around while a scan/execution is running, and give the user explicit ways to view the queue without re-shuffling.

## The problem

`AppHygieneQueue.tsx` re-fetches every 2 seconds while anything is `executing`. The query orders by `created_at desc` only, but the UI also depends on `status`, `progress`, etc. As statuses flip and counts change, React re-renders the list in a different visual order than the user expects, so cards "move up and down."

Two compounding issues:
1. There's no stable sort tie-breaker — rows with identical `created_at` (same scan batch) can swap.
2. There's no user-controlled view mode, so there's no single "correct" order — it just looks chaotic.

## What we'll build

### 1. Lock row positions per session

Compute the row order **once per scan**, cache it by `action.id`, and reuse that order on every poll. New rows (from a new scan) append at the bottom of their group. Existing rows never move while the page is open — only their inner content (progress bar, status badge) updates in place.

### 2. View options (segmented control above the list)

Three locked views; user picks one, order is frozen until they switch:

- **Priority** (default) — high severity first → medium → low; within each, high confidence first; within each, largest `affected_count` first. Computed once per `(view, scan)`.
- **Newest first** — `created_at desc`, stable.
- **Status** — groups in fixed order: `executing` → `failed` → `pending`/`approved` → `cancelled`/`skipped`. Within each group, Priority order applies.

The selected view persists to `localStorage` so it survives reloads.

### 3. Visual stability tricks

- Add a stable React `key={action.id}` (already present) and wrap each card in a memoized component so unchanged rows don't re-render.
- Use a `useRef`-held `Map<actionId, sortIndex>` that's only rebuilt when the view mode changes or a brand-new action id appears. Existing ids keep their original index forever.
- The poll updates row *contents* by merging fetched data into existing array slots rather than replacing the array.

### 4. Small UX additions

- Show a tiny "Locked order: Priority" hint next to the view switcher with a "Re-sort now" link, so users can deliberately re-rank if they want.
- Keep the auto-refresh badge ("Updating every 2s") so it's clear data is live even though positions are static.

## Files to change

- `src/app/pages/AppHygieneQueue.tsx` — add view switcher, stable order ref, memoized row component, merge-in-place loader.
- `src/app/lib/hygiene.ts` — add a `sortActions(rows, view)` helper + severity/confidence weight maps.

No DB changes. No edge function changes.

## Out of scope

- Drag-to-reorder (can add later if you want manual ordering).
- Persisting order across devices (localStorage only for now).
