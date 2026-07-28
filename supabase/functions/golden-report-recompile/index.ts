// Universal Golden Report recompiler.
//
// Runs the shared evidence + consistency compiler over stored reports so
// historic scans get the same guarantees as new ones: one evidence ledger,
// semantically deduplicated root causes, each root cause priced at most once,
// canonical totals and counts injected into prose, and a validation verdict.
//
// Universal by construction: the only optional filter is a scan id, used for
// targeted re-runs. Nothing in the logic branches on company, url or account.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { compileGoldenReport } from "../_shared/golden-compiler.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-pin",
};

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    if (String(body?.pin || "") !== (Deno.env.get("ADMIN_PIN") || "9822")) {
      return json({ error: "unauthorized" }, 401);
    }
    const dryRun = body?.dry_run !== false;
    const scanId = String(body?.scan_id || "").trim();
    const limit = Math.min(Number(body?.limit) || 1000, 5000);

    const stats = {
      dry_run: dryRun,
      scanned: 0,
      compiled: 0,
      needs_review: 0,
      updated: 0,
      repairs: 0,
      duplicate_pricing_removed: 0,
      total_mismatches_fixed: 0,
      count_mismatches_fixed: 0,
      still_violating: [] as Array<{ id: string; url: string; violations: unknown[] }>,
      samples: [] as Array<Record<string, unknown>>,
    };

    const pageSize = 50;
    for (let from = 0; from < limit; from += pageSize) {
      let q = sb
        .from("forensic_scans")
        .select("id, target_url, company_name, report, raw_findings")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);
      if (scanId) q = sb
        .from("forensic_scans")
        .select("id, target_url, company_name, report, raw_findings")
        .eq("id", scanId);

      const { data, error } = await q;
      if (error) throw error;
      if (!data?.length) break;

      for (const row of data) {
        const before = row.report as Record<string, unknown> | null;
        if (!before || typeof before !== "object") continue;
        stats.scanned += 1;

        let compiled = compileGoldenReport({
          report: before as never,
          rawFindings: row.raw_findings,
          url: row.target_url,
          company: row.company_name,
        });
        if (!compiled.ok) {
          compiled = compileGoldenReport({
            report: compiled.report,
            rawFindings: row.raw_findings,
            url: row.target_url,
            company: row.company_name,
          });
        }

        stats.repairs += compiled.repairs.length;
        stats.duplicate_pricing_removed += compiled.repairs.filter((r) => /duplicate/i.test(r)).length;
        stats.total_mismatches_fixed += compiled.repairs.filter((r) => /stale total/i.test(r)).length;
        stats.count_mismatches_fixed += compiled.repairs.filter((r) => /canonicalized count/i.test(r)).length;
        if (compiled.ok) stats.compiled += 1;
        else {
          stats.needs_review += 1;
          if (stats.still_violating.length < 25) {
            stats.still_violating.push({
              id: row.id,
              url: row.target_url,
              violations: compiled.violations.slice(0, 5),
            });
          }
        }

        if (!dryRun) {
          const { error: upErr } = await sb
            .from("forensic_scans")
            .update({ report: compiled.report, updated_at: new Date().toISOString() })
            .eq("id", row.id);
          if (upErr) throw upErr;
          stats.updated += 1;
        }

        if (stats.samples.length < 10) {
          stats.samples.push({
            id: row.id,
            url: row.target_url,
            state: compiled.state,
            canonical_range: compiled.consistency.canonical_range_ascii,
            detected_findings: compiled.consistency.detected_findings,
            uniquely_priced_leaks: compiled.consistency.uniquely_priced_leaks,
            unique_root_causes: compiled.consistency.unique_root_causes,
            site_type: compiled.consistency.site_type,
            evidence_quality: compiled.consistency.evidence_quality,
            repairs: compiled.repairs.slice(0, 8),
          });
        }
      }

      if (scanId || data.length < pageSize) break;
    }

    return json({ ok: true, ...stats });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
