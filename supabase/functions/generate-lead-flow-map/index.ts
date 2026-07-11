import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      businessName,
      website,
      industry,
      leadSources,
      monthlyLeads,
      currentFunnel,
      biggestDropoff,
      avgDealSizeUsd,
    } = await req.json();

    if (!leadSources || !currentFunnel) {
      return new Response(
        JSON.stringify({ error: "leadSources and currentFunnel are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `You are a revenue operations forensics operator. Diagnose the lead flow of this business and find where deals leak. Be blunt, specific, and prescriptive. All money values are USD.

BUSINESS CONTEXT
- Name: ${businessName || "Not provided"}
- Website: ${website || "Not provided"}
- Industry: ${industry || "Not provided"}
- Approx leads / month: ${monthlyLeads || "Unknown"}
- Avg deal size (USD): ${avgDealSizeUsd || "Unknown"}
- Biggest known dropoff: ${biggestDropoff || "Unknown"}

LEAD SOURCES
${leadSources}

CURRENT FUNNEL (first touch to closed deal)
${currentFunnel}

Return valid JSON only, no markdown fences:
{
  "businessName": "detected or provided",
  "healthScore": 0-100,
  "monthlyLeakEstimateUsd": integer (estimated $ leaking every month),
  "annualLeakEstimateUsd": integer,
  "overallDiagnosis": "3-4 sentence forensic diagnosis",
  "mermaid": "A valid mermaid flowchart TD showing lead sources -> stages -> outcomes with leak arrows labeled in %; DO NOT wrap in code fences; use plain node ids like A, B, C; keep it under 20 nodes",
  "stages": [
    { "name": "Stage name", "conversionRate": "e.g. 12%", "benchmark": "e.g. 25-35%", "verdict": "healthy | leaking | critical", "note": "what's happening here" }
  ],
  "leakPoints": [
    {
      "location": "Exact spot in the funnel",
      "severity": "critical | high | moderate",
      "whatBreaks": "Plain English of the failure",
      "estimatedMonthlyLossUsd": integer,
      "rootCause": "The real cause, not the symptom"
    }
  ],
  "sourceBreakdown": [
    { "source": "Paid / Organic / Referral / Outbound / etc", "strength": "strong | average | weak", "note": "what to do with it" }
  ],
  "topFixes": [
    {
      "rank": 1,
      "fix": "Specific action, not generic advice",
      "impact": "Estimated $ recovered / month or % lift",
      "effort": "low | medium | high",
      "timeToImplement": "e.g. 3 days"
    }
  ],
  "quickWins": ["Fix within 24-48 hours", "..."],
  "sevenDayPlan": [
    { "day": 1, "action": "Concrete step" }
  ]
}

RULES
- USD only. Never use €, £, or other currencies.
- Find 4-7 leak points, 3-5 top fixes ranked by ROI, exactly 7 days in the plan.
- Every number must be defensible from the data provided.
- The mermaid diagram MUST be syntactically valid: start with "flowchart TD" and use --> arrows. Do not include emojis.
- CRITICAL JSON RULES: return ONLY a raw JSON object. Every string value must be JSON-safe: escape every internal double-quote as \\", every newline as \\n, and every backslash as \\\\. The "mermaid" value is ONE single JSON string — use \\n between diagram lines, never a real newline. Do not include markdown fences or comments.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(45_000),
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a revenue operations forensics operator. Return only valid JSON matching the requested schema. No markdown fences, no prose outside the JSON." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited. Try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI request failed: ${status}`);
    }

    const aiData = await aiRes.json();
    let raw = aiData.choices?.[0]?.message?.content || "";
    raw = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    // Slice to the outermost { ... } in case the model wrapped it.
    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");
    if (first !== -1 && last > first) raw = raw.slice(first, last + 1);

    function tryParse(s: string) { try { return JSON.parse(s); } catch { return null; } };

    let result: any = tryParse(raw);

    // Fallback 1: strip control chars (except \n \r \t).
    if (!result) {
      const cleaned = raw.replace(/[\x00-\x1F\x7F]/g, (ch: string) =>
        ch === "\n" || ch === "\r" || ch === "\t" ? ch : "");
      result = tryParse(cleaned);
    }

    // Fallback 2: escape raw newlines/tabs *inside* JSON strings — the common
    // failure mode when a model puts a multi-line mermaid block in one field.
    if (!result) {
      let out = "";
      let inStr = false;
      let esc = false;
      for (const ch of raw) {
        if (inStr) {
          if (esc) { out += ch; esc = false; continue; }
          if (ch === "\\") { out += ch; esc = true; continue; }
          if (ch === '"') { out += ch; inStr = false; continue; }
          if (ch === "\n") { out += "\\n"; continue; }
          if (ch === "\r") { out += "\\r"; continue; }
          if (ch === "\t") { out += "\\t"; continue; }
          out += ch;
        } else {
          if (ch === '"') { inStr = true; out += ch; continue; }
          out += ch;
        }
      }
      result = tryParse(out);
    }

    if (!result) {
      console.error("generate-lead-flow-map: unparseable model output. First 400 chars:", raw.slice(0, 400));
      return new Response(
        JSON.stringify({ error: "AI returned malformed JSON. Try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-lead-flow-map error:", error);
    const message = error instanceof Error ? error.message : "Failed to map lead flow";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
