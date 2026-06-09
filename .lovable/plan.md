# Operator-First Rewrite + Premium Bundles

Three jobs, in order: (1) scrub staff portals from public nav, (2) replace tool catalog with three operator-led bundles, (3) reframe site copy so the **operator** is the product, tools are the proof.

---

## 1. Hide staff portals from public nav

Pages, routes, edge functions, and DB stay intact. You and your team keep using `/admin`, `/portal`, `/staff` directly. Visitors get no breadcrumb to them.

- `src/components/Navbar.tsx` — remove any link to `/admin`, `/portal`, `/partner-portal`, `/staff`, `/careers`.
- `src/components/Footer.tsx` — same scrub. Remove "Careers", "Rep Portal", "Partner Login", "Admin".
- `src/pages/Home.tsx`, `src/components/Hero.tsx`, `src/components/Contact.tsx` — remove any rep/careers CTAs.
- `public/robots.txt` — disallow `/admin`, `/portal`, `/partner-portal`, `/staff`, `/careers`, `/careers-test`.
- `src/App.tsx` — keep routes mounted (direct URL still works). Just no link surface.
- `public/llms.txt` / `public/llms-full.txt` — drop any mention of careers/portal so the LLM crawl doesn't surface them.

No DB or edge-function changes. No data loss.

---

## 2. Three operator-led bundles — kill single-tool sales

### Bundle architecture

| Tier | Name | Price | Operator hours | What's in it |
|---|---|---|---|---|
| 1 | **Signal Pack** | $2,500 one-time | ~6 hrs operator-led | Website Report + Brand Contradiction Finder + Friction Vocabulary Audit. Operator runs all three, hands you a single Leak Findings memo + 30-min walkthrough call. |
| 2 | **Revenue Pack** | $5,000 one-time | ~14 hrs operator-led | Everything in Signal + Sales Script Pack + Follow-Up Plan + Strategic Question Engine + Content Calendar. Operator builds your outbound + nurture system, two 45-min working sessions. |
| 3 | **Operator Suite** | $10,000 one-time | ~30 hrs operator-led | Everything in Revenue + Strategy Blueprint + Social Content Pack + Digital Snapshot + Lead-Nurture Automation + Premium Tech Suite access. Operator embeds for 3 weeks, weekly calls, slack-style async. Credit toward Implementation Retainer. |

Flagships stay above the bundles as the "next step":
- **21-Day Revenue Diagnostic** — $18,500 (sales-led)
- **Implementation Retainer** — $15,000/mo (diagnostic clients only)

### Why pairing matters (rendered on each card)

Each bundle card shows a "These tools only work together because…" block — short forensic explanation of which leak each pairing closes. Example for Signal Pack: *"A website report without a brand-contradiction read tells you what's broken on the page but not why visitors don't believe you. Run alone, it under-delivers. Paired, it tells you exactly which sentence is leaking trust."*

### Catalog page changes

- `src/pages/CatalogPage.tsx` — delete the à la carte tool grid entirely. Replace with three bundle cards + the two flagships above. No "buy single tool" buttons anywhere.
- `src/components/PackageTiers.tsx` — rewrite to the three bundles above with operator-hours, included tools, pairing rationale, and a single "Talk to an operator" CTA per card (opens `ContactModal`, NOT Stripe checkout).
- `src/components/ServicesPricing.tsx` — page becomes operator-pitch + bundle summary, not a tool price list. Remove the greyed-out tech-suite grid.
- Individual tool pages (`/sales-scripts`, `/follow-up-plan`, etc.) — keep them live for SEO and rep use, but swap the "Buy now" CTA for "This tool is only sold as part of a bundle. Talk to an operator →".

### Stripe

No new products. Existing single-tool Stripe products stay registered (rep portal still uses them). Public site simply stops linking to checkout. Three new products created for the bundles:
- `signal_pack` — $2,500 one-time
- `revenue_pack` — $5,000 one-time
- `operator_suite` — $10,000 one-time

All three open `ContactModal` first (operator-qualifies), then operator sends a Stripe link manually. No public Buy button — preserves the "you can't just buy this" exclusivity.

---

## 3. Operator-first rewrite

The hero stops selling tools. It sells **a person who runs the tools for you**.

### Files rewritten

- `src/components/Hero.tsx` — new headline: *"You don't need more tools. You need an operator running them."* Sub: *"We pair you with a Business Forensics Operator who sits down with you, finds every leak, and fixes them — using a stack you'd take 18 months to assemble yourself."* Single CTA: "Meet your operator →" → `/operator` (new page).
- `src/pages/Home.tsx` — reorder sections: Operator pitch first, Leak Audit method second, Bundles third, Flagships fourth, Proof last. Remove anything that reads "buy the tool".
- `src/components/Services.tsx`, `src/components/ServiceCapabilities.tsx`, `src/components/ToolsCapabilities.tsx`, `src/components/WhatYouReallyGet.tsx` — reframe every "the tool does X" line into "your operator uses X to find Y leak". Tools become evidence of operator capability, not products.
- `src/pages/CapabilitiesPage.tsx` — keep the problem-first layout from the recent change, but every "solution" panel now says *"Your operator handles this using [tool]"* not *"Use [tool]"*.
- **New `src/pages/OperatorPage.tsx`** at route `/operator` — long-form: what an operator is, what a 30/60/90-day engagement looks like, the 12 tools they wield, why you can't buy the tools without them, single CTA → ContactModal.
- `src/components/Navbar.tsx` — primary nav becomes: Operator · Bundles · Method · Field Notes · Contact.

### Copy rules (applied across all rewrites)

- "Tool" never appears as a noun the buyer purchases. Tools are things the operator wields.
- Replace "Buy", "Get instant access", "Purchase" with "Talk to an operator" everywhere on public pages.
- Keep the forensic voice, crimson-for-leak-only rule, USD-only rule, all existing style memory.

---

## 4. Memory updates

- `mem://business/pricing` — replace tool-pack list with the three bundles + flagships. Note "tools never sold individually on public site".
- `mem://index.md` Core — add: *"Operator is the product. Tools are the operator's instruments, never sold à la carte publicly."*

---

## Out of scope

- No changes to `/admin`, `/portal`, rep commission math, leads board, training, time clock, smart subscriptions, AI coach — they all keep working, just no link surface.
- No auth changes. No email changes. No flagship pricing changes ($18.5k / $15k stay).
- Existing single-tool Stripe products stay registered (rep portal sells them internally).
- Blog/Field Notes gating stays as built last turn.

---

## Files touched (estimate)

**New:** `src/pages/OperatorPage.tsx`
**Rewritten:** `Hero.tsx`, `Home.tsx`, `Navbar.tsx`, `Footer.tsx`, `CatalogPage.tsx`, `PackageTiers.tsx`, `ServicesPricing.tsx`, `Services.tsx`, `ToolsCapabilities.tsx`, `WhatYouReallyGet.tsx`, `CapabilitiesPage.tsx`, `robots.txt`, `llms.txt`
**Touched (CTA swaps):** the 8 individual tool pages
**Stripe:** 3 new bundle products
**Memory:** index.md core line, pricing.md

Want me to build it?
