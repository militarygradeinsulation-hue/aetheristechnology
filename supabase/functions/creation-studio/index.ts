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
const ELEVEN_GATEWAY = "https://connector-gateway.lovable.dev/elevenlabs";

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

  const usr = `USER PROMPT:\n${prompt}\n\nAVAILABLE IMAGES (use imageId values exactly):\n${
    images.map(i => `- ${i.id}${i.label ? ` (${i.label})` : ""}`).join("\n")
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
    if (res.status === 429) throw new Error("Rate limited. Try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    throw new Error(`AI gateway ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = await res.json();
  const call = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) throw new Error("No plan returned");
  const plan = JSON.parse(call.function.arguments);

  // Sanitize: drop scenes whose imageId isn't in the catalog
  const validIds = new Set(images.map(i => i.id));
  plan.scenes = (plan.scenes || []).filter((s: any) => validIds.has(s.imageId));
  if (plan.scenes.length === 0) throw new Error("AI returned no usable scenes");
  return plan;
}

async function elevenHeaders() {
  const lov = Deno.env.get("LOVABLE_API_KEY");
  const el = Deno.env.get("ELEVENLABS_API_KEY");
  if (!lov) throw new Error("LOVABLE_API_KEY missing");
  if (!el) throw new Error("ELEVENLABS_API_KEY missing — connect ElevenLabs in Connectors");
  return {
    Authorization: `Bearer ${lov}`,
    "X-Connection-Api-Key": el,
  };
}

async function listVoices() {
  const headers = await elevenHeaders();
  const res = await fetch(`${ELEVEN_GATEWAY}/v1/voices`, { headers });
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
  const headers = await elevenHeaders();
  const res = await fetch(
    `${ELEVEN_GATEWAY}/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
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

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("creation-studio error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
