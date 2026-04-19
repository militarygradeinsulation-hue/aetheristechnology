
The audit moved from 35 → 55. Six new contradictions, three are HIGH priority. Here's the focused fix plan — no scope creep, only what the audit actually flagged.

## What I'll fix

### 1. HIGH — Harmonize voice to consistent "we" (Co-CEO partner)
Audit flagged inconsistent "I" vs "we" pronouns. Since brand position is "Co-CEO partnership," lean into **"we"** sitewide.

**Files:** `Hero.tsx` (headline + italic quote), `ContactForm.tsx`, `Home.tsx` TL;DR, `WhatsWrongDiagnostic.tsx`, `WhyUs.tsx`, `Services.tsx`, `ThePitch.tsx`, `AboutPage.tsx` — replace "I fix", "I'll tell you", "With me you're paying" with "we" equivalents. Keep blunt tone, just plural.

### 2. HIGH — Soften aggressive headline (still direct, less accusatory)
Current: *"Your brand is losing customers because it looks outdated and your systems can't keep up."*

New (in `Hero.tsx`): *"Most brands are quietly losing revenue to outdated digital presence and systems that can't keep up. We expose it — then fix it."*

Keeps the pain-point sharpness, removes the finger-pointing "your."

### 3. HIGH — Streamline the "no fluff" promise (consolidate tools)
16 tool cards on the home page contradicts "no fluff." Two-part fix:

- **`FreeTools.tsx`** — Show only the **top 6 tools** on the home page (Business Diagnostic, Website Scanner, Marketing Hub, AI Consultant, Sales Compass, Strategic Questions). Add a "View All Capability Demonstrations →" link that routes to a new `/capabilities` page (or reuses `/resources`) showing all 16.
- **`WhatsWrongDiagnostic.tsx`** — Reduce 6 selections to 4 most consequential, or group them into 2 categories ("Brand & Digital" / "Operations & Systems").

### 4. HIGH — Add social proof scaffolding (per brand rules: no fake testimonials)
Brand memory FORBIDS fake testimonials. So instead of inventing social proof, build the **scaffolding** that lets you add real proof later, plus surface what already exists:

- **New section on `AboutPage.tsx` / `Home.tsx`** — "Verifiable Outcomes" with 3 anonymized, quantified case-study tiles (industry + metric only, e.g. *"Healthcare SMB: 38% reduction in manual intake time, 14-day diagnostic"*). These come from your real engagements — I'll add placeholders flagged with `// TODO: replace with real anonymized client outcome` so you can fill them in.
- **`CEOProfile.tsx`** — Strengthen the credentialing block (years of experience, domains, certifications) since the "we" is currently you-led.
- **No fake logos, no fake quotes, no testimonials carousel.** Just a structured space for real outcomes.

### 5. MODERATE — Reframe diagnostic pricing as "investment tiers"
Audit said upfront $750/$7,500 anchors value low. Pricing memory locks the numbers, so only copy changes:

- **`ServicesPricing.tsx`** — Above the diagnostic tiles, add a small framing line: *"Strategic engagement begins with a foundational diagnostic — investment scaled to scope of inquiry."*
- Move the dollar number to the **bottom right** of each tile (smaller, less "menu price" feel) and lead with the **outcome** (e.g., "Rapid Strategic Evaluation" as the headline, "$750 investment" as a footer line).
- Change "FOUNDATIONAL" badge to "FOUNDATIONAL ENGAGEMENT" in serif-style amber.

### 6. MODERATE — Visual sophistication pass on key sections
Audit called the "Full-Spectrum AI Consulting Capabilities" and tool-card sections "visually busy." Tighten without rebuilding:

- **`ServiceCapabilities.tsx`** — Increase whitespace between cards (gap-6 → gap-8), reduce icon sizes slightly, use a single accent color per card instead of multiple amber pulses.
- **`FreeTools.tsx` cards** — Remove the always-on `glass-shine` shimmer (keep on hover only), reduce per-card visual noise. Tighter typographic hierarchy: smaller eyebrow, larger title, more breathing room.
- **`Hero.tsx`** — Three CTAs is one too many. Demote "See the Diagnostic" to a small text link below the two primary CTAs.

## Out of scope
- No price changes (pricing memory is locked)
- No fake testimonials/logos/quotes (brand rule)
- No background canvas changes
- No removal of tools — only re-surfacing

## Files touched
- `src/components/Hero.tsx` — voice + headline + CTA hierarchy
- `src/components/ContactForm.tsx` — voice
- `src/components/WhatsWrongDiagnostic.tsx` — voice + reduce options
- `src/components/WhyUs.tsx`, `ThePitch.tsx`, `Services.tsx` — voice
- `src/components/FreeTools.tsx` — show 6 on home, link to all; reduce shimmer
- `src/components/ServiceCapabilities.tsx` — whitespace + visual restraint
- `src/components/ServicesPricing.tsx` — investment-tier reframing
- `src/components/CEOProfile.tsx` — credential block
- `src/pages/Home.tsx` — TL;DR voice + "Verifiable Outcomes" section
- `src/pages/AboutPage.tsx` — Verifiable Outcomes scaffolding
- New: `src/pages/CapabilitiesPage.tsx` (full 16-tool index) + route in `App.tsx`

## Expected score impact
55 → 80+. The three HIGH items (voice, headline, tool consolidation) drive most of the lift. Social proof scaffolding caps the credibility gap without violating the no-fake-testimonials rule.

<lov-actions>
<lov-suggestion message="Approved — implement all 6 fixes. Use 'we' sitewide, soften the headline, surface only 6 tools on home with a /capabilities page for the full 16, reduce the WhatsWrong options to 4, add Verifiable Outcomes scaffolding with TODO placeholders for me to fill in real anonymized case studies, reframe diagnostic pricing copy, and tighten the visual sophistication on capabilities + tool cards.">Approve all 6 fixes</lov-suggestion>
<lov-suggestion message="Approve fixes 1, 2, 3, 5, 6 — but skip the Verifiable Outcomes scaffolding for now. I'll add real case studies later from a clean slate.">Skip social proof scaffolding</lov-suggestion>
<lov-suggestion message="Keep using 'I' — lean into the solo expert authority instead of pivoting to 'we'. Apply all other fixes (headline, tool consolidation, pricing reframe, visual restraint, social proof scaffolding).">Keep 'I' voice, lean solo-expert</lov-suggestion>
<lov-suggestion message="Show all 16 tools on home page — don't move them to a separate /capabilities page. Apply all other fixes.">Keep all 16 tools on home</lov-suggestion>
</lov-actions>
