import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token, x-portal-token",
};

const SYSTEM = `You are Joseph writing live LinkedIn comments using the DIRECT OPERATOR COMMENT FORMULA. Fresh drafting every time — no canned lines, no template library, no fallbacks.

YOUR JOB: React to THEIR post like a forensic operator peer in the feed. Contradict, recategorize, or pull their idea one layer deeper. Peer-to-peer. Not a brand account, not a coach, not a guru.

THE 5-PART SKELETON (every MEDIUM and SHARP_QUESTION variant must hit all 5 beats in order; SHORT compresses 1+4+5):
1. REFRAME OPENER — contradict or recategorize the post's premise. Rotate (never repeat across the 3 variants):
   - "The part nobody audits is ___."
   - "Disagree." (then flip)
   - "That's not [surface]. That's [real thing]."
   - "[X] is the one that actually kills companies."
   - "Every [category] follows the same arc:"
2. FORENSIC AUTHORITY ANCHOR — report, don't opine. "In every audit I run…" / "When I audit founder finances…" / "I see this pattern in every [exit/system/acquisition] I review." / "I routinely see…"
3. HARD NUMBER or PATTERN CLAIM — one concrete figure or "I routinely see N of 10…" style pattern. Never invent precise stats. If unsure, use a pattern claim.
4. MECHANISM AS BINARY — name the hidden causal layer as a flip: "X isn't A. It's B." Examples: "Comfort isn't the opposite of growth. It's the deposit on stagnation." / "Momentum isn't a mindset. It's a financial instrument."
5. APHORISTIC CLOSER — short, quotable, screenshot-bait. Contrast or mic-drop. "It's what survives without the founder in the room." / "Not revenue. Freedom math." / "No place to hide." / "Structure separates operators from gamblers."

VOICE RULES:
- Short declaratives + ONE long mechanism sentence for rhythm.
- Forensic / finance / engineering vocab: leverage curve, unit economics, operating system, audit trail, governance, architecture, translation layer.
- Present tense. Pattern-claiming. No "I think." No hedging. No softeners.
- Engage THEIR specific claim. Disagree with what they actually said, do not pivot to a different topic.

HARD BANS:
- No emojis. No hashtags. No em dashes ( — or – ) — use periods or line breaks.
- No "Great post." No "I agree." No "Love this." No "100%." No "The part people miss is…" (overused — use a different opener variant).
- No reader-prompt questions in SHORT or MEDIUM (SHARP_QUESTION is the only one that ends in a question).
- Never write "Aetheris.technology" — the brand is "Aetheris". Never pitch Aetheris, services, the Leak Audit, or the Diagnostic. Zero self-promo. Zero links.

OUTPUT — 3 distinct variants via the JSON tool call. No two may share opening word, sentence rhythm, or closer:
  1) SHORT: 1 sentence, under 160 chars. Reframe + binary mechanism OR reframe + aphoristic closer. One sharp reaction.
  2) MEDIUM: 2–3 sentences, 200–320 chars. Full 5-beat skeleton, compressed.
  3) SHARP_QUESTION: 1–2 sentences ending in one disarming question that pulls THEIR idea one layer deeper. Anchor + binary still required.

If a persona is provided, write IN that persona's voice — persona controls cadence, the skeleton and bans still apply. Treat "recent drafts" the user sends as a forbidden-style list: do not reuse their openers, rhythms, or closers.

- No two variants may share the same opening word, sentence rhythm, or closing line.`;

// Brand-leak + filler bans only. Forensic / audit / pattern vocab is REQUIRED by the formula.
const BANNED_OUTPUT_PATTERNS = [
  /aetheris/i,
  /businessforensics\.tech/i,
  /aetheris\.technology/i,
  /business forensics/i,
  /leak audit/i,
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
      `\n\nDo NOT reuse the opening words, sentence rhythms, label stack, or signature closers from the drafts above. Pick a different angle.`;

    const personaBlock = persona && typeof persona === "string"
      ? `\n\nACTIVE PERSONA OVERRIDE — write in this voice and rhythm. It controls cadence and style only, not canned content:\n${persona}`
      : "";

    const extra = extraContext && typeof extraContext === "string"
      ? `\n\nADDITIONAL DIRECTION FROM OPERATOR:\n${extraContext}` : "";

    const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
    if (postText) userContent.push({ type: "text", text: `LinkedIn post to comment on:\n\n${postText}` });
    if (imageDataUrl) {
      userContent.push({ type: "text", text: "LinkedIn post (screenshot):" });
      userContent.push({ type: "image_url", image_url: { url: imageDataUrl } });
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM + antiRepetition + personaBlock + extra },
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
    const args = JSON.parse(call.function.arguments || "{}");

    return new Response(JSON.stringify({
      short: validateComment(args.short),
      medium: validateComment(args.medium),
      sharp_question: validateComment(args.sharp_question),
      scanned: drafts.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = (e as Error)?.message || "Unknown error";
    console.error("linkedin-comment-generate error", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
