// Brand Voice Chrome Extension backend.
// Two actions:
//   1) activate — validate license code, return the cached brand kit.
//   2) draft    — generate a post/comment in the buyer's brand voice for
//                 LinkedIn / X / Reddit / any text field.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TOOL_ID = "brand-voice-extension";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function loadLicense(code: string) {
  const c = String(code || "").trim().toUpperCase();
  if (!c || c.length > 32 || !c.startsWith("EXT-")) return null;
  const { data } = await supabase
    .from("tool_licenses")
    .select("*")
    .eq("code", c)
    .maybeSingle();
  if (!data) return null;
  if (data.plan !== "extension") return null;
  return data;
}

async function loadMemory(code: string) {
  const { data } = await supabase
    .from("tool_memory")
    .select("memory")
    .eq("license_code", code)
    .eq("tool_id", TOOL_ID)
    .maybeSingle();
  return (data?.memory ?? {}) as Record<string, unknown>;
}

async function callAI(system: string, user: string): Promise<string> {
  if (!LOVABLE_KEY) throw new Error("AI gateway not configured");
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LOVABLE_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`AI ${resp.status}: ${t.slice(0, 200)}`);
  }
  const data = await resp.json();
  return String(data?.choices?.[0]?.message?.content ?? "").trim();
}

function platformRules(platform: string): string {
  switch (platform) {
    case "linkedin":
      return "Platform: LinkedIn. 1–3 short paragraphs, professional but human, hook first. No hashtags unless requested. No emojis.";
    case "x":
    case "twitter":
      return "Platform: X/Twitter. Under 280 characters. Punchy. One clear idea. No hashtags.";
    case "reddit":
      return "Platform: Reddit. Conversational, plain-spoken, useful. No self-promotion. No emojis. Reference the parent thread naturally.";
    default:
      return "Platform: generic web textarea. Keep it concise and match the surrounding page tone.";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");
    const code = String(body?.code || "").trim().toUpperCase();

    if (!action) return json({ error: "action required" }, 400);

    if (action === "activate") {
      const lic = await loadLicense(code);
      if (!lic) return json({ ok: false, error: "Invalid or unrecognized activation code." }, 404);
      const memory = await loadMemory(code);
      await supabase.from("tool_licenses").update({ last_used_at: new Date().toISOString() }).eq("id", lic.id);
      return json({
        ok: true,
        brand: {
          url: lic.brand_url,
          tone: lic.brand_tone,
          kit: memory,
        },
      });
    }

    if (action === "draft") {
      const lic = await loadLicense(code);
      if (!lic) return json({ ok: false, error: "Invalid activation code." }, 403);

      const platform = String(body?.platform || "generic").toLowerCase();
      const intent = String(body?.intent || "").slice(0, 400);
      const selection = String(body?.selection || "").slice(0, 2000);
      const pageContext = String(body?.pageContext || "").slice(0, 1500);
      const mode = String(body?.mode || "reply"); // reply | post | comment
      const toneOverride = String(body?.tone || "").slice(0, 60).trim();
      const personality = String(body?.personality || "").slice(0, 60).trim();
      const humanize = body?.humanize !== false; // default on

      const memory = await loadMemory(code);
      const kit = (memory as any) || {};
      const brandName = kit.name || lic.brand_url || "the brand";
      const brandTone = lic.brand_tone || "professional, direct, human";
      const values = Array.isArray(kit.values) ? kit.values.join(", ") : "";

      const personalityRules: Record<string, string> = {
        "friendly": "Personality: warm, conversational, first-name energy. Occasional light contraction.",
        "direct": "Personality: blunt, operator-tier, no filler. State the point in the first sentence.",
        "witty": "Personality: dry wit, one clever observation, never try-hard.",
        "curious": "Personality: ask a real question, sound like you're thinking out loud.",
        "supportive": "Personality: validate the point, add one specific detail, no cheerleading.",
        "skeptical": "Personality: push back gently, name the unstated assumption.",
        "expert": "Personality: quiet authority, one precise term, no jargon dump.",
      };
      const persLine = personality && personalityRules[personality.toLowerCase()]
        ? personalityRules[personality.toLowerCase()]
        : personality ? `Personality: ${personality}.` : "";

      const humanizeLine = humanize
        ? `HUMAN TEXTURE (mandatory, subtle): write like a real person typing on a phone or laptop. Rules:
- 1–2 tiny imperfections MAX across the whole reply. Never more.
- Allowed: a lowercase sentence start, a missing Oxford comma, dropping one apostrophe (dont/its), a mid-sentence "—" that could've been a comma, ending with no period, one very common typo (teh, adn, recieve, alot, its vs it's), or a casual filler ("tbh", "ngl", "kinda", "fwiw") used at most once.
- Never: multiple typos in one sentence, misspelled proper nouns, broken grammar that hurts readability, "text-speak" (u, r, ur), or anything that looks illiterate.
- The reader should feel "a person wrote this," not "this has errors." If unsure, leave it clean.`
        : "";

      const problemSolverLine = `PROBLEM-SOLVER MODE (conditional):
- First, silently scan the thread/context for a concrete problem, blocker, mistake, or "how do I…" question the author is wrestling with.
- If a real problem exists: give 1–3 specific things to TEST or TRY. Each item should be a concrete action (a tactic, tool, script, metric, phrasing, or check) — not a platitude. Keep it tight: one short sentence per item, no numbered lists longer than 3, prose or a compact "Try: A. … B. … C. …" line is fine.
- If NO clear problem exists (e.g. it's a hot take, a win post, a meme, a philosophical musing): do NOT invent one. Stay on-tone and react naturally. Never force advice.
- Never say "here are some tips" or "hope this helps." Just give the moves.
- Answers must be things a real operator could test this week. No theory dumps, no framework names without substance.`;

      const system = [
        `You are the ${brandName} voice engine. Write ONLY the ${mode} text — no preface, no quotes, no signature.`,
        `Brand URL: ${lic.brand_url || "unknown"}.`,
        `Brand tone: ${toneOverride || brandTone}.`,
        persLine,
        values ? `Brand values: ${values}.` : "",
        platformRules(platform),
        problemSolverLine,
        humanizeLine,
        `Never invent facts about the brand. If unsure, stay generic-but-on-tone.`,
      ].filter(Boolean).join("\n");

      const user = [
        selection ? `Thread / context the user is replying to:\n"""${selection}"""` : "",
        pageContext ? `Page context: ${pageContext}` : "",
        intent ? `What the user wants to say: ${intent}` : "Write something on-brand that fits the context.",
      ].filter(Boolean).join("\n\n");

      const draft = await callAI(system, user);
      return json({ ok: true, draft });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    console.error("extension-brand-voice:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
