// Golden Report private experiment workspace.
// Security: manually validates the signed admin PIN token or a rep portal token
// scoped to EXACTLY the report rep_code. Shared scan links have no access.
// Service-role reads/writes only after authorization. Mindprint is admin-only.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";
import { buildActiveFrictionSignals } from "../_shared/golden-friction-scan.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,apikey,x-client-info,content-type,x-admin-token,x-portal-token",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};
const json = (payload: unknown, status = 200) => new Response(JSON.stringify(payload), {
  status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
});
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const URL = Deno.env.get("SUPABASE_URL") || "";
const sb = createClient(URL, SERVICE);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Entry = Record<string, unknown>;
const obj = (x: unknown): Entry => x && typeof x === "object" && !Array.isArray(x) ? x as Entry : {};
const str = (x: unknown, n: number) => typeof x === "string" ? x.trim().slice(0, n) : "";
const num = (x: unknown) => {
  if (x == null || x === "") return null;
  if (typeof x !== "number" && typeof x !== "string") return null;
  const n = Number(x);
  return Number.isFinite(n) && Math.abs(n) <= 1e15 ? n : null;
};
const lenses = new Set(["operational", "perceptual", "human", "economic"]);
const statuses = new Set(["planned","running","measured","closed"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    if (Number(req.headers.get("content-length") || "0") > 96_000) return json({ error: "Request too large" }, 413);
    const body = obj(await req.json());
    const action = str(body.action, 30);
    const scanId = str(body.scan_id, 60);
    if (!UUID.test(scanId)) return json({ error: "Valid scan ID required" }, 400);
    if (!["list","save","reclassify"].includes(action)) return json({ error: "Invalid action" }, 400);

    const admin = await verifyAdminToken(getAdminTokenFromRequest(req), SERVICE).catch(() => false);
    const portal = admin ? null : await verifyPortalToken(getPortalTokenFromRequest(req), SERVICE).catch(() => null);
    if (!admin && portal?.role !== "rep") return json({ error: "Unauthorized" }, 401);

    const { data: scan, error: scanError } = await sb.from("forensic_scans")
      .select("id,rep_code,target_url,raw_findings").eq("id",scanId).maybeSingle();
    if (scanError) return json({ error: "Unable to load report" }, 500);
    if (!scan) return json({ error: "Report not found" }, 404);
    if (!admin && (scan.rep_code == null || scan.rep_code !== portal?.code))
      return json({ error: "Forbidden" }, 403);

    if (action === "reclassify") {
      // The existing crawler and audit are reused at no new AI or scraping cost.
      const signals = buildActiveFrictionSignals(scan.raw_findings, scan.target_url || "");
      return json({ ok: true, signals });
    }

    if (action === "list") {
      const { data, error } = await sb.from("golden_friction_experiments").select("*")
        .eq("scan_id",scanId).order("updated_at",{ ascending: false }).limit(120);
      if (error) return json({ error: "Unable to load experiment records" }, 500);
      const rows = admin ? data : (data || []).map((row: Entry) => ({
        ...row, mindprint_context: null, mindprint_consent_attested: false,
        mindprint_consent_attested_at: null,
      }));
      return json({ ok: true, entries: rows || [] });
    }

    const incoming = obj(body.entry);
    const findingId = str(incoming.finding_id, 200);
    const lens = str(incoming.lens, 30);
    const status = str(incoming.status, 30) || "planned";
    if (!findingId || !lenses.has(lens) || !statuses.has(status)) return json({ error: "Invalid finding, lens, or state" }, 400);
    const observed = str(incoming.observation, 2000);
    const currentRevision = Number(incoming.revision);
    const existingResult = await sb.from("golden_friction_experiments").select("*")
      .eq("scan_id",scanId).eq("finding_id",findingId).maybeSingle();
    if (existingResult.error) return json({ error: "Unable to check current revision" }, 500);
    const existing = existingResult.data as Entry | null;
    if (existing && (!Number.isInteger(currentRevision) || currentRevision !== Number(existing.revision)))
      return json({ error: "Record changed in another session. Reload before saving.", conflict: true }, 409);
    if (!existing && currentRevision > 0) return json({ error: "Missing record. Refresh." }, 409);

    const patch: Entry = {
      scan_id: scanId, finding_id: findingId, lens,
      observation: observed,
      hypothesis: str(incoming.hypothesis, 3000),
      proposed_test: str(incoming.proposed_test, 3000),
      metric: str(incoming.metric, 500),
      owner_role: str(incoming.owner_role, 160),
      status,
      baseline_value: num(incoming.baseline_value),
      result_value: num(incoming.result_value),
      baseline_period: str(incoming.baseline_period, 140),
      result_period: str(incoming.result_period, 140),
      measurement_notes: str(incoming.measurement_notes, 4000),
      updated_at: new Date().toISOString(),
    };
    if (admin && incoming.clear_mindprint === true) {
      patch.mindprint_context = null;
      patch.mindprint_consent_attested = false;
      patch.mindprint_consent_attested_at = null;
    } else if (admin && incoming.mindprint_context != null) {
      if (incoming.mindprint_consent_attested !== true)
        return json({ error: "Documented permission is required before linking Mindprint evidence" }, 400);
      const m = obj(incoming.mindprint_context);
      const subject = str(m.subject_name, 160);
      const role = str(m.role_title, 160);
      const evidence = str(m.professional_evidence, 2500);
      const note = str(m.review_note, 1000);
      if (!subject || !evidence)
        return json({ error: "Mindprint needs a subject and attributable professional evidence" }, 400);
      patch.mindprint_context = { subject_name: subject, role_title: role, professional_evidence: evidence, review_note: note };
      patch.mindprint_consent_attested = true;
      patch.mindprint_consent_attested_at = new Date().toISOString();
    }

    const table = sb.from("golden_friction_experiments");
    const actor = admin ? "admin" : "rep:" + portal!.code;
    let result;
    if (existing) {
      result = await table.update({ ...patch, revision: Number(existing.revision) + 1 })
        .eq("scan_id",scanId).eq("finding_id",findingId).eq("revision",Number(existing.revision))
        .select("*").maybeSingle();
    } else {
      result = await table.insert({ ...patch, created_by: actor, revision: 1 }).select("*").maybeSingle();
    }
    if (result.error) {
      if (result.error.code === "23505") return json({ error: "This finding was saved by another session. Refresh.", conflict: true }, 409);
      return json({ error: "Unable to save experiment" }, 500);
    }
    if (!result.data) return json({ error: "Revision conflict. Refresh and retry.", conflict: true }, 409);
    const saved = admin ? result.data : { ...result.data, mindprint_context: null };
    return json({ ok: true, entry: saved });
  } catch (e) {
    console.error("[golden-friction-workspace]",e instanceof Error ? e.message : "unknown");
    return json({ error: "Unable to process request" }, 500);
  }
});
