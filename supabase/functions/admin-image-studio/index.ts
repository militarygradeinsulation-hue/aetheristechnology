import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";
import {
  AETHERIS_VINTAGE_DETECTIVE,
  resolveAspect,
  vintageDetectivePrompt,
  VINTAGE_DETECTIVE_NEGATIVE,
} from "../_shared/visual-style-presets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const BUCKET = "content-images";
const STUDIO_PREFIX = "admin-studio";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const ok = await verifyAdminToken(getAdminTokenFromRequest(req), SERVICE_KEY);
    if (!ok) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "list") {
      const { data, error } = await supabase
        .from("admin_image_studio")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return json({ images: data || [] });
    }

    if (action === "list_all") {
      // Combined library: admin-side images + every rep portal image, newest first.
      const [adminRes, repRes] = await Promise.all([
        supabase.from("admin_image_studio").select("*").order("created_at", { ascending: false }).limit(300),
        supabase.from("rep_image_studio").select("*").order("created_at", { ascending: false }).limit(300),
      ]);
      if (adminRes.error) throw adminRes.error;
      if (repRes.error) throw repRes.error;
      const adminItems = (adminRes.data || []).map((r: any) => ({ ...r, source_table: "admin_image_studio", owner_label: "Admin" }));
      const repItems = (repRes.data || []).map((r: any) => ({ ...r, source_table: "rep_image_studio", owner_label: r.rep_code ? `Rep ${r.rep_code}` : "Rep" }));
      const merged = [...adminItems, ...repItems].sort(
        (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      return json({ images: merged });
    }

    if (action === "delete" || action === "delete_any") {
      const id = body.id as string;
      const sourceTable = (body.source_table as string) || "admin_image_studio";
      if (sourceTable !== "admin_image_studio" && sourceTable !== "rep_image_studio") {
        return json({ error: "invalid source_table" }, 400);
      }
      const { data: row } = await supabase.from(sourceTable).select("storage_path").eq("id", id).maybeSingle();
      if (row?.storage_path) {
        await supabase.storage.from(BUCKET).remove([row.storage_path]);
      }
      const { error } = await supabase.from(sourceTable).delete().eq("id", id);
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
      // Leonardo only accepts its own UUID model ids. Any other value (e.g. a
      // legacy gateway model slug like "google/gemini-...") falls back to Phoenix.
      const requestedModel = (body.model as string) || "";
      const isLeonardoModelId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedModel);
      const model = isLeonardoModelId ? requestedModel : LEONARDO_PHOENIX_MODEL_ID;
      const sourceImageUrl = body.source_image_url as string | undefined;
      const aetherisStyle = !!body.aetheris_style;
      const cartoon = !!body.cartoon_style;

      const AETHERIS_STYLE_SUFFIX = `\n\n--- AETHERIS BRAND STYLE ---\nRender in the Aetheris Technology forensic brand style:\n- Dark charcoal background (near-black, hsl 220 15% 8%) with subtle noise/grain\n- Primary accent: warm amber/gold (#E8A33D / hsl 38 78% 57%) used for highlights, edges, signal\n- Crimson (#C8102E) reserved ONLY for "leak" / damage / alert signal — sparingly\n- Forensic case-file aesthetic: redaction bars, blueprint lines, manila-folder edges, dossier feel\n- Editorial / investigative tone — never corporate-glossy, never AI-guru gradient, never neon\n- High contrast, cinematic shadows, hard amber rim-light\n- Typography (if any): serif (Fraunces) or monospace (JetBrains Mono) only\n- Bottom-right watermark text: "Aetheris AI Studio" small, amber, monospace, low opacity\nKeep composition clean and intentional. Subject:`;

      const CARTOON_PROMPT = (subject: string) => `Editorial op-ed newspaper cartoon, hand-inked single-panel political-cartoon illustration in the style of a New Yorker / Wall Street Journal editorial cartoonist. Subject: ${subject}. Bold confident black pen-and-ink linework with slightly imperfect human-drawn contours, cross-hatching and stippling for all shading (absolutely no gradients, no airbrush), cream/off-white newsprint paper background with visible paper tooth, charcoal-black ink, one warm amber-gold spot color (#E8A33D) for emphasis, tiny sparing crimson (#C8102E) only for an alert or leak signal. Satirical, slightly exaggerated character proportions. Clear single visual metaphor, generous negative space, witty and sharp. Small amber monospace watermark "Aetheris AI Studio" in the bottom-right corner.`;
      const CARTOON_NEGATIVE = "3d render, photorealistic, photograph, cgi, pixar, disney, anime, manga, chibi, cute, glossy, neon, digital painting, airbrush, smooth gradients, plastic, blurry, watermark clutter, extra limbs, deformed hands, gibberish text, speech bubbles";

      // Named visual style presets (shared with every other studio).
      const stylePreset = typeof body.style_preset === "string" ? body.style_preset : "";
      const isDetective = stylePreset === AETHERIS_VINTAGE_DETECTIVE;
      const aspect = resolveAspect(body.aspect_ratio, isDetective ? "4:5" : "1:1");

      const detectiveCopy = isDetective && body.copy && typeof body.copy === "object"
        ? body.copy as Record<string, string>
        : undefined;

      let finalPrompt = rawPrompt;
      if (isDetective) {
        finalPrompt = vintageDetectivePrompt(rawPrompt, {
          copy: detectiveCopy,
          aspect: aspect.ratioKey,
        });
      } else if (aetherisStyle) finalPrompt = `${AETHERIS_STYLE_SUFFIX} ${rawPrompt}`;
      else if (cartoon) finalPrompt = CARTOON_PROMPT(rawPrompt);
      if (action === "edit" && sourceImageUrl) {
        finalPrompt = `Edit the referenced image. ${finalPrompt}\n\nReference image URL: ${sourceImageUrl}`;
      }


      // Provider chain: cheapest-first (FLUX/Hugging Face -> Leonardo -> OpenAI).
      // An explicitly requested provider is tried first; the rest run as
      // automatic fallbacks so an exhausted quota never blocks a generation.
      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
      const requestedProvider = (body.provider as string) || "";
      const defaultOrder = cartoon
        ? ["flux", "leonardo", "openai"]
        : ["flux", "leonardo", "openai"];
      const order = [
        ...(requestedProvider ? [requestedProvider] : []),
        ...defaultOrder.filter((p) => p !== requestedProvider),
      ];

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
              negativePrompt: isDetective ? VINTAGE_DETECTIVE_NEGATIVE : cartoon ? CARTOON_NEGATIVE : undefined,
              width: aspect.width,
              height: aspect.height,
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
              negativePrompt: isDetective ? VINTAGE_DETECTIVE_NEGATIVE : cartoon ? CARTOON_NEGATIVE : undefined,
              width: aspect.width,
              height: aspect.height,
            });
            providerUsed = "leonardo";
            modelLabel = `leonardo:${gen.modelId}`;
          } else if (provider === "openai") {
            if (!OPENAI_API_KEY) continue;
            const oa = await import("../_shared/openai-image.ts");
            const out = await oa.generateImage({
              prompt: finalPrompt,
              apiKey: OPENAI_API_KEY,
              width: aspect.width,
              height: aspect.height,
            });

            gen = { ...out, generationId: null };
            providerUsed = "openai";
            modelLabel = `openai:${out.modelId}`;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[image-studio] ${provider} failed: ${msg}`);
          failures.push(`${provider}: ${msg.slice(0, 160)}`);
        }
      }

      if (!gen) {
        return json({ error: `All image providers failed — ${failures.join(" | ") || "none configured"}` }, 502);
      }



      const path = `${STUDIO_PREFIX}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${gen.ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, gen.bytes, {
        contentType: gen.contentType, upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

      const { data: row, error: insErr } = await supabase.from("admin_image_studio").insert({
        prompt: rawPrompt, url: pub.publicUrl, storage_path: path, model: modelLabel,
        source: action === "edit" ? "edited" : "generated",
        metadata: {
          provider: providerUsed,
          generation_id: gen.generationId ?? null,
          ...(action === "edit" ? { source_image_url: sourceImageUrl } : {}),
          aetheris_style: aetherisStyle,
          cartoon_style: cartoon,
          style_preset: stylePreset || null,
          aspect_ratio: aspect.ratioKey,
          copy: detectiveCopy ?? null,

        },
      }).select().single();
      if (insErr) throw insErr;

      // Mirror to rep library as SHARED so all reps see it in their banner library.
      if (body.share_to_reps) {
        await supabase.from("rep_image_studio").insert({
          rep_code: "SHARED",
          prompt: rawPrompt, url: pub.publicUrl, storage_path: path, model: modelLabel,
          source: action === "edit" ? "edited" : "generated",
          metadata: { shared_from_admin: true, is_banner: !!body.is_banner, provider: providerUsed },
        });
      }


      return json({ image: row });
    }

    if (action === "save_upload") {
      // body: { filename, content_type, base64, prompt? }
      const filename = (body.filename as string) || `upload-${Date.now()}.png`;
      const contentType = (body.content_type as string) || "image/png";
      const base64 = body.base64 as string;
      if (!base64) return json({ error: "base64 required" }, 400);
      const ext = (filename.split(".").pop() || "png").toLowerCase();
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const path = `${STUDIO_PREFIX}/upload-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const { data: row, error: insErr } = await supabase.from("admin_image_studio").insert({
        prompt: (body.prompt as string) || filename,
        url: pub.publicUrl, storage_path: path,
        source: "uploaded", metadata: { filename },
      }).select().single();
      if (insErr) throw insErr;
      return json({ image: row });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("admin-image-studio error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});
