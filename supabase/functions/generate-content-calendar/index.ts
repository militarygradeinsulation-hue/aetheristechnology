import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function fallbackCalendar(industry: string, goals = "Lead generation and authority building", platforms = "LinkedIn primary") {
  const angles = [
    "where leads disappear after first contact",
    "why busy pipelines still leak revenue",
    "the hidden cost of vague positioning",
    "how follow-up gaps become margin loss",
    "why more traffic does not fix a broken offer",
    "the proof signals buyers need before they call",
  ];

  return {
    _fallback: true,
    _fallbackReason: "AI calendar generation timed out, so a safe operator calendar was returned instead.",
    days: Array.from({ length: 30 }, (_, i) => {
      const angle = angles[i % angles.length];
      const day = i + 1;
      return {
        day,
        topic: `${industry}: ${angle}`,
        hook: day % 3 === 0 ? "Busy is not proof." : day % 3 === 1 ? "Your pipeline is leaking." : "More leads will not save this.",
        platform: platforms.includes("Facebook") && day % 7 === 5 ? "Facebook" : "LinkedIn",
        contentType: day % 7 === 0 ? "carousel" : day % 5 === 0 ? "poll" : "post",
        bestTime: day % 2 === 0 ? "8:15 AM ET" : "4:30 PM ET",
        caption: `${industry} teams do not usually lose revenue in one dramatic failure.\n\nThey lose it in tiny handoffs nobody owns.\n\n${angle}.\n\nThat is the leak.\n\n${goals}.\n\nRun the Leak Audit before you buy another tool.`,
        hashtags: ["#businessforensics", "#revenueleaks", "#operations"],
      };
    }),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { industry, goals, platforms } = await req.json();
    if (!industry) {
      return new Response(JSON.stringify({ error: "Industry is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `You write LinkedIn posts in the dominant 2026 short-line / one-sentence-per-line style. Mobile-first. Massive whitespace. Every sentence on its own line.

INDUSTRY: ${industry}
GOALS: ${goals || "Lead generation and authority building"}
PLATFORMS: ${platforms || "LinkedIn primary"}

═══════════════════════════════════════════════════════════
VOICE — diagnostic, operator, contrarian (never influencer/copy-bro)
═══════════════════════════════════════════════════════════
Lead with a correction, contradiction, or hidden truth.
Name the real mechanism.
Translate it into business language.
Show the consequence.
End with a sharp memorable line or one direct question.

Modes to rotate: Diagnostic (explain hidden failure), Translation (turn story into operating lesson), Permission (validate the reader, frame pain as evidence of progress). Combine two when it lands harder.

═══════════════════════════════════════════════════════════
VISUAL FORMATTING — non-negotiable
═══════════════════════════════════════════════════════════
✓ One sentence per line. Sometimes two short lines. Never a paragraph wall.
✓ Blank line between every 1–2 sentences. Whitespace is the design.
✓ Bold hook: 3–8 words, often with a specific number. First 1–2 lines must force the "see more" click.
✓ Bullets use emoji markers sparingly: 👉 ✅ 1️⃣ 💡 ↳ 🔴 🟡 🟢 (pick ONE marker style per post, don't mix).
✓ Use 2–3 emojis max for emphasis across the whole post. Never decorative.
✓ "Staircase" or numbered lists welcome for evidence/steps.
✓ Numbers in digits. Currency explicit. Time frames specific.
✓ CURRENCY RULE (NON-NEGOTIABLE): every dollar amount is US Dollars (USD), formatted like $1,200 or $1.4M. Never use €, £, ¥, ₹, EUR, GBP, JPY, CAD, AUD, or any other currency or symbol.

═══════════════════════════════════════════════════════════
THE 2-1-3 STRUCTURE (use as the default skeleton)
═══════════════════════════════════════════════════════════
1. Bold hook (3–8 words, often a number, contrarian or diagnostic)
2. Short context line (1–2 lines max)
3. [whitespace]
4. Short story / evidence (3–5 single-sentence lines)
5. [whitespace]
6. Hard truth — the mechanism nobody names (1–2 lines)
7. [whitespace]
8. Single-line CTA or question

═══════════════════════════════════════════════════════════
HARD BANS
═══════════════════════════════════════════════════════════
✗ Em dashes ( — ). Use periods or line breaks instead.
✗ Dense paragraphs. Walls of text.
✗ "Great post", "I agree", "In today's…", "In the age of AI", "game-changer", "leverage", "unlock", "synergy", "rockstar", "ninja"
✗ Generic openers: "Most people…", "If you…", "Stop…" used more than ONCE in 30 days
✗ AI tells. No "As an AI…" No "In conclusion…"
✗ Vague numbers. "Millions" is banned. "$1.4M/year" is required.

═══════════════════════════════════════════════════════════
HOOK VARIETY (rotate across 30 days — never repeat formula in same week)
═══════════════════════════════════════════════════════════
• Number opener: "$1.4M sat dead in his pipeline."
• Character opener: "She ran a $4M shop with 312 'open' deals."
• Contrarian claim: "Hiring isn't your problem."
• Diagnostic question: "Can your team name the leak?"
• Hidden truth: "What looks like growth is fragility wearing makeup."
• Reframe: "That's not a marketing problem. That's a clarity problem."

═══════════════════════════════════════════════════════════
OUTPUT JSON SCHEMA
═══════════════════════════════════════════════════════════
{
  "days": [
    {
      "day": 1,
      "topic": "specific angle this post diagnoses (be concrete)",
      "hook": "the bold opening line (3–8 words, scroll-stopping)",
      "platform": "LinkedIn",
      "contentType": "post" | "carousel" | "poll",
      "bestTime": "9:00 AM EST",
      "caption": "the FULL post body in short-line format. EVERY sentence on its own line. Blank line between 1-2 sentence groups. Use \\n for line breaks and \\n\\n for whitespace. 80–180 words. Follow the 2-1-3 structure unless format is carousel.",
      "hashtags": ["3-5 specific tags, lowercase, no fluff"]
    }
    // 30 entries total
  ]
}

Return ONLY the JSON. No markdown fences. No commentary.`;

    const aiRes = await Promise.race([
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(12_000),
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You write LinkedIn posts in the 2026 short-line / one-sentence-per-line style. Diagnostic operator voice. Massive whitespace. No em dashes. No copy-bro language. Return only valid JSON, no markdown fences.",
          },
          { role: "user", content: prompt },
        ],
      }),
      }),
      new Promise<Response>((_, reject) => setTimeout(() => reject(new Error("AI request timed out")), 12_500)),
    ]);

    if (!aiRes.ok) {
      const status = aiRes.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify(fallbackCalendar(industry, goals, platforms)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    let raw = aiData.choices?.[0]?.message?.content || "";
    if (!raw) throw new Error("AI returned empty response");
    raw = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("No JSON found in AI response");
    raw = raw.substring(start, end + 1);
    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      const cleaned = raw.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
      result = JSON.parse(cleaned);
    }

    // Strip em dashes server-side as a safety net
    if (Array.isArray(result?.days)) {
      result.days = result.days.map((d: any, i: number) => ({
        ...d,
        day: i + 1,
        hook: typeof d.hook === "string" ? d.hook.replace(/—/g, ".").replace(/–/g, ".") : d.hook,
        caption: typeof d.caption === "string" ? d.caption.replace(/—/g, ".").replace(/–/g, ".") : d.caption,
      }));
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-content-calendar error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate calendar";
    if (/abort|timeout|timed out|context canceled|AI request failed/i.test(message)) {
      return new Response(JSON.stringify(fallbackCalendar("general business")), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
