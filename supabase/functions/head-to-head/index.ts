// head-to-head — Compare two URLs side-by-side and score who's winning where.
// Uses Firecrawl to scrape both sites (markdown + branding + summary), then
// asks Lovable AI Gateway (Gemini 2.5 Pro) to synthesize a forensic head-to-head
// verdict: category scores, winners, why, and specific actions for "you".
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

function normalizeUrl(input: string): string | null {
  try {
    const u = new URL(input.startsWith("http") ? input : `https://${input}`);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    const host = u.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) return null;
    return u.toString();
  } catch {
    return null;
  }
}

async function fcScrape(url: string): Promise<any | null> {
  if (!FIRECRAWL_API_KEY) return null;
  try {
    const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      signal: AbortSignal.timeout(30_000),
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "branding", "links"],
        onlyMainContent: true,
        timeout: 25_000,
      }),
    });
    if (!r.ok) {
      console.warn("fc scrape not ok", url, r.status);
      return null;
    }
    const j = await r.json();
    return j?.data ?? j ?? null;
  } catch (e) {
    console.warn("fc scrape failed", url, String(e));
    return null;
  }
}

function trim(s: any, n: number): string {
  if (typeof s !== "string") return "";
  return s.length > n ? s.slice(0, n) + "…[truncated]" : s;
}

function buildEvidence(label: string, url: string, data: any) {
  return {
    label,
    url,
    summary: trim(data?.summary, 1200),
    markdown: trim(data?.markdown, 6000),
    branding: data?.branding
      ? {
          colors: data.branding.colors,
          fonts: data.branding.fonts,
          colorScheme: data.branding.colorScheme,
        }
      : null,
    title: data?.metadata?.title || "",
    description: data?.metadata?.description || "",
    linkCount: Array.isArray(data?.links) ? data.links.length : 0,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);
    if (!FIRECRAWL_API_KEY) return json({ error: "FIRECRAWL_API_KEY not configured" }, 500);

    const body = await req.json().catch(() => ({}));
    const yourUrl = normalizeUrl(String(body?.yourUrl || "").trim());
    const rivalUrl = normalizeUrl(String(body?.rivalUrl || "").trim());
    const takeover = !!body?.takeover;
    if (!yourUrl || !rivalUrl) return json({ error: "Provide two valid URLs" }, 400);
    if (yourUrl === rivalUrl) return json({ error: "URLs must be different" }, 400);

    const [yourData, rivalData] = await Promise.all([fcScrape(yourUrl), fcScrape(rivalUrl)]);
    if (!yourData && !rivalData) return json({ error: "Failed to scrape both URLs" }, 502);

    const evidence = {
      you: buildEvidence("YOU", yourUrl, yourData || {}),
      rival: buildEvidence("RIVAL", rivalUrl, rivalData || {}),
    };

    const system = `You are Aetheris, a forensic business operator. You compare two companies by their public websites and deliver a blunt, evidence-cited head-to-head verdict.

CURRENCY RULE: All money values are US Dollars ($). Never €, £, ¥, EUR, GBP.

Output STRICT JSON only, no prose, matching this schema:
{
  "headline": string,                       // one-sentence verdict, e.g. "You're winning positioning. They're winning proof."
  "overall": {
    "youScore": number,                     // 0-100
    "rivalScore": number,                   // 0-100
    "winner": "you" | "rival" | "tie",
    "gapSummary": string                    // 1-2 sentence why
  },
  "battlefield": {
    "youMonthlyBleedUsd": number,           // total estimated $/mo YOU are bleeding across all 8 categories, integer USD
    "rivalMonthlyBleedUsd": number,         // total estimated $/mo RIVAL is bleeding, integer USD
    "recoverableIfFixedUsd": number,        // total $/mo YOU could reclaim in 90 days if you close your top leaks
    "stealableFromRivalUsd": number,        // total $/mo YOU could steal from rival by exploiting their weaknesses in 90 days
    "verdictLine": string                   // one blunt line, e.g. "Every month you leave this un-fixed = $18,400 gone."
  },
  "categories": [                           // exactly these 8 categories, in this order — every field required
    { "name": "Positioning & Messaging",  "youScore": number, "rivalScore": number, "winner": "you"|"rival"|"tie", "why": string, "youEvidence": string, "rivalEvidence": string, "fix": string, "youMonthlyDollarImpact": number, "rivalMonthlyDollarImpact": number, "roiIfFixedUsd": number },
    { "name": "Offer Clarity & Pricing",  "youScore": number, "rivalScore": number, "winner": "you"|"rival"|"tie", "why": string, "youEvidence": string, "rivalEvidence": string, "fix": string, "youMonthlyDollarImpact": number, "rivalMonthlyDollarImpact": number, "roiIfFixedUsd": number },
    { "name": "Proof & Credibility",      "youScore": number, "rivalScore": number, "winner": "you"|"rival"|"tie", "why": string, "youEvidence": string, "rivalEvidence": string, "fix": string, "youMonthlyDollarImpact": number, "rivalMonthlyDollarImpact": number, "roiIfFixedUsd": number },
    { "name": "Visual & Brand Identity",  "youScore": number, "rivalScore": number, "winner": "you"|"rival"|"tie", "why": string, "youEvidence": string, "rivalEvidence": string, "fix": string, "youMonthlyDollarImpact": number, "rivalMonthlyDollarImpact": number, "roiIfFixedUsd": number },
    { "name": "Conversion Path & CTAs",   "youScore": number, "rivalScore": number, "winner": "you"|"rival"|"tie", "why": string, "youEvidence": string, "rivalEvidence": string, "fix": string, "youMonthlyDollarImpact": number, "rivalMonthlyDollarImpact": number, "roiIfFixedUsd": number },
    { "name": "Content Depth & SEO",      "youScore": number, "rivalScore": number, "winner": "you"|"rival"|"tie", "why": string, "youEvidence": string, "rivalEvidence": string, "fix": string, "youMonthlyDollarImpact": number, "rivalMonthlyDollarImpact": number, "roiIfFixedUsd": number },
    { "name": "Trust & Risk Reduction",   "youScore": number, "rivalScore": number, "winner": "you"|"rival"|"tie", "why": string, "youEvidence": string, "rivalEvidence": string, "fix": string, "youMonthlyDollarImpact": number, "rivalMonthlyDollarImpact": number, "roiIfFixedUsd": number },
    { "name": "Differentiation",          "youScore": number, "rivalScore": number, "winner": "you"|"rival"|"tie", "why": string, "youEvidence": string, "rivalEvidence": string, "fix": string, "youMonthlyDollarImpact": number, "rivalMonthlyDollarImpact": number, "roiIfFixedUsd": number }
  ],
  "youWins": string[],                       // 3-6 specific things you beat them at, with evidence
  "rivalWins": string[],                     // 3-6 specific things they beat you at, with evidence
  "silentLosses": [                         // things you're bleeding that you can't see from inside
    { "area": string, "estimatedMonthlyLossUsd": number, "why": string }
  ],
  "actionPlan": [                           // ordered, concrete moves for YOU
    { "priority": "P0"|"P1"|"P2", "action": string, "expectedImpact": string, "effort": "low"|"medium"|"high" }
  ],
  "quickWins": string[]                      // 3-5 things you can ship this week${takeover ? `,
  "takeover": {
    "thesis": string,                         // 2-3 sentences: the exact wedge to steal their market
    "rivalChaos": [                          // vulnerabilities you found in the rival, ranked
      { "weakness": string, "evidence": string, "exploitability": "high"|"medium"|"low", "howToExploit": string }
    ],
    "yourFixes": [                           // your own chaos you MUST close first (can't attack from a leaky ship)
      { "issue": string, "evidence": string, "fix": string, "blockerLevel": "critical"|"important"|"nice-to-have" }
    ],
    "wedgeMoves": [                          // offensive plays that use their weakness + your strength
      { "move": string, "leveragesRivalWeakness": string, "leveragesYourStrength": string, "expectedOutcome": string, "timeframe": "week"|"month"|"quarter" }
    ],
    "positioningPivot": {                    // how to reposition YOUR site to steal their buyers
      "newHeadline": string,
      "newSubhead": string,
      "newCtaLabel": string,
      "keywordsToOwn": string[],             // 5-8 SEO/messaging terms rival is weak on
      "proofToAdd": string[]                 // specific proof elements (case study, guarantee, logo bar, price)
    },
    "counterMessaging": [                    // exact copy lines that reframe rival's strengths as liabilities
      { "rivalClaim": string, "yourCounter": string }
    ],
    "kpis": [                                // how to measure takeover progress
      { "metric": string, "baseline": string, "target30Day": string }
    ]
  }` : ""}
}

Rules:
- Scores are integers 0-100. Overall = weighted synthesis, not simple average.
- Every "why", "youEvidence", "rivalEvidence" MUST cite something concrete from the scraped pages (a quote, a missing element, a specific color/font, a CTA, a price, a claim).
- If a page failed to scrape, mark that side "insufficient data" for that category and score conservatively.
- No fluff, no consultant-speak. Operator tone.${takeover ? `
- Takeover mode: be ruthless but ethical. Exploit rival's real, evidenced weaknesses (broken messaging, thin proof, hidden pricing, weak CTAs, brand contradictions). Do NOT fabricate rival flaws.
- yourFixes must be honest — list YOUR bleed first. You cannot take over from a leaky ship.` : ""}`;

    const user = `HEAD-TO-HEAD SCAN${takeover ? " — TAKEOVER MODE" : ""}

YOU: ${yourUrl}
RIVAL: ${rivalUrl}

=== YOUR SITE EVIDENCE ===
Title: ${evidence.you.title}
Meta: ${evidence.you.description}
Summary: ${evidence.you.summary}
Branding: ${JSON.stringify(evidence.you.branding)}
Link count: ${evidence.you.linkCount}
Content:
${evidence.you.markdown}

=== RIVAL SITE EVIDENCE ===
Title: ${evidence.rival.title}
Meta: ${evidence.rival.description}
Summary: ${evidence.rival.summary}
Branding: ${JSON.stringify(evidence.rival.branding)}
Link count: ${evidence.rival.linkCount}
Content:
${evidence.rival.markdown}

Return STRICT JSON only.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(90_000),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error", aiRes.status, errText);
      if (aiRes.status === 429) return json({ error: "Rate limited. Try again shortly." }, 429);
      if (aiRes.status === 402) return json({ error: "AI credits exhausted." }, 402);
      return json({ error: "AI synthesis failed", details: errText }, 502);
    }

    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content || "{}";
    let report: any;
    try {
      report = JSON.parse(content);
    } catch {
      return json({ error: "AI returned invalid JSON", raw: content }, 502);
    }

    return json({
      you: { url: yourUrl, scraped: !!yourData, title: evidence.you.title },
      rival: { url: rivalUrl, scraped: !!rivalData, title: evidence.rival.title },
      report,
      meta: { model: "google/gemini-2.5-flash", generatedAt: new Date().toISOString() },
    });
  } catch (e) {
    console.error("head-to-head fatal", e);
    return json({ error: "Server error", details: String(e) }, 500);
  }
});
