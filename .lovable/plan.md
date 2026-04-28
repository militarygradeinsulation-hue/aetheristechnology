# Safer dedupe + uncategorized grouping in Action Queue

## Problem
`dedupedActions` in `src/app/pages/AppHygieneQueue.tsx` currently keys rows by `a.category || a.id`. When `category` is missing:
- It silently falls back to row `id`, mixing two keyspaces.
- Uncategorized rows can never be batch-dismissed together.
- A future category string colliding with an `id` would incorrectly merge unrelated rows.

## Fix (single file: `src/app/pages/AppHygieneQueue.tsx`)

### 1. Make consolidation strictly category-based
Replace the `dedupedActions` useMemo so only rows with a non-empty `category` get merged. Rows missing a category go into a separate bucket.

```ts
const { categorized, uncategorized } = useMemo(() => {
  const byCat = new Map<string, HygieneActionRow & { _duplicateCount?: number; _duplicateIds?: string[] }>();
  const uncat: HygieneActionRow[] = [];
  for (const a of actions) {
    const cat = (a.category || "").trim();
    if (!cat) { uncat.push(a); continue; }
    const existing = byCat.get(cat);
    if (!existing) byCat.set(cat, { ...a, _duplicateCount: 0, _duplicateIds: [] });
    else {
      existing._duplicateCount = (existing._duplicateCount || 0) + 1;
      existing._duplicateIds = [...(existing._duplicateIds || []), a.id];
    }
  }
  return { categorized: Array.from(byCat.values()), uncategorized: uncat };
}, [actions]);
```

`grouped` (the sorted list driving the main render) keeps using `categorized` exactly like today — no behavior change for normal rows.

### 2. New "Uncategorized actions" section
Below the main grouped list, render a collapsible card only when `uncategorized.length > 0`:

- Header row: "Uncategorized actions — N pending" + a single **Dismiss all** button that calls the existing `dismissDuplicates(uncategorized.map(u => u.id))` helper (already marks rows as `skipped`).
- Expanded body: a compact list of each uncategorized row showing `category_label || "(no category)"`, `affected_count`, `created_at`, plus a per-row **Dismiss** button (same handler with a single-id array).
- Styling matches existing cards (`bg-card border border-border rounded-xl`), with a muted heading so it reads as secondary to the main queue. No crimson — these aren't leak signals.

### 3. Empty state
Update the `grouped.length === 0` check to also consider `uncategorized.length === 0`, so the "No pending actions" card only shows when both are empty.

## Out of scope
- No DB schema changes.
- No edge function changes.
- No changes to sorting, execute/approve, or the existing per-category Dismiss badge.