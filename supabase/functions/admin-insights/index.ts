import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { stats, topPages, recentLeads, eventBreakdown } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a senior growth strategist for Aetheris AI, a business consulting and AI technology company in Indianapolis, Indiana. You analyze website analytics data and provide 4-6 specific, actionable recommendations to increase views, clicks, conversions, and SEO performance.

Focus areas:
- Which pages need more traffic or have high bounce potential
- Content gaps in the blog strategy
- CTA optimization opportunities
- LinkedIn engagement improvements
- Lead conversion tactics
- SEO keyword opportunities for "business consulting", "AI consulting", "operational diagnostics", "CRM automation" in the US market

Be direct, specific, and prioritize by impact. Use bullet points. Each recommendation should have a clear action and expected outcome.`;

    const userPrompt = `Here's the current website analytics data:

OVERVIEW:
- Unique Visitors: ${stats.visitors}
- Page Views: ${stats.pageViews}
- LinkedIn Clicks: ${stats.linkedInClicks}
- Form Submissions: ${stats.formSubmissions}
- Conversion Rate: ${stats.formSubmissions > 0 && stats.visitors > 0 ? ((stats.formSubmissions / stats.visitors) * 100).toFixed(1) : '0'}%

TOP PAGES BY VIEWS:
${topPages.map((p: any) => `- ${p.page}: ${p.views} views`).join('\n')}

EVENT BREAKDOWN:
${eventBreakdown.map((e: any) => `- ${e.type}: ${e.count}`).join('\n')}

RECENT LEADS (last 5):
${recentLeads.map((l: any) => `- ${l.name} (${l.company || 'No company'}) - Interest: ${l.service_interest || 'General'} - ${l.created_at}`).join('\n')}

Based on this data, give me 4-6 specific recommendations to improve traffic, engagement, and conversions. Prioritize by potential impact.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "No recommendations available.";

    return new Response(JSON.stringify({ recommendations: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
