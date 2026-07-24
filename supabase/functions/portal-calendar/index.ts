// Calendar CRUD for rep portal + admin. Supports rep self-edit and admin notes/edits on any rep.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-portal-token, x-admin-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type Kind = "event" | "reminder" | "note" | "follow_up" | "call" | "meeting" | "task";

async function pushRepEventToCompany(admin: any, id: string): Promise<string | null> {
  const { data: existing } = await admin.from("rep_calendar_events").select("*").eq("id", id).maybeSingle();
  if (!existing) return null;
  if (existing.company_event_id) return existing.company_event_id;

  const { data: repRow } = await admin.from("rep_codes").select("rep_name, role").eq("code", existing.rep_code).maybeSingle();
  const repName = repRow?.rep_name || existing.rep_code;
  const startDate = new Date(existing.start_at);
  const dateStr = `${startDate.getUTCFullYear()}-${String(startDate.getUTCMonth() + 1).padStart(2, "0")}-${String(startDate.getUTCDate()).padStart(2, "0")}`;
  const dueTime = existing.all_day ? null : startDate.toISOString().slice(11, 19);

  const kindMap: Record<string, string> = {
    meeting: "meeting", call: "meeting", event: "meeting", follow_up: "follow_up",
    reminder: "reminder", task: "task", note: "note",
  };
  const companyKind = kindMap[existing.kind as string] || "meeting";

  const bodyLines = [
    existing.body || "",
    existing.rep_notes ? `\nRep notes: ${existing.rep_notes}` : "",
    `\nPushed from ${repName}'s portal calendar${existing.all_day ? "" : ` · ${startDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}`,
  ].join("").trim();

  const payload = {
    date: dateStr,
    due_time: dueTime,
    kind: companyKind,
    title: existing.title,
    body: bodyLines,
    color: "cat:rep_calendar",
    owner_role: repRow?.role || "rep",
    owner_name: repName,
    status: existing.completed ? "done" : "pending",
    created_by: `rep:${existing.rep_code}`,
  };

  const { data: companyRow, error: insErr } = await admin.from("company_calendar")
    .insert(payload).select().maybeSingle();
  if (insErr) throw insErr;

  await admin.from("rep_calendar_events")
    .update({ company_event_id: companyRow!.id })
    .eq("id", id);

  await admin.from("shared_notifications").insert({
    recipient: "team",
    kind: "calendar_push",
    title: `${repName} added to the company calendar`,
    body: `${existing.title} · ${dateStr}${dueTime ? ` ${dueTime.slice(0, 5)}` : ""}`,
  }).select().maybeSingle().then(() => {}, () => {});

  return companyRow!.id;
}


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE);

    let isAdmin = false;
    let repCode: string | null = null;

    const portalClaims = await verifyPortalToken(getPortalTokenFromRequest(req), SERVICE).catch(() => null);
    if (portalClaims?.code) {
      repCode = portalClaims.code;
    } else {
      const adminOk = await verifyAdminToken(getAdminTokenFromRequest(req), SERVICE);
      if (!adminOk) return json({ error: "Unauthorized" }, 401);
      isAdmin = true;
    }

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const action = (body.action as string) || "list";
    // Admin can target any rep_code; reps are locked to their own.
    const targetCode = isAdmin ? ((body.rep_code as string) || null) : repCode;

    // ===== LIST =====
    if (action === "list") {
      if (!targetCode) {
        // admin without rep_code: return list of reps with counts (for picker)
        const { data: reps } = await admin.from("rep_codes")
          .select("code, rep_name, role, is_active")
          .eq("is_active", true).order("rep_name");
        return json({ reps: reps || [], events: [] });
      }
      const fromIso = (body.from as string) || new Date(Date.now() - 1000 * 60 * 60 * 24 * 35).toISOString();
      const toIso = (body.to as string) || new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString();

      const { data: events } = await admin.from("rep_calendar_events")
        .select("*")
        .eq("rep_code", targetCode)
        .gte("start_at", fromIso)
        .lte("start_at", toIso)
        .order("start_at");

      // Fetch lead summaries for events that have a lead_id
      const leadIds = Array.from(new Set((events || []).map((e) => e.lead_id).filter(Boolean) as string[]));
      let leadsById: Record<string, { id: string; business_name: string | null; contact_name: string | null; phone: string | null; email: string | null }> = {};
      if (leadIds.length > 0) {
        const { data: leads } = await admin.from("rep_leads")
          .select("id, business_name, contact_name, phone, email")
          .in("id", leadIds);
        for (const l of leads || []) leadsById[l.id] = l;
      }

      // Active leads for this rep (so the UI can offer to attach one)
      const { data: activeLeads } = await admin.from("rep_leads")
        .select("id, business_name, contact_name, status, last_touched_at")
        .eq("claimed_by_code", targetCode)
        .not("status", "in", "(\"won\",\"lost\",\"dead\")")
        .order("last_touched_at", { ascending: false, nullsFirst: false })
        .limit(100);

      return json({
        rep_code: targetCode,
        events: events || [],
        leads_by_id: leadsById,
        active_leads: activeLeads || [],
      });
    }

    // ===== CREATE =====
    if (action === "create") {
      if (!targetCode) return json({ error: "rep_code required" }, 400);
      const kind = ((body.kind as string) || "event") as Kind;
      const valid: Kind[] = ["event","reminder","note","follow_up","call","meeting","task"];
      if (!valid.includes(kind)) return json({ error: "invalid kind" }, 400);
      const title = String(body.title || "").trim().slice(0, 200);
      if (!title) return json({ error: "title required" }, 400);
      const start_at = body.start_at ? new Date(String(body.start_at)).toISOString() : new Date().toISOString();
      const end_at = body.end_at ? new Date(String(body.end_at)).toISOString() : null;

      const insert = {
        rep_code: targetCode,
        kind,
        title,
        body: body.body ? String(body.body).slice(0, 5000) : null,
        start_at,
        end_at,
        all_day: !!body.all_day,
        lead_id: body.lead_id ? String(body.lead_id) : null,
        rep_notes: !isAdmin && body.rep_notes ? String(body.rep_notes).slice(0, 5000) : null,
        admin_notes: isAdmin && body.admin_notes ? String(body.admin_notes).slice(0, 5000) : null,
        created_by: isAdmin ? "admin" : "rep",
      };
      const { data, error } = await admin.from("rep_calendar_events").insert(insert).select("*").single();
      if (error) throw error;

      // Auto-push every rep-created schedule item (except pure notes) to the company calendar
      // so the whole team sees it. Reps can still un-push manually if needed.
      let autoPushed = data;
      if (data && data.kind !== "note") {
        try {
          const pushed = await pushRepEventToCompany(admin, data.id);
          if (pushed) autoPushed = { ...data, company_event_id: pushed };
        } catch (e) {
          console.error("auto-push failed", e);
        }
      }
      return json({ event: autoPushed });
    }

    // ===== UPDATE =====
    if (action === "update") {
      const id = String(body.id || "");
      if (!id) return json({ error: "id required" }, 400);
      const { data: existing } = await admin.from("rep_calendar_events").select("*").eq("id", id).maybeSingle();
      if (!existing) return json({ error: "not found" }, 404);
      if (!isAdmin && existing.rep_code !== repCode) return json({ error: "Forbidden" }, 403);

      const patch: Record<string, unknown> = {};
      if (typeof body.title === "string") patch.title = body.title.trim().slice(0, 200);
      if (typeof body.body === "string") patch.body = body.body.slice(0, 5000);
      if (body.start_at) patch.start_at = new Date(String(body.start_at)).toISOString();
      if (body.end_at !== undefined) patch.end_at = body.end_at ? new Date(String(body.end_at)).toISOString() : null;
      if (typeof body.all_day === "boolean") patch.all_day = body.all_day;
      if (typeof body.kind === "string") patch.kind = body.kind;
      if (body.lead_id !== undefined) patch.lead_id = body.lead_id || null;
      if (typeof body.completed === "boolean") {
        patch.completed = body.completed;
        patch.completed_at = body.completed ? new Date().toISOString() : null;
      }
      // Reps may only edit rep_notes; admins may set admin_notes (and rep_notes too).
      if (typeof body.rep_notes === "string") patch.rep_notes = body.rep_notes.slice(0, 5000);
      if (isAdmin && typeof body.admin_notes === "string") patch.admin_notes = body.admin_notes.slice(0, 5000);

      const { data, error } = await admin.from("rep_calendar_events").update(patch).eq("id", id).select("*").single();
      if (error) throw error;

      // Keep pushed company_calendar row in sync when relevant fields change.
      if (existing.company_event_id) {
        const companyPatch: Record<string, unknown> = {};
        if (typeof body.title === "string") companyPatch.title = patch.title;
        if (typeof body.body === "string") companyPatch.body = patch.body;
        if (body.start_at) {
          const sd = new Date(String(body.start_at));
          companyPatch.date = `${sd.getUTCFullYear()}-${String(sd.getUTCMonth()+1).padStart(2,"0")}-${String(sd.getUTCDate()).padStart(2,"0")}`;
          companyPatch.due_time = (data as any).all_day ? null : sd.toISOString().slice(11, 19);
        }
        if (typeof body.all_day === "boolean" && body.all_day) companyPatch.due_time = null;
        if (typeof body.completed === "boolean") companyPatch.status = body.completed ? "done" : "pending";
        if (Object.keys(companyPatch).length > 0) {
          await admin.from("company_calendar").update(companyPatch).eq("id", existing.company_event_id);
        }
      }

      return json({ event: data });
    }

    // ===== DELETE =====
    if (action === "delete") {
      const id = String(body.id || "");
      if (!id) return json({ error: "id required" }, 400);
      const { data: existing } = await admin.from("rep_calendar_events").select("rep_code, company_event_id").eq("id", id).maybeSingle();
      if (!existing) return json({ ok: true });
      if (!isAdmin && existing.rep_code !== repCode) return json({ error: "Forbidden" }, 403);
      if (existing.company_event_id) {
        await admin.from("company_calendar").delete().eq("id", existing.company_event_id);
      }
      await admin.from("rep_calendar_events").delete().eq("id", id);
      return json({ ok: true });
    }

    // ===== PUSH TO COMPANY CALENDAR =====
    if (action === "push_to_company") {
      const id = String(body.id || "");
      if (!id) return json({ error: "id required" }, 400);
      const { data: existing } = await admin.from("rep_calendar_events").select("rep_code, company_event_id").eq("id", id).maybeSingle();
      if (!existing) return json({ error: "not found" }, 404);
      if (!isAdmin && existing.rep_code !== repCode) return json({ error: "Forbidden" }, 403);
      if (existing.company_event_id) {
        return json({ ok: true, already: true, company_event_id: existing.company_event_id });
      }
      const companyId = await pushRepEventToCompany(admin, id);
      return json({ ok: true, company_event_id: companyId });
    }

    // ===== UNPUSH FROM COMPANY CALENDAR =====
    if (action === "unpush_from_company") {
      const id = String(body.id || "");
      if (!id) return json({ error: "id required" }, 400);
      const { data: existing } = await admin.from("rep_calendar_events").select("rep_code, company_event_id").eq("id", id).maybeSingle();
      if (!existing) return json({ error: "not found" }, 404);
      if (!isAdmin && existing.rep_code !== repCode) return json({ error: "Forbidden" }, 403);
      if (existing.company_event_id) {
        await admin.from("company_calendar").delete().eq("id", existing.company_event_id);
        await admin.from("rep_calendar_events").update({ company_event_id: null }).eq("id", id);
      }
      return json({ ok: true });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    console.error("portal-calendar error", e);
    return json({ error: (e as Error).message || "Internal error" }, 500);
  }
});
