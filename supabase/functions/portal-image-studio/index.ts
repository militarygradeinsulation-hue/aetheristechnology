// Rep / Partner image studio. Same capabilities as admin-image-studio but
// scoped to the authenticated rep (via portal token) and stored in
// rep_image_studio.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";

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
      const { data, error } = await supabase
        .from("rep_image_studio")
        .select("*")
        .eq("rep_code", repCode)
        .order("created_at", { ascending: false })
        .limit(200);
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
      if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);
      const rawPrompt = (body.prompt as string || "").trim();
      if (!rawPrompt) return json({ error: "prompt required" }, 400);
      if (rawPrompt.length > 6000) return json({ error: "prompt too long" }, 400);
      const model = (body.model as string) || "google/gemini-3.1-flash-image-preview";
      const sourceImageUrl = body.source_image_url as string | undefined;
      const aetherisStyle = !!body.aetheris_style;
      const infographic = !!body.infographic;
      const cartoon = !!body.cartoon_style;

      const AETHERIS_STYLE_SUFFIX = `\n\n--- AETHERIS BRAND STYLE ---\nRender in the Aetheris Technology forensic brand style:\n- Dark charcoal background (near-black, hsl 220 15% 8%) with subtle noise/grain\n- Primary accent: warm amber/gold (#E8A33D / hsl 38 78% 57%) used for highlights, edges, signal\n- Crimson (#C8102E) reserved ONLY for "leak" / damage / alert signal — sparingly\n- Forensic case-file aesthetic: redaction bars, blueprint lines, manila-folder edges, dossier feel\n- Editorial / investigative tone — never corporate-glossy, never AI-guru gradient, never neon\n- High contrast, cinematic shadows, hard amber rim-light\n- Typography (if any): serif (Fraunces) or monospace (JetBrains Mono) only\n- Bottom-right watermark text: "Aetheris AI Studio" small, amber, monospace, low opacity\nSubject:`;

      const INFOGRAPHIC_SUFFIX = `\n\n--- INFOGRAPHIC LAYOUT ---\nDesign as a single-image infographic suitable for sharing with a business prospect:\n- Clear visual hierarchy with a bold headline at the top\n- 3-5 numbered or icon-led data points / steps stacked vertically\n- Stats or numbers rendered LARGE and legible (no fake/garbled text)\n- Use minimal, crisp typography — every word must be readable, no lorem-ipsum\n- Square or 4:5 portrait composition, social-share friendly\nTopic to visualize:`;

      const CARTOON_SUFFIX = `\n\n--- EDITORIAL CARTOON STYLE ---\nRender as a hand-drawn editorial / op-ed style cartoon illustration:\n- Bold ink linework with confident black outlines, slightly imperfect (human-drawn feel)\n- Limited muted palette: cream/off-white paper background, charcoal black ink, ONE warm amber/gold spot color (#E8A33D) for emphasis, sparing crimson (#C8102E) only for alert/leak signal\n- Cross-hatching and stippling for shading instead of gradients\n- Slightly exaggerated, satirical character proportions — New Yorker / Wall Street Journal op-ed vibe\n- Single-panel composition with clear visual metaphor for the business idea\n- Optional small caption or label in handwritten serif (NO long blocks of text, NO speech bubbles unless requested)\n- Bottom-right watermark "Aetheris AI Studio" small, amber, low opacity\n- NEVER cute/Pixar/anime/Disney — this is editorial newspaper cartoon, witty and sharp\nSubject:`;

      const IMAGE_NUDGE = "Generate a single high-quality image. Subject:";
      let finalPrompt = `${IMAGE_NUDGE} ${rawPrompt}`;
      if (infographic) finalPrompt = `${INFOGRAPHIC_SUFFIX} ${rawPrompt}`;
      if (cartoon) finalPrompt = `${CARTOON_SUFFIX} ${rawPrompt}`;
      if (aetherisStyle) finalPrompt = `${AETHERIS_STYLE_SUFFIX} ${infographic ? INFOGRAPHIC_SUFFIX + " " : ""}${rawPrompt}`;

      const messages: any[] = [];
      if (action === "edit" && sourceImageUrl) {
        messages.push({
          role: "user",
          content: [
            { type: "text", text: finalPrompt },
            { type: "image_url", image_url: { url: sourceImageUrl } },
          ],
        });
      } else {
        messages.push({ role: "user", content: finalPrompt });
      }

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, modalities: ["image", "text"] }),
      });
      if (!aiRes.ok) {
        const t = await aiRes.text();
        if (aiRes.status === 429) return json({ error: "Rate limited. Try again shortly." });
        if (aiRes.status === 402) return json({ error: "AI credits exhausted." });
        return json({ error: `AI gateway (${aiRes.status}): ${t.slice(0, 400)}` });
      }
      const aiData = await aiRes.json();
      const dataUrl: string | undefined = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!dataUrl?.startsWith("data:image/")) {
        const textOut = aiData.choices?.[0]?.message?.content;
        return json({ error: `No image returned. ${typeof textOut === "string" ? textOut.slice(0, 300) : "Try a more visual prompt (describe what should be SHOWN)."}` });
      }

      const m = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/)!;
      const ext = m[1] === "jpeg" ? "jpg" : m[1];
      const bytes = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0));
      const path = `${PREFIX}/${repCode}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, {
        contentType: `image/${ext === "jpg" ? "jpeg" : ext}`, upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

      const { data: row, error: insErr } = await supabase.from("rep_image_studio").insert({
        rep_code: repCode,
        prompt: rawPrompt, url: pub.publicUrl, storage_path: path, model,
        source: action === "edit" ? "edited" : "generated",
        metadata: {
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
