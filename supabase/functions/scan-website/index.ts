import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { computeWebsiteScore, gradeFromScore } from "../_shared/lead-scoring.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ---------------------------------------------------------------------------
// Deterministic leak calculator — same domain + score => same dollar range,
// every run. Eliminates the "score stays, dollars change" credibility problem.
// ---------------------------------------------------------------------------
function hash32(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
function fmt$(n: number): string {
  const r = Math.round(n / 100) * 100;
  return "$" + r.toLocaleString("en-US");
}
function computeLeakRange(host: string, score: number): { low: number; high: number } {
  const s = Math.max(0, Math.min(100, score | 0));
  let baseLow: number, baseHigh: number;
  if (s >= 90) { baseLow = 8000;   baseHigh = 18000; }
  else if (s >= 80) { baseLow = 22000;  baseHigh = 48000; }
  else if (s >= 70) { baseLow = 48000;  baseHigh = 95000; }
  else if (s >= 60) { baseLow = 85000;  baseHigh = 165000; }
  else if (s >= 50) { baseLow = 130000; baseHigh = 240000; }
  else if (s >= 40) { baseLow = 180000; baseHigh = 320000; }
  else { baseLow = 240000; baseHigh = 420000; }
  const h = hash32(host.toLowerCase());
  const variance = ((h % 1000) / 1000) * 0.24 - 0.12; // -12% .. +12%, fixed per host
  return { low: baseLow * (1 + variance), high: baseHigh * (1 + variance) };
}
function applyDeterministicLeaks(analysis: any, host: string): any {
  if (!analysis || typeof analysis !== "object") return analysis;
  const score = typeof analysis.score === "number" ? analysis.score : 60;
  const { low, high } = computeLeakRange(host, score);
  const totalRange = `${fmt$(low)} - ${fmt$(high)}`;

  const gaps: any[] = Array.isArray(analysis.gaps) ? analysis.gaps : [];
  const weights = gaps.map((g) => g?.severity === "critical" ? 3 : g?.severity === "warning" ? 2 : 1);
  const totalW = weights.reduce((a, b) => a + b, 0) || 1;
  gaps.forEach((g, i) => {
    const share = weights[i] / totalW;
    if (g && typeof g === "object") g.annualCost = `${fmt$(low * share)} - ${fmt$(high * share)}`;
  });

  const roi: any[] = Array.isArray(analysis.roiTable) ? analysis.roiTable : [];
  if (roi.length) {
    const per = 1 / roi.length;
    roi.forEach((r) => {
      if (r && typeof r === "object") {
        r.currentWaste = `${fmt$(low * per)} - ${fmt$(high * per)}`;
        r.projectedRecovery = `${fmt$(low * per * 0.6)} - ${fmt$(high * per * 0.75)}`;
      }
    });
  }

  if (typeof analysis.executiveSummary === "string") {
    const dollarRange = /\$[\d,]+\s*[-–]\s*\$[\d,]+/g;
    const hadRange = dollarRange.test(analysis.executiveSummary);
    let summary = analysis.executiveSummary.replace(/\$[\d,]+\s*[-–]\s*\$[\d,]+/g, totalRange);
    if (!hadRange) {
      let replaced = false;
      summary = summary.replace(/\$[\d,]{4,}/g, (m) => {
        if (replaced) return m;
        replaced = true;
        return totalRange;
      });
    }
    analysis.executiveSummary = summary;
  }

  analysis.totalAnnualLeak = totalRange;
  return analysis;
}

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // ----- DETERMINISTIC CACHE -----
    // If this host has been scanned before, return the FIRST stored analysis so
    // every subsequent scan of the same company shows identical results.
    if (parsedHost !== "aetheris.technology" && parsedHost !== "aetheristechnology.lovable.app") {
      try {
        const hostPattern = encodeURIComponent(`%${parsedHost}%`);
        const cacheRes = await fetch(
          `${supabaseUrl}/rest/v1/website_scans?select=gaps,url,created_at&url=ilike.${hostPattern}&order=created_at.asc&limit=1`,
          { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
        );
        if (cacheRes.ok) {
          const rows = await cacheRes.json();
          const cached = Array.isArray(rows) && rows[0]?.gaps;
          if (cached && typeof cached === "object" && cached.score != null) {
            console.log("Returning cached scan for host:", parsedHost);
            return new Response(JSON.stringify({ ...cached, _cached: true }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      } catch (e) {
        console.warn("Scan cache lookup failed, continuing with fresh scan:", e);
      }
    }

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

    async function firecrawlScrape(opts: { onlyMainContent: boolean; waitFor: number; timeout: number; }) {
      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: formattedUrl,
          formats: ["markdown", "links"],
          onlyMainContent: opts.onlyMainContent,
          waitFor: opts.waitFor,
          timeout: opts.timeout,
          blockAds: true,
          removeBase64Images: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok && data?.success !== false, data };
    }

    let attempt = await firecrawlScrape({ onlyMainContent: false, waitFor: 2000, timeout: 45000 });

    if (!attempt.ok) {
      console.warn("Firecrawl first attempt failed, retrying lighter:", attempt.data?.code || attempt.data?.error);
      attempt = await firecrawlScrape({ onlyMainContent: true, waitFor: 0, timeout: 25000 });
    }

    // DNS fallback: toggle www. prefix and retry once
    if (!attempt.ok && attempt.data?.code === "SCRAPE_DNS_RESOLUTION_ERROR") {
      try {
        const u = new URL(formattedUrl);
        u.hostname = u.hostname.startsWith("www.")
          ? u.hostname.replace(/^www\./, "")
          : `www.${u.hostname}`;
        const altUrl = u.toString();
        console.warn("DNS failed, retrying with alternate hostname:", altUrl);
        formattedUrl = altUrl;
        attempt = await firecrawlScrape({ onlyMainContent: true, waitFor: 0, timeout: 25000 });
      } catch (_) { /* ignore */ }
    }

    const scrapeData = attempt.data;

    if (!attempt.ok) {
      console.error("Firecrawl error:", scrapeData);
      const code = scrapeData?.code;
      const friendly =
        code === "SCRAPE_TIMEOUT"
          ? "That site took too long to respond. Try again in a moment, or scan the homepage directly."
          : code === "SCRAPE_DNS_RESOLUTION_ERROR"
          ? `We couldn't resolve that domain. Double-check the spelling — common pitfalls: extra hyphens (e.g. "tool-die" vs "tooldie"), wrong TLD (.com vs .net), or the company may have rebranded. Search the company name on Google to confirm the live URL, then re-scan.`
          : (scrapeData?.error || "Failed to scrape website");
      return new Response(
        JSON.stringify({ error: friendly, code }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
    const links = scrapeData.data?.links || scrapeData.links || [];
    const metadata = scrapeData.data?.metadata || scrapeData.metadata || {};

    console.log("Scrape successful, analyzing with AI...");

    const callAi = async (model: string) => fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: `You are a senior digital strategist and website auditor for Aetheris Technology, an Indianapolis-based strategic business architecture firm. You produce Executive Diagnostic Reports that identify revenue leaks, operational gaps, and strategic opportunities. Be direct, specific, and reference actual content from the site. Every gap must include an estimated annual cost and a projected ROI from fixing it. CURRENCY RULE (NON-NEGOTIABLE): every dollar figure, leak estimate, ROI, cost, or recovery must be in US Dollars (USD), formatted like $1,200 or $1.4M. Never use €, £, ¥, EUR, GBP, CAD, AUD, or any other currency.`,
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

For competitive brief: a 2-3 sentence assessment of their competitive digital positioning.

For OUTREACH (CRITICAL — the sales rep depends on this): based on observable evidence from the actual site content (tone of copy, presence/absence of phone numbers, contact forms, chat widgets, "book a call" CTAs, team bios, founder voice, formality of language, response-time promises, social proof style, industry conventions), recommend whether the rep should CALL or EMAIL first. Be blunt and evidence-based — cite specific signals from the site. Fill every outreach field.

For EMAIL_TIMING (CRITICAL): infer the prospect's timezone from their stated location/area-served/phone area code, then recommend the optimal email send windows tailored to THIS specific business. Account for: (1) industry rhythm — e.g. trades/field-service owners check email 6-8am or after 5pm; B2B SaaS execs scan inbox 7-9am and 4-6pm; healthcare/legal mid-morning; restaurants between lunch and dinner rush (2-4pm); retail off-peak; (2) company size — solo/owner-operator vs. mid-market with assistants gatekeeping; (3) location/timezone — give windows in the PROSPECT'S local time AND ET; (4) day-of-week — avoid Mondays before 10am and Friday afternoons for most; Tue/Wed/Thu are prime for B2B; Sundays evenings work for owner-operators planning their week; (5) seasonality if relevant (tax season for accountants, summer for HVAC, etc.); (6) avoid times derived from on-site signals (e.g. "office closed Fridays" banner). Cite the evidence behind each window.

For TOUCHPOINT_PLAN (CRITICAL — this populates the rep's calendar with fully-written outreach): produce EXACTLY 5 touches in order at day_offset 0, 3, 7, 14, 21. For EACH touch: pick the channel that fits this prospect and that step in the cadence (mix call/email/linkedin/voicemail/text — don't repeat the same channel 5 times unless evidence demands it); write a specific subject_or_opener referencing something concrete from the site; write 3-5 talking_points that EACH cite a specific gap/leak you found above (use the actual gap title or dollar figure — no generic copy); write 2 objection_handles with one-line responses; write a single cta; write a complete ready-to-send full_script (email body, voicemail script, or call talk-track — 80-180 words, ready to copy-paste with no edits); write a why_now line explaining why this channel at this point in the cadence; write the best_send_window_local in the prospect's local time. The 5-touch sequence should escalate logically: open with insight → reinforce with data → social proof / case → direct challenge / value reframe → breakup. Reference real leaks from the gaps array in this same report.`,
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
                  signals: {
                    type: "object",
                    description: "OBSERVABLE signals only — fill from evidence in the scraped content. The numeric score is computed in code from these signals, NOT returned by you.",
                    properties: {
                      has_phone: { type: "boolean" },
                      has_email: { type: "boolean" },
                      has_contact_form: { type: "boolean" },
                      has_calendar_link: { type: "boolean" },
                      cta_strength: { type: "number", description: "0=none, 5=multiple prominent specific CTAs" },
                      lead_magnet_present: { type: "boolean" },
                      value_prop_clarity: { type: "number", description: "0=unclear, 5=instantly obvious what they sell and to whom" },
                      content_depth: { type: "number", description: "0=brochure, 5=deep blog / library / playbooks" },
                      has_case_studies: { type: "boolean" },
                      has_title_tag: { type: "boolean" },
                      has_meta_description: { type: "boolean" },
                      has_schema: { type: "boolean" },
                      uses_responsive: { type: "boolean" },
                      fast_first_paint: { type: "boolean" },
                      brand_consistency: { type: "number", description: "0=mismatched, 5=cohesive identity" },
                      industry_fit: { type: "string", enum: ["high","medium","low","unknown"], description: "Fit for Aetheris forensic-ops engagement: high=ops-heavy SMB, low=enterprise/freelancer/non-profit" },
                      revenue_band: { type: "string", enum: ["<500k","500k-2M","2M-10M","10M+","unknown"] },
                    },
                    required: ["has_phone","has_email","has_contact_form","cta_strength","value_prop_clarity","content_depth","industry_fit","revenue_band"],
                  },
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
                  outreach: {
                    type: "object",
                    description: "Evidence-based recommendation on whether to call or email first, with persona read and opening script. Must reference actual site signals.",
                    properties: {
                      recommended_channel: { type: "string", enum: ["call", "email"], description: "Which to do FIRST" },
                      channel_confidence: { type: "string", enum: ["high", "medium", "low"] },
                      why_this_channel: { type: "string", description: "2-3 sentences citing specific observable evidence from the site (e.g. 'phone number featured in header', 'no contact form, only email', 'formal corporate tone suggests written first contact')" },
                      secondary_channel: { type: "string", description: "Backup channel if first doesn't land, with timing" },
                      best_time_to_reach: { type: "string", description: "Specific window with reasoning, e.g. 'Tue-Thu 9-11am ET — owner-operator likely on jobsites afternoons'" },
                      persona_read: { type: "string", description: "What the site reveals about the decision-maker's personality and pressures" },
                      tone_to_use: { type: "string", description: "e.g. 'blunt operator', 'warm consultative', 'data-driven peer'" },
                      do_not_do: { type: "array", items: { type: "string" }, description: "2-3 anti-patterns specific to this prospect" },
                      first_touch_script: { type: "string", description: "Ready-to-send 2-4 sentence opener referencing something specific found on their site" },
                      email_timing: {
                        type: "object",
                        description: "Location/industry/size-tailored email send windows. Cite evidence behind each window.",
                        properties: {
                          inferred_timezone: { type: "string", description: "e.g. 'America/Indiana/Indianapolis (ET)' — infer from address, area-served, phone area code" },
                          timezone_evidence: { type: "string", description: "What on the site revealed the timezone (address block, phone area code, service-area page, etc.)" },
                          inferred_industry: { type: "string", description: "Specific industry vertical used to pick rhythm, e.g. 'residential HVAC', 'B2B SaaS', 'boutique law firm'" },
                          inferred_company_size: { type: "string", enum: ["solo", "small (2-10)", "mid (11-50)", "large (51-200)", "enterprise (200+)"], description: "Inferred from team page, office count, client logos" },
                          size_evidence: { type: "string", description: "What signals revealed size (team page count, multi-location, enterprise logos, etc.)" },
                          best_send_windows: {
                            type: "array",
                            description: "Top 2-4 send windows ranked best→good, in prospect local time AND ET",
                            items: {
                              type: "object",
                              properties: {
                                day: { type: "string", description: "e.g. 'Tuesday', 'Tue-Thu', 'Sunday evening'" },
                                local_time: { type: "string", description: "Window in prospect local time, e.g. '6:30-7:45 AM CT'" },
                                eastern_time: { type: "string", description: "Same window converted to ET, e.g. '7:30-8:45 AM ET'" },
                                reasoning: { type: "string", description: "Why this window for THIS prospect — cite industry/size/site evidence" },
                              },
                              required: ["day", "local_time", "eastern_time", "reasoning"],
                            },
                          },
                          avoid_windows: {
                            type: "array",
                            description: "Specific times to NOT send and why (e.g. 'Mon before 10am — Monday inbox triage')",
                            items: { type: "string" },
                          },
                          subject_line_angle: { type: "string", description: "Suggested subject-line angle that matches the timing context (e.g. early-AM = scannable/short; evening = thoughtful question)" },
                          follow_up_cadence: { type: "string", description: "Recommended follow-up rhythm tuned to this prospect (e.g. '3 touches over 9 days: Tue AM, Thu PM, following Mon AM')" },
                          seasonality_note: { type: "string", description: "Optional seasonal factor if industry-relevant; empty string if none" },
                        },
                        required: ["inferred_timezone", "inferred_industry", "inferred_company_size", "best_send_windows", "avoid_windows", "subject_line_angle", "follow_up_cadence"],
                      },
                      touchpoint_plan: {
                        type: "array",
                        description: "EXACTLY 5 fully-written outreach touches (day_offset 0,3,7,14,21). Each touch is ready to drop on a calendar and run with zero editing. Talking points MUST cite specific gaps from this report.",
                        items: {
                          type: "object",
                          properties: {
                            step: { type: "number", description: "1-5" },
                            day_offset: { type: "number", description: "Days from Touch 1 (0, 3, 7, 14, 21)" },
                            channel: { type: "string", enum: ["call", "email", "linkedin", "voicemail", "text"] },
                            why_now: { type: "string", description: "Why this channel at this point in the cadence (1 sentence)" },
                            subject_or_opener: { type: "string", description: "Exact subject line (email) or first line (call/voicemail/LinkedIn/text)" },
                            talking_points: { type: "array", items: { type: "string" }, description: "3-5 bullets, each citing a specific gap/leak/dollar figure from THIS report" },
                            objection_handles: { type: "array", items: { type: "string" }, description: "2 likely pushbacks with one-line responses, formatted 'Pushback: ... → Response: ...'" },
                            cta: { type: "string", description: "Single ask for this touch (e.g. '15-min Tue/Wed teardown call')" },
                            full_script: { type: "string", description: "Complete ready-to-send body — 80-180 words. No placeholders. Sign as Aetheris operator." },
                            best_send_window_local: { type: "string", description: "Exact send window in prospect local time, e.g. 'Tue 7:15-8:00 AM CT'" },
                          },
                          required: ["step", "day_offset", "channel", "why_now", "subject_or_opener", "talking_points", "cta", "full_script", "best_send_window_local"],
                        },
                      },
                    },
                    required: ["recommended_channel", "channel_confidence", "why_this_channel", "best_time_to_reach", "persona_read", "tone_to_use", "first_touch_script", "email_timing", "touchpoint_plan"],
                  },
                },
                required: ["signals", "grade", "companyName", "executiveSummary", "gaps", "roadmap", "roiTable", "nextSteps", "competitiveBrief", "outreach"],
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

    let analysis: any = { score: null, grade: "?", companyName: "Unknown", executiveSummary: "", gaps: [], roadmap: [], roiTable: [], nextSteps: [], competitiveBrief: "", signals: null };
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        analysis = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Failed to parse tool call arguments:", e);
      }
    }

    // DETERMINISTIC SCORE — math, not vibes. Ignore any score the AI tries to send.
    const breakdown = computeWebsiteScore(analysis?.signals, analysis?.gaps || [], (markdown || "").length);
    analysis.score = breakdown.total;
    analysis.score_breakdown = breakdown.parts;
    if (breakdown.reason) analysis.score_reason = breakdown.reason;
    analysis.grade = gradeFromScore(breakdown.total);

    // Override AI dollar figures with deterministic per-domain math so reps
    // never see the score hold steady while the leak number drifts. Use a
    // safe fallback when the score is null (insufficient evidence).
    analysis = applyDeterministicLeaks(analysis, parsedHost);

    // Save to database - store full report in gaps column (first scan only is reused later)


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
