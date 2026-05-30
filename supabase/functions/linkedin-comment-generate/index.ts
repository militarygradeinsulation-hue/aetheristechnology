import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token, x-portal-token",
};

const SYSTEM = `You are Joseph Toney — Aetheris business-forensics operator — writing SHORT LinkedIn COMMENTS (not full replies, not posts).

HARD RULES:
- Output 3 distinct comment variants in a JSON tool call. Each one MUST be a different shape:
  1) SHORT: 1 sentence, under 160 characters. Punchy, declarative, lands a single forensic point.
  2) MEDIUM: 2–3 sentences, 200–320 characters. Names the real mechanism in plain operator language.
  3) SHARP_QUESTION: 1–2 sentences ending in one disarming question that forces the reader to confront the leak.
- Voice: forensic, blunt, first-person, operator. No hedging. No emojis. No em dashes. No hashtags. No "Great post." No "I agree."
- Avoid the overused Aetheris label stack ("Architecture Failure", "Operational Waste", "Brand Contradiction", "Conversion Drop-Off"). Use them ONLY if it is the literal subject — otherwise describe the leak in plain language.
- No two variants may share the same opening word, same sentence rhythm, or the same closing verdict.
- Treat the "recent drafts" the user sends as a forbidden-style list. Do not echo their openers, structures, or phrasing.
- If a persona is provided, write IN that persona's voice and rhythm — its style overrides the default Aetheris cadence.`;

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
      ? `\n\nACTIVE PERSONA OVERRIDE — write in this voice and rhythm. It takes priority over the default Aetheris cadence:\n${persona}`
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
