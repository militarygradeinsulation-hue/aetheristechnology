// Aetheris Partner API — external sites (e.g. yourbrain.technology) can run a
// Golden Report and read its results with a scoped API key.
//
//   POST /partner-api/scan     { url, company?, contact_name?, contact_email? }
//        → 202 { scan_id, status_url, report_url }
//   GET  /partner-api/scan?id=<uuid>
//        → 200 { scan_id, status, progress, company, target_url, report? }
//   GET  /partner-api/ping     → 200 { ok, partner }
//
// Auth: header `x-api-key: arp_live_...` (or `Authorization: Bearer arp_live_...`).
// Keys live in `partner_api_keys` (sha-256 hashed). A partner can only read
// scans that its own key created (`partner_api_scans` join table).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-api-key, apikey, x-client-info",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normalizeUrl(raw: string): string | null {
  const s = String(raw || "").trim();
  if (!s) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    if (!/^https?:$/.test(u.protocol)) return null;
    if (!u.hostname.includes(".")) return null;
    return u.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

interface PartnerKey {
  id: string;
  partner_name: string;
  partner_slug: string;
  is_active: boolean;
  daily_scan_limit: number;
}

async function authenticate(req: Request): Promise<PartnerKey | null> {
  const raw =
    req.headers.get("x-api-key")?.trim() ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    "";
  if (!raw.startsWith("arp_")) return null;
  const hash = await sha256Hex(raw);
  const { data } = await sb
    .from("partner_api_keys")
    .select("id, partner_name, partner_slug, is_active, daily_scan_limit")
    .eq("key_hash", hash)
    .maybeSingle();
  if (!data || !data.is_active) return null;
  return data as PartnerKey;
}

async function scansToday(keyId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await sb
    .from("partner_api_scans")
    .select("scan_id", { count: "exact", head: true })
    .eq("partner_key_id", keyId)
    .gte("created_at", since);
  return count || 0;
}

/** Public-safe projection of a scan row — never leaks internal identity fields. */
function publicScan(row: Record<string, unknown>, includeReport: boolean) {
  const stages = (row.stage_status as Record<string, { state?: string }>) || {};
  const total = Object.keys(stages).length || 1;
  const done = Object.values(stages).filter((s) => s?.state === "done").length;
  return {
    scan_id: row.id,
    status: row.status,
    progress: Math.min(100, Math.round((done / total) * 100)),
    company: row.company_name ?? null,
    target_url: row.target_url ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    stages,
    report: includeReport ? (row.report ?? null) : null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/partner-api\/?/, "").replace(/\/$/, "") || "ping";

  try {
    const partner = await authenticate(req);
    if (!partner) return json({ error: "Invalid or inactive API key" }, 401);

    await sb.from("partner_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", partner.id);

    if (path === "ping") {
      return json({ ok: true, partner: partner.partner_name });
    }

    if (path === "scan" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const target = normalizeUrl(String(body.url || body.website || ""));
      if (!target) return json({ error: "A valid `url` is required" }, 400);

      const used = await scansToday(partner.id);
      if (partner.daily_scan_limit > 0 && used >= partner.daily_scan_limit) {
        return json({ error: "Daily scan limit reached", limit: partner.daily_scan_limit }, 429);
      }

      // Reuse the one and only Golden Report pipeline. No second engine.
      const res = await fetch(`${SUPABASE_URL}/functions/v1/forensic-scan-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          url: target,
          company: String(body.company || "").trim() || undefined,
          lead_name: String(body.contact_name || "").trim() || undefined,
          lead_email: String(body.contact_email || "").trim() || undefined,
          lead_phone: String(body.contact_phone || "").trim() || undefined,
        }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out?.scan_id) {
        return json({ error: out?.error || "Could not start scan" }, 502);
      }

      // Attribution: the scan came in through a partner integration.
      await sb.from("forensic_scans")
        .update({
          portal_source: `partner_api:${partner.partner_slug}`,
          creator_name: partner.partner_name,
        })
        .eq("id", out.scan_id);

      await sb.from("partner_api_scans").insert({
        scan_id: out.scan_id,
        partner_key_id: partner.id,
        target_url: target,
        contact_email: String(body.contact_email || "").trim() || null,
      });

      const site = "https://aetheris.technology";
      return json({
        scan_id: out.scan_id,
        status: "queued",
        status_url: `${url.origin}/functions/v1/partner-api/scan?id=${out.scan_id}`,
        report_url: `${site}/golden-report/run?scan=${out.scan_id}`,
        embed_url: `${site}/golden-report/run?scan=${out.scan_id}&embed=1`,
      }, 202);
    }

    if (path === "scan" && req.method === "GET") {
      const id = url.searchParams.get("id") || "";
      if (!id) return json({ error: "`id` is required" }, 400);

      const { data: link } = await sb
        .from("partner_api_scans")
        .select("scan_id")
        .eq("scan_id", id)
        .eq("partner_key_id", partner.id)
        .maybeSingle();
      if (!link) return json({ error: "Scan not found for this API key" }, 404);

      const { data: row, error } = await sb
        .from("forensic_scans")
        .select("id, status, company_name, target_url, created_at, updated_at, stage_status, report")
        .eq("id", id)
        .maybeSingle();
      if (error || !row) return json({ error: "Scan not found" }, 404);

      const includeReport = url.searchParams.get("full") !== "0";
      return json(publicScan(row as Record<string, unknown>, includeReport));
    }

    return json({ error: `Unknown route: ${path}` }, 404);
  } catch (e) {
    console.error("partner-api error", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
