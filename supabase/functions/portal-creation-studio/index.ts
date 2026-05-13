// Rep Creation Studio — portal-token-gated edge function for the rep video tool.
// Mirrors the admin creation-studio but limits voices to 3 curated picks.
// Actions: list_voices, plan_video, tts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-portal-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const ELEVEN_API = "https://api.elevenlabs.io";

// Curated 3-voice menu for reps. Different tones — operator, warm woman, calm anchor.
const REP_VOICES = [
  { voice_id: "nPczCjzI2devNBz1zQrb", name: "Brian — Operator (male)", category: "premade" },
  { voice_id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah — Warm (female)", category: "premade" },
  { voice_id: "cjVigY5qzO86Huf0OWal", name: "Eric — Calm anchor (male)", category: "premade" },
];

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function planVideo(
  prompt: string,
  images: { id: string; label?: string }[],
  opts: { durationSec: number; aspect: string },
) {
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
          title: { type: "string" },
          scenes: {
            type: "array",
            description: `Scenes that fit roughly ${opts.durationSec} seconds total. 4-8 scenes.`,
            items: {
              type: "object",
              properties: {
                imageId: { type: "string", description: "MUST be one of the provided image ids." },
                caption: { type: "string", description: "Bold on-screen caption, <= 9 words." },
                voiceover: { type: "string", description: "1-2 sentences, blunt, operator tone." },
                durationMs: { type: "integer", description: "Scene length in ms (2500-5500)." },
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
Open with the punch. Pick images from the provided list — do NOT invent ids.
Total runtime target: ~${opts.durationSec}s. Aspect: ${opts.aspect}.`;

  const trimmed = images.slice(0, 40);
  const usr = `USER PROMPT:\n${prompt}\n\nAVAILABLE IMAGES (use imageId values exactly):\n${
    trimmed.map((i) => `- ${i.id}${i.label ? ` (${i.label})` : ""}`).join("\n")
  }`;

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
    const t = await res.text();
    if (res.status === 429) throw new Error("Rate limited. Wait a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    throw new Error(`AI gateway ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const msg = data?.choices?.[0]?.message;
  const call = msg?.tool_calls?.[0];
  let plan: any = null;
  if (call?.function?.arguments) {
    try { plan = JSON.parse(call.function.arguments); } catch { /* ignore */ }
  }
  if (!plan && typeof msg?.content === "string") {
    const m = msg.content.match(/\{[\s\S]*\}/);
    if (m) { try { plan = JSON.parse(m[0]); } catch { /* ignore */ } }
  }
  if (!plan) throw new Error("AI did not return a plan. Try again.");

  const validIds = new Set(trimmed.map((i) => i.id));
  plan.scenes = (plan.scenes || []).filter((s: any) => validIds.has(s.imageId));
  if (!plan.scenes.length) throw new Error("AI returned no usable scenes. Try again.");
  return plan;
}

async function tts(text: string, voiceId: string) {
  const el = Deno.env.get("ELEVENLABS_API_KEY");
  if (!el) throw new Error("ELEVENLABS_API_KEY missing");
  // Gate: rep voice must be one of the 3 allowed
  if (!REP_VOICES.some((v) => v.voice_id === voiceId)) {
    throw new Error("Voice not allowed for reps");
  }
  const res = await fetch(
    `${ELEVEN_API}/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": el, "Content-Type": "application/json" },
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
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const claims = await verifyPortalToken(getPortalTokenFromRequest(req), SERVICE_KEY);
    if (!claims) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "list_voices") return json({ voices: REP_VOICES });

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

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("portal-creation-studio error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
