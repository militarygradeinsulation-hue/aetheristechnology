// Universal Golden Report leakage backfill.
//
// Recomputes report.overall_leakage for EVERY completed scan using the single
// shared resolver. No company, url, account or scan-id filtering: the only
// input is the report data shape. Reports with no valid priced evidence keep
// no overall_leakage (the UI then shows the muted message and the PDF omits
// the box) — nothing is ever invented.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import {
  computeOverallLeakage,
  hasPricedEvidence,
  LEAKAGE_CALCULATION_VERSION,
} from "../_shared/golden-leakage.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-pin",
};

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    if (String(body?.pin || "") !== (Deno.env.get("ADMIN_PIN") || "9822")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const dryRun = body?.dry_run !== false;

    const stats = {
      scanned: 0,
      updated: 0,
      unchanged: 0,
      cleared: 0,
      no_evidence: 0,
      invariant_violations: [] as Array<{ id: string; reason: string }>,
      by_source: { top_leaks: 0, chapters: 0 } as Record<string, number>,
    };

    const pageSize = 100;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await sb
        .from("forensic_scans")
        .select("id, report")
        .eq("status", "completed")
        .order("created_at", { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (!data?.length) break;

      for (const row of data) {
        stats.scanned += 1;
        const report = (row.report || {}) as Record<string, unknown>;
        const next = computeOverallLeakage(report);
        const prev = report.overall_leakage as Record<string, unknown> | undefined;

        if (!next) {
          stats.no_evidence += 1;
          if (hasPricedEvidence(report)) {
            // Should be impossible: evidence exists but no total resolved.
            stats.invariant_violations.push({
              id: row.id,
              reason: "priced evidence present but overall_leakage unresolved",
            });
            console.error("leakage_invariant_violation", JSON.stringify({ scan_id: row.id }));
          }
          if (prev) {
            // Previously stored value is no longer supported by evidence.
            stats.cleared += 1;
            if (!dryRun) {
              const { overall_leakage: _drop, ...rest } = report;
              await sb.from("forensic_scans").update({ report: rest }).eq("id", row.id);
            }
          }
          continue;
        }

        stats.by_source[next.source] = (stats.by_source[next.source] || 0) + 1;
        const same = prev &&
          Number(prev.annual_low) === next.annual_low &&
          Number(prev.annual_high) === next.annual_high &&
          Number(prev.calculation_version) === LEAKAGE_CALCULATION_VERSION;
        if (same) {
          stats.unchanged += 1;
          continue;
        }
        stats.updated += 1;
        if (!dryRun) {
          await sb
            .from("forensic_scans")
            .update({ report: { ...report, overall_leakage: next } })
            .eq("id", row.id);
        }
      }
      if (data.length < pageSize) break;
    }

    return new Response(JSON.stringify({ ok: true, dry_run: dryRun, ...stats }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("golden-leakage-backfill failed", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
