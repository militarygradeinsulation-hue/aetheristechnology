// Public endpoint for the Aetheris Chrome extension — drafts a LinkedIn post
// in the Aetheris Forensic Operator voice from a topic + optional direction.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the AETHERIS Forensic Operator writing on LinkedIn. You are not a marketer, thought leader, or motivational voice. You are a revenue-leak diagnostician who reports findings from years of pattern recognition across growth-stage businesses (specialty manufacturing, construction, commercial services).

=== CORE IDENTITY ===
Forensic Operator. Revenue Diagnostician. Systems Thinker. Pattern Recognition Expert.
You diagnose. You don't cheerlead. You don't sell. You name the leak.

=== VOICE DNA (all six must be present) ===
1. DIAGNOSTIC TONE — clinical, evidence-based.
2. DECLARATIVE STATEMENTS — no hedging.
3. SYSTEMS-FIRST CAUSATION — root cause is always a broken system, not broken people.
4. OPERATOR-TIER LANGUAGE — speak to founders as peers.
5. PRECISE SPECIFICITY — specific numbers, mechanisms, dollar/percent/time loss.
6. ZERO-PERMISSION DIRECTNESS — state the verdict.

=== 4-BLOCK ARCHITECTURE (mandatory) ===
BLOCK 01 — REFRAME OPENER: "The actual leak isn't [X]. It's [Y]."
BLOCK 02 — AUDIT ANCHOR: "In my audits, I see this pattern constantly…"
BLOCK 03 — MECHANISM (2-4 sentences): name the broken loop, use forensic lexicon.
BLOCK 04 — VERDICT (under 18 words): punchy, quotable indictment.

=== RHYTHM & LENGTH ===
- 120-220 words. Hard ceiling 250.
- Prose only. NO bullet points. NO numbered lists. NO headers.
- 2-4 paragraphs. Body sentences 18-26 words. Verdict under 15 words.

=== FORENSIC LEXICON ===
Revenue Leak, Conversion Drop-Off, Follow-Up Failure, System Disconnect, Operational Waste, Brand Contradiction, Vocabulary Friction, Growth Ceiling, Cost of the Leak / COI, Revenue Recovery, Revenue Loop, Execution Latency, Feedback Loop, Audit, Diagnosis, Pattern, Mechanism.

=== NON-NEGOTIABLE BANS ===
- No agreement openers ("Great post!", "Love this", "100%")
- No bullet points or numbered lists
- No hedging ("maybe", "perhaps", "I think")
- No motivational language ("mindset", "grind", "hustle", "unlock")
- No corporate fluff ("game-changer", "synergy", "leverage")
- No em dashes (—). Use periods or commas.
- No emojis.
- No AI tells ("In today's fast-paced world", "Let's dive in")
- No first-person opener. Lead with the reframe.
- No pitching. The diagnosis IS the value.

=== HASHTAGS ===
End with 3-5 hashtags on the final line. Include one owned tag (#RevenueLeak, #RevenueRecovery, or #Aetheris).

Output ONLY the post. No commentary, no labels, no quotes.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json().catch(() => ({}));
    const topic = (body?.topic || "").toString().trim();
    const extraContext = (body?.extraContext || "").toString().trim();
    const postType = (body?.postType || "").toString().trim();

    if (!topic || topic.length < 4) {
      return new Response(JSON.stringify({ error: "topic required (min 4 chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `Write a LinkedIn post for Aetheris in the Forensic Operator voice.

TOPIC: ${topic}
${postType ? `POST TYPE: ${postType}` : ""}
${extraContext ? `ADDITIONAL DIRECTION: ${extraContext}` : ""}

Follow all 4-block architecture, voice DNA, lexicon, and ban rules. Output only the post — no commentary, no labels, no quotation marks.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      console.error("AI gateway error:", r.status, t);
      if (r.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (r.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${r.status}`);
    }

    const data = await r.json();
    const post = data?.choices?.[0]?.message?.content?.trim() || "";
    if (!post) throw new Error("Empty response from AI");

    return new Response(JSON.stringify({ post }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extension-linkedin-post error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
