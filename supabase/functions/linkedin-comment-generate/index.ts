import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { INFLUENCE_BLUEPRINT_COMPACT } from "../_shared/influenceBlueprint.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token, x-portal-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM = INFLUENCE_BLUEPRINT_COMPACT + "\n\n" + `You are Joseph writing live LinkedIn comments. Fresh drafting every time. No canned lines, no template library, no fallbacks.

YOUR JOB: React to THEIR post like a forensic operator peer in the feed. Contradict, recategorize, or pull their idea one layer deeper. Peer-to-peer. Not a brand account, not a coach, not a guru.

LIVE RESPONSE RULE:
Read the actual post first. Identify the specific claim, acronym, example, metric, objection, or assumption that deserves a reply. The first sentence must engage that specific thing immediately. If the opener could work on any other post, rewrite it.

Do not follow a fixed skeleton. Do not rotate through premade openers. Do not force audit anchors, binary mechanisms, or aphoristic closers. Use forensic/operator language only if it naturally answers this post.

VOICE RULES:
- Short declaratives + ONE long mechanism sentence for rhythm.
- Forensic / finance / engineering vocab: leverage curve, unit economics, operating system, audit trail, governance, architecture, translation layer.
- Present tense. Pattern-claiming. No "I think." No hedging. No softeners.
- Engage THEIR specific claim. Disagree with what they actually said, do not pivot to a different topic.

HARD BANS:
- No emojis. No hashtags. No em dashes ( — or – ) — use periods or line breaks.
- No "Great post." No "I agree." No "Love this." No "100%." No "The part people miss is…".
- Never open with generic crowd framing: "Most people", "Most founders", "Most operators", "Most companies", "People think", "Everyone thinks".
- Never close with canned mic-drops: "That is the whole game", "That's the whole game", "That is the game", "The work is the work", "Most won't. You should", "No place to hide".
- No reader-prompt questions in SHORT or MEDIUM (SHARP_QUESTION is the only one that ends in a question).
- Never write "Aetheris.technology" — the brand is "Aetheris". Never pitch Aetheris, services, the Leak Audit, or the Diagnostic. Zero self-promo. Zero links.

OUTPUT — 3 distinct variants via the JSON tool call. No two may share opening word, sentence rhythm, or closer:
  1) SHORT: 1 sentence, under 160 chars. One sharp source-specific reaction.
  2) MEDIUM: 2–3 sentences, 200–320 chars. Engage the actual claim and add one mechanism or consequence.
  3) SHARP_QUESTION: 1–2 sentences ending in one disarming question that pulls THEIR idea one layer deeper.

If a persona is provided, write IN that persona's voice — persona controls cadence, but the bans still apply. Treat "recent drafts" the user sends as a forbidden-style list: do not reuse their openers, rhythms, or closers.

- No two variants may share the same opening word, sentence rhythm, or closing line.`;

// Brand-leak + filler bans only. Forensic / audit / pattern vocab is REQUIRED by the formula.
const BANNED_OUTPUT_PATTERNS = [
  /aetheris/i,
  /businessforensics\.tech/i,
  /aetheris\.technology/i,
  /business forensics/i,
  /leak audit/i,
  /^\s*most\s+(people|founders|operators|businesses|companies|marketers|creators|teams)\b/i,
  /^\s*people\s+(think|see|believe|assume)\b/i,
  /^\s*everyone\s+(thinks|sees|believes|assumes)\b/i,
  /\bthat is the whole game\b/i,
  /\bthat'?s the whole game\b/i,
  /\bthat is the game\b/i,
  /\bthe work is the work\b/i,
  /\bmost won'?t\.\s*you should\b/i,
  /\bno place to hide\b/i,
  /great post/i,
  /love this/i,
  /well said/i,
  /spot on/i,
  /\b100%\b/,
  /https?:\/\//i,
];

function validateComment(value: unknown) {
  const text = String(value || "").trim().replace(/[—–]/g, ",").replace(/https?:\/\/\S+/gi, "");
  const violation = BANNED_OUTPUT_PATTERNS.find((pattern) => pattern.test(text));
  if (violation) throw new Error("AI response failed the no-template/no-pitch filter. Regenerate with more source context.");
  return text;
}

function normalizedWords(text: string) {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function sentenceList(text: string) {
  return text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 3);
}

function firstWords(text: string, n: number) {
  return normalizedWords(sentenceList(text)[0] || text).slice(0, n).join(" ");
}

function lastWords(text: string, n: number) {
  const sentences = sentenceList(text);
  const final = sentences[sentences.length - 1] || text;
  const words = normalizedWords(final);
  return words.slice(Math.max(0, words.length - n)).join(" ");
}

function sharedNgram(a: string, b: string, n = 6) {
  const aw = normalizedWords(a);
  const bw = normalizedWords(b);
  if (aw.length < n || bw.length < n) return "";
  const grams = new Set<string>();
  for (let i = 0; i <= aw.length - n; i++) grams.add(aw.slice(i, i + n).join(" "));
  for (let i = 0; i <= bw.length - n; i++) {
    const gram = bw.slice(i, i + n).join(" ");
    if (grams.has(gram)) return gram;
  }
  return "";
}

function findRecentStyleViolation(text: string, drafts: string[]) {
  const opener = firstWords(text, 4);
  const closer = lastWords(text, 6);
  for (const draft of drafts.slice(0, 24)) {
    if (opener && opener === firstWords(draft, 4)) return `repeated opener starter "${opener}"`;
    if (closer && closer === lastWords(draft, 6)) return `repeated closing words "${closer}"`;
    const overlap = sharedNgram(text, draft, 6);
    if (overlap) return `reused phrase "${overlap}"`;
  }
  return null;
}

function validateDistinctVariants(args: Record<string, unknown>, drafts: string[]) {
  const values = [args.short, args.medium, args.sharp_question].map((v) => validateComment(v));
  const seenOpeners = new Set<string>();
  const seenClosers = new Set<string>();
  for (const text of values) {
    const opener = firstWords(text, 3);
    const closer = lastWords(text, 5);
    if (opener && seenOpeners.has(opener)) throw new Error(`variants repeated opener "${opener}"`);
    if (closer && seenClosers.has(closer)) throw new Error(`variants repeated closer "${closer}"`);
    seenOpeners.add(opener);
    seenClosers.add(closer);
    const styleViolation = findRecentStyleViolation(text, drafts);
    if (styleViolation) throw new Error(styleViolation);
  }
  return { short: values[0], medium: values[1], sharp_question: values[2] };
}


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { postText, imageDataUrl, recentDrafts, persona, extraContext } = await req.json();
    if (!postText && !imageDataUrl) {
      return new Response(JSON.stringify({ error: "Provide postText or imageDataUrl" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const drafts: string[] = Array.isArray(recentDrafts)
      ? recentDrafts.filter((d: unknown) => typeof d === "string" && d.length > 0).slice(0, 40)
      : [];

    const antiRepetition = drafts.length === 0 ? "" :
      `\n\nLIVE ANTI-REPETITION SCAN (${drafts.length} recent drafts from the saved library):\n` +
      drafts.map((d, i) => `[${i + 1}] ${d.slice(0, 280)}`).join("\n") +
      `\n\nDo NOT reuse the first 4 words, final 6 words, any 6-word phrase, sentence rhythms, label stack, or signature closers from the drafts above. Pick a different angle.`;

    const personaBlock = persona && typeof persona === "string"
      ? `\n\nACTIVE PERSONA OVERRIDE — write in this voice and rhythm. It controls cadence and style only, not canned content:\n${persona}\n\nIf this is Alex Hormozi style, use live blunt arithmetic and compression only. Do not open with "Most people" or any generic crowd frame. Do not close with "That is the whole game" or any canned finality line. React to the actual post.`
      : "";

    const extra = extraContext && typeof extraContext === "string"
      ? `\n\nADDITIONAL DIRECTION FROM OPERATOR:\n${extraContext}` : "";

    const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
    if (postText) userContent.push({ type: "text", text: `LinkedIn post to comment on:\n\n${postText}` });
    if (imageDataUrl) {
      userContent.push({ type: "text", text: "LinkedIn post (screenshot):" });
      userContent.push({ type: "image_url", image_url: { url: imageDataUrl } });
    }

    let args: Record<string, unknown> = {};
    let validated: { short: string; medium: string; sharp_question: string } | null = null;
    const repairNotes: string[] = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          temperature: 1.08,
          top_p: 0.97,
          messages: [
            { role: "system", content: SYSTEM + antiRepetition + personaBlock + extra + (repairNotes.length ? `\n\nREWRITE FROM SCRATCH. Failed attempt reason: ${repairNotes.join("; ")}. Use a new source-specific first sentence and a new source-specific ending.` : "") },
            { role: "user", content: userContent },
          ],
          tools: [{
            type: "function",
            function: {
              name: "emit_comments",
              description: "Return 3 distinct LinkedIn comment variants.",
              parameters: {
                type: "object",
                properties: {
                  short: { type: "string", description: "1 sentence, under 160 characters." },
                  medium: { type: "string", description: "2–3 sentences, 200–320 characters." },
                  sharp_question: { type: "string", description: "1–2 sentences ending in one question." },
                },
                required: ["short", "medium", "sharp_question"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "emit_comments" } },
        }),
      });

      if (res.status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (res.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (!res.ok) {
        const t = await res.text();
        console.error("gateway error", res.status, t);
        throw new Error(`AI gateway error ${res.status}`);
      }

      const data = await res.json();
      const call = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!call) throw new Error("No tool call returned");
      args = JSON.parse(call.function.arguments || "{}");
      try {
        validated = validateDistinctVariants(args, drafts);
        break;
      } catch (e) {
        repairNotes.push((e as Error)?.message || "repeated wording");
      }
    }

    if (!validated) {
      // 3 attempts failed strict de-dupe. Return raw drafts anyway so the UI never goes blank.
      console.warn("comment-generate: returning unvalidated drafts after 3 attempts", repairNotes);
      validated = {
        short: validateComment(args.short),
        medium: validateComment(args.medium),
        sharp_question: validateComment(args.sharp_question),
      };
    }

    return new Response(JSON.stringify({
      short: validated.short,
      medium: validated.medium,
      sharp_question: validated.sharp_question,
      scanned: drafts.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = (e as Error)?.message || "Unknown error";
    console.error("linkedin-comment-generate error", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
