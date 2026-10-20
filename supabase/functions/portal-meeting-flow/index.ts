// Shared executive meeting flow for the Aetheris portal.
// Dean -> Braden -> Joseph. All reads/writes require a valid portal or admin token.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyPortalToken, getPortalTokenFromRequest, type PortalClaims } from "../_shared/portal-token.ts";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";
import { sanitizePostgrestLike } from "../_shared/sanitize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-portal-token, x-admin-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const STAGES = new Set(["dean", "braden", "joseph", "closed"]);
const STATUSES = new Set(["active", "won", "lost", "on_hold", "disqualified", "archived"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(v: unknown, max: number): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
}

function object(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
}

async function auth(req: Request, serviceKey: string): Promise<{ claims: PortalClaims | null; admin: boolean; actor: string } | null> {
  const claims = await verifyPortalToken(getPortalTokenFromRequest(req), serviceKey).catch(() => null);
  if (claims) return { claims, admin: false, actor: claims.code };
  const adminToken = getAdminTokenFromRequest(req);
  const isAdmin = adminToken ? await verifyAdminToken(adminToken, serviceKey).catch(() => false) : false;
  return isAdmin ? { claims: null, admin: true, actor: "ADMIN" } : null;
}

async function logActivity(sb: any, actor: string, action: string, meta: Record<string, unknown>) {
  if (actor === "ADMIN") return;
  try {
    const { data: rep } = await sb.from("rep_codes").select("rep_name").eq("code", actor).maybeSingle();
    await sb.from("rep_activity").insert({
      rep_code: actor,
      rep_name: rep?.rep_name || null,
      event: action,
      meta,
    });
  } catch (error) {
    console.error("meeting-flow activity log failed", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const url = Deno.env.get("SUPABASE_URL");
    if (!serviceKey || !url) return json({ error: "Meeting flow backend is not configured." }, 500);

    const identity = await auth(req, serviceKey);
    if (!identity) return json({ error: "Unauthorized" }, 401);

    const sb = createClient(url, serviceKey);
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const action = String(body.action || "list");

    if (action === "list") {
      const raw = text(body.q, 160);
      const q = raw ? sanitizePostgrestLike(raw) : null;
      let query = sb
        .from("aetheris_executive_meeting_cases")
        .select("id,company,contact_name,contact_role,contact_email,stage,status,answers,gates,decision,context,handoff_summary,created_by_code,updated_by_code,last_meeting_at,created_at,updated_at")
        .is("archived_at", null)
        .order("updated_at", { ascending: false })
        .limit(100);
      if (q) {
        query = query.or(
          `company.ilike.%${q}%,contact_name.ilike.%${q}%,contact_email.ilike.%${q}%`,
        );
      }
      const { data, error } = await query;
      if (error) throw error;
      return json({ ok: true, cases: data || [] });
    }

    if (action === "get") {
      const id = String(body.id || "");
      if (!UUID_RE.test(id)) return json({ error: "Invalid case id" }, 400);
      const { data, error } = await sb
        .from("aetheris_executive_meeting_cases")
        .select("*")
        .eq("id", id)
        .is("archived_at", null)
        .maybeSingle();
      if (error) throw error;
      if (!data) return json({ error: "Case not found" }, 404);
      return json({ ok: true, case: data });
    }

    if (action === "upsert") {
      const id = text(body.id, 64);
      if (id && !UUID_RE.test(id)) return json({ error: "Invalid case id" }, 400);

      const company = text(body.company, 240);
      if (!company) return json({ error: "Company is required" }, 400);

      const stage = String(body.stage || "dean");
      const status = String(body.status || "active");
      if (!STAGES.has(stage)) return json({ error: "Invalid stage" }, 400);
      if (!STATUSES.has(status)) return json({ error: "Invalid status" }, 400);

      const payload = {
        company,
        contact_name: text(body.contact_name, 180),
        contact_role: text(body.contact_role, 180),
        contact_email: text(body.contact_email, 255),
        stage,
        status,
        answers: object(body.answers),
        gates: object(body.gates),
        decision: object(body.decision),
        context: object(body.context),
        handoff_summary: text(body.handoff_summary, 50_000),
        updated_by_code: identity.actor,
        last_meeting_at: body.last_meeting_at ? String(body.last_meeting_at).slice(0, 40) : null,
        updated_at: new Date().toISOString(),
      };

      if (id) {
        const { data, error } = await sb
          .from("aetheris_executive_meeting_cases")
          .update(payload)
          .eq("id", id)
          .is("archived_at", null)
          .select()
          .maybeSingle();
        if (error) throw error;
        if (!data) return json({ error: "Case not found" }, 404);
        await logActivity(sb, identity.actor, "meeting_flow_update", { id, company, stage, status });
        return json({ ok: true, case: data });
      }

      const { data, error } = await sb
        .from("aetheris_executive_meeting_cases")
        .insert({ ...payload, created_by_code: identity.actor })
        .select()
        .maybeSingle();
      if (error) throw error;
      await logActivity(sb, identity.actor, "meeting_flow_create", { id: data?.id, company, stage });
      return json({ ok: true, case: data });
    }

    if (action === "archive") {
      const id = String(body.id || "");
      if (!UUID_RE.test(id)) return json({ error: "Invalid case id" }, 400);
      const { data, error } = await sb
        .from("aetheris_executive_meeting_cases")
        .update({
          status: "archived",
          archived_at: new Date().toISOString(),
          updated_by_code: identity.actor,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("id,company")
        .maybeSingle();
      if (error) throw error;
      if (!data) return json({ error: "Case not found" }, 404);
      await logActivity(sb, identity.actor, "meeting_flow_archive", { id, company: data.company });
      return json({ ok: true });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    console.error("portal-meeting-flow error", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
