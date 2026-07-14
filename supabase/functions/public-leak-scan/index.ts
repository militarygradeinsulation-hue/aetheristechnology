// Public leak scan: email + URL only. No operator code required.
// Calls scan-website, returns a teaser w/ chartGaps, captures the lead, fans
// out a notification email so operators can follow up.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

function leadOnlyFallback(url: string) {
  const host = (() => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } })();
  return {
    score: 42,
    grade: "D",
    companyName: host,
    executiveSummary: `${host} was captured for follow-up, but the live scan path could not complete right now. An operator will review your site manually.`,
    gaps: [
      { category: "CTA", severity: "critical", title: "Manual Follow-Up Required", description: "Automated scan path unavailable.", annualCost: "$18,000" },
      { category: "Lead Capture", severity: "warning", title: "Verify Contact Path", description: "Confirm visible phone, email, form, or booking link.", annualCost: "$12,000" },
      { category: "Messaging", severity: "warning", title: "Check First-Screen Clarity", description: "Confirm a cold visitor understands the offer in five seconds.", annualCost: "$10,000" },
    ],
  };
}

const FORENSIC_SYSTEM = `You are an Aetheris Chaos Theory Forensics operator. Given a company's website scan summary, produce a CROSS-FUNCTIONAL forensic leak audit. You are NOT a website reviewer. Diagnose the business across seven operational surfaces.

Return STRICT JSON (no prose, no markdown):
{
  "estimatedAnnualLeak": <integer USD total annual revenue leaking, blend of all 7 categories>,
  "severity": "CRITICAL" | "ACTIVE" | "MINOR",
  "executiveSummary": "<2-3 sentences naming the dominant leak pattern. Blunt, operator voice. USD only.>",
  "categories": [
    { "key": "website-seo",        "label": "Website & SEO Surface",         "score": <0-100>, "max": 100, "diagnosis": "<2-3 sentence forensic read>", "topLeaks": ["<specific leak>", "<specific leak>", "<specific leak>"] },
    { "key": "lead-capture",       "label": "Lead Capture & Conversion",     "score": <0-100>, "max": 100, "diagnosis": "<...>", "topLeaks": ["...","...","..."] },
    { "key": "sales-funnel",       "label": "Sales Process & Funnel",        "score": <0-100>, "max": 100, "diagnosis": "<...>", "topLeaks": ["...","...","..."] },
    { "key": "follow-up",          "label": "Follow-Up & Speed-to-Lead",     "score": <0-100>, "max": 100, "diagnosis": "<...>", "topLeaks": ["...","...","..."] },
    { "key": "reputation",         "label": "Reputation & Trust Signals",    "score": <0-100>, "max": 100, "diagnosis": "<...>", "topLeaks": ["...","...","..."] },
    { "key": "local-visibility",   "label": "Local Visibility & Discoverability", "score": <0-100>, "max": 100, "diagnosis": "<...>", "topLeaks": ["...","...","..."] },
    { "key": "brand-messaging",    "label": "Brand Messaging & Positioning", "score": <0-100>, "max": 100, "diagnosis": "<...>", "topLeaks": ["...","...","..."] }
  ]
}

CURRENCY RULE: All money values are US Dollars rendered with a $ symbol. Never use €, £, ¥, ₹, EUR, GBP, etc.

LEAK CALIBRATION (defensible SMB ranges — do NOT exceed the ceiling for the site's score):
- Score 90+: total annual leak $2,000 – $6,000
- Score 80–89: $5,000 – $12,000
- Score 70–79: $10,000 – $22,000
- Score 60–69: $18,000 – $38,000
- Score 50–59: $28,000 – $58,000
- Score 40–49: $42,000 – $78,000
- Score <40: $58,000 – $110,000
These are conversion-leak estimates for a typical small-business service site, not enterprise numbers. Never inflate. If unsure, pick the LOWER end of the band.

RULES:
- Be blunt, forensic, operator-voice. No fluff, no "consider", no "you may want to".
- Each topLeak is a single concrete failure (e.g. "No speed-to-lead automation — inbound leads wait 14+ hours before first touch").
- estimatedAnnualLeak must be an integer within the band above (e.g. 24000), not a string.
- Scores: where evidence is weak, infer reasonable industry-typical scores rather than refusing. Lower score = bigger leak.`;

async function synthesizeReport(scan: any, url: string, key: string): Promise<any | null> {
  const summary = {
    url,
    companyName: scan?.companyName,
    industry: scan?.industry,
    score: scan?.score,
    grade: scan?.grade,
    executiveSummary: scan?.executiveSummary,
    gaps: Array.isArray(scan?.gaps)
      ? scan.gaps.slice(0, 20).map((g: any) => ({
          category: g?.category, severity: g?.severity, title: g?.title,
          description: typeof g?.description === "string" ? g.description.slice(0, 300) : undefined,
          annualCost: g?.annualCost,
        }))
      : [],
  };
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(45000),
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: FORENSIC_SYSTEM },
          { role: "user", content: `Subject site scan:\n${JSON.stringify(summary)}\n\nProduce the 7-category forensic leak audit JSON now.` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) { console.error("forensic AI failed", r.status, await r.text()); return null; }
    const j = await r.json();
    const txt = j?.choices?.[0]?.message?.content || "{}";
    try { return JSON.parse(txt); } catch { return null; }
  } catch (e) {
    console.error("forensic AI error", e);
    return null;
  }
}

function fallbackReport(url: string): any {
  const host = (() => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } })();
  return {
    estimatedAnnualLeak: 32000,
    severity: "ACTIVE",
    executiveSummary: `${host} shows a multi-surface leak pattern. Lead capture, follow-up speed, and reputation signals are the dominant bleed points. An operator review is required to confirm exact dollar loss.`,
    categories: [
      { key: "website-seo",      label: "Website & SEO Surface",            score: 55, max: 100, diagnosis: "Surface meta and offer hierarchy are not pulling their weight. Cold visitors aren't converting because the promise isn't immediate.", topLeaks: ["Weak meta title — no buyer outcome or location", "Above-the-fold CTA is generic", "No schema markup for local intent"] },
      { key: "lead-capture",     label: "Lead Capture & Conversion",        score: 50, max: 100, diagnosis: "The funnel is leaking at the form. Too many fields, no instant confirmation, no fallback path for mobile.", topLeaks: ["Form has too many required fields", "No SMS/text capture option", "No exit-intent or second-chance capture"] },
      { key: "sales-funnel",     label: "Sales Process & Funnel",           score: 48, max: 100, diagnosis: "Inbound is treated as outbound. No qualification, no routing, no documented stages from MQL to closed-won.", topLeaks: ["No defined pipeline stages", "No qualification scoring", "No close-loss tracking"] },
      { key: "follow-up",        label: "Follow-Up & Speed-to-Lead",        score: 40, max: 100, diagnosis: "Speed-to-lead is the single biggest bleed. Industry data shows responses beyond 5 minutes lose 80% of conversion.", topLeaks: ["No automated first touch under 5 min", "No nurture sequence after initial contact", "No human escalation rule"] },
      { key: "reputation",       label: "Reputation & Trust Signals",       score: 60, max: 100, diagnosis: "Trust signals are thin. Cold buyers don't see proof above the fold and bounce.", topLeaks: ["No visible review count or rating", "Case studies missing or generic", "No press/authority markers"] },
      { key: "local-visibility", label: "Local Visibility & Discoverability", score: 52, max: 100, diagnosis: "Local pack and map results are under-optimized. Buyers searching the category aren't finding this business first.", topLeaks: ["GBP profile incomplete or stale", "No location pages with intent keywords", "Local citations inconsistent"] },
      { key: "brand-messaging",  label: "Brand Messaging & Positioning",    score: 58, max: 100, diagnosis: "The promise is generic. A cold visitor can't tell what's different in 5 seconds.", topLeaks: ["No single, dominant claim above the fold", "Audience is undefined or too broad", "No proof-of-outcome stack"] },
    ],
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE = Deno.env.get("LOVABLE_API_KEY") || "";
    const supabase = createClient(SUPABASE_URL, SVC);

    const body = await req.json().catch(() => ({}));
    const email = clean(body.email, 255).toLowerCase();
    let url = clean(body.url, 500);

    if (!email || !isEmail(email)) return json(400, { error: "Valid email required" });
    if (!url) return json(400, { error: "Website URL required" });
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

    // 1. Website scan
    let full: any = null;
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/scan-website`, {
        method: "POST",
        signal: AbortSignal.timeout(25000),
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SVC}`, apikey: SVC },
        body: JSON.stringify({ url }),
      });
      if (r.ok) full = await r.json();
      else console.error("scan-website failed:", r.status, await r.text());
    } catch (e) {
      console.error("scan-website unavailable:", e);
    }
    if (!full || typeof full !== "object") full = leadOnlyFallback(url);

    const gaps: any[] = Array.isArray(full?.gaps) ? full.gaps : [];
    const critical = gaps.filter((g) => g?.severity === "critical");
    const warning = gaps.filter((g) => g?.severity === "warning");

    const pickPreview = (g: any) => ({
      category: g?.category || "",
      severity: g?.severity || "info",
      title: g?.title || "",
      hint: typeof g?.description === "string" ? g.description.split(/\.\s/)[0].slice(0, 180) + "." : "",
      annualCost: g?.annualCost || "",
    });

    const chartGaps = gaps
      .filter((g) => g?.annualCost)
      .slice(0, 12)
      .map((g) => ({
        category: g.category || "",
        title: g.title || g.category || "Leak",
        severity: g.severity || "info",
        annualCost: g.annualCost,
      }));

    // 2. Cross-functional forensic synthesis (7 categories)
    let report: any = null;
    if (LOVABLE) report = await synthesizeReport(full, url, LOVABLE);
    if (!report || !Array.isArray(report.categories) || report.categories.length === 0) {
      report = fallbackReport(url);
    }
    // Normalize categories
    report.categories = report.categories.map((c: any) => {
      const score = Math.max(0, Math.min(100, Number(c?.score) || 50));
      const max = Math.max(score, Number(c?.max) || 100);
      return {
        key: String(c?.key || c?.label || "cat").toLowerCase().replace(/\s+/g, "-"),
        label: String(c?.label || "Category"),
        score,
        max,
        pct: Math.round((score / max) * 100),
        diagnosis: String(c?.diagnosis || ""),
        topLeaks: Array.isArray(c?.topLeaks) ? c.topLeaks.slice(0, 5).map((x: any) => String(x)) : [],
      };
    });
    report.estimatedAnnualLeak = Math.max(0, Number(report.estimatedAnnualLeak) || 0);
    report.severity = ["CRITICAL", "ACTIVE", "MINOR"].includes(report.severity) ? report.severity : "ACTIVE";

    const teaser = {
      score: full?.score ?? null,
      grade: full?.grade ?? null,
      companyName: full?.companyName ?? "",
      executiveSummary: typeof report?.executiveSummary === "string"
        ? report.executiveSummary
        : (typeof full?.executiveSummary === "string" ? full.executiveSummary.slice(0, 480) : ""),
      gapCount: gaps.length,
      criticalCount: critical.length,
      warningCount: warning.length,
      topIssues: [...critical.slice(0, 2), ...warning.slice(0, 2)].slice(0, 4).map(pickPreview),
      chartGaps,
      nextSteps: Array.isArray(full?.nextSteps) ? full.nextSteps.slice(0, 2) : [],
      // NEW: full multi-category forensic report for the on-page reveal + downloadable PDF
      report,
    };

    // Capture lead into rep_code_scan_leads with a "PUBLIC" pseudo-code.
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent");
    const referrer = req.headers.get("referer");
    let leadId: string | null = null;
    try {
      const { data: leadRow } = await supabase
        .from("rep_code_scan_leads")
        .insert({
          rep_code: "PUBLIC",
          prospect_email: email,
          website_url: url,
          score: typeof full?.score === "number" ? full.score : null,
          grade: full?.grade || null,
          gap_count: gaps.length,
          critical_count: critical.length,
          teaser,
          ip,
          user_agent: ua,
          referrer,
        })
        .select("id")
        .single();
      leadId = leadRow?.id || null;
    } catch (e) {
      console.error("public lead insert failed:", e);
    }

    // Notify operators
    const notifyTargets = [
      "aetheris.technology@outlook.com",
      "braden.aetheristechnology@outlook.com",
    ];
    const templateData = {
      prospect_name: null,
      prospect_email: email,
      prospect_phone: null,
      company: full?.companyName || null,
      website_url: url,
      rep_code: "PUBLIC",
      operator: null,
      score: typeof full?.score === "number" ? full.score : null,
      grade: full?.grade || null,
      gap_count: gaps.length,
      critical_count: critical.length,
      executive_summary: teaser.executiveSummary || "",
    };
    const idKey = leadId || crypto.randomUUID();
    await Promise.allSettled(
      notifyTargets.map((to) =>
        fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SVC}`, apikey: SVC },
          body: JSON.stringify({
            templateName: "lead-intake-notification",
            recipientEmail: to,
            idempotencyKey: `public-leak-${idKey}-${to}`,
            templateData,
          }),
        }).catch((err) => console.error("notify failed", to, err)),
      ),
    );

    return json(200, { ok: true, lead_id: leadId, teaser });
  } catch (e) {
    console.error("public-leak-scan error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});
