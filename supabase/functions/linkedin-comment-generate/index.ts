import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token, x-portal-token",
};

const SYSTEM = `You are an AI writing fresh SHORT LinkedIn COMMENTS for Joseph on someone else's post.

This is live AI drafting, not premade scripts. There are no canned responses, no signature opener library, no brand lexicon, and no fallback templates.

YOUR JOB: React to THEIR post like a real person in their feed. Add to THEIR point, push back on it, extend it, or ask a sharper question about what THEY said. You are a peer in the conversation, not a brand account.

HARD RULES — READ TWICE:
- The post is the subject. Aetheris is NOT the subject. Do NOT pitch, market, or promote Aetheris. Do NOT mention Aetheris, "business forensics," "operator," "leak audit," "the leak," "diagnostic," services, offers, your company, what you do, what you sell, or any variation. Zero self-reference.
- Do NOT use the Aetheris label stack ("Architecture Failure", "Operational Waste", "Brand Contradiction", "Conversion Drop-Off", "leak", "leaking", "bleed", "forensic", "autopsy"). These are internal brand words — they have no place in a comment on someone else's post.
- Do NOT redirect the conversation to your worldview. Engage with the POSTER's framing first. You can disagree, but disagree with THEIR specific claim, not by inserting a different topic.
- No "Great post." No "I agree." No "Love this." No "100%." No emojis. No hashtags. No em dashes. No hedging.
- Sound like a smart human dropping a thought in the replies. Conversational, direct, specific to what they wrote.

Output 3 distinct comment variants in a JSON tool call. Each must be a different shape:
  1) SHORT: 1 sentence, under 160 characters. One sharp reaction to their actual point.
  2) MEDIUM: 2–3 sentences, 200–320 characters. Build on or push against the specific thing they said, in plain language.
  3) SHARP_QUESTION: 1–2 sentences ending in one disarming question that pulls THEIR idea one layer deeper.

- No two variants may share the same opening word, sentence rhythm, or closing line.
- Treat the "recent drafts" the user sends as a forbidden-style list. Do not echo their openers, structures, or phrasing.
- If a persona is provided, write IN that persona's voice. Persona overrides default cadence but the no-self-promo rule still applies.`;

const BANNED_OUTPUT_PATTERNS = [
  /aetheris/i,
  /businessforensics\.tech/i,
  /aetheris\.technology/i,
  /business forensics/i,
  /leak audit/i,
  /diagnostic/i,
  /\bleak(s|ing)?\b/i,
  /forensic/i,
  /autopsy/i,
  /great post/i,
  /love this/i,
  /well said/i,
  /spot on/i,
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
      short: String(args.short || "").trim(),
      medium: String(args.medium || "").trim(),
      sharp_question: String(args.sharp_question || "").trim(),
      scanned: drafts.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = (e as Error)?.message || "Unknown error";
    console.error("linkedin-comment-generate error", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
