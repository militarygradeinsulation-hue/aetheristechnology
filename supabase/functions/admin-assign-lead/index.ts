// Admin assigns leads to a specific rep (or unassigns / releases / deletes).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ok = await verifyAdminToken(getAdminTokenFromRequest(req), SERVICE);
    if (!ok) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "assign");
    const ids: string[] = Array.isArray(body.ids)
      ? body.ids.filter((x: unknown) => typeof x === "string" && x.length > 0)
      : (body.id && typeof body.id === "string" ? [body.id] : []);
    const NO_ID_ACTIONS = new Set(["refresh_rep", "auto_assign", "create_leads"]);
    console.log("[admin-assign-lead] action=", action, "ids=", ids.length, "rows=", Array.isArray(body.rows) ? body.rows.length : 0);
    if (ids.length === 0 && !NO_ID_ACTIONS.has(action)) {
      console.warn("[admin-assign-lead] Missing id(s) for action:", action, "body keys:", Object.keys(body));
      return new Response(JSON.stringify({ error: `Missing id(s) for action "${action}"` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }



    // ---------- CREATE LEADS: manual admin entry / bulk paste, optionally drop to pool or to a specific rep ----------
    if (action === "create_leads") {
      const rows: any[] = Array.isArray(body.rows) ? body.rows : [];
      if (rows.length === 0) return new Response(JSON.stringify({ error: "No rows provided" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const destination = String(body.destination || "pool"); // "pool" | "rep" | "holding"
      const assignCode = destination === "rep" ? String(body.assign_to_code || "").trim() : "";
      const holdHours = Math.max(1, Math.min(720, Number(body.hold_hours) || 72));
      const sharedLHF = body.low_hanging_fruit === true;
      const sharedNotes = typeof body.notes === "string" ? body.notes.trim() : "";

      if (destination === "rep") {
        if (!assignCode) return new Response(JSON.stringify({ error: "Pick a rep for the daily drop" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const { data: rep } = await admin.from("rep_codes").select("code,is_active").eq("code", assignCode).maybeSingle();
        if (!rep || !rep.is_active) return new Response(JSON.stringify({ error: "Rep code not found or inactive" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const nowIso = new Date().toISOString();
      const expires = destination === "rep" ? new Date(Date.now() + holdHours * 3600 * 1000).toISOString() : null;
      const isHolding = destination === "holding";

      const cleaned = rows.map((r: any) => {
        const business = String(r.business_name || r.company || r.name || "").trim();
        if (!business) return null;
        const lhf = r.low_hanging_fruit === true || sharedLHF;
        const rowNotes = [sharedNotes, typeof r.notes === "string" ? r.notes.trim() : ""].filter(Boolean).join("\n").trim() || null;
        let score = r.score != null && r.score !== "" ? Number(r.score) : null;
        if (score != null && (!Number.isFinite(score) || score < 0)) score = null;
        if (score != null) score = Math.min(100, Math.max(0, Math.round(score)));
        return {
          business_name: business,
          contact_name: r.contact_name ? String(r.contact_name).trim() : null,
          email: r.email ? String(r.email).trim().toLowerCase() : null,
          phone: r.phone ? String(r.phone).trim() : null,
          website: r.website ? String(r.website).trim() : null,
          industry: r.industry ? String(r.industry).trim() : null,
          location: r.location ? String(r.location).trim() : null,
          notes: rowNotes,
          score,
          low_hanging_fruit: lhf,
          source: "admin_manual",
          status: "new",
          admin_holding: isHolding,
          assigned_to_code: destination === "rep" ? assignCode : null,
          assigned_at: destination === "rep" ? nowIso : null,
          assignment_expires_at: expires,
        };
      }).filter(Boolean);

      }).filter(Boolean);

      if (cleaned.length === 0) return new Response(JSON.stringify({ error: "No valid rows (business name required)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { data: inserted, error } = await admin.from("rep_leads").insert(cleaned).select("id");
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, inserted: inserted?.length || 0, destination, assign_to_code: assignCode || null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "assign") {
      const code = String(body.code || "").trim();
      const holdHours = Math.max(1, Math.min(720, Number(body.hold_hours) || 72));
      if (!code) return new Response(JSON.stringify({ error: "Missing rep code" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { data: rep } = await admin.from("rep_codes").select("code,is_active").eq("code", code).maybeSingle();
      if (!rep || !rep.is_active) return new Response(JSON.stringify({ error: "Rep code not found or inactive" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const expires = new Date(Date.now() + holdHours * 3600 * 1000).toISOString();
      const expires = new Date(Date.now() + holdHours * 3600 * 1000).toISOString();
      const { error } = await admin.from("rep_leads").update({
        assigned_to_code: code,
        assigned_at: new Date().toISOString(),
        assignment_expires_at: expires,
        admin_holding: false,
      }).in("id", ids).is("claimed_by_code", null);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, assigned: ids.length, code, expires }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---------- MOVE FROM HOLDING → POOL (admin distributes their personal stash) ----------
    if (action === "move_to_pool") {
      const { error } = await admin.from("rep_leads").update({
        admin_holding: false,
        assigned_to_code: null, assigned_at: null, assignment_expires_at: null,
      }).in("id", ids);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, moved: ids.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---------- MOVE TO HOLDING (admin pulls a pool lead back into personal stash) ----------
    if (action === "move_to_holding") {
      const { error } = await admin.from("rep_leads").update({
        admin_holding: true,
        assigned_to_code: null, assigned_at: null, assignment_expires_at: null,
      }).in("id", ids).is("claimed_by_code", null);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, moved: ids.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    }

    if (action === "unassign") {
      const { error } = await admin.from("rep_leads").update({
        assigned_to_code: null, assigned_at: null, assignment_expires_at: null,
      }).in("id", ids);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, unassigned: ids.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "release") {
      const { error } = await admin.from("rep_leads").update({
        claimed_by_code: null, claimed_at: null, status: "new",
        assigned_to_code: null, assigned_at: null, assignment_expires_at: null,
      }).in("id", ids);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, released: ids.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete") {
      const { error } = await admin.from("rep_leads").delete().in("id", ids);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, deleted: ids.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---------- REFRESH a single rep: top up their drip queue with N highest-score pool leads ----------
    if (action === "refresh_rep") {
      const code = String(body.code || "").trim();
      const target = Math.max(1, Math.min(200, Number(body.count) || 10));
      const holdHours = Math.max(1, Math.min(720, Number(body.hold_hours) || 72));
      const industry = body.industry ? String(body.industry) : null;
      const minScore = body.min_score != null ? Number(body.min_score) : null;
      if (!code) return new Response(JSON.stringify({ error: "Missing rep code" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { data: rep } = await admin.from("rep_codes").select("code,is_active").eq("code", code).maybeSingle();
      if (!rep || !rep.is_active) return new Response(JSON.stringify({ error: "Rep code not found or inactive" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      // count current active drip
      const nowIso = new Date().toISOString();
      const { count: currentDrip } = await admin.from("rep_leads")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to_code", code)
        .is("claimed_by_code", null)
        .gt("assignment_expires_at", nowIso);

      const need = Math.max(0, target - (currentDrip ?? 0));
      if (need === 0) {
        return new Response(JSON.stringify({ ok: true, assigned: 0, current: currentDrip ?? 0, target, message: "Already at target" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      let q = admin.from("rep_leads").select("id")
        .is("claimed_by_code", null).is("assigned_to_code", null).eq("admin_holding", false)

        .order("score", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(need);
      if (industry) q = q.ilike("industry", `%${industry}%`);
      if (minScore != null) q = q.gte("score", minScore);

      const { data: pool, error: poolErr } = await q;
      if (poolErr) throw poolErr;
      const pickIds = (pool || []).map((r: any) => r.id);
      if (pickIds.length === 0) {
        return new Response(JSON.stringify({ ok: true, assigned: 0, current: currentDrip ?? 0, target, message: "No matching pool leads" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const expires = new Date(Date.now() + holdHours * 3600 * 1000).toISOString();
      const { error: assignErr } = await admin.from("rep_leads").update({
        assigned_to_code: code,
        assigned_at: new Date().toISOString(),
        assignment_expires_at: expires,
      }).in("id", pickIds).is("claimed_by_code", null).is("assigned_to_code", null);
      if (assignErr) throw assignErr;

      return new Response(JSON.stringify({ ok: true, assigned: pickIds.length, current: (currentDrip ?? 0) + pickIds.length, target }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---------- AUTO-ASSIGN: round-robin highest-score pool leads across selected reps ----------
    if (action === "auto_assign") {
      const codes: string[] = Array.isArray(body.codes) ? body.codes.map((c: any) => String(c).trim()).filter(Boolean) : [];
      const perRep = Math.max(1, Math.min(200, Number(body.per_rep) || 10));
      const holdHours = Math.max(1, Math.min(720, Number(body.hold_hours) || 72));
      const industry = body.industry ? String(body.industry) : null;
      const minScore = body.min_score != null ? Number(body.min_score) : null;
      const respectCurrent = body.respect_current !== false; // top-up vs additive; default top-up

      if (codes.length === 0) return new Response(JSON.stringify({ error: "Pick at least one rep" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { data: validReps } = await admin.from("rep_codes").select("code").in("code", codes).eq("is_active", true);
      const liveCodes = (validReps || []).map((r: any) => r.code);
      if (liveCodes.length === 0) return new Response(JSON.stringify({ error: "No active reps in selection" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      // determine need per rep
      const nowIso = new Date().toISOString();
      const needs: Record<string, number> = {};
      let totalNeed = 0;
      for (const c of liveCodes) {
        let cur = 0;
        if (respectCurrent) {
          const { count } = await admin.from("rep_leads")
            .select("id", { count: "exact", head: true })
            .eq("assigned_to_code", c).is("claimed_by_code", null).gt("assignment_expires_at", nowIso);
          cur = count ?? 0;
        }
        const n = Math.max(0, perRep - cur);
        needs[c] = n;
        totalNeed += n;
      }
      if (totalNeed === 0) {
        return new Response(JSON.stringify({ ok: true, assigned: 0, message: "All reps already at target", per_rep: needs }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      let q = admin.from("rep_leads").select("id,industry,score")
        .is("claimed_by_code", null).is("assigned_to_code", null).eq("admin_holding", false)

        .order("score", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(totalNeed);
      if (industry) q = q.ilike("industry", `%${industry}%`);
      if (minScore != null) q = q.gte("score", minScore);

      const { data: pool, error: poolErr } = await q;
      if (poolErr) throw poolErr;
      const available = pool || [];
      if (available.length === 0) {
        return new Response(JSON.stringify({ ok: true, assigned: 0, message: "No pool leads available", per_rep: needs }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // round-robin allocate
      const allocation: Record<string, string[]> = {};
      liveCodes.forEach(c => allocation[c] = []);
      const remaining = { ...needs };
      let i = 0;
      for (const lead of available) {
        // find next rep in rotation that still needs
        let attempts = 0;
        while (attempts < liveCodes.length && remaining[liveCodes[i % liveCodes.length]] <= 0) {
          i++; attempts++;
        }
        const code = liveCodes[i % liveCodes.length];
        if (remaining[code] <= 0) break;
        allocation[code].push(lead.id);
        remaining[code]--;
        i++;
      }

      const expires = new Date(Date.now() + holdHours * 3600 * 1000).toISOString();
      const assignedAt = new Date().toISOString();
      let totalAssigned = 0;
      const summary: Record<string, number> = {};
      for (const [code, ids] of Object.entries(allocation)) {
        if (ids.length === 0) { summary[code] = 0; continue; }
        const { error } = await admin.from("rep_leads").update({
          assigned_to_code: code, assigned_at: assignedAt, assignment_expires_at: expires,
        }).in("id", ids).is("claimed_by_code", null).is("assigned_to_code", null);
        if (error) throw error;
        summary[code] = ids.length;
        totalAssigned += ids.length;
      }

      return new Response(JSON.stringify({ ok: true, assigned: totalAssigned, per_rep: summary }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("admin-assign-lead error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
