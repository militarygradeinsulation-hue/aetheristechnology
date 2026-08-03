// Rep / Partner image studio. Same capabilities as admin-image-studio but
// scoped to the authenticated rep (via portal token) and stored in
// rep_image_studio.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";
import { consumeStudioQuota } from "../_shared/studio-quota.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-portal-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const BUCKET = "content-images";
const PREFIX = "rep-studio";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const claims = await verifyPortalToken(getPortalTokenFromRequest(req), SERVICE_KEY);
    if (!claims) return json({ error: "Unauthorized" }, 401);
    const repCode = claims.code;

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "list") {
      // Include this rep's images PLUS shared admin-pushed banners (rep_code='SHARED')
      const { data, error } = await supabase
        .from("rep_image_studio")
        .select("*")
        .in("rep_code", [repCode, "SHARED"])
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return json({ images: data || [] });
    }

    if (action === "delete") {
      const id = body.id as string;
      const { data: row } = await supabase
        .from("rep_image_studio")
        .select("storage_path, rep_code")
        .eq("id", id)
        .maybeSingle();
      if (!row || row.rep_code !== repCode) return json({ error: "Not found" }, 404);
      if (row.storage_path) {
        await supabase.storage.from(BUCKET).remove([row.storage_path]);
      }
      const { error } = await supabase.from("rep_image_studio").delete().eq("id", id);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "generate" || action === "edit") {
      const LEONARDO_API_KEY = Deno.env.get("LEONARDO_API_KEY");
      const HF_TOKEN = Deno.env.get("HF_TOKEN");
      if (!LEONARDO_API_KEY && !HF_TOKEN && !Deno.env.get("OPENAI_API_KEY")) {
        return json({ error: "No image provider configured" }, 500);
      }


      const { generateImage, LEONARDO_PHOENIX_MODEL_ID, LEONARDO_ILLUSTRATION_MODEL_ID } = await import("../_shared/leonardo.ts");

      const rawPrompt = (body.prompt as string || "").trim();
      if (!rawPrompt) return json({ error: "prompt required" }, 400);
      if (rawPrompt.length > 2000) return json({ error: "prompt too long (max 2000 chars)" }, 400);
      // Daily per-rep cap — stops runaway credit use.
      const quota = await consumeStudioQuota(
        SERVICE_KEY, SUPABASE_URL, repCode,
        action === "edit" ? "image_edit" : "image_generate",
      );
      if (!quota.ok) return json({ error: quota.error, limit: quota.limit, used: quota.used }, 429);
      // Leonardo only accepts its own UUID model ids. Any other value (e.g. a
      // legacy gateway model slug like "google/gemini-...") falls back to Phoenix.
      const requestedModel = (body.model as string) || "";
      const isLeonardoModelId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedModel);
      const model = isLeonardoModelId ? requestedModel : LEONARDO_PHOENIX_MODEL_ID;
      const sourceImageUrl = body.source_image_url as string | undefined;
      const aetherisStyle = !!body.aetheris_style;
      const infographic = !!body.infographic;
      const cartoon = !!body.cartoon_style;

      const AETHERIS_STYLE_SUFFIX = `\n\n--- AETHERIS BRAND STYLE ---\nRender in the Aetheris Technology forensic brand style:\n- Dark charcoal background (near-black, hsl 220 15% 8%) with subtle noise/grain\n- Primary accent: warm amber/gold (#E8A33D / hsl 38 78% 57%) used for highlights, edges, signal\n- Crimson (#C8102E) reserved ONLY for "leak" / damage / alert signal — sparingly\n- Forensic case-file aesthetic: redaction bars, blueprint lines, manila-folder edges, dossier feel\n- Editorial / investigative tone — never corporate-glossy, never AI-guru gradient, never neon\n- High contrast, cinematic shadows, hard amber rim-light\n- Typography (if any): serif (Fraunces) or monospace (JetBrains Mono) only\n- Bottom-right watermark text: "Aetheris AI Studio" small, amber, monospace, low opacity\nSubject:`;

      const INFOGRAPHIC_SUFFIX = `\n\n--- INFOGRAPHIC LAYOUT ---\nDesign as a single-image infographic suitable for sharing with a business prospect:\n- Clear visual hierarchy with a bold headline at the top\n- 3-5 numbered or icon-led data points / steps stacked vertically\n- Stats or numbers rendered LARGE and legible (no fake/garbled text)\n- Use minimal, crisp typography — every word must be readable, no lorem-ipsum\n- Square or 4:5 portrait composition, social-share friendly\nTopic to visualize:`;

      const CARTOON_PROMPT = (subject: string) => `Editorial op-ed newspaper cartoon, hand-inked single-panel political-cartoon illustration in the style of a New Yorker / Wall Street Journal editorial cartoonist. Subject: ${subject}. Bold confident black pen-and-ink linework with slightly imperfect human-drawn contours, cross-hatching and stippling for all shading (absolutely no gradients, no airbrush), cream/off-white newsprint paper background with visible paper tooth, charcoal-black ink, one warm amber-gold spot color (#E8A33D) for emphasis, tiny sparing crimson (#C8102E) only for an alert or leak signal. Satirical, slightly exaggerated character proportions. Clear single visual metaphor, generous negative space, witty and sharp. Small amber monospace watermark "Aetheris AI Studio" in the bottom-right corner.`;
      const CARTOON_NEGATIVE = "3d render, photorealistic, photograph, cgi, pixar, disney, anime, manga, chibi, cute, glossy, neon, digital painting, airbrush, smooth gradients, plastic, blurry, watermark clutter, extra limbs, deformed hands, gibberish text, speech bubbles";

      let finalPrompt = rawPrompt;
      if (aetherisStyle) {
        finalPrompt = `${AETHERIS_STYLE_SUFFIX} ${rawPrompt}${infographic ? `\n\n${INFOGRAPHIC_SUFFIX} ${rawPrompt}` : ""}`;
      } else if (infographic) {
        finalPrompt = `${INFOGRAPHIC_SUFFIX} ${rawPrompt}`;
      } else if (cartoon) {
        finalPrompt = CARTOON_PROMPT(rawPrompt);
      }
      if (action === "edit" && sourceImageUrl) {
        finalPrompt = `Edit the referenced image. ${finalPrompt}\n\nReference image URL: ${sourceImageUrl}`;
      }

      // Provider chain: cheapest-first (FLUX/Hugging Face -> Leonardo -> OpenAI).
      // An explicitly requested provider is tried first; the rest run as
      // automatic fallbacks so an exhausted quota never blocks a generation.
      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
      const requestedProvider = (body.provider as string) || "";
      const order = [
        ...(requestedProvider ? [requestedProvider] : []),
        ...["flux", "leonardo", "openai"].filter((p) => p !== requestedProvider),
      ];
      const imgWidth = infographic ? 832 : 1024;
      const imgHeight = infographic ? 1216 : 1024;

      let gen: any;
      let providerUsed = "";
      let modelLabel = "";
      const failures: string[] = [];

      for (const provider of order) {
        if (gen) break;
        try {
          if (provider === "flux") {
            if (!HF_TOKEN) continue;
            const hf = await import("../_shared/hf-image.ts");
            const out = await hf.generateImage({
              prompt: finalPrompt,
              apiKey: HF_TOKEN,
              negativePrompt: cartoon ? CARTOON_NEGATIVE : undefined,
              width: imgWidth,
              height: imgHeight,
            });
            gen = { ...out, generationId: null };
            providerUsed = out.provider;
            modelLabel = `hf:${out.modelId}`;
          } else if (provider === "leonardo") {
            if (!LEONARDO_API_KEY) continue;
            gen = await generateImage({
              prompt: finalPrompt.slice(0, 1450),
              apiKey: LEONARDO_API_KEY,
              modelId: cartoon ? LEONARDO_ILLUSTRATION_MODEL_ID : model,
              presetStyle: cartoon ? "ILLUSTRATION" : undefined,
              negativePrompt: cartoon ? CARTOON_NEGATIVE : undefined,
              width: imgWidth,
              height: imgHeight,
            });
            providerUsed = "leonardo";
            modelLabel = `leonardo:${gen.modelId}`;
          } else if (provider === "openai") {
            if (!OPENAI_API_KEY) continue;
            const oa = await import("../_shared/openai-image.ts");
            const out = await oa.generateImage({
              prompt: finalPrompt,
              apiKey: OPENAI_API_KEY,
              width: imgWidth,
              height: imgHeight,
            });
            gen = { ...out, generationId: null };
            providerUsed = "openai";
            modelLabel = `openai:${out.modelId}`;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[portal-image-studio] ${provider} failed: ${msg}`);
          failures.push(`${provider}: ${msg.slice(0, 160)}`);
        }
      }

      if (!gen) {
        return json({ error: `All image providers failed — ${failures.join(" | ") || "none configured"}` }, 502);
      }


      const path = `${PREFIX}/${repCode}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${gen.ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, gen.bytes, {
        contentType: gen.contentType, upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

      const { data: row, error: insErr } = await supabase.from("rep_image_studio").insert({
        rep_code: repCode,
        prompt: rawPrompt, url: pub.publicUrl, storage_path: path, model: modelLabel,
        source: action === "edit" ? "edited" : "generated",
        metadata: {
          provider: providerUsed,
          generation_id: gen.generationId ?? null,
          ...(action === "edit" ? { source_image_url: sourceImageUrl } : {}),
          aetheris_style: aetherisStyle,
          infographic,
          cartoon_style: cartoon,
        },
      }).select().single();
      if (insErr) throw insErr;

      return json({ image: row });
    }

    if (action === "save_upload") {
      const filename = (body.filename as string) || `upload-${Date.now()}.png`;
      const contentType = (body.content_type as string) || "image/png";
      const base64 = body.base64 as string;
      if (!base64) return json({ error: "base64 required" }, 400);
      // Limit size ~12MB base64
      if (base64.length > 16_000_000) return json({ error: "file too large" }, 400);
      const ext = (filename.split(".").pop() || "png").toLowerCase();
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const path = `${PREFIX}/${repCode}/upload-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const { data: row, error: insErr } = await supabase.from("rep_image_studio").insert({
        rep_code: repCode,
        prompt: (body.prompt as string) || filename,
        url: pub.publicUrl, storage_path: path,
        source: "uploaded", metadata: { filename },
      }).select().single();
      if (insErr) throw insErr;
      return json({ image: row });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("portal-image-studio error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});
