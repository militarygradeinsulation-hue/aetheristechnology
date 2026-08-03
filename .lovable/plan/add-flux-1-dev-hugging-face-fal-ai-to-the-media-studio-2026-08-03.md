# Add FLUX.1-dev (Hugging Face / fal-ai) to the Media Studio

Yes — that snippet can be wired in. Hugging Face's Inference router exposes an HTTP endpoint that the backend can call directly (no Python needed), routed to the `fal-ai` provider running `black-forest-labs/FLUX.1-dev`. FLUX is much stronger than Leonardo Phoenix at hand-drawn / editorial ink illustration, which is exactly the look that has been missing.

## What changes for you

- A **provider picker** appears in both the Admin Media Studio and the Rep Media Studio: **Leonardo** (current) or **FLUX.1-dev (Hugging Face)**.
- **Editorial Cartoon** defaults to FLUX when the Hugging Face token is present, and silently falls back to Leonardo if FLUX is unavailable — so nothing ever breaks.
- Generated FLUX images save into the same library, with the same download / edit / animate / share-to-reps actions. Model is labeled on each saved image so you can tell which engine produced it.
- Motion/animation stays on Leonardo (FLUX is image-only).

## What I need from you

A Hugging Face access token (`HF_TOKEN`) with Inference permissions, stored as a backend secret. I'll request it during the build.

## Technical detail

1. **New secret**: `HF_TOKEN`.
2. **New shared module** `supabase/functions/_shared/hf-image.ts`:
   - `generateImage({ prompt, negativePrompt, apiKey, width, height, model })`
   - POSTs to `https://router.huggingface.co/fal-ai/...` (HF Inference router, `text-to-image` task) with `Authorization: Bearer $HF_TOKEN`.
   - Returns the same shape the Leonardo helper returns — `{ bytes, contentType, ext, modelId }` — so the callers stay unchanged apart from provider selection.
   - Handles the 503 "model loading" case with a bounded retry, and throws a clear error on failure.
3. **`supabase/functions/admin-image-studio/index.ts`** and **`portal-image-studio/index.ts`**:
   - Read `body.provider` (`"leonardo" | "flux"`); default to `flux` for `cartoon_style` when `HF_TOKEN` exists, else `leonardo`.
   - Keep the existing cartoon prompt and negative prompt (FLUX honors negative prompts through fal).
   - Store `model: "hf:black-forest-labs/FLUX.1-dev"` and `metadata.provider = "huggingface"` on the row; upload path and storage bucket unchanged.
   - Wrap FLUX in try/catch and fall back to the existing Leonardo path on error.
4. **`src/components/admin/AdminImageStudio.tsx`** and **`src/components/portal/RepImageStudio.tsx`**: add the provider select next to the existing model select; hide the Leonardo model list when FLUX is selected; pass `provider` in the invoke body.
5. Deploy both edge functions and verify with one cartoon generation end to end.
