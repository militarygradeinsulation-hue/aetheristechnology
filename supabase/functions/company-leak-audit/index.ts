// Public company assessment gateway. Never returns the Golden Report, its ID,
// internal findings, or the raw answers from a different visitor.
// Full forensic jobs are triggered once per domain, limited at the database.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { deliverLeakAuditSubmission } from '../_shared/deliver-leak-audit.ts';
import { shouldStartCompanyReport } from '../_shared/leak-audit-appendix.ts';
import {
  AUDIT_ENGINE_VERSION, AUDIT_OPTIONS, evaluateCompanyAudit, modelCompanyAuditExposure,
  normalizePublicCompanyUrl, validateAuditAnswers,
} from "../_shared/company-audit-offers.ts";

const CORS = {
  ...corsHeaders,
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: CORS });
const str = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";
const validBands = new Set(["sub_500k","500k_1m","1m_3m","3m_10m","10m_plus"]);

const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const url = Deno.env.get("SUPABASE_URL") || "";
const sb = createClient(url, service, { auth: { persistSession: false } });

async function ipDigest(req: Request): Promise<string> {
  // Only used for best-effort rate limiting; never persisted in plaintext.
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const bytes = new TextEncoder().encode(service + ":" + ip);
  const result = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(result)].map(x => x.toString(16).padStart(2,"0")).join("");
}

async function queuePrivateGolden(caseId: string, domain: string, websiteUrl: string, companyName: string) {
  // Atomic claim in Postgres prevents duplicate starts and enforces daily cost cap.
  const { data: claimed, error: claimError } = await sb.rpc("claim_private_company_golden", { p_case_id: caseId });
  if (claimError) {
    console.error("claim private golden failed", claimError.message);
    return;
  }
  if (claimed !== true) return;
  try {
    const res = await fetch(url + "/functions/v1/forensic-scan-all", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + service,
        "apikey": service,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: websiteUrl, company: companyName, private_intake: true }),
      signal: AbortSignal.timeout(20000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.scan_id) throw new Error("private scanner rejected dispatch");
    const { error } = await sb.from("aetheris_company_audit_cases").update({
      private_scan_id: data.scan_id,
      scan_status: data.reused ? "reused" : "queued",
      updated_at: new Date().toISOString(),
    }).eq("id", caseId).eq("domain", domain);
    if (error) throw error;
    // Reuse may finish before the scanner's completion hook ever runs.
    const { data: request } = await sb.from('aetheris_company_audit_submissions')
      .select('id').eq('case_id', caseId).order('created_at').limit(1).maybeSingle();
    if (request) await deliverLeakAuditSubmission(request.id);
  } catch (e) {
    console.error("private Golden dispatch failed", e instanceof Error ? e.message : e);
    await sb.from("aetheris_company_audit_cases").update({
      scan_status: "failed", updated_at: new Date().toISOString(),
    }).eq("id", caseId).eq("scan_status", "dispatching");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not supported" }, 405);
  try {
    if (!service || !url) return json({ error: "Assessment is being configured." }, 503);
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Invalid assessment." }, 400);
    const companyUrl = normalizePublicCompanyUrl(body.website);
    const companyName = str(body.company, 120) || companyUrl.domain;
    const name = str(body.name, 120);
    const email = str(body.email, 254).toLowerCase();
    const revenueBand = str(body.revenueBand, 24);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !validBands.has(revenueBand) ||
        !validateAuditAnswers(body.answers)) {
      return json({ error: "Enter your company website, email, revenue band and all 14 answers." }, 400);
    }
    const ipHash = await ipDigest(req);
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const { count, error: countError } = await sb.from("aetheris_company_audit_submissions")
      .select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", yesterday);
    if (countError) throw countError;
    if ((count ?? 0) >= 8) return json({ error: "Daily assessment limit reached. Try again tomorrow." }, 429);

    // The FIRST completed questionnaire is the canonical company baseline.
    // Later questionnaires for the same normalized host get precisely the same
    // findings and frozen prices, even if their input answers differ.
    const { data: existing, error: readError } = await sb.from("aetheris_company_audit_cases")
      .select("id, company_name, domain, revenue_band, baseline_answers, recommendations, offer_snapshot, scan_status")
      .eq("domain", companyUrl.domain).maybeSingle();
    if (readError) throw readError;
    let companyCase = existing;
    if (!companyCase) {
      const baseline = {
        domain: companyUrl.domain, website_url: companyUrl.url,
        company_name: companyName, revenue_band: revenueBand,
        baseline_answers: body.answers,
        recommendations: evaluateCompanyAudit(body.answers),
        offer_snapshot: AUDIT_OPTIONS,
        engine_version: AUDIT_ENGINE_VERSION, scan_status: "pending",
      };
      const { data: created, error: createError } = await sb.from("aetheris_company_audit_cases")
        .insert(baseline).select("id, company_name, domain, revenue_band, baseline_answers, recommendations, offer_snapshot, scan_status").single();
      if (createError && createError.code !== "23505") throw createError;
      if (created) companyCase = created;
      else {
        const { data: winner, error: winnerError } = await sb.from("aetheris_company_audit_cases")
          .select("id, company_name, domain, revenue_band, baseline_answers, recommendations, offer_snapshot, scan_status")
          .eq("domain", companyUrl.domain).single();
        if (winnerError) throw winnerError;
        companyCase = winner;
      }
    }

    const { data: submission, error: submissionError } = await sb.from("aetheris_company_audit_submissions").insert({
      case_id: companyCase.id, contact_name: name || null, contact_email: email,
      submission_answers: body.answers, ip_hash: ipHash,
    }).select('id').single();
    if (submissionError) throw submissionError;
    if (!submission) throw new Error('Assessment was not saved');

    // Keep the established admin lead surfaces and admin assistant in sync.
    // assessment_leads is the historical inbox used for public assessments.
    const visitorModel = modelCompanyAuditExposure(body.answers, revenueBand);
    const { error: legacyLeadError } = await sb.from("assessment_leads").insert({
      email,
      name: name || null,
      company: companyName || companyCase.company_name || null,
      score: visitorModel.healthScore,
      answers: {
        source: "free_leak_check",
        domain: companyUrl.domain,
        case_id: companyCase.id,
        revenue_band: revenueBand,
        exposure: visitorModel,
        responses: body.answers,
      },
    });
    if (legacyLeadError) console.error("assessment lead mirror failed", legacyLeadError.message);

    // The public request has no privileged scan ID and never accesses report
    // JSON. The existing Golden scanner stores a full case file in the private
    // forensic_scans table and automatically archives it in Golden Library.
    if (shouldStartCompanyReport(companyCase.scan_status, null)) {
      // The private Golden dispatch is optional work, not part of giving visitors
      // their own deterministic results. Never block the response for up to 20s
      // on a costed scan dispatch or claim that dispatch completion is guaranteed.
      const dispatch = queuePrivateGolden(companyCase.id, companyUrl.domain, companyUrl.url, companyCase.company_name);
      const runtime = (globalThis as { EdgeRuntime?: { waitUntil?: (job: Promise<unknown>) => void } }).EdgeRuntime;
      if (runtime?.waitUntil) runtime.waitUntil(dispatch);
      else await dispatch;
    }
    // No questionnaire-derived dollar range is presented as report findings.
    let deliveryStatus = 'pending';
    try { deliveryStatus = (await deliverLeakAuditSubmission(submission.id)).status; }
    catch (e) { console.error('appendix delivery failed', e instanceof Error ? e.message : 'delivery error'); deliveryStatus = 'review'; }
    return json({
      company: companyUrl.domain, domain: companyUrl.domain,
      repeated: !!existing, engineVersion: AUDIT_ENGINE_VERSION,
      recommendations: companyCase.recommendations,
      options: companyCase.offer_snapshot,
      saved: true,
      deliveryStatus: ['limited', 'failed'].includes(companyCase.scan_status) ? 'review' : deliveryStatus,
      message: 'Your request is saved. Findings are emailed only from a completed, reviewed Golden Report.',
    });
  } catch (e) {
    console.error("company audit error", e instanceof Error ? e.message : e);
    return json({ error: "Unable to save assessment right now. Please try again or contact Aetheris." }, 500);
  }
});
