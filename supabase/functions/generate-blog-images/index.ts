// Generate blog post thumbnails by blending the operator headshot
// into a unique editorial-cover scene per blog with the title overlaid.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

// Topic → environment + accent. Each blog gets a different scene.
const SCENES = [
  { mood: "modern dark studio backdrop with a single warm key light", accent: "crimson red (#DC143C)", label: "FIELD REPORT" },
  { mood: "modern executive office at night, warm desk lamp, city window behind", accent: "amber gold (#F59E0B)", label: "PATTERN REVEAL" },
  { mood: "industrial workspace at dusk, exposed brick, warm practical lighting", accent: "amber gold (#F59E0B)", label: "FIELD NOTES" },
  { mood: "modern library setting with warm brass desk lamp, dark wood shelves", accent: "yellow gold (#FBBF24)", label: "COUNTER-TAKE" },
  { mood: "rooftop at blue hour, distant city skyline, warm rim light", accent: "amber gold (#F59E0B)", label: "DISPATCH" },
  { mood: "concrete loft with steel beams, single overhead pendant light", accent: "crimson red (#DC143C)", label: "AUDIT" },
  { mood: "minimal black studio with a vertical strip of warm light", accent: "amber gold (#F59E0B)", label: "CASE FILE" },
  { mood: "war-room with dim monitors casting cool blue light, warm key light on subject", accent: "crimson red (#DC143C)", label: "OPERATIONS" },
];

function pickScene(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return SCENES[Math.abs(h) % SCENES.length];
}

function sanitizeTitle(raw: string) {
  const blocked = [
    /\broast(ed|ing)?\b/gi, /\bkill(ed|ing|er)?\b/gi, /\bdestroy(ed|ing)?\b/gi,
    /\battack(ed|ing)?\b/gi, /\bweapon\b/gi, /\bblood\b/gi, /\bdead\b/gi,
    /\bvictim\b/gi, /\bcrime\b/gi, /\bsuspect\b/gi, /\binterrogat\w*/gi,
  ];
  let s = raw;
  for (const re of blocked) s = s.replace(re, "exposed");
  return s;
}

function buildPrompt(title: string, scene: { mood: string; accent: string; label: string }) {
  const safeTitle = sanitizeTitle(title).slice(0, 120);
  return `Editorial magazine cover poster, square 1:1.

SUBJECT (CRITICAL — do not modify):
- The reference image is a photo of the operator. Place this exact person into the new scene UNCHANGED — keep their face, hair, beard, skin tone, body proportions, pose, and clothing pixel-accurate. Do not restyle, re-pose, re-light their face, or change their outfit.
- Position the subject standing on the LEFT THIRD of the composition, full body or 3/4 length visible, scaled so they fill that left column from near the top to near the bottom.
- Cleanly integrate the subject by adding realistic ground shadow and matching ambient light only — never alter the subject's pixels themselves.

ENVIRONMENT (build this AROUND the subject):
- ${scene.mood}.
- Deep cinematic near-black background (#0a0a0a) on the right two-thirds with subtle film grain and atmospheric depth.
- Subtle ${scene.accent} ambient glow behind the subject for separation.

DESIGN OVERLAY (right two-thirds, do not overlap subject):
- Small monospaced uppercase label top-right: "${scene.label}" in ${scene.accent}.
- Large bold serif headline beneath it, all caps, multi-line as needed: "${safeTitle.toUpperCase()}"
- Headline color: warm off-white (#F5F5F0). Tight letter-spacing, generous line-height. Title must be the dominant typographic element and fully readable.
- Small footer bottom-right: "AETHERIS" in ${scene.accent}.
- Thin ${scene.accent} vertical accent rule between subject and text block.

STYLE: Premium business magazine cover. Photographic realism for the subject (untouched), clean typographic graphic design for the overlay. No watermarks, no text artifacts, no duplicated faces, no extra people.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let offset = 0;
    let limit = 3; // smaller batches — each generation is heavy
    let forceRegenerate = false;
    let postIds: string[] | null = null;
    let headshotId: string | null = null;
    try {
      const body = await req.json();
      if (typeof body.offset === "number") offset = body.offset;
      if (typeof body.limit === "number") limit = body.limit;
      if (body.forceRegenerate) forceRegenerate = true;
      if (Array.isArray(body.postIds)) postIds = body.postIds;
      if (typeof body.headshotId === "string") headshotId = body.headshotId;
    } catch {}

    // Resolve headshot — explicit override, then default, then any enabled one
    let headshot: any = null;
    if (headshotId) {
      const { data } = await supabase.from("operator_headshots").select("*").eq("id", headshotId).single();
      headshot = data;
    }
    if (!headshot) {
      const { data } = await supabase.from("operator_headshots")
        .select("*").eq("disabled", false).eq("is_default", true).limit(1).maybeSingle();
      headshot = data;
    }
    if (!headshot) {
      const { data } = await supabase.from("operator_headshots")
        .select("*").eq("disabled", false).order("sort_order").limit(1).maybeSingle();
      headshot = data;
    }
    if (!headshot) throw new Error("No operator headshot configured. Upload one in admin.");

    // Load reference image once
    const refResp = await fetch(headshot.public_url);
    if (!refResp.ok) throw new Error("Failed to fetch reference headshot");
    const refBuf = new Uint8Array(await refResp.arrayBuffer());
    let bin = "";
    for (let i = 0; i < refBuf.length; i++) bin += String.fromCharCode(refBuf[i]);
    const refDataUrl = `data:${refResp.headers.get("content-type") || "image/jpeg"};base64,${btoa(bin)}`;

    // Pick posts
    let query = supabase.from("blog_posts").select("id, title, slug, featured_image")
      .eq("is_published", true).order("published_at", { ascending: false, nullsFirst: false });
    if (postIds && postIds.length) query = query.in("id", postIds);
    else if (!forceRegenerate) query = query.is("featured_image", null);
    const { data: posts, error: fetchErr } = await query.range(offset, offset + limit - 1);
    if (fetchErr) throw fetchErr;

    console.log(`[blog-images] processing ${posts?.length ?? 0} posts (offset ${offset}, limit ${limit})`);

    let generated = 0;
    let errors = 0;

    for (const post of posts || []) {
      try {
        const scene = pickScene(post.slug || post.id);
        const prompt = buildPrompt(post.title, scene);
        console.log(`[blog-images] generating: ${post.title}`);

        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: refDataUrl } },
              ],
            }],
            modalities: ["image", "text"],
          }),
        });

        if (!aiResp.ok) {
          const errText = await aiResp.text();
          console.error(`[blog-images] AI error ${aiResp.status} for ${post.slug}: ${errText.slice(0, 300)}`);
          errors++;
          if (aiResp.status === 429) await new Promise(r => setTimeout(r, 8000));
          continue;
        }

        const aiJson = await aiResp.json();
        const dataUrl: string | undefined = aiJson?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (!dataUrl?.startsWith("data:image/")) {
          console.error(`[blog-images] no image returned for ${post.slug}`);
          errors++;
          continue;
        }

        const m = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
        if (!m) { errors++; continue; }
        const ext = m[1] === "jpg" ? "jpeg" : m[1];
        const bytes = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0));

        const fileName = `${post.slug}-${Date.now()}.${ext === "jpeg" ? "jpg" : ext}`;
        const { error: upErr } = await supabase.storage
          .from("blog-thumbnails")
          .upload(fileName, bytes, { contentType: `image/${ext}`, upsert: true });
        if (upErr) { console.error("upload error", upErr); errors++; continue; }

        const { data: urlData } = supabase.storage.from("blog-thumbnails").getPublicUrl(fileName);
        const { error: updErr } = await supabase.from("blog_posts")
          .update({ featured_image: urlData.publicUrl }).eq("id", post.id);
        if (updErr) { console.error("db update error", updErr); errors++; continue; }

        generated++;
        console.log(`[blog-images] ✓ ${post.title}`);

        // small spacing between calls
        await new Promise(r => setTimeout(r, 1500));
      } catch (e) {
        console.error(`[blog-images] error on ${post.slug}:`, e);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: posts?.length ?? 0,
        generated,
        errors,
        nextOffset: offset + limit,
        remaining: (posts?.length ?? 0) === limit,
        headshot_id: headshot.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[blog-images] fatal:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
