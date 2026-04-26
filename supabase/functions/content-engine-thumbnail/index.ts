// Content Engine Thumbnail Generator
// Uses OpenAI gpt-image-1 with operator headshot as image-to-image reference.
// Admin-token gated via the same shared HMAC pattern as content-engine-generate.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_SECRET = SERVICE_KEY;

const FORMAT_PRESETS: Record<string, { tag: string; mood: string; accent: string; label: string }> = {
  auditRoast:    { tag: "executive_dark", mood: "interrogation room, harsh single overhead light, sharp shadows", accent: "crimson red (#DC143C)", label: "AUDIT ROAST" },
  patternReveal: { tag: "boardroom",      mood: "boardroom evidence wall, warm desk lamp, papers pinned with red string", accent: "amber gold (#F59E0B)", label: "PATTERN REVEAL" },
  founderPOV:    { tag: "field_notes",    mood: "industrial warehouse at dusk, atmospheric haze, warm practical lights", accent: "amber gold (#F59E0B)", label: "FIELD NOTES" },
  counterTake:   { tag: "analyst",        mood: "vintage library archive, deep shadows, brass desk lamp", accent: "yellow gold (#FBBF24)", label: "COUNTER-TAKE" },
};

function buildPrompt(post: any, accent: string, mood: string, label: string) {
  const hook = (post.hook || post.topic_angle || "").slice(0, 140);
  return `Cinematic editorial portrait poster, FORENSIC CASE FILE aesthetic.

SUBJECT: Use the reference photo as the EXACT person. Preserve their face, hair, beard, and build precisely. Reposition them three-quarter angle, looking directly at camera with serious operator expression. Subject occupies left third of the frame.

ENVIRONMENT: ${mood}. Deep cinematic black background (#0a0a0a) with subtle film grain.

DESIGN OVERLAY (right two-thirds of frame):
- Top-left small badge: monospaced uppercase text "CASE FILE // ${label}" in ${accent} on dark
- Large bold serif headline (Playfair Display style, all caps): "${hook.toUpperCase()}"
- Headline color: warm off-white (#F5F5F0)
- Bottom-right small watermark: "AETHERIS // BUSINESS FORENSICS" in ${accent}
- Thin ${accent} accent border line on the right edge
- Subtle redacted-document texture in background

LIGHTING: Dramatic chiaroscuro. ${accent} rim light on subject's edge. No flat lighting.

STYLE: Editorial magazine cover meets noir detective dossier. High contrast, photographic realism for the subject, designed graphic elements for typography.

FORMAT: Square 1:1 composition, sharp focus, no text artifacts, no watermarks beyond what is specified.`;
}

async function generateOne(supa: any, postId: string, overrideHeadshotId?: string) {
  // Fetch post
  const { data: post, error: postErr } = await supa
    .from("content_engine_posts").select("*").eq("id", postId).single();
  if (postErr || !post) throw new Error("Post not found");

  // Pick headshot
  let headshot: any = null;
  if (overrideHeadshotId) {
    const { data } = await supa.from("operator_headshots").select("*").eq("id", overrideHeadshotId).single();
    headshot = data;
  }
  if (!headshot) {
    const preset = FORMAT_PRESETS[post.format] || FORMAT_PRESETS.founderPOV;
    const { data } = await supa.from("operator_headshots")
      .select("*").eq("tag", preset.tag).eq("disabled", false).limit(1).maybeSingle();
    headshot = data;
  }
  if (!headshot) {
    const { data } = await supa.from("operator_headshots")
      .select("*").eq("disabled", false).order("is_default", { ascending: false }).limit(1).maybeSingle();
    headshot = data;
  }
  if (!headshot) throw new Error("No operator headshot available");

  // Daily cap check
  const { data: settings } = await supa.from("thumbnail_settings").select("*").eq("id", 1).maybeSingle();
  const cap = settings?.daily_cap ?? 50;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supa.from("thumbnail_generations")
    .select("id", { count: "exact", head: true }).gte("created_at", since).eq("status", "success");
  if ((count ?? 0) >= cap) {
    throw new Error(`Daily generation cap (${cap}) reached. Increase in settings or wait 24h.`);
  }

  await supa.from("content_engine_posts").update({ thumbnail_status: "generating" }).eq("id", postId);

  const preset = FORMAT_PRESETS[post.format] || FORMAT_PRESETS.founderPOV;
  const prompt = buildPrompt(post, preset.accent, preset.mood, preset.label);

  // Fetch reference image as Blob
  const refResp = await fetch(headshot.public_url);
  if (!refResp.ok) throw new Error("Could not load reference headshot");
  const refBlob = await refResp.blob();

  // Build multipart form for OpenAI image edit
  const form = new FormData();
  form.append("model", "gpt-image-1");
  form.append("prompt", prompt);
  form.append("size", "1024x1024");
  form.append("quality", settings?.default_quality || "medium");
  form.append("n", "1");
  form.append("image", refBlob, "reference.jpg");

  const aiResp = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { "Authorization": `Bearer ${OPENAI_API_KEY}` },
    body: form,
  });
  if (!aiResp.ok) {
    const errText = await aiResp.text();
    console.error("OpenAI error:", aiResp.status, errText);
    await supa.from("thumbnail_generations").insert({
      post_id: postId, status: "error",
      error_message: `OpenAI ${aiResp.status}: ${errText.slice(0, 500)}`,
    });
    await supa.from("content_engine_posts").update({ thumbnail_status: "error" }).eq("id", postId);
    if (aiResp.status === 401) throw new Error("OpenAI API key invalid. Update OPENAI_API_KEY secret.");
    if (aiResp.status === 429) throw new Error("OpenAI rate limit hit. Wait a minute and retry.");
    if (aiResp.status === 400 && errText.includes("safety")) throw new Error("Image rejected by content policy. Try regenerating or edit the hook.");
    throw new Error(`Image generation failed (${aiResp.status})`);
  }

  const aiJson = await aiResp.json();
  const b64 = aiJson?.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image returned from OpenAI");

  // Decode and upload to Supabase storage
  const binary = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const path = `post-thumbnails/${postId}-${Date.now()}.png`;
  const { error: upErr } = await supa.storage.from("content-images")
    .upload(path, binary, { contentType: "image/png", upsert: true });
  if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

  const { data: pub } = supa.storage.from("content-images").getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  await supa.from("content_engine_posts").update({
    thumbnail_url: publicUrl,
    thumbnail_reference_id: headshot.id,
    thumbnail_generated_at: new Date().toISOString(),
    thumbnail_status: "ready",
  }).eq("id", postId);

  await supa.from("thumbnail_generations").insert({ post_id: postId, status: "success" });

  return { url: publicUrl, headshot_id: headshot.id };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const token = getAdminTokenFromRequest(req);
    const ok = await verifyAdminToken(token, ADMIN_SECRET);
    if (!ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supa = createClient(SUPABASE_URL, SERVICE_KEY);
    const { action, post_id, post_ids, headshot_id, settings } = await req.json();

    if (action === "list_headshots") {
      const { data, error } = await supa.from("operator_headshots")
        .select("*").order("sort_order").order("created_at");
      if (error) throw error;
      return new Response(JSON.stringify({ headshots: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_settings") {
      const { data } = await supa.from("thumbnail_settings").select("*").eq("id", 1).maybeSingle();
      return new Response(JSON.stringify({ settings: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_settings") {
      const { error } = await supa.from("thumbnail_settings")
        .update({ ...settings, updated_at: new Date().toISOString() }).eq("id", 1);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_headshot") {
      const { id, ...patch } = req as any;
      const body = await req.clone().json().catch(() => ({}));
      const { error } = await supa.from("operator_headshots")
        .update(body.patch || {}).eq("id", body.headshot_id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "generate") {
      if (!post_id) throw new Error("post_id required");
      const result = await generateOne(supa, post_id, headshot_id);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "bulk_generate") {
      if (!Array.isArray(post_ids)) throw new Error("post_ids array required");
      const results: any[] = [];
      for (const pid of post_ids) {
        try {
          const r = await generateOne(supa, pid);
          results.push({ post_id: pid, ok: true, url: r.url });
        } catch (e) {
          results.push({ post_id: pid, ok: false, error: e instanceof Error ? e.message : String(e) });
        }
      }
      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("thumbnail error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
