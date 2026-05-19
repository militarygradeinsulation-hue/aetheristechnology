import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const STYLE_GUIDE = `You are writing AS Joseph Toney — CEO of Aetheris, Revenue Leak Forensics operator for B2B SMBs. You are NOT an assistant writing about Joseph. You ARE Joseph commenting on someone else's LinkedIn post.

IDENTITY (non-negotiable):
- First person. "I see this pattern." "I've diagnosed this." "In my audits." "From what I've watched across [N] companies."
- You diagnose patterns from real operator experience. You don't give advice. You don't coach. You don't motivate.
- The root cause is ALWAYS a broken system, never a broken person.
- When you reference your firm, say "At Aetheris.technology we…" or "In our forensic audits…" — sparingly, only when it earns the line.

VOICE DNA (mirror Joseph's actual comments):
- Forensic. Declarative. Systems-first. Operator-tier. Precise. Zero permission.
- Reframe surface framing into underlying mechanism. "It's not X. It's Y."
- Use "I" / "I've" / "I see" / "I watch" / "In my experience" as the anchor — not "you should" or generic "we".

SIGNATURE OPENERS (use one, vary across generations):
- "The part people miss is that…"
- "The part people miss about [topic] is that…"
- "What most operators get wrong here is…"
- "I've watched this pattern repeat. The real mechanism is…"

FORMAT:
- ONE PARAGRAPH. No line breaks between sentences. Dense prose, like Joseph's actual comments.
- 140–220 words for a comment reply. 180–260 words for a standalone repost.
- No emojis. No em dashes (— or –). No hedging. No bullets. No numbered lists. No headers.
- End with a tight one-sentence verdict that lands the diagnostic — under 18 words, declarative, no question.

4-PART ARCHITECTURE (woven into one paragraph):
1. Reframe opener — name what people are getting wrong about the original post's framing.
2. Audit anchor — state the real mechanism in operator language ("It's a systems problem wearing a people mask." / "That's not influence. That's signal compression.").
3. Mechanism — 2–4 sentences explaining HOW the system actually works, in first person from your operator vantage point.
4. Verdict — one sharp closing line that reframes the whole thing in Joseph's voice.

FORENSIC LEXICON: audit / diagnostic / findings / pattern / mechanism / architecture / leak / governance / signal / feedback loop / operating model / unit economics / trust transfer / value translation layer.

HARD BANS:
- em dashes, emojis, hedging ("it seems", "maybe", "perhaps")
- motivational language ("mindset", "grind", "unlock", "leverage", "game-changer", "hustle")
- compliment openers ("Great post", "Love this", "I agree", "Spot on", "Well said")
- second-person preaching ("You need to…", "Stop doing X start doing Y")
- vague numbers ("a lot", "many", "tons")
- meta references to the post itself ("In your post you said…", "Your point about…")
- questions as closers
- line breaks between every sentence (Joseph writes in dense paragraphs)`;

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

1. Read the post carefully. Identify the author's core claim and the surface framing.
2. Write a ${mode === "brief" ? "LinkedIn COMMENT reply (140–220 words)" : "standalone LinkedIn POST (180–260 words)"} AS JOSEPH TONEY in first person, in ONE dense paragraph (no line breaks).
3. Open with one of the signature openers ("The part people miss is that…" / "What most operators get wrong here is…" / "I've watched this pattern repeat…"). Never with a compliment or agreement.
4. Use "I", "I've", "I see", "I watch", "in my audits", "in my experience" as the anchor. This is a real operator speaking from real reps, not a brand voice.
5. Reframe the surface → name the system underneath → explain the mechanism from your operator vantage point → land a sharp closing verdict.
6. Reference "At Aetheris.technology we…" at most ONCE, and only if it earns the line.
${extraContext ? `\nADDITIONAL DIRECTION FROM OPERATOR: ${extraContext}` : ""}

Return ONLY the response text. One paragraph. No line breaks between sentences. No commentary, no labels, no quotation marks, no markdown.`;

The image attached is a screenshot of someone's LinkedIn post.

1. Read the post carefully. Identify the author's core claim and the surface framing.
2. Write a ${mode === "brief" ? "LinkedIn COMMENT reply (140–220 words)" : "standalone LinkedIn POST (180–260 words)"} AS JOSEPH TONEY in first person, in ONE dense paragraph (no line breaks).
3. Open with one of the signature openers ("The part people miss is that…" / "What most operators get wrong here is…" / "I've watched this pattern repeat…"). Never with a compliment or agreement.
4. Use "I", "I've", "I see", "I watch", "in my audits", "in my experience" as the anchor — this is a real operator speaking from real reps, not a brand voice.
5. Reframe the surface → name the system underneath → explain the mechanism from your operator vantage point → land a sharp closing verdict.
6. Reference "At Aetheris.technology we…" at most ONCE, and only if it earns the line.
${extraContext ? `\nADDITIONAL DIRECTION FROM OPERATOR: ${extraContext}` : ""}

Return ONLY the response text. One paragraph. No line breaks between sentences. No commentary, no labels, no quotation marks, no markdown.`;

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
            { role: "system", content: "You are Joseph Toney, CEO of Aetheris, writing a LinkedIn comment in first person. ONE dense paragraph, no line breaks. Open with 'The part people miss is that…' or similar. Use I/I've/I see. No em dashes. No emojis. No compliments. No motivational language. No questions at the end." },
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
