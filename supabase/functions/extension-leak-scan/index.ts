// Public leak scan for the Aetheris Chrome extension.
// Accepts { url, pageText, title, metaDescription } from any site the user is on,
// runs the same deterministic forensic analyzer as scan-website (no Firecrawl needed),
// returns leak score + top gaps + estimated annual leak + 3-step roadmap.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { computeWebsiteScore, gradeFromScore } from "../_shared/lead-scoring.ts";
import type { WebsiteSignals } from "../_shared/lead-scoring.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function hash32(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function fmt$(n: number): string { return "$" + (Math.round(n / 100) * 100).toLocaleString("en-US"); }
function computeLeakRange(host: string, score: number) {
  const s = Math.max(0, Math.min(100, score | 0));
  let lo: number, hi: number;
  if (s >= 90) { lo = 8000; hi = 18000; }
  else if (s >= 80) { lo = 22000; hi = 48000; }
  else if (s >= 70) { lo = 48000; hi = 95000; }
  else if (s >= 60) { lo = 85000; hi = 165000; }
  else if (s >= 50) { lo = 130000; hi = 240000; }
  else if (s >= 40) { lo = 180000; hi = 320000; }
  else { lo = 240000; hi = 420000; }
  const h = hash32(host.toLowerCase());
  const v = ((h % 1000) / 1000) * 0.24 - 0.12;
  return { low: lo * (1 + v), high: hi * (1 + v) };
}

// In-memory IP rate limit: 25 scans / hour per IP.
const ipBuckets = new Map<string, { count: number; reset: number }>();
function rateLimited(ip: string, limit = 25, windowMs = 3600_000): boolean {
  const now = Date.now();
  const b = ipBuckets.get(ip);
  if (!b || b.reset < now) { ipBuckets.set(ip, { count: 1, reset: now + windowMs }); return false; }
  if (b.count >= limit) return true;
  b.count++; return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (rateLimited(ip)) {
      return new Response(JSON.stringify({ error: "Rate limit reached. Try again in an hour." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const rawUrl = String(body?.url || "").trim();
    if (!rawUrl) {
      return new Response(JSON.stringify({ error: "url required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const formattedUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
    let host = "";
    try { host = new URL(formattedUrl).hostname.replace(/^www\./, "").toLowerCase(); }
    catch { return new Response(JSON.stringify({ error: "invalid url" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

    let pageText = String(body?.pageText || "").slice(0, 12000);
    let title = String(body?.title || "").slice(0, 200);
    let metaDescription = String(body?.metaDescription || "").slice(0, 500);
    const links: string[] = Array.isArray(body?.links) ? body.links.slice(0, 80).map((l: unknown) => String(l)) : [];

    // Mobile / standalone callers don't pass pageText. Fetch and parse server-side so
    // the deterministic detectors and the forensic narrator have real evidence to work with.
    if (!pageText) {
      try {
        const r = await fetch(formattedUrl, {
          headers: { "User-Agent": "Mozilla/5.0 AetherisLeakScanBot/1.0" },
          signal: AbortSignal.timeout(15000),
        });
        const html = await r.text();
        if (!title) {
          const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
          if (m) title = m[1].trim().slice(0, 200);
        }
        if (!metaDescription) {
          const m = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
          if (m) metaDescription = m[1].trim().slice(0, 500);
        }
        pageText = html
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 12000);
      } catch (_err) { /* fall through with whatever we have */ }
    }
    if (!title) title = host;

    const content = `${title}\n${metaDescription}\n${pageText}`;
    const lower = content.toLowerCase();
    const linkList = links.map((l) => l.toLowerCase());
    const companyName = title.replace(/\s*[|–—-].*$/i, "").trim() || host;

    const hasPhone = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(content);
    const hasEmail = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(content);
    const hasContactForm = lower.includes("contact form") || linkList.some((l) => l.includes("contact")) || lower.includes("contact us");
    const hasCalendarLink = lower.includes("calendly") || lower.includes("book a call") || lower.includes("schedule") || lower.includes("appointment");
    const ctaHits = ["book", "schedule", "quote", "consult", "call", "contact", "demo", "start", "buy"].filter((t) => lower.includes(t)).length;
    const leadMagnetPresent = /download|guide|checklist|audit|ebook|whitepaper|case study|newsletter/.test(lower);
    const hasCaseStudies = /case stud|results|portfolio|testimonials|clients|reviews/.test(lower);
    const hasMetaDescription = Boolean(metaDescription);
    const valuePropClarity = lower.length > 1200 ? (/(we help|we build|we provide|specializ|serving|for businesses|for homeowners|for teams)/.test(lower) ? 4 : 3) : 2;
    const contentDepth = lower.length > 8000 ? 5 : lower.length > 4500 ? 4 : lower.length > 2200 ? 3 : lower.length > 900 ? 2 : 1;
    const ctaStrength = Math.max(0, Math.min(5, ctaHits + (hasCalendarLink ? 1 : 0) + (hasContactForm ? 1 : 0)));

    const signals: WebsiteSignals = {
      has_phone: hasPhone, has_email: hasEmail, has_contact_form: hasContactForm,
      has_calendar_link: hasCalendarLink, cta_strength: ctaStrength, lead_magnet_present: leadMagnetPresent,
      value_prop_clarity: valuePropClarity, content_depth: contentDepth, has_case_studies: hasCaseStudies,
      has_title_tag: Boolean(title), has_meta_description: hasMetaDescription,
      has_schema: lower.includes("schema.org") || lower.includes("ld+json"),
      uses_responsive: true, fast_first_paint: lower.length < 12000,
      brand_consistency: title && hasMetaDescription ? 4 : 3,
      industry_fit: "medium", revenue_band: "unknown",
    };

    const gaps: any[] = [];
    if (!hasMetaDescription) gaps.push({ category: "SEO", severity: "critical", title: "Search Result Snippet Is Missing", description: `${companyName} is not exposing a clear meta description. That weakens search click-through and lets engines pick whatever snippet they want.`, recommendedFix: "Write a page-specific meta description naming the offer, market, and conversion action.", projectedROI: "140-260%" });
    if (ctaStrength < 3) gaps.push({ category: "CTA", severity: "critical", title: "Primary Conversion Path Is Too Soft", description: `${companyName} does not show enough strong conversion language. Visitors should not have to hunt for the next step.`, recommendedFix: "Install one dominant CTA tied to a business outcome and repeat at every decision point.", projectedROI: "180-320%" });
    if (!hasPhone && !hasEmail && !hasContactForm) gaps.push({ category: "Lead Capture", severity: "critical", title: "Contact Friction Is Blocking Hot Prospects", description: `No verifiable phone, email, or short contact form. High-intent visitors have no low-friction way to start a conversation.`, recommendedFix: "Add visible phone, email, and a short form with a response-time promise.", projectedROI: "200-380%" });
    if (!leadMagnetPresent) gaps.push({ category: "Lead Capture", severity: "warning", title: "No Mid-Funnel Capture Asset", description: `${companyName} appears to rely on visitors being ready to contact immediately. Interested-but-not-ready buyers leave anonymous.`, recommendedFix: "Add a diagnostic checklist, calculator, or buyer guide that captures email before sales.", projectedROI: "120-240%" });
    if (!hasCaseStudies) gaps.push({ category: "Content", severity: "warning", title: "Proof Is Not Doing Enough Work", description: `No strong case-study or results language surfaced. Without proof, visitors are asked to trust claims instead of seeing evidence.`, recommendedFix: "Publish 2-3 outcome-driven case studies with before/after metrics.", projectedROI: "130-250%" });
    if (contentDepth < 3) gaps.push({ category: "Content", severity: "warning", title: "Thin Page Depth Limits Buyer Confidence", description: `Page content is light for a serious buyer evaluation. Thin pages look less established and rank weaker.`, recommendedFix: "Expand service pages with process, objections, pricing context, FAQs, and proof.", projectedROI: "120-230%" });
    gaps.push({ category: "Messaging", severity: valuePropClarity >= 4 ? "info" : "warning", title: "Positioning Needs A Sharper First Read", description: `The offer, buyer, and outcome should be unmistakable in the first few seconds.`, recommendedFix: "Rewrite the first-screen message around buyer pain, measurable outcome, and a direct next step.", projectedROI: "110-220%" });

    const breakdown = computeWebsiteScore(signals, gaps, pageText.length);
    const score = breakdown.total ?? 40;
    const { low, high } = computeLeakRange(host, score);
    const totalRange = `${fmt$(low)} - ${fmt$(high)}`;

    // Distribute the leak range across gaps by severity weight.
    const weights = gaps.map((g) => g.severity === "critical" ? 3 : g.severity === "warning" ? 2 : 1);
    const totalW = weights.reduce((a, b) => a + b, 0) || 1;
    gaps.forEach((g, i) => {
      const share = weights[i] / totalW;
      g.annualCost = `${fmt$(low * share)} - ${fmt$(high * share)}`;
    });

    // ── Forensic AI layer: turn the deterministic gap list + page evidence into a real
    // case-file narrative with mechanisms, quoted clues, and root causes.
    let forensics: any = null;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY && pageText && pageText.length > 200) {
      try {
        const gapList = gaps.map((g, i) => `${i + 1}. [${g.category}] ${g.title} — ${g.description}`).join("\n");
        const sys = `You are the Aetheris Forensic Operator. You read live website evidence and explain WHY a business is leaking, not just WHAT is broken.
Return STRICT JSON only with this shape:
{
  "verdict": "1-2 sentence forensic headline naming the dominant failure pattern",
  "rootCauses": ["3-5 mechanism-level causes — say WHY the leak exists. Reference what the page actually does or fails to do."],
  "clueTrail": [
    { "clue": "short label", "evidence": "quote or measurable observation from the page (≤140 chars)", "implication": "what this tells you about the business" }
  ],
  "deepLeaks": [
    { "title": "specific leak (not generic)", "mechanism": "exact sentence explaining HOW money disappears", "trigger": "what on the page causes it", "fix": "one concrete action" }
  ],
  "buyerJourneyBreakpoints": ["3 spots where a real buyer would bail, named by what they'd see"]
}
RULES: USD only. No hype words. No selling. Quote evidence from the actual page text. If you cannot quote, say so. 4-6 clueTrail items. 4-6 deepLeaks.`;
        const usr = `URL: ${formattedUrl}
HOST: ${host}
TITLE: ${title}
META: ${metaDescription || "(none)"}
DETERMINISTIC GAPS DETECTED:
${gapList}

PAGE TEXT (truncated, this is your evidence — quote from it):
${pageText.slice(0, 8000)}`;
        const ai = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
            response_format: { type: "json_object" },
            temperature: 0.5,
          }),
          signal: AbortSignal.timeout(25000),
        });
        if (ai.ok) {
          const j = await ai.json();
          const raw = j?.choices?.[0]?.message?.content || "{}";
          try { forensics = JSON.parse(raw); } catch { /* ignore */ }
        }
      } catch (err) { console.error("forensics layer failed:", err); }
    }

    const analysis = {
      url: formattedUrl, host, companyName, score, grade: gradeFromScore(score),
      totalAnnualLeak: totalRange,
      executiveSummary: forensics?.verdict ||
        `${companyName} is leaking an estimated ${totalRange} per year through visible website gaps. The biggest risks are unclear next steps, weak capture paths, and proof that is not carrying enough of the sales burden.`,
      gaps,
      forensics,
      roadmap: [
        { month: "Week 1", action: "Repair the first-screen message and primary CTA" },
        { month: "Week 2", action: "Add visible contact paths + a low-friction capture asset" },
        { month: "Week 3-4", action: "Publish proof assets and tighten above-the-fold speed" },
      ],
      nextSteps: [
        "Rewrite the first-screen value proposition so a cold visitor understands the offer in 5 seconds.",
        "Add one dominant CTA and repeat it consistently.",
        "Create a low-friction capture path for visitors who are not ready to call.",
      ],
      ctaUrl: "https://aetheris.technology/leak-audit",
      _mode: "extension_scan",
    };

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extension-leak-scan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
