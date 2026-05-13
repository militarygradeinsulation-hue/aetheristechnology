// Creation Studio — admin-gated edge function.
// 1) plan_video: AI scene plan from prompt + available images
// 2) list_voices: ElevenLabs voices via connector gateway
// 3) tts: ElevenLabs MP3 voiceover (returns base64 audio)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const ELEVEN_API = "https://api.elevenlabs.io";

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function planVideo(prompt: string, images: { id: string; url: string; label?: string }[], opts: { durationSec: number; aspect: string }) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");

  const tool = {
    type: "function",
    function: {
      name: "build_video_plan",
      description: "Plan a short marketing video as a sequence of scenes.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short video title" },
          scenes: {
            type: "array",
            description: `Scenes that fit roughly ${opts.durationSec} seconds total. 4-8 scenes.`,
            items: {
              type: "object",
              properties: {
                imageId: { type: "string", description: "MUST be one of the provided image ids." },
                caption: { type: "string", description: "Bold on-screen caption, <= 9 words." },
                voiceover: { type: "string", description: "1-2 sentences spoken over this scene. Punchy, blunt, operator-tone." },
                durationMs: { type: "integer", description: "Scene length in milliseconds (2500-5500)." },
              },
              required: ["imageId", "caption", "voiceover", "durationMs"],
              additionalProperties: false,
            },
          },
        },
        required: ["title", "scenes"],
        additionalProperties: false,
      },
    },
  };

  const sys = `You are an Aetheris (Business Forensics Operator) short-form video director.
Voice: aggressive, blunt, non-corporate. Forensic > influencer. Real numbers > round numbers.
Never use "Hey guys", "Today I'm going to". Open with the punch.
Pick images from the provided list — do NOT invent ids.
Total runtime target: ~${opts.durationSec}s. Aspect: ${opts.aspect}.`;

  // Cap images to keep prompt small + reliable
  const trimmed = images.slice(0, 40);
  const usr = `USER PROMPT:\n${prompt}\n\nAVAILABLE IMAGES (use imageId values exactly):\n${
    trimmed.map(i => `- ${i.id}${i.label ? ` (${i.label})` : ""}`).join("\n")
  }`;

  console.log("plan_video: calling AI gateway", { promptLen: prompt.length, imageCount: trimmed.length });

  const res = await fetch(LOVABLE_AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
      tools: [tool],
      tool_choice: { type: "function", function: { name: "build_video_plan" } },
    }),
  });

  if (!res.ok) {
    const bodyText = await res.text();
    console.error("plan_video gateway error", res.status, bodyText.slice(0, 400));
    if (res.status === 429) throw new Error("Rate limited. Wait a moment and try again.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Lovable Cloud → AI Gateway.");
    throw new Error(`AI gateway ${res.status}: ${bodyText.slice(0, 200)}`);
  }
  const data = await res.json();
  const msg = data?.choices?.[0]?.message;
  let call = msg?.tool_calls?.[0];

  // Fallback: some models occasionally return JSON in content instead of tool_calls
  let plan: any = null;
  if (call?.function?.arguments) {
    try { plan = JSON.parse(call.function.arguments); } catch (e) {
      console.error("plan_video parse args failed", e, call.function.arguments?.slice(0, 200));
    }
  }
  if (!plan && typeof msg?.content === "string") {
    const m = msg.content.match(/\{[\s\S]*\}/);
    if (m) { try { plan = JSON.parse(m[0]); } catch { /* ignore */ } }
  }
  if (!plan) {
    console.error("plan_video no plan", JSON.stringify(data).slice(0, 500));
    throw new Error("AI did not return a plan. Try again or simplify the prompt.");
  }

  // Sanitize: drop scenes whose imageId isn't in the catalog
  const validIds = new Set(trimmed.map(i => i.id));
  plan.scenes = (plan.scenes || []).filter((s: any) => validIds.has(s.imageId));
  if (!plan.scenes || plan.scenes.length === 0) {
    throw new Error("AI returned no usable scenes (none of its imageIds matched). Try again.");
  }
  return plan;
}

function elevenHeaders() {
  const el = Deno.env.get("ELEVENLABS_API_KEY");
  if (!el) throw new Error("ELEVENLABS_API_KEY missing — connect ElevenLabs in Connectors");
  return { "xi-api-key": el };
}

async function listVoices() {
  const headers = elevenHeaders();
  const res = await fetch(`${ELEVEN_API}/v1/voices`, { headers });
  if (!res.ok) throw new Error(`ElevenLabs voices ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const voices = (data.voices || []).map((v: any) => ({
    voice_id: v.voice_id,
    name: v.name,
    category: v.category,
    preview_url: v.preview_url,
    labels: v.labels || {},
  }));
  return voices;
}

async function tts(text: string, voiceId: string) {
  const headers = elevenHeaders();
  const res = await fetch(
    `${ELEVEN_API}/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true },
      }),
    },
  );
  if (!res.ok) throw new Error(`TTS ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const buf = await res.arrayBuffer();
  return base64Encode(buf);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = getAdminTokenFromRequest(req);
    const ok = await verifyAdminToken(token, SUPABASE_SERVICE_ROLE_KEY);
    if (!ok) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (action === "list_voices") {
      const voices = await listVoices();
      return json({ voices });
    }

    if (action === "plan_video") {
      const { prompt, images, durationSec, aspect } = body;
      if (!prompt || !Array.isArray(images) || images.length === 0) {
        return json({ error: "prompt and images required" }, 400);
      }
      const plan = await planVideo(prompt, images, {
        durationSec: Number(durationSec) || 30,
        aspect: aspect || "9:16",
      });
      return json({ plan });
    }

    if (action === "tts") {
      const { text, voiceId } = body;
      if (!text || !voiceId) return json({ error: "text and voiceId required" }, 400);
      const audioBase64 = await tts(text, voiceId);
      return json({ audioBase64, mime: "audio/mpeg" });
    }

    if (action === "generate_music") {
      const el = Deno.env.get("ELEVENLABS_API_KEY");
      if (!el) return json({ error: "ELEVENLABS_API_KEY missing — connect ElevenLabs in Connectors" }, 500);
      const prompt = (body.prompt as string || "").trim();
      const ms = Math.max(10000, Math.min(180000, Number(body.durationMs) || 30000));
      if (!prompt) return json({ error: "prompt required" }, 400);
      const res = await fetch("https://api.elevenlabs.io/v1/music", {
        method: "POST",
        headers: { "xi-api-key": el, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, music_length_ms: ms }),
      });
      if (!res.ok) {
        const t = await res.text();
        return json({ error: `Music ${res.status}: ${t.slice(0, 240)}` }, 502);
      }
      const buf = await res.arrayBuffer();
      return json({ audioBase64: base64Encode(buf), mime: "audio/mpeg" });
    }

    if (action === "generate_topics") {
      const key = Deno.env.get("LOVABLE_API_KEY");
      if (!key) return json({ error: "LOVABLE_API_KEY missing" }, 500);
      const category = (body.category as string) || "All";
      const count = Math.max(4, Math.min(20, Number(body.count) || 10));
      const exclude = Array.isArray(body.exclude) ? (body.exclude as string[]).slice(0, 80) : [];

      const sys = `You are the Aetheris Business Forensics Operator. Generate sharp, specific short-form video TOPIC IDEAS for a 30-90 second forensic-style B2B video aimed at $5M-$50M owner-operators. Tone: blunt, non-corporate, operator > consultant, forensic > influencer. Each topic must be ONE SENTENCE, concrete, ideally with a number or dollar figure, no clichés, no emojis, no hashtags, no quote marks. Stay on-brand: revenue leaks, CRM hygiene, sales process, follow-up gaps, owner overload, AI-as-leak-finder, Indianapolis mid-market.`;

      const user = `Category: ${category === "All" ? "any of {Revenue Leaks, Systems & Ops, AI / Practical, Sales & Pipeline, Founder POV, Industry-Specific}" : category}.
Generate ${count} BRAND NEW topic ideas. Avoid duplicating these existing ones:
${exclude.map((e, i) => `${i + 1}. ${e}`).join("\n") || "(none)"}

Return ONLY a JSON object: { "topics": ["...", "...", ...] }. No prose.`;

      const aiRes = await fetch(LOVABLE_AI_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: sys },
            { role: "user", content: user },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!aiRes.ok) {
        const t = await aiRes.text();
        if (aiRes.status === 429) return json({ error: "Rate limited. Try again shortly." }, 429);
        if (aiRes.status === 402) return json({ error: "AI credits exhausted." }, 402);
        return json({ error: `AI gateway: ${t.slice(0, 240)}` }, 502);
      }
      const aiData = await aiRes.json();
      const content = aiData.choices?.[0]?.message?.content || "{}";
      let parsed: { topics?: string[] } = {};
      try { parsed = JSON.parse(content); } catch { parsed = {}; }
      const topics = (parsed.topics || [])
        .map((t) => (typeof t === "string" ? t.trim().replace(/^["'-]+|["']+$/g, "") : ""))
        .filter((t) => t.length > 8 && t.length < 240);
      return json({ topics });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("creation-studio error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
