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
      const toneKey = String(body?.tone || "").slice(0, 60).trim().toLowerCase();
      const styleKey = String(body?.style || "").slice(0, 60).trim().toLowerCase();
      const personaKey = String(body?.persona || body?.personality || "").slice(0, 60).trim().toLowerCase();
      const lengthKey = String(body?.length || "").slice(0, 20).trim().toLowerCase();
      const humanize = body?.humanize !== false;

      const memory = await loadMemory(code);
      const kit = (memory as any) || {};
      const brandName = kit.name || lic.brand_url || "the brand";
      const brandTone = lic.brand_tone || "professional, direct, human";
      const values = Array.isArray(kit.values) ? kit.values.join(", ") : "";

      // ============ TONE DIRECTIVES ============
      const TONE: Record<string, string> = {
        "blunt-operator": "TONE: Blunt operator. Direct, no filler, no throat-clearing. State the point in the first sentence.",
        "forensic-cold": "TONE: Forensic / cold. Clinical, case-file cadence. Diagnose, don't opine.",
        "aggressive-callout": "TONE: Aggressive call-out. Name the leak or the lazy pattern directly. No hedging.",
        "mentor-calm": "TONE: Calm mentor. Patient, teaching cadence. One clear lesson.",
        "contrarian": "TONE: Contrarian. Flip the conventional take. Argue the opposite of the obvious answer.",
        "storyteller": "TONE: Storyteller. First-person mini field story with a specific detail.",
        "dry-witty": "TONE: Dry, restrained wit. One clever observation, never try-hard.",
        "empathetic-peer": "TONE: Empathetic peer, founder-to-founder. Warm, real, no cheerleading.",
        "data-driven": "TONE: Data-driven. Lead with a stat or number. Prove with math, not adjectives.",
        "professional": "TONE: Professional, polished, corporate-safe. Clean grammar, measured.",
        "casual": "TONE: Casual, conversational. Light contractions, relaxed rhythm.",
        "confident": "TONE: Confident, assertive, self-assured. No hedging language.",
        "playful": "TONE: Playful, cheeky, light. One small joke, still on-topic.",
      };

      // ============ STYLE / STRUCTURE ============
      const STYLE: Record<string, string> = {
        "reaction": "STRUCTURE: Natural reaction. Read what is actually there, react to the real point, no template.",
        "hook-list-close": "STRUCTURE: Hook line → short numbered list (3 items max) → sharp one-line close.",
        "micro-story": "STRUCTURE: Micro-story with one specific dollar figure or metric.",
        "case-file": "STRUCTURE: Case-file format. Subject / Findings / Verdict. Terse.",
        "one-paragraph": "STRUCTURE: One dense paragraph, no line breaks.",
        "stat-led": "STRUCTURE: Open with a stat. Three supporting points. Close with implication.",
        "verdict-first": "STRUCTURE: Verdict first sentence. Then the proof. Then the consequence.",
        "question-frame": "STRUCTURE: Question frame → answer → twist that reframes the question.",
        "before-after": "STRUCTURE: Before / After / What changed. Concrete on both sides.",
        "problem-solution": "STRUCTURE: Name the problem in one line, then 2-3 concrete moves the reader could test this week.",
        "agree-extend": "STRUCTURE: Agree with the post, then extend it with ONE sharper detail or angle they missed.",
        "polite-pushback": "STRUCTURE: Polite pushback. Name the unstated assumption. Offer the counter-frame.",
      };

      // ============ PERSONA DIRECTIVES (style transfer, never name them) ============
      const PERSONA: Record<string, string> = {
        "alex-hormozi": "PERSONA (style transfer only, never name him): blunt, declarative, arithmetic over adjectives. Reframe the stated problem as a more uncomfortable upstream one. Flat, slightly tired closer.",
        "machiavellian": "PERSONA: strategic, power-aware, calculating. Frame moves in terms of leverage and unstated incentives.",
        "elon-musk": "PERSONA (style transfer only): terse, first-principles, dry tech bravado. Short lines. Occasional 'obviously'.",
        "ryan-reynolds": "PERSONA (style transfer only): self-aware deadpan, charming wit, one gentle self-deprecating aside. Never cheesy.",
        "robin-williams": "PERSONA (style transfer only): rapid-fire, warm, associative. One quick riff, then land the point.",
        "clint-eastwood": "PERSONA (style transfer only): spare, weathered, quiet menace. Short sentences. Never raises voice.",
        "hemingway": "PERSONA: short, declarative, iceberg restraint. Concrete nouns. No adjectives you can cut.",
        "aaron-sorkin": "PERSONA (style transfer only): walk-and-talk cadence, rhythmic sparring, one rhetorical rebound.",
        "anthony-bourdain": "PERSONA (style transfer only): gritty, observational, unfiltered. Moral weight under practical advice. Direct 'you' address.",
        "churchill": "PERSONA: gravitas, cadenced resolve, tricolon rhythm. One line of iron.",
        "denzel": "PERSONA (style transfer only): measured, magnetic, moral weight. Slow, sure sentences.",
        "steve-jobs": "PERSONA (style transfer only): reductive, reverent, reality-distortion conviction. 'It's really simple.'",
        "tony-soprano": "PERSONA (style transfer only): blunt, North-Jersey menace, family-first logic. Never talks down.",
        "don-draper": "PERSONA (style transfer only): mid-century pitch cadence, controlled gravity. One clean image, one clean line.",
        "bill-burr": "PERSONA (style transfer only): frustrated everyman, rant-into-clarity. Ends with something true nobody wants to say.",
        "naval-ravikant": "PERSONA (style transfer only): aphoristic, leverage-aware, calm tech-philosopher. One-line truths, stacked.",
        "david-goggins": "PERSONA (style transfer only): confrontational, accountability-forward, no soft-landing. Never theatrical.",
        "jocko-willink": "PERSONA (style transfer only): disciplined, ownership-first, command voice. Calm authority. 'Good.'",
        "mr-rogers": "PERSONA (style transfer only): gentle, deliberate, radically kind clarity. Never saccharine.",
        "samuel-jackson": "PERSONA (style transfer only): emphatic, rhythmic, righteous indignation. Controlled, not shouted.",
        "mark-twain": "PERSONA: wry, plain-spoken, folksy demolition of nonsense. One quiet dagger of a line.",
        "robert-greene": "PERSONA: 48 Laws power-strategist. Historical parable + cold law. Every observation ends on a rule.",
        "robert-cialdini": "PERSONA: behavioral scientist. Frame the move in terms of reciprocity, commitment, social proof, authority, liking, or scarcity — name only the mechanism, not the book.",
        "aetheris-strategist": "PERSONA: fused Greene + Cialdini + Godin operator voice. Cold law, behavioral principle, and remarkable-idea framing in one calm sentence. Never quote them.",
      };

      // ============ LENGTH ============
      const LENGTH: Record<string, string> = {
        "one-liner": "LENGTH: One sentence. Under 20 words.",
        "short": "LENGTH: 2–3 short sentences.",
        "medium": "LENGTH: One tight paragraph, roughly 40–80 words.",
        "long": "LENGTH: 2–3 paragraphs, roughly 120–220 words.",
      };

      const toneLine = TONE[toneKey] || (toneKey ? `TONE: ${toneKey}.` : "");
      const styleLine = STYLE[styleKey] || (styleKey ? `STRUCTURE: ${styleKey}.` : "");
      const personaLine = PERSONA[personaKey] || "";
      const lengthLine = LENGTH[lengthKey] || "";

      const humanizeLine = humanize
        ? `HUMAN TEXTURE (mandatory, subtle): write like a real person typing on a phone. Rules:
- 1–2 tiny imperfections MAX across the whole reply. Never more.
- Allowed: a lowercase sentence start, a missing Oxford comma, dropping one apostrophe (dont/its), ending with no period, one very common typo (teh, adn, recieve, alot, its vs it's), or a casual filler ("tbh", "ngl", "kinda", "fwiw") used at most once.
- Never: multiple typos in one sentence, misspelled proper nouns, broken grammar that hurts readability, text-speak (u, r, ur).
- The reader should feel "a person wrote this," not "this has errors." If unsure, leave it clean.`
        : "";

      const problemSolverLine = `PROBLEM-SOLVER MODE (conditional):
- Silently scan the thread for a concrete problem, blocker, mistake, or "how do I…" question.
- If a real problem exists: give 1–3 specific things to TEST or TRY (a tactic, tool, script, metric, phrasing, or check). Prose or a compact "Try: A. … B. … C. …" line — no numbered lists longer than 3.
- If NO clear problem exists (hot take, win post, meme, philosophical musing): do NOT invent one. React naturally, on-tone.
- Never say "here are some tips" or "hope this helps." Just give the moves.`;

      const system = [
        `You are the ${brandName} voice engine. Write ONLY the ${mode} text — no preface, no quotes, no signature, no labels.`,
        `Brand URL: ${lic.brand_url || "unknown"}.`,
        `Brand default tone: ${brandTone}.`,
        values ? `Brand values: ${values}.` : "",
        platformRules(platform),
        toneLine,
        styleLine,
        personaLine,
        lengthLine,
        problemSolverLine,
        humanizeLine,
        `Never invent facts about the brand. Never name any persona. Never use em dashes (—); use periods or commas.`,
      ].filter(Boolean).join("\n\n");

      const user = [
        selection ? `Thread / post the user is replying to:\n"""${selection}"""` : "",
        pageContext ? `Surrounding page context: ${pageContext}` : "",
        intent ? `User direction: ${intent}` : "Write something on-brand that fits the context.",
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
