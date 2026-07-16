# Plan: Harden AI Gateway calls against timeouts

## Problem
18+ requests each to `google/gemini-3-flash-preview` and `google/gemini-2.5-flash` returned "Signal timed out" (503) on 2026-07-15. The preview model appears unstable and the current AbortSignal timeouts are too aggressive across 13 edge functions.

## Affected functions
`admin-assistant`, `admin-insights`, `aetheris-nexus-chat`, `book-writer`, `content-assistant`, `forensic-report-chat`, `generate-content-calendar`, `generate-hashtags`, `linkedin-comment-generate`, `linkedin-post-respond`, `rep-assistant`, `sales-chat`, `scan-website`.

## Proposed changes
1. Create a shared helper `supabase/functions/_shared/aiGateway.ts` exporting `callAiGateway({ system, user, jsonMode, maxTokens })` that:
   - Tries a fallback chain: `google/gemini-2.5-flash` (stable primary, 25s) → `google/gemini-3-flash-preview` (20s) → `google/gemini-2.5-flash-lite` (15s).
   - Uses longer per-attempt AbortSignal timeouts.
   - Surfaces the final error with model + status details.
2. Refactor each of the 13 functions to import and use the helper, removing hardcoded `google/gemini-3-flash-preview` and per-file timeout constants.
3. Swap the primary model to the stable `google/gemini-2.5-flash` (preview reserved as fallback), matching the Lovable AI catalog defaults.
4. Deploy all 13 functions.

## Risks
- Behavioral changes in 13 features — verify each still returns expected shape (some expect JSON mode).
- Longer timeouts increase Edge Function wall time and cost.

## Validation
- Deploy, then hit each function with a smoke request.
- Watch AI gateway logs for renewed timeout rate over 24h.
