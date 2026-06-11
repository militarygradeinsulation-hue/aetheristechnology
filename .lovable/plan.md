
## Goal

Make every AI-discoverability surface tell the same truth as `supabase/functions/_shared/aetheris-knowledge.ts`. Right now `public/llms.txt`, `public/llms-full.txt`, and the JSON-LD in `index.html` still advertise retired offers ($2,500 Forensic Diagnostic, $7,500 14-Day, $1,500/mo Oversight, $25K Custom, $50–$400 rendering). Meta AI / ChatGPT / Perplexity scrape these and contradict the chatbots.

No new pages, no un-retired tools, no Phase 2/3 Meta work. Pure cleanup.

## Identity decisions (locked in by your answers)

- **Primary domain:** `https://aetheris.technology` (businessforensics.tech stays as `alternateName` + `sameAs`)
- **Physical address:** Noblesville, IN (was Indianapolis 46204) — `addressLocality` only; SEO `areaServed` keeps Indianapolis/Carmel/Fishers/etc.
- **Founder facts:** add USMCR Lance Corporal (E-3), MOS 0621 Field Wireman; Liberty University MS Marketing candidate.
- **Current offers (the only two):**
  - 21-Day Revenue Diagnostic — $18,500 flat (price_id `diagnostic_21day_once`)
  - Implementation Retainer — $15,000/mo, 3-mo minimum (price_id `implementation_retainer`)

## Files to change

### 1. `index.html` — JSON-LD blocks
- **Organization/LocalBusiness block** (lines 52–182):
  - `address.addressLocality` → "Noblesville", `postalCode` → "46060", geo → 40.0456/-86.0086.
  - `description` rewritten to current offers ($18,500 Diagnostic + $15K/mo Retainer).
  - `priceRange` → `"$15,000 - $18,500"`.
  - `alternateName` adds `"Business Forensics"`.
  - `sameAs` adds `"https://businessforensics.tech"`.
  - `hasOfferCatalog` collapsed to one `OfferCatalog` ("Engagements") with the two real offers (correct prices, `priceCurrency: USD`). Strategy/Technology/Marketing sub-catalogs removed — they don't reflect what we sell.
- **FAQPage block** (lines 201–249): replace the 5 Q&As with current ones — "What is Aetheris?", "What is the 21-Day Revenue Diagnostic?", "What is the Implementation Retainer?", "How much does Aetheris cost?", "Does Aetheris serve businesses outside Indiana?". Update `dateModified` to 2026-06-11.
- **Service @graph** (lines 252–295): replace the two stale Services with `21-Day Revenue Diagnostic` ($18,500) and `Implementation Retainer` ($15,000, `priceSpecification` UnitPriceSpecification billingDuration P1M).
- **Add a new Person block** (founder authority) at the bottom of the head: Joseph Toney, jobTitle "Business Forensics Operator", `description` with the verified credentials (USMCR Lance Corporal MOS 0621, MS Marketing candidate Liberty University, 20 years building revenue systems, former Director of Strategy at $25M aerospace firm), `sameAs` LinkedIn + ctoguy.ai, `worksFor` → `@id` of the Organization.
- Hero `<meta name="description">` / og:description / twitter:description sweep: any line that still references "$2,500 Forensic Diagnostic" gets rewritten to the two real offers.

### 2. `public/llms.txt` — full rewrite (62 lines)
New structure:
```
# Aetheris (Business Forensics)
> One-paragraph factual summary: Business Forensics Operator …
> Public offers: 21-Day Revenue Diagnostic ($18,500 flat) and
> Implementation Retainer ($15,000/month, Diagnostic clients only).

## Engagements
- 21-Day Revenue Diagnostic — $18,500 — /diagnostic
- Implementation Retainer — $15,000/mo (Diagnostic clients only) — /implementation

## Methodology
- The Leak Audit — /leak-audit
- Full methodology — /methodology
- Why Aetheris — /why-us

## Free tools  (kept — these are real free utilities, not retired paid offers)
…existing list, unchanged except link sanity check

## About
- About / Operator bio — /about
- Credentials — /credentials
- Field Notes (blog) — /blog
- News — /news
- Indianapolis service area — /indianapolis
- Noblesville HQ — /noblesville  (only if page exists; otherwise omit)
```
Removed: "$7,500 14-Day Operational Diagnostic", "$1,500/mo Ongoing Digital Oversight", "$25,000+ Custom Implementation", and the `services` URL line that points to that catalog.

### 3. `public/llms-full.txt` — same rewrite, expanded
- Replace the offer section with the canonical block from `aetheris-knowledge.ts` (Engagements + commission model context is optional — recommend leaving commission internal).
- Update operator bio paragraph to include the USMCR/MOS/Liberty facts.
- Add a "What we no longer sell" line listing retired offers so scrapers stop surfacing them as current.
- Bump `Last updated:` to 2026-06-11.

### 4. Memory cleanup (small but important)
Project memory Core still says `"Forensic Diagnostic $2,500 flat, applied toward engagement"` — that's the source of half of these stale references. Update `mem://index.md` Core line to point to the two current offers, and refresh `mem://business/pricing`. Without this, the next AI surface I generate will re-introduce the stale price.

## Out of scope (per your answer)

- Phase 2 (Meta Page, IG, reviews, catalog), Phase 3 (Business AI agent, click-to-message ads), Phase 4 weekly content loop — these are off-platform operator work.
- Bing Webmaster / IndexNow setup — you do this in Bing's UI, not code.
- Un-retiring the $39–$349 tool catalog (you explicitly chose NOT to).
- No new routes, no UI changes, no edge functions touched.

## Verification

- `rg -n "2,500|7,500|1,500/mo|14-Day Operational|Forensic Diagnostic" index.html public/llms*.txt` returns zero hits when done.
- `rg -n "18,500|15,000" index.html public/llms*.txt` shows the new offers in all three files.
- Paste both JSON-LD blocks into Google's Rich Results test (you do this; I can't from the sandbox) — expect 0 errors.
- Optional: trigger an SEO scan after the change so the AEO panel re-baselines.
