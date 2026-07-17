
## Goal
Reprice the tool suite to premium anchors, hide operator-only tools from the public shop, and keep the Golden Report as a "$3,500 included" line inside the $18,500 Full Leak Investigation (never sold standalone).

## 1. Client-facing tools — new stated value AND new checkout price

| Tool | New price (Stripe + UI) |
|---|---|
| Website Leak Scanner | $250 |
| Brand Contradictions | $250 |
| Friction Audit | $250 |
| Strategic Questions | $250 |
| AI Readiness Checklist | $250 |
| Detective Mode | $500 |
| Forensic Scan (All) | $1,500 |
| Golden Report | $3,500 (**never sold** — appears only as value-stack line inside the $18,500 Investigation) |

Retire the flat "$40 single / $100 triple / $1,000 all-access" pricing model on the public shop. Each client-facing tool becomes its own priced unlock. Keep an "All Client-Facing Access — $2,500" bundle for anyone who wants the whole evidence kit at once.

## 2. Operator tools — hidden from public catalog

Removed from `SHOP_TOOLS` (public) but preserved as internal-only in `repProducts.ts` for direct rep sales:

- **Reports (internal):** Head-to-Head, Prospect Intel · Nexus IQ, Resume Forensics, Reciprocation Gift
- **Sales:** Sales Scripts, Follow-Up Sequences, LinkedIn Playbook
- **Content (9):** All-In-One Content, Content Calendar Builder, Playbook Generator, Social Content Studio, Content Engine, Image Studio, Creation Studio, Easy Mode, Tool Generator

These stay in `REP_PRODUCTS` flagged `legacy: true` / `internalOnly: true` so rep POS and direct links keep working; they disappear from `/tools-shop`, `TryToolPage` buy bars, `LeakMindMap` shop buttons, and marketing copy.

## 3. Stripe product changes

Create new Stripe prices via `payments--batch_create_product`:

- `tool_website_scanner_lifetime` — $250
- `tool_brand_contradictions_lifetime` — $250
- `tool_friction_audit_lifetime` — $250
- `tool_strategic_questions_lifetime` — $250
- `tool_ai_checklist_lifetime` — $250
- `tool_detective_mode_lifetime` — $500
- `tool_forensic_scan_all_lifetime` — $1,500
- `tool_evidence_kit_bundle` — $2,500 (all client-facing tools)

Legacy `tool_single_lifetime` / `tool_triple_lifetime` / `tool_unlimited_lifetime` remain in Stripe for redemption of already-issued codes, but no UI surfaces them for new purchase.

## 4. Files touched

- `src/lib/tool-shop-catalog.ts` — trim `SHOP_TOOLS` to 8 client-facing tools, per-tool `priceId` + `amount`, drop `SHOP_PRICES` single/triple/unlimited in favor of per-tool prices + evidence-kit bundle.
- `src/lib/repProducts.ts` — mark operator tools `internalOnly: true`, update shop entries to new prices.
- `src/pages/TryToolPage.tsx` — replace "$40 / $100" buy bar with per-tool price; block operator-tool pages from public buy UI.
- `src/pages/ToolsShopRedeemPage.tsx` — copy update.
- `src/components/ToolBuyBar.tsx` — dynamic per-tool price.
- `src/components/BuyToolDialog.tsx` — dynamic per-tool price.
- `src/components/LeakMindMap.tsx` — remove "$40 lifetime" chips on operator tools; show new price on client-facing tools; Golden Report card shows "$3,500 · included in Full Leak Investigation" (no buy button).
- `src/pages/GoldenReportPage.tsx` — add "$3,500 deliverable, included in the $18,500 Full Leak Investigation" line; remove any standalone buy path.
- `src/pages/TechSolutionsPage.tsx` meta description — new price line.
- Any lingering "$40 / $100 / $1,000" copy on marketing pages.

Careers/test pricing ($40 test, $500 license) is **unchanged** — that's a different product family.

## 5. Verification
- Grep for `$40`, `$100`, `$1,000 all-access`, `tool_single_lifetime`, `tool_triple_lifetime`, `tool_unlimited_lifetime` after edits.
- Load `/tools-shop` in preview — confirm only 7 tools show with new prices, Golden Report appears as "included, not for sale".
- Build passes.
