import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const VOICE_BRIAN = "nPczCjzI2devNBz1zQrb";
const ELEVEN_MODEL = "eleven_turbo_v2_5";

interface SlideJSON {
  title: string;
  bullets: string[];
  narration: string;
  audio_url?: string;
  duration_sec?: number;
  route?: string;
}

async function generateScript(
  title: string,
  outline: string,
  apiKey: string,
  routeHints: Record<string, string>,
  screenshotMap: Record<string, string>,
): Promise<{ slides: SlideJSON[] }> {
  const hintBlock = Object.keys(routeHints).length
    ? `\n\nWhile narrating each slide, the player will display a captured SCREENSHOT of one of these app areas. Pick the most relevant key per slide from this list (use the KEY string, not the path):\n${Object.entries(routeHints).map(([k, v]) => `  - ${k} → ${v}${screenshotMap[k] ? " [screenshot ready]" : ""}`).join("\n")}\nIf no area fits a slide (intro/outro), set "route_key" to null.`
    : "";

  const sys = `You are a sales onboarding script writer for Aetheris Technology, a Business Forensics operator.
Voice: blunt, operator, confident, never corporate. Write like a senior closer talking to a new hire.
Output STRICT JSON only — no markdown, no code fences:
{ "slides": [ { "title": "<short slide title, max 6 words>", "bullets": ["<3-5 short punchy bullets, max 10 words each>"], "narration": "<60-110 words spoken naturally, conversational, includes the bullets in flow>", "route_key": "<one key from allowed list, or null>" } ] }
Generate exactly 4 to 6 slides. The first slide is an intro/hook. The last slide is a takeaway/next step.${hintBlock}`;
  const user = `Module title: ${title}\n\nWhat to cover:\n${outline}`;

  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [{ role: "system", content: sys }, { role: "user", content: user }],
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) throw new Error(`AI ${r.status}: ${await r.text()}`);
  const j = await r.json();
  let txt = j.choices?.[0]?.message?.content || "{}";
  txt = txt.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const parsed = JSON.parse(txt);
  if (!Array.isArray(parsed.slides) || parsed.slides.length === 0) {
    throw new Error("AI returned no slides");
  }
  // Resolve route_key -> screenshot URL (preferred) or live route fallback.
  const slides: SlideJSON[] = parsed.slides.map((s: any) => {
    const key = s.route_key as string | undefined;
    const shot = key && screenshotMap[key];
    const route = key && routeHints[key] ? routeHints[key] : undefined;
    return {
      title: s.title,
      bullets: Array.isArray(s.bullets) ? s.bullets : [],
      narration: s.narration,
      route: shot ? undefined : route,
      image_url: shot || undefined,
    };
  });
  return { slides };
}

async function ttsToBuffer(text: string, apiKey: string): Promise<Uint8Array> {
  const r = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_BRIAN}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: ELEVEN_MODEL,
        voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true, speed: 1.0 },
      }),
    },
  );
  if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${await r.text()}`);
  return new Uint8Array(await r.arrayBuffer());
}

// Estimate MP3 duration from byte size at 128kbps CBR (close enough for slide timing).
function estimateDurationSec(bytes: number): number {
  // 128 kbps = 16,000 bytes/sec
  return Math.max(1, Math.round((bytes / 16000) * 10) / 10);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
    if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY missing");

    const adminToken = getAdminTokenFromRequest(req);
    const isAdmin = await verifyAdminToken(adminToken, SERVICE_ROLE);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { slug, title, summary, scriptOutline, order_index, routeHints } = await req.json();
    if (!slug || !title || !scriptOutline) {
      return new Response(JSON.stringify({ error: "slug, title, scriptOutline required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Mark generating
    await supabase.from("onboarding_modules").upsert({
      slug, title, summary: summary || "", order_index: order_index ?? 0,
      status: "generating", error_message: null,
    }, { onConflict: "slug" });

    // 1. Generate script
    const { slides } = await generateScript(title, scriptOutline, LOVABLE_API_KEY, routeHints || {});

    // 2. TTS per slide + upload
    const finalSlides: SlideJSON[] = [];
    let total = 0;
    for (let i = 0; i < slides.length; i++) {
      const s = slides[i];
      const audio = await ttsToBuffer(s.narration, ELEVENLABS_API_KEY);
      const path = `audio/${slug}/slide-${i + 1}-${Date.now()}.mp3`;
      const { error: upErr } = await supabase.storage
        .from("onboarding-assets")
        .upload(path, audio, { contentType: "audio/mpeg", upsert: true });
      if (upErr) throw new Error(`upload: ${upErr.message}`);
      const { data: pub } = supabase.storage.from("onboarding-assets").getPublicUrl(path);
      const dur = estimateDurationSec(audio.byteLength);
      total += dur;
      finalSlides.push({
        title: s.title,
        bullets: Array.isArray(s.bullets) ? s.bullets : [],
        narration: s.narration,
        audio_url: pub.publicUrl,
        duration_sec: dur,
        route: s.route,
      });
    }

    const { data: row, error: saveErr } = await supabase
      .from("onboarding_modules")
      .update({
        status: "ready",
        slides_json: finalSlides,
        total_duration_sec: total,
        generated_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("slug", slug)
      .select()
      .single();
    if (saveErr) throw saveErr;

    return new Response(JSON.stringify({ ok: true, module: row }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = (e as Error).message || String(e);
    // Try to mark module failed
    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
      const body = await req.clone().json().catch(() => ({}));
      if (body.slug) {
        await supabase.from("onboarding_modules")
          .update({ status: "failed", error_message: msg })
          .eq("slug", body.slug);
      }
    } catch { /* ignore */ }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
