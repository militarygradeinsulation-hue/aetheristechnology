// Manage rep codes (CRUD). Accessible by admin token OR partner portal token.
// Reps cannot see other reps' codes — this function rejects rep-role tokens.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-portal-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminTok = getAdminTokenFromRequest(req);
    const isAdmin = await verifyAdminToken(adminTok, SVC);

    let isPartner = false;
    if (!isAdmin) {
      const portalTok = getPortalTokenFromRequest(req);
      const portal = await verifyPortalToken(portalTok, SVC);
      if (!portal) return json(401, { error: "Unauthorized" });
      if (portal.role !== "partner") return json(403, { error: "Forbidden — admin or partner only" });
      isPartner = true;
    }

    const sb = createClient(SUPABASE_URL, SVC);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    if (action === "list") {
      const { data, error } = await sb
        .from("rep_codes")
        .select("id, code, rep_name, rep_email, commission_rate, is_active, role, total_sales_cents, total_commission_cents, created_at")
        .order("rep_name", { ascending: true });
      if (error) throw error;
      return json(200, { reps: data || [] });
    }

    if (action === "create") {
      const code = String(body.code || "").trim();
      const rep_name = String(body.rep_name || "").trim();
      const rep_email = body.rep_email ? String(body.rep_email).trim() : null;
      const commission_rate = Number.isFinite(Number(body.commission_rate)) ? Number(body.commission_rate) : 0.10;
      const role = body.role === "partner" ? "partner" : "rep";
      if (!/^\d{4,12}$/.test(code)) return json(400, { error: "Code must be 4-12 digits" });
      if (!rep_name) return json(400, { error: "Name required" });
      const { data, error } = await sb
        .from("rep_codes")
        .insert({ code, rep_name, rep_email, commission_rate, role, is_active: true })
        .select()
        .single();
      if (error) return json(400, { error: error.message });
      return json(200, { rep: data });
    }

    if (action === "update") {
      const id = String(body.id || "");
      if (!id) return json(400, { error: "id required" });
      const patch: Record<string, unknown> = {};
      if (typeof body.rep_name === "string") patch.rep_name = body.rep_name.trim();
      if (typeof body.rep_email === "string" || body.rep_email === null) patch.rep_email = body.rep_email || null;
      if (Number.isFinite(Number(body.commission_rate))) patch.commission_rate = Number(body.commission_rate);
      if (typeof body.is_active === "boolean") patch.is_active = body.is_active;
      if (body.role === "rep" || body.role === "partner") patch.role = body.role;
      if (Object.keys(patch).length === 0) return json(400, { error: "Nothing to update" });
      const { data, error } = await sb.from("rep_codes").update(patch).eq("id", id).select().single();
      if (error) return json(400, { error: error.message });

      // Mirror name change to existing team_messages so chat history reflects the rename.
      if (typeof patch.rep_name === "string" && data?.code) {
        await sb.from("team_messages").update({ author_name: patch.rep_name }).eq("author_code", data.code);
      }
      return json(200, { rep: data });
    }

    if (action === "delete") {
      const id = String(body.id || "");
      if (!id) return json(400, { error: "id required" });
      const { error } = await sb.from("rep_codes").delete().eq("id", id);
      if (error) return json(400, { error: error.message });
      return json(200, { success: true });
    }

    return json(400, { error: "Unknown action" });
  } catch (e) {
    console.error("admin-rep-codes error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});
