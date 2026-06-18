## Goal

Upgrade the **Analyze** mode of the Outreach Email tool (used in the Rep & Partner Portal and Admin Studio) so a critique returns a **0–100 score**, a breakdown across the dimensions that actually determine whether an email lands, an explicit **trigger-word scan**, and a **guard meter** that judges how "sold-to" the reader will feel.

Today the tool returns a letter grade + free-form problems. That's vibes. We want a measurable, repeatable scorecard that hard-penalizes the exact language patterns that make prospects shut down.

---

## What changes

### 1. Edge function `supabase/functions/outreach-email-creator/index.ts`

Extend ONLY the `analyze` mode. Create/rewrite/subjects/linkedin_intro stay untouched.

**`CRITIQUE_SYSTEM_PROMPT` rewrite** — bake in the full do/don't catalog so the model scores against a known rubric, not its own taste:

- **Hard trigger words (auto -5 each, capped at -25)** — words/phrases that pattern-match to spam, pitch decks, or LinkedIn-guru cringe and instantly raise a prospect's guard:
  `just checking in`, `circling back`, `touching base`, `hop on a call`, `quick call`, `quick chat`, `15 minutes`, `30 minutes`, `synergy`, `leverage` (as verb), `unlock`, `revolutionary`, `game-changer`, `cutting-edge`, `world-class`, `best-in-class`, `ROI`, `solution`, `solutions`, `value-add`, `value prop`, `partner` (as verb), `partnership opportunity`, `exclusive offer`, `limited time`, `act now`, `don't miss out`, `special discount`, `pick your brain`, `I hope this finds you well`, `I hope you're doing well`, `Dear Sir/Madam`, `To whom it may concern`, `As per my last email`, `per our conversation`, `Congratulations on…` (generic), `loved your post` (generic flattery), `huge fan`, `impressive work`, `passionate`, `disrupting`, `paradigm`, `transformative`, `holistic`, `seamless`, `robust`, `scalable solution`, `at scale`, `move the needle`, `boil the ocean`, `low-hanging fruit`, `take this offline`, `bandwidth`, `align`, `alignment`, `book a demo`, `schedule a demo`, `our platform`, `our software`, `our solution`.
- **Sales-y phrases (auto -3 each)** — anything that screams "I want to sell you something" in the first 3 sentences: mentioning your company in line 1, mentioning a product/service before line 4, asking for a meeting before showing you understand them, generic compliment openers.
- **Guard-raising patterns (auto -4 each)** — false urgency, presumptive language ("when we work together"), name-drops without consent, fake personalization (`{firstName}` leaks, wrong company), passive-aggressive follow-ups ("did you see my last email?"), CTA stacking (more than one ask), gated curiosity ("I have something to share…").

The prompt teaches the model the **psychology rule**: an email that keeps the guard low reads peer-to-peer, leads with a specific observation about THEM (not us), earns the right to ask anything by being useful first, and has exactly one low-friction ask phrased as a question, not a demand.

**`ANALYZE_TOOL` schema additions** (extend `parameters.properties`, add to `required`):

```ts
total_score: { type: "integer", minimum: 0, maximum: 100 },
score_bar: { type: "string", enum: ["danger", "weak", "decent", "strong", "elite"] },
pillars: {
  type: "array",
  minItems: 6, maxItems: 6,
  items: {
    type: "object",
    properties: {
      key:   { type: "string", enum: ["opener", "specificity", "guard_low", "clarity", "ask", "tone_fit"] },
      label: { type: "string" },
      score: { type: "integer", minimum: 0, maximum: 20 },
      max:   { type: "integer", enum: [10, 15, 20] },
      note:  { type: "string", description: "One blunt sentence on why this score." },
    },
    required: ["key","label","score","max","note"],
    additionalProperties: false,
  },
},
trigger_words_found: {
  type: "array",
  items: {
    type: "object",
    properties: {
      phrase:    { type: "string", description: "Exact phrase quoted from the draft." },
      category:  { type: "string", enum: ["spam_trigger","sales_jargon","guard_raiser","fake_flattery","false_urgency","corporate_filler"] },
      why_bad:   { type: "string" },
      swap_with: { type: "string", description: "Concrete replacement the rep can paste in." },
    },
    required: ["phrase","category","why_bad","swap_with"],
    additionalProperties: false,
  },
},
guard_meter: {
  type: "object",
  properties: {
    level: { type: "string", enum: ["low","medium","high","hostile"] },
    why:   { type: "string", description: "Why the reader's guard will sit there." },
    fix:   { type: "string", description: "One concrete way to lower the guard." },
  },
  required: ["level","why","fix"],
  additionalProperties: false,
},
```

Pillar weights (max field): opener 20, specificity 20, guard_low 20, clarity 15, ask 15, tone_fit 10 → 100 total.

**Server-side enforcement** (post-process the model response, do not trust the score alone):
- Recompute `total_score = sum(pillars[i].score)` clamped 0–100.
- Run the trigger-word catalog as a regex pass on `pastedText`. Any matches the model missed get auto-appended to `trigger_words_found` with a default `swap_with` from a constant `TRIGGER_LIBRARY`. Each unique trigger over zero deducts 5 from `total_score` (floored at 0).
- Derive `score_bar`: 85+ elite, 70–84 strong, 55–69 decent, 35–54 weak, <35 danger.
- Keep all existing `stripDashes` cleanup on returned strings, also strip dashes from new fields.

### 2. Frontend `src/components/OutreachEmailCreator.tsx`

Update the `Analysis` interface and the analyze result panel only. No changes to the form, the other modes, or auto-fill.

New display order (replaces today's single grade chip):

1. **Score header** — big 0–100 number, colored by `score_bar` (danger=crimson, weak=amber/70, decent=amber, strong=emerald, elite=emerald glow). Letter grade kept as a small badge next to it for continuity.
2. **Pillar bars** — 6 stacked horizontal bars (label, `score/max`, note). Color matches earned ratio. Uses existing border/bg token palette (`bg-emerald-500/15`, `bg-amber/15`, `bg-crimson/15`).
3. **Guard meter** — pill (low=emerald, medium=amber, high=crimson, hostile=crimson with pulse). Shows `why` + `fix`.
4. **Trigger words found** — table-ish list grouped by category. Each row: red-struck `phrase` → arrow → green `swap_with`, plus `why_bad`. Empty state: "No trigger words detected. Guard stays down."
5. Existing **Subject critique**, **Problems**, **What works**, **Rewritten body**, **Next moves** sections render below, unchanged.

Saved tool runs (`saveToolRun`) include the new fields automatically because the whole `analysis` blob is already what gets persisted.

### 3. No DB / no migrations / no new env vars

Pure prompt + schema + UI work. Existing auth (admin token OR portal token) unchanged.

---

## Out of scope

- The Create / Rewrite / Subjects / LinkedIn Intro modes (untouched).
- LinkedIn Comment Generator, Reply Composer, AI Coach.
- Persisting historical scores or building a leaderboard.
- The Chrome extension and the Mobile App cockpit.

---

## Files

- **Edit** `supabase/functions/outreach-email-creator/index.ts` — new system prompt section, expanded `ANALYZE_TOOL` schema, regex trigger-word catalog + post-processing.
- **Edit** `src/components/OutreachEmailCreator.tsx` — extend `Analysis` interface, replace the verdict header block, add Pillars / Guard / Trigger Words sections above existing critique sections.
