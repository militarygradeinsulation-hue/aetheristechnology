# Tighten Lead Scoring + Make It Legible to Reps

## Why scores cluster at 45
Every score today is whatever the LLM feels like returning. We give it `score: 0-100` with vague guidance, no rubric, no required sub-signals. LLMs default to safe middles (40–55) and the same model keeps landing on **45**. There is no math, no anchor, no evidence trail.

Three functions all do this:
- `scan-website` (deep website scan, score from AI freeform)
- `admin-scrape-leads` + `portal-scrape-leads` (score during prospect scraping)
- `admin-enrich-lead` (re-scores after enrichment)

## Fix: deterministic rubric, AI only returns signals

Stop asking the AI for a score. Ask it for observable **signals**, then compute the score in code with fixed weights. Same inputs → same score, every time. Reps can read the breakdown.

### A. Website scan rubric (out of 100)
Replace the single `score` field in the `website_diagnostic_report` tool with a `signals` object the model must fill from evidence, plus we compute totals server-side.

```text
Signal                              Weight  Source
----------------------------------  ------  -------------------------------------
Contactability (phone+email+form)     15    AI booleans: has_phone, has_email,
                                            has_contact_form, has_calendar_link
Lead capture quality (CTA, gated)     10    AI 0-5: cta_strength, lead_magnet_present
Messaging clarity (value prop)        10    AI 0-5: value_prop_clarity
Content depth / authority             10    AI 0-5: content_depth, has_case_studies
SEO hygiene (title, meta, schema)     10    AI booleans summed
Mobile + speed signals                 5    AI booleans (uses_responsive, fast_paint)
Brand consistency                      5    AI 0-5
Industry leverage for Aetheris        15    AI enum: high/med/low fit for forensic ops
Revenue band (ability to pay)         10    AI enum: <500k / 500k-2M / 2M-10M / 10M+
Gap severity load (inverse)           10    Computed: critical gaps hurt, but a site
                                            with ZERO findings also gets 0 here
                                            (no evidence = no score)
```

Score = sum of weighted sub-scores, clamped 0–100. Grade = A 85+, B 70+, C 55+, D 40+, F <40.

Hard rules in code (not the prompt):
- If `gaps.length < 4` AND no contact info detected → cap at 35 ("LOW EVIDENCE").
- If site fetch failed / content < 500 chars → return `score: null` with reason `"insufficient_evidence"` instead of guessing 50.
- No more `analysis = { score: 50 ... }` default.

### B. Scrape-time rubric (out of 100, before any deep scan)
For `admin-scrape-leads` + `portal-scrape-leads`, drop AI `score` from the tool schema. Compute from what we actually have:

```text
+25 has website (required to keep at all)
+15 has direct email
+10 has phone
+10 has named contact (not "info@")
+10 industry in priority list (operations-heavy SMB verticals)
+10 location matches rep's target geo (if provided)
+10 business-size signal in why_fit (employee count, revenue band, multi-location)
+10 explicit pain signal in why_fit (hiring ops, growth complaint, manual process)
```
No middle defaults. Score 0–100, integers, deterministic.

### C. Enrichment re-score (`admin-enrich-lead`)
Same signals contract as A. If the enrichment AI cannot fill the signals (low-info site), leave `score` null and mark `confidence: 'low'` — never overwrite an existing scrape score with a junk 45.

## Make reps understand the score

Add a **"How leads are scored"** panel inside `LeadsBoard.tsx`'s existing score tooltip/modal:

- Plain rubric table (the weights above, rep-friendly wording).
- Tier bands restated: 80+ HOT, 60–79 WARM, 40–59 WORTH A SHOT, <40 SKIP.
- For each lead with a score, show the actual sub-scores when available (read from `scan.signals` / `enrichment.signals` JSON we now persist).
- One line at the top: *"Every score is math, not vibes. Lower scores aren't broken leads — they're leads with less evidence yet."*

Also add a single-paragraph "Scoring system" entry to `InterviewBriefingPanel.tsx` so it shows up in the rep briefing/FAQ.

## Files to change (build phase)
- `supabase/functions/scan-website/index.ts` — swap tool schema, add `computeScore(signals, gaps)`, kill the `score: 50` default.
- `supabase/functions/admin-scrape-leads/index.ts` + `supabase/functions/portal-scrape-leads/index.ts` — remove AI `score`, add `computeScrapeScore(lead)`.
- `supabase/functions/admin-enrich-lead/index.ts` — switch prompt + schema to `signals`, compute in code, allow null.
- `src/components/portal/LeadsBoard.tsx` — extend score modal with rubric + per-lead sub-score breakdown; pass `signals` through.
- `src/components/portal/InterviewBriefingPanel.tsx` — add Scoring entry.

## Out of scope
- No DB migration: signals ride inside existing `enrichment` / `scan` JSON columns.
- No changes to detective mode, drip cadence, lead actions, or pricing.
- No retroactive rescoring of historical leads (new scans only; old `45`s stay until rescanned).

## Verification
- Hit `scan-website` on 3 real domains: confirm scores differ, none equal 45, low-info site returns null, breakdown matches weights.
- Hit `portal-scrape-leads` with a fake context: confirm two leads with different contact data get clearly different scores.
- Open LeadsBoard score modal: confirm rubric renders, sub-scores show for newly scanned leads.
