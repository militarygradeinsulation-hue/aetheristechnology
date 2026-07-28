// Golden Report parity audit.
//
// Rebuilds the shared report view model for saved scans and verifies that every
// reader-facing string on the website report is present, verbatim, in the model
// the PDF renders from. Read-only: it never mutates a scan.
//
// POST { ids?: string[], limit?: number }  ->  { checked, failing, results[] }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { buildGoldenReportModel, auditGoldenReportParity } from "../_shared/golden-report-model.ts";
import { computeGoldenLeakage } from "../_shared/golden-leakage.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
    const limit = Math.min(Number(body.limit) || 50, 500);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let q = supabase
      .from("forensic_scans")
      .select("id, company_name, target_url, report")
      .not("report", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (ids.length) q = supabase.from("forensic_scans").select("id, company_name, target_url, report").in("id", ids);

    const { data, error } = await q;
    if (error) throw error;

    const results = (data || []).map((row) => {
      const report = (row.report || {}) as Record<string, unknown>;
      const model = buildGoldenReportModel({
        report,
        company: row.company_name || row.target_url || "",
        url: row.target_url || "",
        scanId: row.id,
      });
      const audit = auditGoldenReportParity(report, model);
      const leak = computeGoldenLeakage(report as never);
      return {
        id: row.id,
        company: row.company_name || row.target_url,
        ok: audit.ok,
        checked_leaves: audit.checkedLeaves,
        sections: audit.sectionCount,
        blocks: audit.blockCount,
        chapters: Array.isArray(report.chapters) ? report.chapters.length : 0,
        posts: (report.deliverables as { posts?: unknown[] } | null)?.posts?.length || 0,
        schedule_days: (report.deliverables as { schedule?: { days?: unknown[] } } | null)?.schedule?.days?.length || 0,
        leakage: leak ? `${leak.rangeLabelAscii} / year` : null,
        issues: audit.issues.slice(0, 10),
        report: body.include_report ? report : undefined,
      };
    });

    return new Response(
      JSON.stringify({
        checked: results.length,
        failing: results.filter((r) => !r.ok).length,
        results,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
