## Diagnosis (verified, not guessed)

The scan is collecting real evidence. It's the AI writing layer that is failing, so every chapter falls back to canned text.

Verified facts:

1. **Evidence exists.** `forensic_scans` rows for `www.odoo.com` (latest 2026-07-28 13:24Z) have `raw_findings` of ~46 KB — the crawler, friction audit, and companion audits all worked.
2. **Every report since 2026-07-27 16:35Z starts with** `"Odoo was scanned across every forensic tool in the Aetheris stack…"` — that string only exists in `fallbackReport()` in `supabase/functions/forensic-scan-all/index.ts` (line ~534). Same for "standard SMB leak math", "public profile", "Ranges shown are floors". The last genuinely AI-written report is Khan Pediatrics on 2026-07-24 — i.e. before the RouteLLM migration.
3. **Abacus is dead.** Live call to `https://routellm.abacus.ai/v1/chat/completions` with `grok-4.3` returns HTTP 400: `{"success": false, "error": "You have no remaining credits to use the LLM apis."}`. Function logs match: ~15 consecutive `[ai-router] Abacus 400, falling back to Lovable` per scan. The migration is not misparsing anything — the provider is simply out of credits, so 100% of traffic hits the fallback.
4. **The Lovable fallback then fails too.** Logs for the 13:24Z Odoo scan show all 14 chapters failing, in two flavors:
   - `AbortError: The signal has been aborted` at `_shared/ai-router.ts:56` — the per-call timeout firing.
   - `chapter <slug> synth failed: empty result` — a 200 response with empty `message.content`.
5. **Why:** `heavy` tier now maps to `google/gemini-2.5-pro`. A trivial 2,200-token JSON call to that model measured **16 seconds**. `synthesizeOneChapter` sends ~28 KB of findings and calls `aiJson(prompt, 2200, 24_000)` — a **24-second** budget — and fires **15 of them in parallel** against one gateway. Pro is a reasoning model: thinking tokens are billed against `max_tokens`, so long prompts either exceed 24s (AbortError) or return `finish_reason: length` with empty content (empty result). Either way `synthesizeReport` swaps in `fb.chapters`, and the summary swaps in `fb.executive_summary`.

**Root cause:** two independent regressions stacking — Abacus RouteLLM has zero credits so it never serves a request, and the Lovable fallback model/timeout pairing (`gemini-2.5-pro` @ 24s, 2,200 max_tokens, 15-way parallel) cannot complete a chapter. The fallback report is doing exactly what it was designed to do; it's just doing it every single time.

Not the cause: input data (46 KB of real findings), JSON parsing (`aiJson` has a regex salvage path), the sanitizer, the PDF renderer, or schema/tool calls (none are used here).

## Fix plan

**A. Make the router honest about a dead provider — `supabase/functions/_shared/ai-router.ts`**
- Detect the "no remaining credits" 400 (and any Abacus 4xx auth/billing error) and set a module-level circuit breaker so the remaining 14 calls of a scan skip Abacus entirely instead of each burning a round trip.
- Change the `heavy` Lovable fallback from `google/gemini-2.5-pro` to `google/gemini-2.5-flash` (fast, non-reasoning-heavy, reliably returns content), keeping Pro available via `lovableModelOverride` for callers that want it.
- Treat a 200-with-empty-content from Lovable as a failure and retry once with a larger token budget, so "empty result" can't silently become boilerplate.

**B. Give chapter synthesis room to finish — `supabase/functions/forensic-scan-all/index.ts`**
- Raise the per-chapter timeout from 24s to ~55s and the summary to ~60s (the outer watchdog already covers the total).
- Stagger the 15 parallel calls into 2–3 waves so one gateway isn't hit with 15 simultaneous large-prompt requests.
- Add one retry per chapter on abort/empty before falling back.

**C. Make fallback visible instead of silent**
- Record a `synth_fallback` flag plus the failure reason per chapter into `stage_status`, and surface a small "degraded — AI synthesis unavailable" marker in the admin scan view. A report that is 100% template should never look identical to a real one again.

**D. Decide the Abacus question (needs your input)**
- Either top up the Abacus RouteLLM account, or set `AI_ROUTER_DISABLE=1` so every function goes straight to Lovable without the wasted round trip. Fixes A–C work either way; this only affects cost.

**E. Verify**
- Re-run a scan against `odoo.com`, then confirm in the DB that `report->>'executive_summary'` no longer begins with "…was scanned across every forensic tool" and that chapter text quotes real findings, plus check the function logs are clean of AbortError/empty-result.

## Technical notes
- Affected: `supabase/functions/_shared/ai-router.ts` (`MODEL_MAP`, `routedChatCompletion`, `extractMessage`), `supabase/functions/forensic-scan-all/index.ts` (`aiJson`, `synthesizeOneChapter`, `synthesizeSummary`, `synthesizeReport`).
- Other functions on the shared router (`admin-assistant`, `assistant-chat`, `rep-assistant`, `diagnose-whats-wrong`, `generate-system-deliverable`, `handle-drip-replies`, `generate-sales-scripts`) are silently paying the same Abacus-400 penalty and will benefit from A; they need redeploying alongside.
- No database migration required.
