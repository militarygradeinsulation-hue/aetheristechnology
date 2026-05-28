
## Goal

Bake the reasoning style shown in the user's example + 3 screenshots into every piece of Aetheris-generated writing (posts, comments, replies, blogs, emails, rep coaching). The pattern is consistent: surface read → deeper forensic reframe → named mechanism → quantified operational drag → revenue recovery verdict.

## What changes

### 1. Update the master voice spec
`supabase/functions/_shared/contentBlueprint.ts` → extend `AETHERIS_FORENSIC_OPERATOR_VOICE` with a new section: **"THE DEEPER-READ MOVE"**.

Add this as a required reasoning layer on top of the existing 4-Part Architecture (REFRAME → ANCHOR → MECHANISM → VERDICT):

- **Surface read acknowledgment** (1 sentence): "That's the version most people land on." / "The framing here is X." / "The acquisition playbook sounds clean until…" — names the obvious read without endorsing it.
- **Deeper read pivot** (1 sentence): "The deeper read is…" / "The forensic version of this is different." / "The real failure is not X. It is Y." — pivots to the structural diagnosis.
- **Named contradiction/mechanism**: must name a *branded concept* — Brand Contradiction, Governance Vacuum, Signal Compression, Decision Latency, Process Debt, Single Point of Failure Dressed in Revenue, Information Architecture Failure, Handoff Gap.
- **Quantified drag**: every deeper-read must include a % or $ or time-range cost ("up to 30% drag on internal mobility," "36 to 48 hours of decision latency," "6 to 9 months discovering the leak").
- **Revenue Recovery close**: verdict locates where the money is hiding — "the Revenue Recovery lies in [delta]."

### 2. Update the writing blueprint memory
`.lovable/memory/marketing/aetheris-writing-blueprint.md` → add a "Deeper-Read Move" subsection under the 4-Part Architecture, with the 4 example reframes from the screenshots as canonical exemplars:

- VP/retention → "Retention is not a people problem. It is an information architecture failure."
- Acquisition → "The deal is never the hard part. The diagnostic is."
- Sales drag → "The rep is not the failure point. The rep is the receipt for a system that was never architected to scale."
- Talent/VP role → "Identifying the exact delta between internal brand promise and architectural reality is where the Revenue Recovery lies."

### 3. Expand the lexicon
`.lovable/memory/marketing/aetheris-lexicon.md` → add the new named mechanisms so generators reuse them: Brand Contradiction, Governance Vacuum, Signal Compression, Decision Latency, Process Debt, Single Point of Failure Dressed in Revenue, Information Architecture Failure, Operational Waste, Revenue Recovery.

### 4. Update the index
`.lovable/memory/index.md` → bump the "LinkedIn Voice Playbook" Core line to mention the Deeper-Read Move + Revenue Recovery close, so it's enforced on every generation.

## What does NOT change

- No UI changes.
- No new edge functions. The blueprint is imported by every existing generator (`generate-posts-from-source`, blog generator, playbook, drip emails, rep coach), so updating the shared constant propagates everywhere automatically.
- No DB migrations.

## Files touched

- `supabase/functions/_shared/contentBlueprint.ts` (edit `AETHERIS_FORENSIC_OPERATOR_VOICE` + `FORENSIC_BLUEPRINT_PROMPT`)
- `.lovable/memory/marketing/aetheris-writing-blueprint.md`
- `.lovable/memory/marketing/aetheris-lexicon.md`
- `.lovable/memory/index.md`

## Verification

After the edit, generate one test post via the admin Post Studio using a generic source and confirm the output contains: (1) surface-read acknowledgment, (2) "deeper read" pivot, (3) a named branded mechanism, (4) a quantified drag figure, (5) a Revenue Recovery verdict ≤15 words.
