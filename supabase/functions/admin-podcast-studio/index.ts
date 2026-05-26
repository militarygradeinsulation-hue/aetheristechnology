// Admin Podcast Studio — generate short-form podcast episodes
// Actions: list_voices, suggest_topics, generate_script, create_episode, list, delete
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const LOVABLE_IMAGE_URL = "https://ai.gateway.lovable.dev/v1/images/generations";
const ELEVEN_API = "https://api.elevenlabs.io";
const BUCKET = "admin-podcasts";

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function svc() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key);
}

function lovableKey() {
  const k = Deno.env.get("LOVABLE_API_KEY");
  if (!k) throw new Error("LOVABLE_API_KEY missing");
  return k;
}

function elevenKey() {
  const k = Deno.env.get("ELEVENLABS_API_KEY");
  if (!k) throw new Error("ELEVENLABS_API_KEY missing — connect ElevenLabs in Connectors");
  return k;
}

const SYS_VOICE = `You are the Aetheris Business Forensics Operator.
Voice: aggressive, blunt, non-corporate. Forensic > influencer. Operator > consultant.
Real numbers > round numbers. Open with the punch. No "hey guys", no hashtags, no emojis.`;

async function listVoices() {
  const res = await fetch(`${ELEVEN_API}/v1/voices`, { headers: { "xi-api-key": elevenKey() } });
  if (!res.ok) throw new Error(`ElevenLabs voices ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return (data.voices || []).map((v: any) => ({
    voice_id: v.voice_id, name: v.name, category: v.category,
    preview_url: v.preview_url, labels: v.labels || {},
  }));
}

async function suggestTopics(category: string, count: number, exclude: string[]) {
  const res = await fetch(LOVABLE_AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYS_VOICE },
        { role: "user", content: `Category: ${category || "any of {Revenue Leaks, Systems & Ops, AI / Practical, Sales & Pipeline, Founder POV, Industry-Specific}"}.
Generate ${count} brand-new SHORT-FORM PODCAST EPISODE IDEAS (3-7 minute episodes).
Each is one sentence, concrete, ideally with a number or dollar figure.
Avoid duplicating:
${exclude.slice(0, 60).map((e, i) => `${i + 1}. ${e}`).join("\n") || "(none)"}
Return ONLY JSON: { "topics": ["...", ...] }` }
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`AI gateway ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  let parsed: { topics?: string[] } = {};
  try { parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}"); } catch { /* ignore */ }
  return (parsed.topics || []).map((s: any) => String(s).trim().replace(/^["'-]+|["']+$/g, ""))
    .filter((s) => s.length > 8 && s.length < 240);
}

async function generateScript(topic: string, source: string, durationMin: number) {
  const target = Math.max(2, Math.min(15, durationMin || 5));
  const words = target * 150; // ~150 wpm
  const userMsg = source
    ? `TOPIC: ${topic || "(derive from source)"}\n\nSOURCE MATERIAL:\n${source.slice(0, 12000)}\n\nWrite a ~${words}-word solo podcast monologue grounded in the source.`
    : `TOPIC: ${topic}\n\nWrite a ~${words}-word solo podcast monologue.`;

  const res = await fetch(LOVABLE_AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: `${SYS_VOICE}
You write short-form solo podcast scripts. Structure:
1. Cold open hook (1-2 sentences, punch first).
2. The leak / problem (with a specific dollar figure or %).
3. Why owners can't see it from the inside.
4. The forensic move — 2-3 concrete steps.
5. Close with a hard line and a single call-to-action (visit aetheris.technology / book the Forensic Diagnostic).
Return ONLY JSON: { "title": "...", "script": "..." }. Script is plain prose — no stage directions, no [music], no speaker labels.` },
        { role: "user", content: userMsg },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`AI gateway ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  let parsed: { title?: string; script?: string } = {};
  try { parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}"); } catch { /* ignore */ }
  if (!parsed.script) throw new Error("AI returned no script");
  return { title: parsed.title || topic || "Untitled Episode", script: parsed.script };
}

async function ttsToBytes(text: string, voiceId: string): Promise<Uint8Array> {
  // ElevenLabs caps ~5000 chars per request — chunk on sentence boundaries
  const chunks: string[] = [];
  const maxLen = 4500;
  let cur = "";
  const sentences = text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+|\S+$/g) || [text];
  for (const s of sentences) {
    if ((cur + " " + s).length > maxLen) { if (cur) chunks.push(cur.trim()); cur = s; }
    else cur = cur ? cur + " " + s : s;
  }
  if (cur.trim()) chunks.push(cur.trim());

  const parts: Uint8Array[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const body: Record<string, unknown> = {
      text: chunks[i],
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true },
    };
    if (i > 0) body.previous_text = chunks[i - 1].slice(-400);
    if (i < chunks.length - 1) body.next_text = chunks[i + 1].slice(0, 400);

    const res = await fetch(`${ELEVEN_API}/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": elevenKey(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`TTS ${res.status}: ${(await res.text()).slice(0, 200)}`);
    parts.push(new Uint8Array(await res.arrayBuffer()));
  }
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0; for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

async function generateCoverImage(title: string, topic: string): Promise<Uint8Array> {
  const prompt = `Dark charcoal podcast cover art for an episode titled "${title}". Theme: ${topic || title}. Forensic, noir aesthetic with amber accents on deep charcoal. Bold serif title text. Editorial / autopsy / case-file vibe. No people, no logos. Square 1024x1024. High contrast.`;
  const res = await fetch(LOVABLE_IMAGE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-image-2",
      prompt,
      size: "1024x1024",
      quality: "low",
      n: 1,
    }),
  });
  if (!res.ok) throw new Error(`Image gen ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("Image gen returned no image");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function uploadToBucket(supabase: ReturnType<typeof createClient>, path: string, bytes: Uint8Array, contentType: string) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: false });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ok = await verifyAdminToken(getAdminTokenFromRequest(req), SERVICE_KEY);
    if (!ok) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;
    const supabase = svc();

    if (action === "list_voices") return json({ voices: await listVoices() });

    if (action === "suggest_topics") {
      const topics = await suggestTopics(body.category || "", Math.min(20, Math.max(4, Number(body.count) || 10)), Array.isArray(body.exclude) ? body.exclude : []);
      return json({ topics });
    }

    if (action === "generate_script") {
      const out = await generateScript(String(body.topic || ""), String(body.source || ""), Number(body.durationMin) || 5);
      return json(out);
    }

    if (action === "create_episode") {
      const title = String(body.title || "Untitled Episode").slice(0, 180);
      const topic = body.topic ? String(body.topic).slice(0, 300) : null;
      const script = String(body.script || "").trim();
      const voiceId = String(body.voiceId || "");
      const voiceName = body.voiceName ? String(body.voiceName) : null;
      const sourceType = body.sourceType ? String(body.sourceType) : null;
      const sourceText = body.sourceText ? String(body.sourceText).slice(0, 20000) : null;
      if (!script) return json({ error: "script required" }, 400);
      if (!voiceId) return json({ error: "voiceId required" }, 400);

      const audioBytes = await ttsToBytes(script, voiceId);
      const stamp = Date.now();
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "episode";
      const audioPath = `${stamp}-${slug}.mp3`;
      const audioUrl = await uploadToBucket(supabase, audioPath, audioBytes, "audio/mpeg");

      let imageUrl: string | null = null;
      try {
        const imgBytes = await generateCoverImage(title, topic || "");
        const imgPath = `${stamp}-${slug}.png`;
        imageUrl = await uploadToBucket(supabase, imgPath, imgBytes, "image/png");
      } catch (e) {
        console.error("cover image failed", e);
      }

      // Rough duration estimate: ~150 wpm
      const words = script.split(/\s+/).length;
      const duration = Math.round((words / 150) * 60);

      const { data: row, error } = await supabase.from("admin_podcasts").insert({
        title, topic, script, voice_id: voiceId, voice_name: voiceName,
        audio_url: audioUrl, image_url: imageUrl, duration_seconds: duration,
        source_type: sourceType, source_text: sourceText,
      }).select("*").single();
      if (error) throw new Error(`DB insert failed: ${error.message}`);

      return json({ episode: row });
    }

    if (action === "list") {
      const { data, error } = await supabase.from("admin_podcasts")
        .select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw new Error(error.message);
      return json({ episodes: data || [] });
    }

    if (action === "delete") {
      const id = String(body.id || "");
      if (!id) return json({ error: "id required" }, 400);
      const { data: row } = await supabase.from("admin_podcasts").select("audio_url,image_url").eq("id", id).maybeSingle();
      if (row) {
        const paths: string[] = [];
        for (const u of [row.audio_url, row.image_url]) {
          if (typeof u === "string") {
            const m = u.match(/\/admin-podcasts\/(.+)$/);
            if (m) paths.push(m[1]);
          }
        }
        if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
      }
      const { error } = await supabase.from("admin_podcasts").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("admin-podcast-studio error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
