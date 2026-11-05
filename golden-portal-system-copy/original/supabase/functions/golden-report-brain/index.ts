import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";
import { classifyIndustryHeuristic, INDUSTRY_TAXONOMY, isAllowedIndustry } from "../_shared/industry-intelligence.ts";
import { routedChatCompletion } from "../_shared/ai-router.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type,x-admin-token,x-supabase-client-platform,x-supabase-client-platform-version,x-supabase-client-runtime,x-supabase-client-runtime-version",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "private, max-age=60" } });

function websiteOrigin(raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return u.origin;
  } catch {
    return null;
  }
}

async function scrapeHomepage(raw: unknown): Promise<string> {
  const origin = websiteOrigin(raw);
  const key = Deno.env.get("FIRECRAWL_API_KEY") || "";
  if (!origin || !key) return "";
  try {
    const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: origin, formats: ["markdown"], onlyMainContent: true, waitFor: 800 }),
    });
    if (!r.ok) return "";
    const d = await r.json();
    return String(d?.data?.markdown || d?.markdown || "").slice(0, 14000);
  } catch {
    return "";
  }
}

async function classifyCompanyIndustry(company: Record<string, any>, archive: Record<string, any> | null, deep: boolean) {
  const reportEvidence = [
    company.business_summary,
    archive?.executive_summary,
    JSON.stringify(archive?.top_priorities || []),
    JSON.stringify(archive?.top_leaks || []),
  ].filter(Boolean).join("\n").slice(0, 12000);

  const heuristic = classifyIndustryHeuristic({
    companyName: company.display_name,
    domain: company.primary_domain,
    websiteUrl: company.website_url || archive?.target_url,
    reportEvidence,
  });

  if (!deep || heuristic.confidence >= 0.82) return heuristic;

  const page = await scrapeHomepage(company.website_url || archive?.target_url || company.primary_domain);
  if (!page && heuristic.industry) return heuristic;
  if (!page && !heuristic.industry) return heuristic;

  try {
    const evidence = [
      `Company: ${company.display_name || ""}`,
      `Domain: ${company.primary_domain || ""}`,
      `URL: ${company.website_url || archive?.target_url || ""}`,
      reportEvidence ? `Saved Golden Report evidence:\n${reportEvidence}` : "",
      page ? `Company website text:\n${page}` : "",
    ].filter(Boolean).join("\n\n").slice(0, 26000);

    const result = await routedChatCompletion({
      tier: "bulk",
      messages: [
        {
          role: "system",
          content: `Classify a company into exactly one industry from this controlled taxonomy:
${INDUSTRY_TAXONOMY.join("\n")}

Use only the supplied company name, domain, URL, saved report evidence, and company website text.
Return JSON only with: industry, confidence from 0 to 1, signals array of 2 to 6 short evidence phrases.
If the evidence is insufficient, set industry to null and confidence below 0.5. Never invent an industry.`,
        },
        { role: "user", content: evidence },
      ],
      response_format: { type: "json_object" },
      max_tokens: 700,
      timeoutMs: 45_000,
    });

    const parsed = JSON.parse(result.content || "{}");
    const industry = isAllowedIndustry(parsed?.industry) ? parsed.industry : null;
    const confidence = Math.max(0, Math.min(1, Number(parsed?.confidence || 0)));
    const signals = Array.isArray(parsed?.signals) ? parsed.signals.map((x: unknown) => String(x).slice(0, 180)).slice(0, 6) : [];

    if (industry && confidence >= Math.max(0.62, heuristic.confidence)) {
      return { industry, confidence: Math.round(confidence * 100) / 100, source: "website_ai", signals };
    }
  } catch (e) {
    console.warn("industry deep classification failed", e);
  }
  return heuristic;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const adminToken = getAdminTokenFromRequest(req);
    if (!adminToken) return json({ error: "Admin session required" }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !secret) return json({ error: "Brain service configuration missing" }, 500);
    if (!await verifyAdminToken(adminToken, secret)) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(url, secret);
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "dashboard");

    if (action === "classify_industries") {
      const batch = Math.max(1, Math.min(40, Number(body?.batch || 20)));
      const deep = body?.deep !== false;
      const { data: companies, error: companyError } = await supabase
        .from("golden_report_companies")
        .select("id,display_name,primary_domain,website_url,business_summary,industry,industry_confidence,industry_source")
        .or("industry.is.null,industry_confidence.lt.0.82")
        .order("updated_at", { ascending: false })
        .limit(batch);
      if (companyError) throw companyError;

      let classified = 0;
      let unchanged = 0;
      const results: Array<Record<string, unknown>> = [];

      for (const company of companies || []) {
        const { data: archive } = await supabase
          .from("golden_report_archive")
          .select("target_url,executive_summary,top_priorities,top_leaks,completed_at")
          .eq("company_id", company.id)
          .order("completed_at", { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle();

        const guess = await classifyCompanyIndustry(company as any, archive as any, deep);
        if (guess.industry && guess.confidence >= 0.62) {
          const { error } = await supabase.from("golden_report_companies").update({
            industry: guess.industry,
            industry_confidence: guess.confidence,
            industry_source: guess.source,
            industry_signals: guess.signals,
            industry_classified_at: new Date().toISOString(),
          }).eq("id", company.id);
          if (error) throw error;
          classified++;
        } else {
          unchanged++;
        }
        results.push({
          company: company.display_name,
          industry: guess.industry,
          confidence: guess.confidence,
          source: guess.source,
          signals: guess.signals,
        });
      }

      const { error: refreshError } = await supabase.rpc("refresh_golden_report_collective_brain");
      if (refreshError) console.warn("Collective Brain refresh failed after classification", refreshError);

      const { count: remaining } = await supabase
        .from("golden_report_companies")
        .select("id", { count: "exact", head: true })
        .is("industry", null);

      return json({ ok: true, processed: (companies || []).length, classified, unchanged, remaining_unclassified: remaining ?? 0, results });
    }

    if (action !== "dashboard") return json({ error: "Unsupported action" }, 400);

    const [
      patternsR,
      pairsR,
      stateR,
      industriesR,
      industryPatternsR,
    ] = await Promise.all([
      supabase.from("golden_report_collective_patterns").select("*").order("report_count", { ascending: false }).limit(400),
      supabase.from("golden_report_pattern_pairs").select("*").order("reports_together", { ascending: false }).limit(250),
      supabase.from("golden_report_brain_state").select("*").eq("id", "collective").maybeSingle(),
      supabase.from("golden_report_companies").select("industry,industry_confidence,industry_source").limit(5000),
      supabase.from("golden_report_industry_patterns").select("*").order("report_count", { ascending: false }).limit(800),
    ]);

    const dbError = patternsR.error || pairsR.error || stateR.error || industriesR.error || industryPatternsR.error;
    if (dbError) {
      console.error("Collective Brain database read failed", dbError);
      return json({ error: "Collective Brain data is not initialized yet. Apply the Golden Report collective brain migration." }, 503);
    }

    const patterns = patternsR.data || [];
    const companies = industriesR.data || [];

    const industryMap = new Map<string, { industry: string; companies: number; confidenceTotal: number; confidenceCount: number; sources: Record<string, number> }>();
    let high = 0, medium = 0, low = 0, unclassified = 0;
    for (const row of companies as any[]) {
      const industry = String(row.industry || "").trim();
      const confidence = Number(row.industry_confidence || 0);
      if (!industry) { unclassified++; continue; }
      if (confidence >= 0.85) high++;
      else if (confidence >= 0.7) medium++;
      else low++;
      const rec = industryMap.get(industry) || { industry, companies: 0, confidenceTotal: 0, confidenceCount: 0, sources: {} };
      rec.companies++;
      if (confidence > 0) { rec.confidenceTotal += confidence; rec.confidenceCount++; }
      const source = String(row.industry_source || "unknown");
      rec.sources[source] = (rec.sources[source] || 0) + 1;
      industryMap.set(industry, rec);
    }
    const industry_stats = [...industryMap.values()]
      .map(x => ({ ...x, avg_confidence: x.confidenceCount ? x.confidenceTotal / x.confidenceCount : null }))
      .sort((a, b) => b.companies - a.companies);

    const categoryMap = new Map<string, { category: string; occurrences: number; reports: number }>();
    const evidenceMap = new Map<string, number>();
    for (const p of patterns as any[]) {
      const cat = String(p.category || "uncategorized");
      const rec = categoryMap.get(cat) || { category: cat, occurrences: 0, reports: 0 };
      rec.occurrences += Number(p.occurrence_count || 0);
      rec.reports += Number(p.report_count || 0);
      categoryMap.set(cat, rec);
      const grades = p.evidence_grades && typeof p.evidence_grades === "object" ? p.evidence_grades : {};
      for (const [grade, count] of Object.entries(grades)) evidenceMap.set(grade, (evidenceMap.get(grade) || 0) + Number(count || 0));
    }

    return json({
      patterns,
      pairs: pairsR.data || [],
      state: stateR.data || null,
      industry_patterns: industryPatternsR.data || [],
      industry_stats,
      category_stats: [...categoryMap.values()].sort((a, b) => b.occurrences - a.occurrences),
      evidence_stats: [...evidenceMap.entries()].map(([grade, count]) => ({ grade, count })).sort((a, b) => b.count - a.count),
      classification: {
        total: companies.length,
        classified: companies.length - unclassified,
        high,
        medium,
        low,
        unclassified,
      },
    });
  } catch (e) {
    const msg = e && typeof e === "object" && "message" in e ? String((e as any).message) : "Brain query failed";
    console.error("golden-report-brain failed", e);
    return json({ error: msg }, 500);
  }
});
