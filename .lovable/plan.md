# Update chatbot pricing + answer email question

## Am I sending those emails?
**No.** I do not send email. I only edit code in this project. Emails going out from `aetheris.technology` / `businessforensics.tech` are sent by the app itself — the Lovable Cloud email queue + edge functions (`send-transactional-email`, `auth-email-hook`, `process-email-queue`, subscription/onboarding senders, etc.) — using templates and triggers already wired into the codebase. If a message went out at 8:30 PM to `andrel@ezbreathe.com`, it came from one of those app flows (or from you sending manually from your inbox), not from me. I can show which function/template produced any given send if you forward the message.

## Current pricing (authoritative, per project memory)
- **Free:** Leak Audit self-scan at `/leak-audit`
- **21-Day Revenue Diagnostic — $18,500 flat** (credited 1:1 toward the Retainer)
- **Implementation Retainer — $15,000/month, 3-month minimum** (Diagnostic clients only)

## Old prices to purge everywhere the chatbot can see
- `$2,500` Forensic Diagnostic
- `$7,500` 14-Day Operational Systems Diagnostic
- `$750` Rapid Evaluation
- `$25,000+` Custom Implementation
- Any "14-Day Diagnostic" framing

## The chatbot itself (`supabase/functions/sales-chat`)
Already hard-blocks quoting any dollar figure and any product/tier name. **No edit needed to the system prompt.** However, it injects live page context and page copy into the model, so stale prices on the page can leak through. Fix = scrub the pages/content the bot reads.

## Files to update

1. **`src/components/seo/seoContent.ts`** — rewrite `CORE_LEAK_FACTS` and `LEAK_AUDIT_FAQS` to reflect the two current offers only:
   - Replace every `$2,500 Forensic Diagnostic` with `$18,500 21-Day Revenue Diagnostic`.
   - Remove the `$7,500 14-Day Operational Systems Diagnostic` fact + FAQ entirely (retired offer).
   - Update `/implementation` retainer FAQ to keep `$15,000/mo, 3-mo min`, credited from the $18,500 Diagnostic.
   - Update the "How do I start?" FAQ to two paths: free self-scan, or the $18,500 Diagnostic.
   - Remove the "à la carte $79–$400 tools" FAQ (retired per `llms.txt`).
   - Update the "confidential / equity / ownership / sample report" answers to stay accurate under the new offer set.

2. **`src/pages/AIConsultantPage.tsx`** — line 20 FAQ: replace `"Rapid Evaluation $750, 14-Day Diagnostic $7,500, or Custom Implementation $25,000+"` with `"21-Day Revenue Diagnostic ($18,500 flat) or the $15,000/month Implementation Retainer"`.

3. **Grep sweep** for any remaining `2,500`, `7,500`, `750`, `25,000+`, `Rapid Evaluation`, `14-Day Diagnostic`, `Operational Systems Diagnostic` in `src/pages/*` (WhyUsPage, ServicesPage, MethodologyPage, ImplementationPage, DiagnosticPage, ResourcesPage, GlossaryPage, LocationPage, CaseStudiesPage, CapabilitiesPage, Home, SalesCompassPage) and rewrite to `$18,500 / $15,000/mo`. Leave `src/lib/repProducts.ts`, `repToolTips.ts`, `problemGroups.ts` alone unless they reference the retired flagship prices — I'll inspect and only touch flagship refs.

4. **Optional hard guard in `sales-chat`** — add `$2,500`, `$7,500`, `$750`, `$25,000`, `Rapid Evaluation`, `14-Day Diagnostic` to the existing forbidden-token list so even if stale copy is fed as context, the bot cannot echo it. Keep the existing "no pricing in chat" rule intact.

## Out of scope
- No changes to email templates, cron, queues, or send logic.
- No changes to Stripe products/prices.
- No design or layout changes.

## Verification
- `rg -n "2,500|7,500|\\$750|25,000\\+|Rapid Evaluation|14-Day Diagnostic|Operational Systems Diagnostic" src/ supabase/functions/` returns zero hits after edits (allowlist: none).
- Load `/ai-consultant` and `/leak-audit`, open the chat, ask "how much does it cost?" — bot still refuses to quote and offers the booking link (unchanged behavior).
