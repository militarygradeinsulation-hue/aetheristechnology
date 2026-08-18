// Golden Report Library — company-centered archive of every Golden Report.
//
// Auth: admin PIN token (full access) or portal token (rep/partner, scoped to
// that rep_code). Reports themselves stay canonical in forensic_scans; this
// function only maintains and serves the searchable archive layer.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";
import {
  resolveBusinessIdentity,
  buildArchiveSummary,
  buildFindingRows,
  deterministicBusinessSummary,
  type ScanRow,
} from "../_shared/golden-archive.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-portal-token, x-internal-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SCAN_COLS =
  "id, target_url, company_name, report, raw_findings, report_source, portal_source, rep_code, creator_name, creator_email, report_state, financial_model_version, completed_at, status";

type SB = ReturnType<typeof createClient>;

/* ─────────────── archive upsert (idempotent by scan_id) ─────────────── */

async function upsertCompany(sb: SB, scan: ScanRow) {
  const identity = resolveBusinessIdentity(scan);

  let existing: Record<string, unknown> | null = null;
  if (identity.primary_domain) {
    const { data } = await sb
      .from("golden_report_companies").select("*")
      .eq("primary_domain", identity.primary_domain).maybeSingle();
    existing = data as never;
  }
  if (!existing) {
    const { data } = await sb
      .from("golden_report_companies").select("*")
      .eq("normalized_name", identity.normalized_name)
      .is("primary_domain", identity.primary_domain ? null : null)
      .maybeSingle();
    // Only reuse a name match when neither side carries a domain.
    if (data && !(data as Record<string, unknown>).primary_domain && !identity.primary_domain) {
      existing = data as never;
    }
  }

  if (existing) {
    const aliases = new Set<string>((existing.aliases as string[] | null) ?? []);
    if (identity.display_name && identity.display_name !== existing.display_name) aliases.add(identity.display_name);
    const contacts = new Set<string>((existing.contact_names as string[] | null) ?? []);
    if (identity.contact_name) contacts.add(identity.contact_name);
    const patch: Record<string, unknown> = {
      aliases: [...aliases],
      contact_names: [...contacts],
    };
    if (!existing.industry && identity.industry) patch.industry = identity.industry;
    if (!existing.location && identity.location) patch.location = identity.location;
    if (!existing.website_url && identity.website_url) patch.website_url = identity.website_url;
    await sb.from("golden_report_companies").update(patch).eq("id", existing.id as string);
    return { id: existing.id as string, identity, row: existing };
  }

  const insert = {
    display_name: identity.display_name,
    normalized_name: identity.normalized_name,
    primary_domain: identity.primary_domain,
    website_url: identity.website_url,
    aliases: [],
    industry: identity.industry,
    location: identity.location,
    contact_names: identity.contact_name ? [identity.contact_name] : [],
    summary_source: "pending",
  };
  const { data, error } = await sb.from("golden_report_companies").insert(insert).select("*").maybeSingle();
  if (error) {
    // Concurrent insert — re-read.
    const { data: again } = await sb.from("golden_report_companies").select("*")
      .eq(identity.primary_domain ? "primary_domain" : "normalized_name",
        identity.primary_domain ?? identity.normalized_name)
      .maybeSingle();
    if (!again) throw error;
    return { id: (again as Record<string, unknown>).id as string, identity, row: again as never };
  }
  return { id: (data as Record<string, unknown>).id as string, identity, row: data as never };
}

async function archiveScan(sb: SB, scan: ScanRow): Promise<{ archive_id: string; skipped?: string }> {
  if (!scan.report || Object.keys(scan.report).length === 0) return { archive_id: "", skipped: "no_report" };
  if (scan.status && scan.status !== "completed") return { archive_id: "", skipped: "not_completed" };

  const company = await upsertCompany(sb, scan);
  const summary = buildArchiveSummary(scan);

  // Version = position in this company's history, stable per scan.
  const { data: prior } = await sb.from("golden_report_archive")
    .select("id, report_version, scan_id")
    .eq("company_id", company.id)
    .order("completed_at", { ascending: true });
  const priorRows = (prior || []) as { id: string; report_version: number; scan_id: string }[];
  const mine = priorRows.find((r) => r.scan_id === scan.id);
  const version = mine ? mine.report_version : priorRows.length + 1;

  const row = {
    company_id: company.id,
    scan_id: scan.id,
    report_version: version,
    report_state: summary.report_state,
    is_valid: summary.is_valid,
    target_url: summary.target_url,
    raw_company_name: summary.raw_company_name,
    report_source: summary.report_source,
    portal_source: summary.portal_source,
    rep_code: summary.rep_code,
    creator_name: summary.creator_name,
    creator_email: summary.creator_email,
    annual_low: summary.annual_low,
    annual_high: summary.annual_high,
    currency: "USD",
    leak_count: summary.leak_count,
    finding_count: summary.finding_count,
    root_cause_count: summary.root_cause_count,
    score: summary.score,
    grade: summary.grade,
    executive_summary: summary.executive_summary,
    top_priorities: summary.top_priorities,
    top_leaks: summary.top_leaks,
    report_hash: summary.report_hash,
    compiler_version: summary.compiler_version,
    financial_model_version: summary.financial_model_version,
    completed_at: summary.completed_at,
  };

  const { data: saved, error } = await sb
    .from("golden_report_archive")
    .upsert(row, { onConflict: "scan_id" })
    .select("id")
    .maybeSingle();
  if (error) throw error;
  const archiveId = (saved as { id: string }).id;

  // Findings index — replace for this archive (idempotent).
  const findings = buildFindingRows(scan);
  await sb.from("golden_report_findings_index").delete().eq("archive_id", archiveId);
  if (findings.length) {
    await sb.from("golden_report_findings_index").insert(
      findings.map((f) => ({ ...f, archive_id: archiveId, scan_id: scan.id, company_id: company.id })),
    );
  }

  // Deterministic business summary when the company has none yet.
  const companyRow = company.row as Record<string, unknown>;
  if (!companyRow.business_summary) {
    await sb.from("golden_report_companies").update({
      business_summary: deterministicBusinessSummary(company.identity, summary),
      summary_source: "report_evidence",
      summary_generated_at: new Date().toISOString(),
    }).eq("id", company.id);
  }

  return { archive_id: archiveId };
}

/* ─────────────────────────────── handler ─────────────────────────────── */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(SUPABASE_URL, SVC);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    const isAdmin = await verifyAdminToken(getAdminTokenFromRequest(req), SVC);
    const portal = isAdmin ? null : await verifyPortalToken(getPortalTokenFromRequest(req), SVC);
    // Internal service-role calls (forensic-scan-all completion hook).
    const internal = req.headers.get("x-internal-key") === SVC;

    if (!isAdmin && !portal && !internal) return json({ error: "Unauthorized" }, 401);

    // Tenant scope. Admin/internal are global. Every other portal role is
    // pinned to explicit owner codes; an untieable token reads nothing.
    const globalScope = isAdmin || internal;
    let scopeCodes: string[] | null = null; // null => global
    if (!globalScope) {
      if (!portal) return json({ error: "Unauthorized" }, 401);
      if (portal.role === "rep") {
        scopeCodes = [portal.code];
      } else if (portal.role === "partner") {
        const { data: self } = await sb.from("rep_codes").select("team_name").eq("code", portal.code).maybeSingle();
        const team = (self as { team_name?: string | null } | null)?.team_name || null;
        let codes = [portal.code];
        if (team) {
          const { data: mates } = await sb.from("rep_codes").select("code").eq("team_name", team);
          codes = codes.concat(((mates || []) as Array<{ code: string }>).map((r) => r.code));
        }
        scopeCodes = [...new Set(codes)];
      } else {
        scopeCodes = [];
      }
    }
    const scoped = <T extends { in: (c: string, v: string[]) => T }>(q: T): T =>
      scopeCodes === null ? q : q.in("rep_code", scopeCodes.length ? scopeCodes : ["\u0000none"]);

    /* archive a single scan (completion hook / admin retry) */
    if (action === "archive_scan") {
      if (!isAdmin && !internal) return json({ error: "Forbidden" }, 403);
      const scanId = String(body.scan_id ?? "");
      if (!scanId) return json({ error: "scan_id required" }, 400);
      const { data: scan } = await sb.from("forensic_scans").select(SCAN_COLS).eq("id", scanId).maybeSingle();
      if (!scan) return json({ error: "scan not found" }, 404);
      const res = await archiveScan(sb, scan as unknown as ScanRow);

      // Automatic pipeline: a valid, archived report provisions its Company
      // Operating System. Fire and forget so the scan response can never fail
      // because provisioning failed; compose is idempotent and retryable.
      let provisioning: string = "skipped";
      if (res.archive_id && body.provision !== false) {
        const { data: arch } = await sb.from("golden_report_archive")
          .select("is_valid").eq("id", res.archive_id).maybeSingle();
        if ((arch as { is_valid?: boolean } | null)?.is_valid) {
          provisioning = "queued";
          const call = fetch(`${SUPABASE_URL}/functions/v1/company-system`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-internal-key": SVC, Authorization: `Bearer ${SVC}` },
            body: JSON.stringify({ action: "compose", scan_id: scanId }),
          }).catch(() => undefined);
          const rt = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
          if (rt?.waitUntil) rt.waitUntil(call);
        } else {
          provisioning = "blocked:report_not_valid";
        }
      }
      return json({ ok: true, ...res, provisioning });
    }


    /* resumable, idempotent historical backfill */
    if (action === "backfill") {
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
      const batch = Math.max(1, Math.min(100, Number(body.batch) || 40));
      const cursor: string | null = typeof body.cursor === "string" && body.cursor ? body.cursor : null;

      let q = sb.from("forensic_scans").select(SCAN_COLS)
        .eq("status", "completed")
        .not("report", "is", null)
        .order("id", { ascending: true })
        .limit(batch);
      if (cursor) q = q.gt("id", cursor);
      const { data: scans, error } = await q;
      if (error) throw error;
      const rows = (scans || []) as unknown as ScanRow[];

      let archived = 0, skipped = 0;
      const errors: string[] = [];
      for (const s of rows) {
        try {
          const r = await archiveScan(sb, s);
          if (r.skipped) skipped++; else archived++;
        } catch (e) {
          errors.push(`${s.id}: ${(e as Error).message}`);
        }
      }
      const [{ count: total }, { count: done }] = await Promise.all([
        sb.from("forensic_scans").select("id", { count: "exact", head: true })
          .eq("status", "completed").not("report", "is", null),
        sb.from("golden_report_archive").select("id", { count: "exact", head: true }),
      ]) as unknown as { count: number }[];

      return json({
        ok: true,
        processed: rows.length,
        archived,
        skipped,
        errors: errors.slice(0, 5),
        cursor: rows.length ? rows[rows.length - 1].id : null,
        done: rows.length < batch,
        total_scans: total ?? 0,
        total_archived: done ?? 0,
      });
    }

    if (action === "stats") {
      const [{ count: total }, { count: done }, { count: companies }] = await Promise.all([
        sb.from("forensic_scans").select("id", { count: "exact", head: true })
          .eq("status", "completed").not("report", "is", null),
        sb.from("golden_report_archive").select("id", { count: "exact", head: true }),
        sb.from("golden_report_companies").select("id", { count: "exact", head: true }),
      ]) as unknown as { count: number }[];
      return json({ total_scans: total ?? 0, total_archived: done ?? 0, total_companies: companies ?? 0 });
    }

    /* company-first search list */
    if (action === "list_companies") {
      const limit = Math.max(1, Math.min(60, Number(body.limit) || 24));
      const offset = Math.max(0, Number(body.offset) || 0);
      const search = String(body.search ?? "").trim();
      const source = String(body.source ?? "");
      const state = String(body.state ?? "");
      const sort = String(body.sort ?? "newest");
      const blueprintFilter = String(body.blueprint ?? "");

      // Scope by matching archive rows first (also enforces rep scoping).
      let aq = sb.from("golden_report_archive")
        .select("id, company_id, scan_id, report_state, is_valid, report_source, rep_code, annual_low, annual_high, finding_count, root_cause_count, grade, score, completed_at, executive_summary, target_url, report_version");
      aq = scoped(aq as never) as never;
      if (source) aq = aq.eq("report_source", source);
      if (state) aq = aq.eq("report_state", state);
      if (body.since) aq = aq.gte("completed_at", String(body.since));
      if (body.until) aq = aq.lte("completed_at", String(body.until));
      const { data: archives, error: aerr } = await aq.order("completed_at", { ascending: false }).limit(4000);
      if (aerr) throw aerr;
      let rows = (archives || []) as Record<string, unknown>[];

      // Company lookup
      const companyIds = [...new Set(rows.map((r) => String(r.company_id)))];
      let cq = sb.from("golden_report_companies").select("*").in("id", companyIds.slice(0, 1000));
      const { data: companiesData } = await cq;
      const companies = new Map((companiesData || []).map((c) => [String((c as Record<string, unknown>).id), c as Record<string, unknown>]));

      if (search) {
        const needle = search.toLowerCase();
        const matchingFindingScans = new Set<string>();
        const { data: f } = await sb.from("golden_report_findings_index")
          .select("scan_id").ilike("title", `%${search}%`).limit(500);
        for (const r of (f || []) as { scan_id: string }[]) matchingFindingScans.add(r.scan_id);
        rows = rows.filter((r) => {
          const c = companies.get(String(r.company_id));
          const hay = [
            c?.display_name, c?.primary_domain, c?.website_url, c?.business_summary,
            (c?.aliases as string[] | undefined)?.join(" "),
            r.executive_summary, r.target_url,
          ].map((x) => String(x ?? "").toLowerCase()).join(" ");
          return hay.includes(needle) || matchingFindingScans.has(String(r.scan_id));
        });
      }

      if (body.industry) {
        rows = rows.filter((r) => String(companies.get(String(r.company_id))?.industry ?? "")
          .toLowerCase().includes(String(body.industry).toLowerCase()));
      }

      // Blueprint status per scan
      const scanIds = rows.map((r) => String(r.scan_id));
      const bpByScan = new Map<string, Record<string, unknown>>();
      for (let i = 0; i < scanIds.length; i += 500) {
        const { data: bps } = await sb.from("golden_system_blueprints")
          .select("scan_id, status, approval_state, validation_passed, created_at")
          .in("scan_id", scanIds.slice(i, i + 500))
          .order("created_at", { ascending: false });
        for (const b of (bps || []) as Record<string, unknown>[]) {
          const k = String(b.scan_id);
          if (!bpByScan.has(k)) bpByScan.set(k, b);
        }
      }
      if (blueprintFilter === "has") rows = rows.filter((r) => bpByScan.has(String(r.scan_id)));
      if (blueprintFilter === "none") rows = rows.filter((r) => !bpByScan.has(String(r.scan_id)));

      // Group by company
      const grouped = new Map<string, Record<string, unknown>[]>();
      for (const r of rows) {
        const k = String(r.company_id);
        if (!grouped.has(k)) grouped.set(k, []);
        grouped.get(k)!.push(r);
      }

      let cards = [...grouped.entries()].map(([cid, reps]) => {
        const c = companies.get(cid) || {};
        const sorted = [...reps].sort((a, b) => String(b.completed_at ?? "").localeCompare(String(a.completed_at ?? "")));
        const newest = sorted[0];
        return {
          company: {
            id: cid,
            display_name: c.display_name ?? "Unknown business",
            primary_domain: c.primary_domain ?? null,
            website_url: c.website_url ?? null,
            business_summary: c.business_summary ?? null,
            summary_source: c.summary_source ?? null,
            industry: c.industry ?? null,
            location: c.location ?? null,
            contact_names: c.contact_names ?? [],
            aliases: c.aliases ?? [],
          },
          report_count: sorted.length,
          newest_completed_at: newest?.completed_at ?? null,
          annual_low: newest?.annual_low ?? null,
          annual_high: newest?.annual_high ?? null,
          finding_count: newest?.finding_count ?? 0,
          root_cause_count: newest?.root_cause_count ?? 0,
          grade: newest?.grade ?? null,
          score: newest?.score ?? null,
          report_source: newest?.report_source ?? null,
          report_state: newest?.report_state ?? null,
          is_valid: !!newest?.is_valid,
          newest_scan_id: newest?.scan_id ?? null,
          newest_archive_id: newest?.id ?? null,
          blueprint: bpByScan.get(String(newest?.scan_id)) ?? null,
        };
      });

      const cmp: Record<string, (a: typeof cards[0], b: typeof cards[0]) => number> = {
        newest: (a, b) => String(b.newest_completed_at ?? "").localeCompare(String(a.newest_completed_at ?? "")),
        oldest: (a, b) => String(a.newest_completed_at ?? "").localeCompare(String(b.newest_completed_at ?? "")),
        name: (a, b) => String(a.company.display_name).localeCompare(String(b.company.display_name)),
        exposure_high: (a, b) => Number(b.annual_high ?? 0) - Number(a.annual_high ?? 0),
        exposure_low: (a, b) => Number(a.annual_high ?? 0) - Number(b.annual_high ?? 0),
        findings: (a, b) => Number(b.finding_count ?? 0) - Number(a.finding_count ?? 0),
      };
      cards.sort(cmp[sort] ?? cmp.newest);

      const totalCards = cards.length;
      cards = cards.slice(offset, offset + limit);
      return json({ items: cards, total: totalCards, limit, offset });
    }

    /* company detail — report timeline */
    if (action === "get_company") {
      const companyId = String(body.company_id ?? "");
      if (!companyId) return json({ error: "company_id required" }, 400);
      const { data: company } = await sb.from("golden_report_companies").select("*").eq("id", companyId).maybeSingle();
      if (!company) return json({ error: "not found" }, 404);
      let aq = sb.from("golden_report_archive").select("*").eq("company_id", companyId);
      aq = scoped(aq as never) as never;
      const { data: reports } = await aq.order("completed_at", { ascending: false });
      const list = (reports || []) as Record<string, unknown>[];
      if (scopeCodes !== null && list.length === 0) return json({ error: "Forbidden" }, 403);
      const { data: bps } = await sb.from("golden_system_blueprints")
        .select("id, scan_id, blueprint_version, status, approval_state, validation_passed, created_at, error_message")
        .in("scan_id", list.map((r) => String(r.scan_id)))
        .order("created_at", { ascending: false });
      return json({ company, reports: list, blueprints: bps || [] });
    }

    /* single report detail + findings */
    if (action === "get_report") {
      const scanId = String(body.scan_id ?? "");
      if (!scanId) return json({ error: "scan_id required" }, 400);
      let aq = sb.from("golden_report_archive").select("*").eq("scan_id", scanId);
      aq = scoped(aq as never) as never;
      const { data: archive } = await aq.maybeSingle();
      if (!archive) return json({ error: "not found" }, 404);
      const { data: findings } = await sb.from("golden_report_findings_index")
        .select("*").eq("scan_id", scanId).order("priority", { ascending: true });
      const { data: blueprints } = await sb.from("golden_system_blueprints")
        .select("id, blueprint_version, status, approval_state, validation, validation_passed, error_message, created_at, source_report_hash, template_version")
        .eq("scan_id", scanId).order("created_at", { ascending: false });
      const { data: company } = await sb.from("golden_report_companies")
        .select("*").eq("id", (archive as Record<string, unknown>).company_id as string).maybeSingle();
      return json({ archive, company, findings: findings || [], blueprints: blueprints || [] });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("golden-report-library error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
