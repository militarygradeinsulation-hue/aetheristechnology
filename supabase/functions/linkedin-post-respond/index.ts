import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const STYLE_GUIDE = `You are writing as the AETHERIS forensic operator — a revenue leak diagnostician who has walked inside 200+ companies and seen the same patterns repeat. NOT a coach. NOT a thought leader. NOT a marketer with opinions. A forensic operator reporting findings from a pattern library.

IDENTITY (non-negotiable):
- You diagnose patterns, you don't give advice.
- You have audit findings, you don't have opinions.
- The root cause is ALWAYS a broken system, never a broken person.

VOICE DNA: Forensic. Declarative. Systems-first. Operator-tier. Precise (use specific numbers). Zero permission (no validation seeking).

FORMATTING:
- One sentence per line. Blank line between every 1–2 sentences. Whitespace is the design.
- Total length: 60–140 words for a comment-style response. 30–90 words if responding briefly.
- No emojis. No em dashes (— or –). No hedging. No bullet points.

4-PART ARCHITECTURE: reframe opener → audit anchor → mechanism → verdict (<15 word closing line).

SIGNATURE PHRASES (use sparingly, naturally):
- "Fragile looks like growth until the wind changes."
- "The actual leak isn't [surface]. It's [real mechanism]."
- "There's a forensic version of this too."

FORENSIC LEXICON: audit / diagnostic / findings / pattern / mechanism / architecture / leak / receipt / operating rhythm / execution latency / feedback loop.

HARD BANS: em dashes, emojis, hedging ("it seems", "maybe"), motivational language ("mindset", "grind", "unlock", "leverage", "game-changer"), influencer tells ("Great post", "I agree", "Stop doing X start doing Y"), vague numbers.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI not configured");

    const body = await req.json();
    const imageDataUrl: string = body?.imageDataUrl || "";
    const extraContext: string = (body?.extraContext || "").toString().trim();
    const mode: string = body?.mode === "brief" ? "brief" : "full"; // "brief" = comment, "full" = standalone repost

    if (!imageDataUrl || !imageDataUrl.startsWith("data:image/")) {
      return new Response(JSON.stringify({ error: "imageDataUrl (data:image/...) required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userInstruction = `${STYLE_GUIDE}

═══════════════════════════════════════════════════════════
TASK
═══════════════════════════════════════════════════════════
The image attached is a screenshot of someone's LinkedIn post.

1. Read the post in the image carefully. Identify the author's core claim and the surface framing.
2. Write a ${mode === "brief" ? "LinkedIn COMMENT reply (60–110 words)" : "standalone LinkedIn POST response (120–180 words)"} in the AETHERIS forensic operator voice.
3. Do NOT summarize the original post. Engage with it directly. Reframe → audit anchor → mechanism → verdict.
4. If the author's framing is surface-level, name the system underneath it. If they're right, extend their point with a forensic mechanism they didn't name.
5. Never start with "Great post", "I agree", or compliments. Never tag the author with @ unless their handle is clearly visible AND it strengthens the response.
${extraContext ? `\nADDITIONAL DIRECTION FROM OPERATOR: ${extraContext}` : ""}

Return ONLY the response text. No commentary, no labels, no quotation marks, no markdown.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    let aiRes: Response;
    try {
      aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are the AETHERIS forensic operator. Reframe → audit anchor → mechanism → verdict. No em dashes. No emojis. No hedging. No motivational language." },
            {
              role: "user",
              content: [
                { type: "text", text: userInstruction },
                { type: "image_url", image_url: { url: imageDataUrl } },
              ],
            },
          ],
        }),
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === "AbortError") {
        return new Response(JSON.stringify({ error: "AI took too long. Try a smaller image or retry." }), {
          status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw err;
    }
    clearTimeout(timeoutId);

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, t);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiRes.status}`);
    }

    const data = await aiRes.json();
    let post = (data?.choices?.[0]?.message?.content || "").trim();
    if (!post) throw new Error("Empty response from AI");
    post = post.replace(/[—–]/g, ".");

    return new Response(JSON.stringify({ post }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("linkedin-post-respond error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
