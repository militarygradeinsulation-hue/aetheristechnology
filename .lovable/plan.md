# Make Lead Scoring Make Sense

Right now the system has **two different scores** (scrape-time + website-time), **three different tier thresholds** (80/60/40, 75/50, A–F), and the breakdown is buried in a popover. Reps don't know which number to trust or what to do with it. This plan unifies it.

---

## The new mental model — one score, two stages

Every lead has ONE number: **Lead Score 0–100**. What changes is the **confidence stage** behind it:

```text
Stage 1: TRIAGE      → score from contact info + industry/geo/pain    (always present)
Stage 2: AUDIT       → score from website signals + gaps              (after scan)
Stage 3: VERIFIED    → score after a rep touches it                   (future, optional)
```

Reps see one number. A small badge says which stage it came from. No more "is this the scrape score or the website score?"

---

## Changes

### 1. One unified tier scale (used everywhere)

| Score | Tier | What rep does |
|---|---|---|
| 80–100 | 🔥 HOT — call today | Phone first |
| 60–79 | 🟡 WARM — this week | Email + LinkedIn |
| 40–59 | ⚪ WORTH A SHOT | Templated outreach |
| 0–39 | ⬇ SKIP / nurture | Back to pool |
| `?` | INSUFFICIENT EVIDENCE | Manual look |

Replaces the three inconsistent threshold sets in `LeadsBoard.tsx`.

### 2. Stage badge on every lead card

Next to the score: `TRIAGE`, `AUDIT`, or `VERIFIED` in mono micro-label (case-file style). Hover = "Score based on contact data only. Run the website scan to upgrade."

### 3. Plain-English "what this means" line

Under the score, always one sentence pulled from the lowest-earning + highest-earning components, e.g.:

> "Strong industry fit and direct email, but no case studies or proof of authority."

Generated deterministically from the `parts` array — no AI call.

### 4. Redesigned breakdown card (replaces current popover)

Each component as a row with `earned / weight`, a mini bar, and a one-line *what this measures*:

```text
Contactability         12 / 15   ████████████░░░  phone + email + form + calendar
Industry leverage      15 / 15   ███████████████  priority industry for Aetheris
Revenue band            6 / 10   ██████░░░░░░░░░  $500k–$2M
Gap severity load       2 / 10   ██░░░░░░░░░░░░░  few real problems surfaced — score capped
...
TOTAL                  68 / 100  WARM
```

Add a "Why this score?" link that opens an info drawer with the full rubric (built from the same constants in `lead-scoring.ts` so docs can't drift).

### 5. Single source of truth in the codebase

- Add `tierFromScore(score)` to `supabase/functions/_shared/lead-scoring.ts` and a mirror in `src/lib/leadScoring.ts`.
- Delete the duplicate `scoreTier()` and tier branches inside `LeadsBoard.tsx`.
- Add `explainScore(parts)` returning the plain-English line.
- Stage field saved on the lead row: `score_stage: 'triage' | 'audit' | 'verified'`.

### 6. Admin Leads view gets the same UI

The admin lead views currently show raw numbers. Use the same `<LeadScoreBadge />` component so admin + rep + portal all read identically.

### 7. Info doc

A short `/docs/lead-scoring` style modal (admin + rep can both open it) explaining the rubric in plain language. Pulled from the same constants. One source, one explanation.

---

## Technical details

**Files to edit:**
- `supabase/functions/_shared/lead-scoring.ts` — add `tierFromScore`, `explainScore`, export rubric metadata (label + description per component).
- `src/lib/leadScoring.ts` (new) — frontend mirror of `tierFromScore` + `explainScore`.
- `src/components/LeadScoreBadge.tsx` (new) — score + tier + stage badge.
- `src/components/LeadScoreBreakdown.tsx` (new) — bar-style component rows + info drawer.
- `src/components/portal/LeadsBoard.tsx` — remove duplicate tier logic, use new components.
- `src/components/crm/*` admin lead views — swap raw score for `<LeadScoreBadge />`.
- `supabase/functions/admin-scrape-leads/index.ts`, `portal-scrape-leads/index.ts`, `admin-enrich-lead/index.ts`, `scan-website/index.ts`, `extension-leak-scan/index.ts` — set `score_stage` on write.
- Migration: add `score_stage text` column to `rep_leads` (and admin lead tables) with default `'triage'`.

**Out of scope (ask before doing):**
- Reweighting the rubric itself.
- A new "Verified" stage logic (column added, but no UI flow yet).
- Backfilling stage on historical leads (will default to `'triage'`; audit-stage backfill is a separate script).

---

## What you'll see after

- One number per lead. Same tier names everywhere.
- A stamp telling you *how confident* that number is (TRIAGE / AUDIT / VERIFIED).
- A one-sentence reason underneath.
- A clean breakdown showing exactly where points came from and where they didn't.
- An info drawer that reads the rubric directly from code — so the explanation can never go stale.

No business logic changes to the scoring math itself. Just clarity, consistency, and one source of truth.
