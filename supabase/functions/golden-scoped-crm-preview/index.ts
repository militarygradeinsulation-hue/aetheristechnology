/**
 * Read-only company context for Missing Information Triangulation.
 *
 * Requires BOTH the valid signed admin token and a Supabase Auth JWT belonging
 * to a connected CRM account owner. Never uses the scan requester's email,
 * target company's name, or a client-provided account ID for authorization.
 *
 * Deliberately does NOT join deals, contacts, or engagements.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";
import {
  normalizeReportDomain, companyMatchesReport, chooseUniqueCompanyMatch,
  type ScopedCompanyRecord,
} from "../_shared/golden-scoped-crm.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,apikey,x-client-info,content-type,x-admin-token",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !key) return reply({ error: "Service unavailable" }, 503);

  try {
    if (Number(req.headers.get("content-length") || "0") > 4096)
      return reply({ error: "Request too large" }, 413);

    const adminAuthorized = await verifyAdminToken(getAdminTokenFromRequest(req), key).catch(() => false);
    if (!adminAuthorized) return reply({ error: "Private admin access required" }, 401);

    // Never infer ownership from an admin PIN, portal rep code, email,
    // account number supplied by the browser, or the report's target URL.
    const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!bearer) return reply({ error: "Signed-in CRM account owner required" }, 401);

    const service = createClient(url, key);
    const { data: identity, error: authError } = await service.auth.getUser(bearer);
    if (authError || !identity?.user?.id)
      return reply({ error: "Signed-in CRM account owner required" }, 401);

    const body = await req.json().catch(() => null);
    const scanId = typeof body?.scan_id === "string" ? body.scan_id.trim() : "";
    if (!UUID.test(scanId)) return reply({ error: "Valid scan ID required" }, 400);

    const { data: scan, error: scanError } = await service.from("forensic_scans")
      .select("id,target_url").eq("id", scanId).maybeSingle();
    if (scanError) return reply({ error: "Unable to read report" }, 500);
    if (!scan) return reply({ error: "Report unavailable" }, 404);

    const reportDomain = normalizeReportDomain(scan.target_url || "");
    if (!reportDomain) return reply({ ok: true, status: "invalid_report_domain" });

    // Only account IDs that belong to the authenticated Supabase user and
    // still have a connected HubSpot refresh token can be searched.
    // No encrypted tokens are returned, decrypted, or refreshed.
    const { data: accounts, error: accountError } = await service.from("accounts")
      .select("id")
      .eq("user_id", identity.user.id)
      .not("hubspot_connected_at", "is", null)
      .not("hubspot_refresh_token_encrypted", "is", null)
      .limit(26);
    if (accountError) return reply({ error: "Unable to verify connected CRM ownership" }, 500);
    if (!accounts?.length) return reply({ ok: true, status: "no_owned_connected_account" });
    if (accounts.length > 25) return reply({ ok: true, status: "too_many_accounts" });

    const results: ScopedCompanyRecord[] = [];
    // Fixed account limit and exact-domain match make this a bounded,
    // narrowly scoped lookup rather than a bulk CRM search.
    for (const account of accounts) {
      const { data, error } = await service.from("mirror_companies")
        .select("id,name,domain,industry,owner_id,last_activity_date,synced_at")
        .eq("account_id", account.id)
        .or(`domain.ilike.${reportDomain},domain.ilike.www.${reportDomain}`)
        .limit(3);
      if (error) return reply({ error: "Unable to verify company domain" }, 500);
      for (const record of data || []) {
        if (companyMatchesReport(scan.target_url, record.domain || "")) results.push(record);
      }
      if (results.length > 1) break;
    }

    const choice = chooseUniqueCompanyMatch(scan.target_url, results);
    return reply({ ok: true, ...choice });
  } catch (error) {
    console.error("[golden-scoped-crm-preview]", error instanceof Error ? error.message : "unknown");
    return reply({ error: "Unable to evaluate company context" }, 500);
  }
});
