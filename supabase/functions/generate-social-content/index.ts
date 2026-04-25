import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { url } = body;
    const autopsyNumber = typeof body.autopsyNumber === "number" ? body.autopsyNumber : Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)) % 999;
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: "Firecrawl not configured" }), {
        status: 500,
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

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    // Scrape the website
    const scrapeRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
    });

    const scrapeData = await scrapeRes.json();
    const siteContent = scrapeData?.data?.markdown || scrapeData?.markdown || "";

    if (!siteContent || siteContent.length < 50) {
      return new Response(JSON.stringify({ error: "Could not extract enough content from the website." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const truncated = siteContent.substring(0, 8000);

    const prompt = `You are a Business Forensics Operator writing LinkedIn content for the company described below. You are NOT a consultant, NOT a thought leader, NOT an AI guru. You find where businesses bleed and you stop the bleeding.

WEBSITE CONTENT:
${truncated}

Generate a Forensic Content Pack using the five-format architecture below. Return valid JSON, no markdown fences.

THE FIVE FORMATS:

FORMAT 1 — THE CASE FILE (flagship, 2 posts)
Forensic case studies. The Tuesday Case File is ALWAYS the Autopsy series — title format: "Autopsy #N: [vertical] — [the leak]" (N is provided as autopsyNumber). Each has:
- "caseId": a short alphanumeric case ID (e.g. "CF-0041")
- "status": "ACTIVE"
- "hook": THE HOOK — MANDATORY formula = $[specific dollar] + [specific %] + [named wound]. Example: "This $4M HVAC company lost 31% of inbound leads from a single CRM field nobody touched in 2 years."
- "finding": THE FINDING — one sentence, the core revenue leak discovered
- "evidence": THE EVIDENCE — 2-3 sentences, what was observed, specific data points
- "math": THE MATH — one line with specific dollar amounts or percentages (e.g. "$1.4M/year", "23% margin compression"), NEVER vague ("millions", "significant")
- "fixTease": THE FIX — 1-2 sentences teasing the fix WITHOUT giving it away. End with tension.
- "lesson": THE LESSON — one sentence, the transferable pattern
- "format": "case_file"
- "isAutopsy": boolean — true ONLY for the Tuesday post. If true, prepend title with "Autopsy #N:"
- "isCarousel": boolean — at least ONE of the 2 case files per week MUST be a carousel
- "carouselSlides": if isCarousel=true, array of 7-10 slide objects { "slideNumber": 1, "headline": "...", "body": "..." }

FORMAT 2 — LEAK OF THE WEEK (1 post)
Name one specific leak pattern. Define it. Show the signs. Teach them to spot it. Don't give away the fix.
- "leakName": the named leak pattern (e.g. "The Invisible Handoff Gap")
- "definition": 1-2 sentences defining this leak
- "signs": array of 3-4 bullet-point signs to watch for
- "spotIt": 2-3 sentences on how to detect this in their own business
- "format": "leak_of_week"

FORMAT 3 — THE DEAD SIMPLE DIAGNOSTIC (1 post)
One 60-second test a reader can run on themselves. Shareable. Saveable. Carousel-eligible.
- "testName": name of the diagnostic (e.g. "The 3-Email Test")
- "test": the actual test steps, 3-5 numbered steps
- "threshold": THE THRESHOLD — what good vs. bad looks like, specific numbers
- "whatItMeans": WHAT IT MEANS — 2-3 sentences interpreting results
- "format": "diagnostic"
- "isCarousel": boolean — strongly preferred true (cheat-sheet format gets 7x dwell)
- "carouselSlides": if isCarousel=true, array of 7-10 slide objects { "slideNumber": 1, "headline": "...", "body": "..." }

FORMAT 4 — OPERATOR'S JOURNAL (2 posts)
Unpolished. Personal. Short. Counter-signals the guru aesthetic. NO template. Field notes. 3-8 lines max. A thing you saw, a thing that broke, a thing you're thinking about. No CTA. No link. This is where the human shows up.
- "body": the raw field note text, 3-8 lines
- "format": "operators_journal"
(No other fields. No hook. No cta. No structure.)

FORMAT 5 — THE CONTRARIAN (1 post)
One defensible dissent. Not rage-bait. Pattern-recognition dissent.
- "claim": THE CLAIM — the consensus position being challenged, one sentence
- "evidence": THE EVIDENCE — 2-3 sentences with specific data proving the consensus wrong
- "counter": THE COUNTER — the strongest argument against your position, acknowledged honestly
- "position": THE POSITION — your final stance, 1-2 sentences, defensible
- "format": "contrarian"

═════════════════════════════════════════════════════════
THE SOFT FRONT DOOR (mandatory on every CTA-eligible post)
═════════════════════════════════════════════════════════
Every post EXCEPT operators_journal MUST end with a "Soft Front Door" CTA — never a pitch.
Format: "Comment [KEYWORD] for the [asset name]."
Each post needs a UNIQUE keyword (e.g., AUTOPSY, BLEED, LEAK14, CHECKLIST, SCAN, FORENSIC, PROOF).
The DM that follows sends the asset with ZERO pitch + ONE curious follow-up question.

Add this object to every non-journal post:
"softFrontDoor": {
  "keyword": "AUTOPSY",
  "assetName": "the 14-point HVAC leak checklist (PDF)",
  "publicCta": "Comment AUTOPSY and I'll DM you the 14-point checklist I use to find this leak in any HVAC P&L.",
  "dmScript": "Here's the checklist you asked for — [link]. No pitch.",
  "followUpQuestion": "Quick curious question — when's the last time anyone audited [specific system from your business]?"
}

WEEKLY SCHEDULE (return as "weeklySchedule"):
[
  {"day": "Monday", "format": "case_file", "goal": "Flagship forensic case study"},
  {"day": "Tuesday", "format": "operators_journal", "goal": "Field note — human signal"},
  {"day": "Wednesday", "format": "leak_of_week", "goal": "Name and define one leak pattern"},
  {"day": "Thursday", "format": "diagnostic", "goal": "60-second self-test"},
  {"day": "Friday", "format": "contrarian", "goal": "Defensible dissent"},
  {"day": "Saturday", "format": "operators_journal", "goal": "Weekend field note"},
  {"day": "Sunday", "format": "case_file", "goal": "Second case file of the week"}
]

Return JSON structure:
{
  "businessName": "detected business name",
  "caseFiles": [2 case file objects],
  "leakOfTheWeek": [1 leak object],
  "deadSimpleDiagnostics": [1 diagnostic object],
  "operatorsJournal": [2 journal objects],
  "contrarians": [1 contrarian object],
  "weeklySchedule": [7 schedule entries]
}

STRUCTURAL DNA — STEAL STRUCTURE, NOT VOICE:
You don't steal voice. You steal structure. Model post architectures after proven formats from adjacent categories. The structure should be invisible to the reader — they see YOUR forensic content, not someone else's template.

Format-specific structural models:
- CASE FILES: Use Hormozi's "named framework + reveal-then-math" structure (claim → walk through logic → counterintuitive conclusion). Use Harry Dry's 3-beat pacing (situation, decision, result). For narrative variants, use Sam Parr's "I met a guy who…" story openers with specific-dollar reveals. For ownership-framed cases, use Jocko's command-style sentences. Use Tommy Mello's operational granularity and specific-revenue hooks.
- LEAK OF THE WEEK: Use Rory Sutherland's "everybody thinks X but actually Y" reversal hook. Observational precision — write like you've noticed something nobody else has.
- DIAGNOSTIC: Use Justin Welsh's scroll-stop hook formulas (flat declarative, specific number, pattern interrupt) combined with Hormozi's framework-naming approach.
- OPERATOR'S JOURNAL: Use Naval's aphoristic stacking — one idea, one line, move on. Sequences of short declaratives that build a worldview. Also draw from Morgan Housel's "one thing I've noticed" meditation format and Derek Sivers' extreme brevity (a 40-word post that hits harder than 800 words).
- CONTRARIAN: Use Codie Sanchez's "here's what nobody tells you about [industry]" frame. Flip conventional wisdom with evidence.

Pacing rule for ALL formats: Hormozi-style short paragraphs. 1-3 lines max per paragraph. Air on the page.
Hooks for ALL formats: Justin Welsh's scroll-stop formulas — flat declarative opening, specific number in first 2 lines, pattern interrupt.

GUARDRAILS:
- Never mimic the voice of anyone in AI consulting
- Never echo playground/parks industry voices directly
- Steal bones, not skin — the structure must be invisible to the reader

THE SEVEN RULES — ENFORCE ALL OF THEM:
1. Every post either finds a leak, names a leak, or fixes a leak. If it does none of those three, don't write it.
2. No AI tells. No "As an AI-enabled…" No "In the age of AI…" You use AI. You don't worship it.
3. Every number is specific or it doesn't exist. "Millions" is weak. "$1.4M/year" is forensic.
4. Every CTA (where applicable) is the same CTA: "Run the 14-Point Leak Audit." One door. (Operator's Journal has NO CTA.)
5. Never explain the methodology unprompted. Demonstrate it. The work is the argument.
6. ONE-SENTENCE TEST: Before finalizing each post, ask — could an AI-consultant LinkedIn bot have written this? If yes, rewrite it until the answer is no.
7. When in doubt — cut it. The edit is the brand.

Reference actual products, services, and value props from the scraped website. Make findings specific to THIS business.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a Business Forensics Operator — not a consultant, not a thought leader. You find where businesses bleed and stop the bleeding. Write like you're telling a CEO the uncomfortable truth over whiskey. Raw. Blunt. Forensic. Return only valid JSON, no markdown fences. Every number must be specific. Every post must pass the One-Sentence Test: if an AI-consultant LinkedIn bot could have written it, rewrite it." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI request failed");
    }

    const aiData = await aiRes.json();
    let raw = aiData.choices?.[0]?.message?.content || "";
    raw = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const result = JSON.parse(raw);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-social-content error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate content";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
