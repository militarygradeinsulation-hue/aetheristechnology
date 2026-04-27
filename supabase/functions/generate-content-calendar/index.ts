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

    const prompt = `You are a content marketing strategist for Aetheris — a Business Forensics Operator that finds revenue leaks inside HubSpot and other CRMs. Create a detailed 30-day content calendar SPECIFICALLY targeting HubSpot users and CRM operators.

INDUSTRY: ${industry}
GOALS: ${goals || "Lead gen for HubSpot CRM audits + brand awareness with revenue ops, sales leaders, and HubSpot admins"}
PLATFORMS: ${platforms || "LinkedIn, Facebook, Instagram"}

Return valid JSON:
{
  "days": [
    30 objects, each with:
    "day": 1-30,
    "topic": "main topic for the day — must be tied to HubSpot, CRM hygiene, pipeline leaks, sales ops, or revenue recovery",
    "hook": "scroll-stopping opening line written DIRECTLY to a HubSpot user or CRM operator",
    "platform": "primary platform",
    "contentType": "post/carousel/video/story/poll",
    "bestTime": "e.g. 9:00 AM EST",
    "caption": "full post caption (2-3 sentences) — speak to HubSpot/CRM users, name the leak, name the fix",
    "hashtags": ["3-5 relevant hashtags — mix HubSpot/CRM/RevOps tags with topic-specific tags"]
  ]
}

HOOK RULES (CRITICAL — every hook must follow ONE of these patterns, customized to the day's topic):
- "If you use HubSpot, this is probably you: [specific painful symptom]"
- "I'll bet $1,000 I can find [specific leak] in your HubSpot in under 30 minutes"
- "Your HubSpot is hiding money. Here's where: [topic-specific leak]"
- "Most HubSpot admins don't realize [counterintuitive truth about today's topic]"
- "Open your HubSpot right now. Go to [specific view]. I guarantee you'll find [leak]"
- "If your HubSpot has [specific symptom], you're losing roughly \\$X per month"
- "Stop blaming your sales team. Your HubSpot is doing this: [specific dysfunction]"
- "The most expensive setting in HubSpot is the one you've never touched: [topic]"
- "Three things every HubSpot org gets wrong about [topic] — and how to fix them in one afternoon"
- "Sales leaders: if you've never run [specific report] in HubSpot, you don't actually know your pipeline"

EVERY hook must be CUSTOM to that day's topic. Do not reuse the same hook pattern for the same topic. Mention HubSpot, CRM, pipeline, deals, contacts, properties, workflows, sequences, lifecycle stages, deal stages, or owners EXPLICITLY.

CONTENT MIX (every 30 days):
- ~12 posts: HubSpot-specific leaks (stalled deals, dead contacts, dirty data, misfiring workflows, missing follow-ups, ghosted quotes, no-owner records)
- ~6 posts: Broader CRM/RevOps issues (attribution, lifecycle stage misuse, lead scoring lies, vanity pipeline metrics)
- ~6 posts: Revenue recovery wins / case-file style (anonymized leak found → \\$ amount recovered)
- ~3 posts: Hot takes / contrarian (e.g., "HubSpot reports lie", "your forecast is fiction")
- ~3 posts: The offer — free HubSpot leak audit, then \\$2,500 setup + \\$1,500/mo + 15% of recovered revenue

OTHER RULES:
- Mix content types throughout the month
- Each hook must be unique, specific, and curiosity-driven
- Hashtags should include a mix from: #HubSpot #HubSpotCRM #RevOps #SalesOps #CRM #PipelineLeaks #RevenueOperations #SalesLeaders #B2BSales plus topic-specific tags
- Tone: forensic, blunt, operator — not influencer, not consultant
- Promotional posts must reference the free audit + the recovery model (no payment unless we recover money)`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a content calendar expert. Return only valid JSON, no markdown fences." },
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
    // Find first { and last } to extract JSON object
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("No JSON found in AI response");
    raw = raw.substring(start, end + 1);
    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      // Try fixing trailing commas
      const cleaned = raw.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
      result = JSON.parse(cleaned);
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
