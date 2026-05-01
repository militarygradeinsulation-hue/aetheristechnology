import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { FORENSIC_BLUEPRINT_COMPACT } from "../_shared/contentBlueprint.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Weekly rotation locked to the Five-Format Forensic Architecture
// Sun=0 ... Sat=6
const FORMAT_BY_DOW = [
  "Case File",            // Sun
  "Case File",            // Mon
  "Operator's Journal",   // Tue
  "Leak of the Week",     // Wed
  "Dead Simple Diagnostic", // Thu
  "Contrarian",           // Fri
  "Operator's Journal",   // Sat
];

const FORMAT_SPECS: Record<string, string> = {
  "Case File": `STRUCTURE: CASE ID (e.g. "CASE #0419-B") · STATUS: ACTIVE · THE FINDING (one-line diagnosis) · THE EVIDENCE (2-3 specific signals) · THE MATH (dollarized monthly leak) · THE FIX (teased, not given) · THE LESSON (one sentence). Caption is the post body itself, not a summary.`,
  "Leak of the Week": `STRUCTURE: Name the leak pattern (give it a brand-able term). Define it in one sentence. List 3 signs you have it. Tell them how to spot it in their own ops. DO NOT give the fix.`,
  "Dead Simple Diagnostic": `STRUCTURE: ONE 60-second test the reader can run right now. THE TEST (steps) · THE THRESHOLD (the number that means trouble) · WHAT IT MEANS (the diagnosis). No fluff.`,
  "Operator's Journal": `STRUCTURE: 3-8 short lines. No template. No CTA. No hashtags beyond 1-2 max. Field notes from the operator's week. Personal, unpolished, specific. Example openings: "Walked into a $7M shop today.", "Closed a file this morning.", "Got asked the same question for the 4th time this month."`,
  "Contrarian": `STRUCTURE: THE CLAIM (the popular belief) · THE EVIDENCE (why people believe it) · THE COUNTER (the data/pattern that breaks it) · THE POSITION (what to do instead). Defensible dissent — not rage-bait.`,
};

const HOOK_FORMULAS_LIST = `
HOOK FORMULAS (rotate — never use the same formula twice in 7 days):
1. ABOUT ME — "I spent [time] inside [N] CRMs. Here's the leak nobody names."
2. IF I — "If I opened your pipeline right now, the first thing I'd find is ___."
3. TO YOU — "To the operator running [role] without [specific report]: this is for you."
4. CAN YOU? — "Can your CRM tell you which deals went silent in the last 14 days? Mine can. Yours probably can't."
5. HE/SHE DID — "She ran a $4M shop with 312 'open' deals. 71 of them had been dead for 90+ days."
`;

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

    // Build the day-by-day format schedule starting from "today" so the
    // calendar lines up with the user's actual posting week.
    const today = new Date();
    const startDow = today.getDay();
    const schedule = Array.from({ length: 30 }, (_, i) => {
      const dow = (startDow + i) % 7;
      return {
        day: i + 1,
        dow,
        format: FORMAT_BY_DOW[dow],
      };
    });

    const scheduleTable = schedule
      .map((s) => `Day ${s.day} (${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][s.dow]}) → ${s.format}`)
      .join("\n");

    const prompt = `You are the content operator for Aetheris — a Business Forensics firm that finds revenue leaks inside HubSpot and other CRMs. You are NOT a marketing influencer. You are NOT a SaaS copywriter. You are an operator who has walked into hundreds of broken CRMs and named what's bleeding.

${FORENSIC_BLUEPRINT_COMPACT}

INDUSTRY FOCUS: ${industry}
GOALS: ${goals || "Generate qualified leads for the free Leak Audit, then convert into the $2,500 Forensic Diagnostic."}
PLATFORMS: ${platforms || "LinkedIn primary; cross-post to Facebook"}

═══════════════════════════════════════════════════════════
LOCKED 30-DAY FORMAT SCHEDULE (do not deviate)
═══════════════════════════════════════════════════════════
${scheduleTable}

═══════════════════════════════════════════════════════════
FORMAT SPECS — each post MUST follow the structure for its assigned format
═══════════════════════════════════════════════════════════
${Object.entries(FORMAT_SPECS).map(([k, v]) => `▸ ${k}\n  ${v}`).join("\n\n")}

${HOOK_FORMULAS_LIST}

═══════════════════════════════════════════════════════════
ANTI-REPETITION RULES (this is why the last calendar failed)
═══════════════════════════════════════════════════════════
HARD BANS — these phrases may appear ZERO times across 30 days:
  ✗ "If you use HubSpot, this is probably you"
  ✗ "Your HubSpot is hiding money"
  ✗ "I'll bet $1,000"
  ✗ "Open your HubSpot right now"
  ✗ "Stop blaming your sales team"
  ✗ "Most HubSpot admins don't realize"
  ✗ "The most expensive setting"
  ✗ Any hook that starts with "If you...", "Most...", "Stop..." more than ONCE in the month
  ✗ The word "HubSpot" in the FIRST 5 WORDS of more than 6 hooks total
  ✗ Emojis. Anywhere. Ever.
  ✗ "Game-changer", "leverage", "unlock", "synergy", "in today's...", "in the age of AI"

VARIETY MANDATES:
  ✓ At least 6 hooks must open with a NUMBER ("$1.4M sat...", "312 contacts...", "47 hours...")
  ✓ At least 5 hooks must open with a CHARACTER ("She ran...", "He opened...", "The CRO told me...")
  ✓ At least 4 hooks must be a QUESTION the reader has to answer in their head
  ✓ At least 3 hooks must use NEGATIVE FRAMING ("not...", "you're not losing leads — you're losing...")
  ✓ Topics rotate across: stalled deals, dead MQLs, owner overload, dirty data, ghosted quotes, lifecycle misuse, attribution lies, forecast fiction, slow follow-up, missing contact info, no-owner records, closed-lost reactivation, workflow drift, sequence fatigue, deal-stage decay, property bloat, source attribution, lead scoring, pipeline velocity, win-rate by stage, time-in-stage, rep ramp, manager dashboards, deal review cadence, quota math.
  ✓ NO topic may repeat within a 7-day window.

═══════════════════════════════════════════════════════════
CTA RULES
═══════════════════════════════════════════════════════════
  • Case File / Leak of the Week / Diagnostic / Contrarian → end with: "Run the 14-Point Leak Audit."
  • Operator's Journal → NO CTA. NO LINK. Just the field note.
  • One door only. Never offer alternatives.

═══════════════════════════════════════════════════════════
OUTPUT JSON SCHEMA
═══════════════════════════════════════════════════════════
{
  "days": [
    {
      "day": 1,
      "format": "Case File" | "Leak of the Week" | "Dead Simple Diagnostic" | "Operator's Journal" | "Contrarian",
      "topic": "specific leak/pattern this post diagnoses (NOT generic — name the exact dysfunction)",
      "hookFormula": "ABOUT ME | IF I | TO YOU | CAN YOU | HE-SHE DID | NUMBER | CHARACTER | QUESTION | NEGATIVE",
      "hook": "the actual opening line (1 sentence, scroll-stopping, follows formula)",
      "platform": "LinkedIn" | "Facebook" | "Instagram",
      "contentType": "post" | "carousel" | "video" | "poll",
      "bestTime": "9:00 AM EST",
      "caption": "the FULL post body — written in the assigned format's structure. Use line breaks. 60-180 words for short formats, up to 220 for Case File. Operator's Journal stays 40-90 words.",
      "hashtags": ["3-5 tags, ZERO for Operator's Journal beyond 0-1"]
    }
    // ... 30 entries, one per day, in the EXACT format order from the schedule above
  ]
}

Return ONLY the JSON. No markdown fences. No commentary.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content:
              "You are an operator-voice content strategist. You enforce the Forensic Content Blueprint. You never repeat hook patterns. You never write like a SaaS marketer. Return only valid JSON, no markdown fences.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI request failed");
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

    // Server-side enforcement: stamp the locked format onto each day so the UI
    // can't drift even if the model re-orders things.
    if (Array.isArray(result?.days)) {
      result.days = result.days.map((d: any, i: number) => ({
        ...d,
        day: i + 1,
        format: schedule[i]?.format ?? d.format,
      }));
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-content-calendar error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate calendar";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
