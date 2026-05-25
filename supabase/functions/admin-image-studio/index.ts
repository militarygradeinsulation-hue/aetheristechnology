import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

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
      if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);
      const rawPrompt = (body.prompt as string || "").trim();
      if (!rawPrompt) return json({ error: "prompt required" }, 400);
      const model = (body.model as string) || "google/gemini-3.1-flash-image-preview";
      const sourceImageUrl = body.source_image_url as string | undefined;
      const aetherisStyle = !!body.aetheris_style;
      const cartoon = !!body.cartoon_style;

      const AETHERIS_STYLE_SUFFIX = `\n\n--- AETHERIS BRAND STYLE ---\nRender in the Aetheris Technology forensic brand style:\n- Dark charcoal background (near-black, hsl 220 15% 8%) with subtle noise/grain\n- Primary accent: warm amber/gold (#E8A33D / hsl 38 78% 57%) used for highlights, edges, signal\n- Crimson (#C8102E) reserved ONLY for "leak" / damage / alert signal — sparingly\n- Forensic case-file aesthetic: redaction bars, blueprint lines, manila-folder edges, dossier feel\n- Editorial / investigative tone — never corporate-glossy, never AI-guru gradient, never neon\n- High contrast, cinematic shadows, hard amber rim-light\n- Typography (if any): serif (Fraunces) or monospace (JetBrains Mono) only\n- Bottom-right watermark text: "Aetheris AI Studio" small, amber, monospace, low opacity\nKeep composition clean and intentional. Subject:`;

      const CARTOON_SUFFIX = `\n\n--- EDITORIAL CARTOON STYLE ---\nRender as a hand-drawn editorial / op-ed style cartoon illustration:\n- Bold ink linework with confident black outlines, slightly imperfect (human-drawn feel)\n- Limited muted palette: cream/off-white paper background, charcoal black ink, ONE warm amber/gold spot color (#E8A33D) for emphasis, sparing crimson (#C8102E) only for alert/leak signal\n- Cross-hatching and stippling for shading instead of gradients\n- Slightly exaggerated, satirical character proportions — New Yorker / Wall Street Journal op-ed vibe\n- Single-panel composition with clear visual metaphor for the business idea\n- Optional small caption or label in handwritten serif (NO long blocks of text, NO speech bubbles unless requested)\n- Bottom-right watermark "Aetheris AI Studio" small, amber, low opacity\n- NEVER cute/Pixar/anime/Disney — this is editorial newspaper cartoon, witty and sharp\nSubject:`;

      const IMAGE_NUDGE = "Generate a single high-quality image. Subject:";
      const finalPrompt = aetherisStyle
        ? `${AETHERIS_STYLE_SUFFIX} ${rawPrompt}`
        : cartoon
          ? `${CARTOON_SUFFIX} ${rawPrompt}`
          : `${IMAGE_NUDGE} ${rawPrompt}`;

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
      const path = `${STUDIO_PREFIX}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, {
        contentType: `image/${ext === "jpg" ? "jpeg" : ext}`, upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

      const { data: row, error: insErr } = await supabase.from("admin_image_studio").insert({
        prompt: rawPrompt, url: pub.publicUrl, storage_path: path, model,
        source: action === "edit" ? "edited" : "generated",
        metadata: { ...(action === "edit" ? { source_image_url: sourceImageUrl } : {}), aetheris_style: aetherisStyle, cartoon_style: cartoon },
      }).select().single();
      if (insErr) throw insErr;

      // Mirror to rep library as SHARED so all reps see it in their banner library.
      if (body.share_to_reps) {
        await supabase.from("rep_image_studio").insert({
          rep_code: "SHARED",
          prompt: rawPrompt, url: pub.publicUrl, storage_path: path, model,
          source: action === "edit" ? "edited" : "generated",
          metadata: { shared_from_admin: true, is_banner: !!body.is_banner },
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
