import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyPortalToken, getPortalTokenFromRequest, type PortalClaims } from "../_shared/portal-token.ts";
import { loadBlockedKeywords, isLeadBlocked } from "../_shared/lead-blocklist.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-portal-token",
};

const MAX_ACTIVE_CLAIMED = 25;
const MAX_UPLOAD_ROWS = 500;
const VALID_STATUS = new Set(["new","outreach","touched","replied","meeting","won","lost","dead"]);

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sanitizeStr(v: unknown, max = 500): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.slice(0, max);
}

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com","yahoo.com","hotmail.com","outlook.com","aol.com","icloud.com",
  "live.com","msn.com","comcast.net","ymail.com","me.com","mac.com","proton.me",
  "protonmail.com","gmx.com","mail.com","zoho.com","yandex.com","att.net",
  "verizon.net","sbcglobal.net","cox.net","bellsouth.net","earthlink.net",
]);

function guessWebsiteFromEmail(email: string): string | null {
  const m = String(email || "").trim().toLowerCase().match(/^[^@\s]+@([^@\s]+\.[^@\s]+)$/);
  if (!m) return null;
  const domain = m[1];
  if (FREE_EMAIL_DOMAINS.has(domain)) return null;
  return `https://${domain}`;
}

// Auto-top-up this rep's drop to the daily quota. Always keeps "Today's Drop" full.
async function topUpRepDrop(supabase: any, repCode: string): Promise<number> {
  try {
    const { data: settings } = await supabase.from("lead_drip_settings").select("*").maybeSingle();
    if (!settings || settings.enabled === false) return 0;
    const dailyPerRep = Math.max(1, Math.min(100, settings.daily_per_rep ?? 10));
    const holdHours = Math.max(1, Math.min(168, settings.hold_hours ?? 24));

    // Sweep this rep's expired holds
    await supabase.from("rep_leads")
      .update({ assigned_to_code: null, assigned_at: null, assignment_expires_at: null })
      .eq("assigned_to_code", repCode)
      .lt("assignment_expires_at", new Date().toISOString())
      .is("claimed_by_code", null);

    // Don't top up if rep is at active cap
    const { count: activeClaimed } = await supabase.from("rep_leads")
      .select("id", { count: "exact", head: true })
      .eq("claimed_by_code", repCode)
      .not("status", "in", "(won,lost,dead)");
    if ((activeClaimed ?? 0) >= MAX_ACTIVE_CLAIMED) return 0;

    const { count: openDrip } = await supabase.from("rep_leads")
      .select("id", { count: "exact", head: true })
      .eq("assigned_to_code", repCode)
      .is("claimed_by_code", null)
      .gt("assignment_expires_at", new Date().toISOString());
    const needed = dailyPerRep - (openDrip ?? 0);
    if (needed <= 0) return 0;

    // Leads this rep has already skipped — never re-drop them.
    const { data: skippedRows } = await supabase.from("rep_lead_skips")
      .select("lead_id").eq("rep_code", repCode);
    const skippedIds = new Set<string>((skippedRows || []).map((r: any) => r.lead_id));

    let candidatesQuery = supabase.from("rep_leads")
      .select("id,business_name,industry,website,location,contact_name,email,why_fit,notes")
      .is("claimed_by_code", null)
      .is("assigned_to_code", null)
      .order("score", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(needed * 4 + skippedIds.size);
    const { data: candidatesRaw } = await candidatesQuery;
    const blocked = await loadBlockedKeywords(supabase);
    const candidates = (candidatesRaw || [])
      .filter((c: any) => !skippedIds.has(c.id) && !isLeadBlocked(c, blocked))
      .slice(0, needed);
    if (!candidates || candidates.length === 0) return 0;

    const expiresAt = new Date(Date.now() + holdHours * 3600_000).toISOString();
    const { data: assigned } = await supabase.from("rep_leads")
      .update({
        assigned_to_code: repCode,
        assigned_at: new Date().toISOString(),
        assignment_expires_at: expiresAt,
      })
      .in("id", candidates.map((c: any) => c.id))
      .is("claimed_by_code", null)
      .is("assigned_to_code", null)
      .select("id");
    return assigned?.length || 0;
  } catch (e) {
    console.error("topUpRepDrop error:", e);
    return 0;
  }
}

async function logActivity(supabase: any, claims: PortalClaims, event: string, meta: Record<string, unknown> = {}) {
  try {
    const { data: rep } = await supabase.from("rep_codes").select("rep_name").eq("code", claims.code).maybeSingle();
    await supabase.from("rep_activity").insert({
      rep_code: claims.code,
      rep_name: rep?.rep_name || null,
      event,
      meta,
    });
  } catch (e) {
    console.error("activity log failed:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const claims = await verifyPortalToken(getPortalTokenFromRequest(req), secret);
    if (!claims) return jsonResp({ error: "Unauthorized" }, 401);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, secret);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    // ---------- LIST ----------
    if (action === "list") {
      const view = body.view === "mine" ? "mine" : body.view === "drip" ? "drip" : "pool";
      if (view === "drip") {
        await topUpRepDrop(supabase, claims.code);
      }
      let query = supabase.from("rep_leads").select(
        "id,business_name,contact_name,email,phone,website,industry,location,notes,source,score,why_fit,claimed_by_code,claimed_at,status,last_touched_at,touch_count,created_at,assigned_to_code,assignment_expires_at,enrichment,enriched_at"
      );
      if (view === "mine") {
        query = query.eq("claimed_by_code", claims.code).order("updated_at", { ascending: false }).limit(200);
      } else if (view === "drip") {
        query = query
          .eq("assigned_to_code", claims.code)
          .is("claimed_by_code", null)
          .gt("assignment_expires_at", new Date().toISOString())
          .order("score", { ascending: false, nullsFirst: false })
          .limit(100);
      } else {
        query = query.is("claimed_by_code", null).is("assigned_to_code", null)
          .order("score", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false }).limit(200);
        if (body.industry) query = query.ilike("industry", `%${body.industry}%`);
        if (body.location) query = query.ilike("location", `%${body.location}%`);
        if (body.minScore) query = query.gte("score", Number(body.minScore));
      }
      const { data, error } = await query;
      if (error) throw error;

      // Hide leads matching admin blocklist (schools, etc.) from the rep pool/drip.
      const blockedKw = await loadBlockedKeywords(supabase);
      const filtered = (data || []).filter((l: any) => !isLeadBlocked(l, blockedKw));

      // Prioritize leads that have a website URL (scannable businesses surface first)
      const sorted = filtered.slice().sort((a: any, b: any) => {
        const aw = a.website && String(a.website).trim() ? 1 : 0;
        const bw = b.website && String(b.website).trim() ? 1 : 0;
        return bw - aw;
      });

      const { count: activeCount } = await supabase.from("rep_leads")
        .select("id", { count: "exact", head: true })
        .eq("claimed_by_code", claims.code)
        .not("status", "in", "(won,lost,dead)");

      const { count: dripCount } = await supabase.from("rep_leads")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to_code", claims.code)
        .is("claimed_by_code", null)
        .gt("assignment_expires_at", new Date().toISOString());

      return jsonResp({ ok: true, leads: sorted, activeClaimed: activeCount ?? 0, maxActive: MAX_ACTIVE_CLAIMED, dripCount: dripCount ?? 0 });
    }

    // ---------- SKIP DRIP ----------
    if (action === "skip_drip") {
      const id = sanitizeStr(body.id);
      if (!id) return jsonResp({ error: "Missing id" }, 400);
      // Record the skip so this lead is not re-dropped to the same rep.
      await supabase.from("rep_lead_skips")
        .upsert({ rep_code: claims.code, lead_id: id }, { onConflict: "rep_code,lead_id" });
      const { error } = await supabase.from("rep_leads")
        .update({ assigned_to_code: null, assigned_at: null, assignment_expires_at: null })
        .eq("id", id).eq("assigned_to_code", claims.code).is("claimed_by_code", null);
      if (error) throw error;
      await logActivity(supabase, claims, "lead_skip_drip", { lead_id: id });
      const refilled = await topUpRepDrop(supabase, claims.code);
      return jsonResp({ ok: true, refilled });
    }

    // ---------- CLAIM ----------
    if (action === "claim") {
      const id = sanitizeStr(body.id);
      if (!id) return jsonResp({ error: "Missing id" }, 400);

      const { count } = await supabase.from("rep_leads")
        .select("id", { count: "exact", head: true })
        .eq("claimed_by_code", claims.code)
        .not("status", "in", "(won,lost,dead)");
      if ((count ?? 0) >= MAX_ACTIVE_CLAIMED) {
        return jsonResp({ error: `You already have ${MAX_ACTIVE_CLAIMED} active leads. Close some first.` }, 400);
      }

      // Allow claim if: lead is unclaimed AND (unassigned OR assigned to this rep).
      // If the hosted API schema cache is momentarily stale for assignment columns,
      // fall back to the core claim update so reps can still accept visible leads.
      let { data, error } = await supabase
        .from("rep_leads")
        .update({
          claimed_by_code: claims.code,
          claimed_at: new Date().toISOString(),
          status: "new",
          assigned_to_code: null,
          assigned_at: null,
          assignment_expires_at: null,
        })
        .eq("id", id)
        .is("claimed_by_code", null)
        .or(`assigned_to_code.is.null,assigned_to_code.eq.${claims.code}`)
        .select("id,business_name")
        .maybeSingle();

      if (error?.code === "42703" && String(error.message || "").includes("assigned_to_code")) {
        console.warn("portal-leads claim assignment-column fallback:", error.message);
        const fallback = await supabase
          .from("rep_leads")
          .update({
            claimed_by_code: claims.code,
            claimed_at: new Date().toISOString(),
            status: "new",
          })
          .eq("id", id)
          .is("claimed_by_code", null)
          .select("id,business_name")
          .maybeSingle();
        data = fallback.data;
        error = fallback.error;
      }

      if (error) throw error;
      if (!data) return jsonResp({ error: "Already claimed by someone else." }, 409);

      // Auto-populate website from email domain if missing
      try {
        const { data: full } = await supabase.from("rep_leads")
          .select("email,website,business_name").eq("id", id).maybeSingle();
        if (full && !full.website && full.email) {
          const guessed = guessWebsiteFromEmail(full.email);
          if (guessed) {
            await supabase.from("rep_leads").update({ website: guessed }).eq("id", id);
          }
        }
      } catch (e) {
        console.warn("website auto-populate failed:", e);
      }

      await logActivity(supabase, claims, "lead_claim", { lead_id: id, business: data.business_name });
      const refilled = await topUpRepDrop(supabase, claims.code);
      return jsonResp({ ok: true, refilled });
    }

    // ---------- RELEASE ----------
    if (action === "release") {
      const id = sanitizeStr(body.id);
      if (!id) return jsonResp({ error: "Missing id" }, 400);
      const { error } = await supabase.from("rep_leads")
        .update({ claimed_by_code: null, claimed_at: null, status: "new" })
        .eq("id", id).eq("claimed_by_code", claims.code);
      if (error) throw error;
      await logActivity(supabase, claims, "lead_release", { lead_id: id });
      return jsonResp({ ok: true });
    }

    // ---------- DELETE ----------
    if (action === "delete") {
      const id = sanitizeStr(body.id);
      if (!id) return jsonResp({ error: "Missing id" }, 400);
      const { data, error } = await supabase.from("rep_leads")
        .delete()
        .eq("id", id)
        .eq("claimed_by_code", claims.code)
        .select("id,business_name")
        .maybeSingle();
      if (error) throw error;
      if (!data) return jsonResp({ error: "Lead not found or not yours" }, 404);
      await logActivity(supabase, claims, "lead_delete", { lead_id: id, business: data.business_name });
      return jsonResp({ ok: true });
    }

    // ---------- UPDATE STATUS / NOTES / TOUCH ----------
    if (action === "update_status") {
      const id = sanitizeStr(body.id);
      if (!id) return jsonResp({ error: "Missing id" }, 400);
      const status = body.status ? String(body.status) : undefined;
      const notes = body.notes !== undefined ? sanitizeStr(body.notes, 5000) : undefined;
      const touch = !!body.touch;

      if (status && !VALID_STATUS.has(status)) return jsonResp({ error: "Invalid status" }, 400);

      const patch: Record<string, unknown> = {};
      if (status) patch.status = status;
      if (notes !== undefined) patch.notes = notes;
      if (touch) {
        patch.last_touched_at = new Date().toISOString();
      }
      // Allow editing core lead fields
      const editable: Array<[string, number]> = [
        ["business_name", 200], ["contact_name", 200], ["email", 200],
        ["phone", 50], ["website", 300], ["industry", 100], ["location", 200],
      ];
      for (const [field, max] of editable) {
        if (body[field] !== undefined) {
          const v = sanitizeStr(body[field], max);
          patch[field] = field === "email" && v ? v.toLowerCase() : (v || null);
        }
      }

      // First update non-touch fields
      const { error } = await supabase.from("rep_leads")
        .update(patch).eq("id", id).eq("claimed_by_code", claims.code);
      if (error) throw error;

      if (touch) {
        // Increment touch_count via raw SQL-ish approach: fetch + update
        const { data: cur } = await supabase.from("rep_leads").select("touch_count").eq("id", id).maybeSingle();
        await supabase.from("rep_leads").update({ touch_count: (cur?.touch_count ?? 0) + 1 }).eq("id", id);
      }

      await logActivity(supabase, claims, touch ? "lead_touch" : "lead_status", { lead_id: id, status, touch });
      return jsonResp({ ok: true });
    }

    // ---------- UPLOAD ----------
    if (action === "upload") {
      const rows = Array.isArray(body.rows) ? body.rows : [];
      if (rows.length === 0) return jsonResp({ error: "No rows" }, 400);
      if (rows.length > MAX_UPLOAD_ROWS) return jsonResp({ error: `Max ${MAX_UPLOAD_ROWS} rows per upload` }, 400);

      const cleaned = rows
        .map((r: any) => ({
          business_name: sanitizeStr(r.business_name, 200),
          contact_name: sanitizeStr(r.contact_name, 200),
          email: sanitizeStr(r.email, 200)?.toLowerCase() || null,
          phone: sanitizeStr(r.phone, 50),
          website: sanitizeStr(r.website, 500),
          industry: sanitizeStr(r.industry, 100),
          location: sanitizeStr(r.location, 200),
          notes: sanitizeStr(r.notes, 5000),
          source: "rep_upload",
          claimed_by_code: claims.code,
          claimed_at: new Date().toISOString(),
          created_by_code: claims.code,
          status: "new",
        }))
        .filter((r) => r.business_name || r.email);

      if (cleaned.length === 0) return jsonResp({ error: "No valid rows (need business_name or email)" }, 400);

      const { error, data } = await supabase.from("rep_leads").insert(cleaned).select("id");
      if (error) throw error;

      await logActivity(supabase, claims, "lead_upload", { count: data?.length || 0 });
      return jsonResp({ ok: true, inserted: data?.length || 0 });
    }

    // ---------- DOWNLOAD ----------
    if (action === "download") {
      const { data, error } = await supabase.from("rep_leads")
        .select("business_name,contact_name,email,phone,website,industry,location,status,touch_count,last_touched_at,notes,created_at")
        .eq("claimed_by_code", claims.code)
        .order("updated_at", { ascending: false }).limit(2000);
      if (error) throw error;
      await logActivity(supabase, claims, "lead_download", { count: data?.length || 0 });
      return jsonResp({ ok: true, rows: data || [] });
    }

    // ---------- SCAN (company website insights, autosaved to lead) ----------
    if (action === "scan") {
      const id = sanitizeStr(body.id);
      if (!id) return jsonResp({ error: "Missing id" }, 400);

      const { data: lead, error: leadErr } = await supabase.from("rep_leads")
        .select("id,website,business_name,claimed_by_code,enrichment")
        .eq("id", id).eq("claimed_by_code", claims.code).maybeSingle();
      if (leadErr) throw leadErr;
      if (!lead) return jsonResp({ error: "Lead not found or not yours" }, 404);

      const rawUrl = sanitizeStr(body.url) || lead.website;
      if (!rawUrl) return jsonResp({ error: "No website on this lead. Add one first." }, 400);

      const force = !!body.force;
      const existing = (lead.enrichment as any)?.scan;
      if (!force && existing?.score) {
        return jsonResp({ ok: true, scan: existing, cached: true });
      }

      const supaUrl = Deno.env.get("SUPABASE_URL")!;
      const scanRes = await fetch(`${supaUrl}/functions/v1/scan-website`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
          apikey: secret,
        },
        body: JSON.stringify({ url: rawUrl }),
      });
      const scanData = await scanRes.json().catch(() => ({}));
      if (!scanRes.ok || scanData?.error) {
        return jsonResp({ error: scanData?.error || "Scan failed" }, 502);
      }

      const enrichment = { ...((lead.enrichment as any) || {}), scan: { ...scanData, scanned_at: new Date().toISOString(), scanned_url: rawUrl } };
      await supabase.from("rep_leads")
        .update({ enrichment, enriched_at: new Date().toISOString() })
        .eq("id", id).eq("claimed_by_code", claims.code);

      await logActivity(supabase, claims, "lead_scan", { lead_id: id, url: rawUrl, score: scanData?.score });
      return jsonResp({ ok: true, scan: enrichment.scan, cached: false });
    }

    return jsonResp({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("portal-leads error:", e);
    return jsonResp({ error: e instanceof Error ? e.message : "Server error" }, 500);
  }
});
