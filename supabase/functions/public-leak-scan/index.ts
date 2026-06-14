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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SVC);

    const body = await req.json().catch(() => ({}));
    const email = clean(body.email, 255).toLowerCase();
    let url = clean(body.url, 500);

    if (!email || !isEmail(email)) return json(400, { error: "Valid email required" });
    if (!url) return json(400, { error: "Website URL required" });
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

    // Run scan
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

    // chartGaps = enough data for the bar chart, but NO ROI / fix details.
    const chartGaps = gaps
      .filter((g) => g?.annualCost)
      .slice(0, 12)
      .map((g) => ({
        category: g.category || "",
        title: g.title || g.category || "Leak",
        severity: g.severity || "info",
        annualCost: g.annualCost,
      }));

    const teaser = {
      score: full?.score ?? null,
      grade: full?.grade ?? null,
      companyName: full?.companyName ?? "",
      executiveSummary: typeof full?.executiveSummary === "string" ? full.executiveSummary.slice(0, 480) : "",
      gapCount: gaps.length,
      criticalCount: critical.length,
      warningCount: warning.length,
      topIssues: [...critical.slice(0, 2), ...warning.slice(0, 2)].slice(0, 4).map(pickPreview),
      chartGaps,
      nextSteps: Array.isArray(full?.nextSteps) ? full.nextSteps.slice(0, 2) : [],
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
