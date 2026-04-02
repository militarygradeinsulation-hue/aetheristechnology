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
    const { url } = await req.json();
    if (!url) {
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

    // Easter egg: detect Aetheris own domain
    const parsedHost = new URL(formattedUrl).hostname.replace(/^www\./, "").toLowerCase();
    if (parsedHost === "aetheris.technology" || parsedHost === "aetheristechnology.lovable.app") {
      const easterEgg = {
        score: 97,
        grade: "A+",
        companyName: "Aetheris AI",
        executiveSummary: "Nice try. You just pointed the cannon at the people who built it. Aetheris Technology operates at a diagnostic-grade level of strategic architecture — the same system producing this report was engineered in-house. There are no revenue leaks here. Only leverage.",
        gaps: [
          {
            category: "Meta",
            severity: "info",
            title: "You Can't Use My Own Tricks Against Me",
            description: "This scanner was built by Aetheris AI. Scanning our own site is like asking the locksmith to pick his own lock — he already knows where every pin sits. The architecture, messaging, conversion flow, and technical SEO were designed by the same system generating this report.",
            annualCost: "$0",
            recommendedFix: "Scan your own website instead — that's where the gaps are.",
            projectedROI: "∞",
          },
          {
            category: "Brand Consistency",
            severity: "info",
            title: "Strategic Architecture: Operating as Designed",
            description: "Every element on aetheris.technology — from the copy cadence to the CTA placement to the schema markup — was intentionally engineered for conversion. The site serves as a living case study of what we build for clients.",
            annualCost: "$0",
            recommendedFix: "No fix needed. This is the standard.",
            projectedROI: "N/A",
          },
        ],
        roadmap: [
          { month: "Month 1", action: "Scan YOUR website instead", estimatedCost: "$0", projectedRecovery: "Let's find out" },
        ],
        roiTable: [
          { category: "Aetheris Operations", currentWaste: "$0", projectedRecovery: "Already optimized" },
        ],
        nextSteps: [
          "Enter your own website URL above and see what we find.",
          "Book a call if you want the full diagnostic treatment.",
          "Stop trying to reverse-engineer the magician — hire him.",
        ],
        competitiveBrief: "Aetheris AI built this tool. Scanning it is flattering, but the real value is pointing it at your business. We already know what's under our hood.",
      };

      return new Response(JSON.stringify(easterEgg), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Scraping URL:", formattedUrl);

    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ["markdown", "links"],
        onlyMainContent: false,
        waitFor: 3000,
      }),
    });

    const scrapeData = await scrapeResponse.json();

    if (!scrapeResponse.ok) {
      console.error("Firecrawl error:", scrapeData);
      return new Response(
        JSON.stringify({ error: scrapeData.error || "Failed to scrape website" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
    const links = scrapeData.data?.links || scrapeData.links || [];
    const metadata = scrapeData.data?.metadata || scrapeData.metadata || {};

    console.log("Scrape successful, analyzing with AI...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a senior digital strategist and website auditor for Aetheris Technology, an Indianapolis-based strategic business architecture firm. You produce Executive Diagnostic Reports that identify revenue leaks, operational gaps, and strategic opportunities. Be direct, specific, and reference actual content from the site. Every gap must include an estimated annual cost and a projected ROI from fixing it.`,
          },
          {
            role: "user",
            content: `Produce a full Executive Diagnostic Report for this website.

URL: ${formattedUrl}
Title: ${metadata.title || "Unknown"}
Description: ${metadata.description || "None found"}
Number of links found: ${links.length}

Page content (markdown):
${markdown.slice(0, 10000)}

Return a comprehensive analysis using the website_diagnostic_report function. Be extremely specific — reference actual page elements, missing sections, weak copy, and real business impact. Every gap needs a dollar estimate for annual revenue leak and projected recovery.

For the executive summary: provide an overall letter grade (A-F), estimate total annual revenue leak, and give a 2-3 sentence positioning assessment.

For gaps: include 12-16 findings across categories (SEO, CTA, Messaging, Mobile, Speed, Brand Consistency, Content, Lead Capture). Each gap needs: category, severity, title, detailed description (3-4 sentences), estimated annual cost of the gap, recommended fix, and projected ROI percentage from fixing it.

For the roadmap: create a 6-month implementation plan with monthly actions, estimated costs, and projected revenue recovery.

For ROI projections: break down by category showing current annual waste vs projected recovery after fixes.

For next steps: provide 5 prioritized action items.

For competitive brief: a 2-3 sentence assessment of their competitive digital positioning.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "website_diagnostic_report",
              description: "Return a full executive diagnostic report",
              parameters: {
                type: "object",
                properties: {
                  score: { type: "number", description: "Overall score 0-100" },
                  grade: { type: "string", description: "Letter grade A-F" },
                  companyName: { type: "string", description: "Company name extracted from site" },
                  executiveSummary: { type: "string", description: "2-3 paragraph executive summary with overall assessment, revenue leak estimate, and positioning" },
                  gaps: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: { type: "string", enum: ["SEO", "CTA", "Messaging", "Mobile", "Speed", "Brand Consistency", "Content", "Lead Capture"] },
                        severity: { type: "string", enum: ["critical", "warning", "info"] },
                        title: { type: "string" },
                        description: { type: "string" },
                        annualCost: { type: "string", description: "Estimated annual revenue leak e.g. '$12,000 - $24,000'" },
                        recommendedFix: { type: "string", description: "Specific actionable fix" },
                        projectedROI: { type: "string", description: "Projected ROI percentage from fixing e.g. '150-300%'" },
                      },
                      required: ["category", "severity", "title", "description", "annualCost", "recommendedFix", "projectedROI"],
                    },
                  },
                  roadmap: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        month: { type: "string", description: "e.g. 'Month 1'" },
                        action: { type: "string" },
                        estimatedCost: { type: "string" },
                        projectedRecovery: { type: "string" },
                      },
                      required: ["month", "action", "estimatedCost", "projectedRecovery"],
                    },
                  },
                  roiTable: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: { type: "string" },
                        currentWaste: { type: "string" },
                        projectedRecovery: { type: "string" },
                      },
                      required: ["category", "currentWaste", "projectedRecovery"],
                    },
                  },
                  nextSteps: {
                    type: "array",
                    items: { type: "string" },
                    description: "5 prioritized action items",
                  },
                  competitiveBrief: { type: "string", description: "2-3 sentence competitive positioning assessment" },
                },
                required: ["score", "grade", "companyName", "executiveSummary", "gaps", "roadmap", "roiTable", "nextSteps", "competitiveBrief"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "website_diagnostic_report" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    console.log("AI response received");

    let analysis = { score: 50, grade: "C", companyName: "Unknown", executiveSummary: "", gaps: [], roadmap: [], roiTable: [], nextSteps: [], competitiveBrief: "" };
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        analysis = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Failed to parse tool call arguments:", e);
      }
    }

    // Save to database - store full report in gaps column
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    await fetch(`${supabaseUrl}/rest/v1/website_scans`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        url: formattedUrl,
        score: analysis.score,
        gaps: analysis,
      }),
    });

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scan-website error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
