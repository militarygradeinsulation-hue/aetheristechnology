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
    const ids: string[] = Array.isArray(body.ids) ? body.ids : (body.id ? [body.id] : []);
    if (ids.length === 0) return new Response(JSON.stringify({ error: "Missing id(s)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (action === "assign") {
      const code = String(body.code || "").trim();
      const holdHours = Math.max(1, Math.min(720, Number(body.hold_hours) || 72));
      if (!code) return new Response(JSON.stringify({ error: "Missing rep code" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { data: rep } = await admin.from("rep_codes").select("code,is_active").eq("code", code).maybeSingle();
      if (!rep || !rep.is_active) return new Response(JSON.stringify({ error: "Rep code not found or inactive" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const expires = new Date(Date.now() + holdHours * 3600 * 1000).toISOString();
      const { error } = await admin.from("rep_leads").update({
        assigned_to_code: code,
        assigned_at: new Date().toISOString(),
        assignment_expires_at: expires,
      }).in("id", ids).is("claimed_by_code", null);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, assigned: ids.length, code, expires }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("admin-assign-lead error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
