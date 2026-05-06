// Personal workspace for the Rep / Partner Portal: settings, notes, library (history).
// Gated by the portal HMAC token. All data scoped to claims.code.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyPortalToken, getPortalTokenFromRequest, type PortalClaims } from "../_shared/portal-token.ts";
import { verifyAdminToken } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-portal-token, x-admin-token",
};

const MAX_LIBRARY = 500;
const MAX_NOTES = 500;
const MAX_BODY_LEN = 50_000;
const MAX_TITLE_LEN = 300;

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clean(v: unknown, max: number): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
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
    let claims = await verifyPortalToken(getPortalTokenFromRequest(req), secret);
    if (!claims) {
      const adminToken = req.headers.get("x-admin-token");
      if (adminToken && (await verifyAdminToken(adminToken, secret))) {
        claims = { code: "ADMIN_PREVIEW", role: "partner", exp: Date.now() + 60_000 } as PortalClaims;
      }
    }
    if (!claims) return jsonResp({ error: "Unauthorized" }, 401);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, secret);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    // ============ SETTINGS ============
    if (action === "settings_get") {
      const { data, error } = await supabase
        .from("rep_settings")
        .select("defaults, preferences, updated_at")
        .eq("code", claims.code)
        .maybeSingle();
      if (error) throw error;
      return jsonResp({ ok: true, settings: data || { defaults: {}, preferences: {}, updated_at: null } });
    }

    if (action === "settings_save") {
      const defaults = (body.defaults && typeof body.defaults === "object") ? body.defaults : {};
      const preferences = (body.preferences && typeof body.preferences === "object") ? body.preferences : {};
      const { error } = await supabase
        .from("rep_settings")
        .upsert({ code: claims.code, defaults, preferences, updated_at: new Date().toISOString() });
      if (error) throw error;
      await logActivity(supabase, claims, "settings_save");
      return jsonResp({ ok: true });
    }

    // ============ NOTES ============
    if (action === "notes_list") {
      const q = clean(body.q, 200);
      let query = supabase.from("rep_notes")
        .select("id, title, body, pinned, tags, attachments, created_at, updated_at")
        .eq("code", claims.code)
        .order("pinned", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(MAX_NOTES);
      if (q) query = query.or(`title.ilike.%${q}%,body.ilike.%${q}%`);
      const { data, error } = await query;
      if (error) throw error;
      return jsonResp({ ok: true, notes: data || [] });
    }

    if (action === "notes_upsert") {
      const id = clean(body.id, 64);
      const title = clean(body.title, MAX_TITLE_LEN) || "Untitled";
      const noteBody = clean(body.body, MAX_BODY_LEN) || "";
      const pinned = !!body.pinned;
      const tags = Array.isArray(body.tags) ? body.tags.slice(0, 20).map((t: unknown) => String(t).slice(0, 50)) : [];
      const attachments = Array.isArray(body.attachments)
        ? body.attachments.slice(0, 50).map((a: any) => ({
            name: String(a?.name || "file").slice(0, 200),
            url: String(a?.url || "").slice(0, 1000),
            path: String(a?.path || "").slice(0, 500),
            size: Number(a?.size) || 0,
            type: String(a?.type || "").slice(0, 100),
            uploaded_at: String(a?.uploaded_at || new Date().toISOString()).slice(0, 40),
          })).filter((a: any) => a.url)
        : [];

      if (id) {
        const { data, error } = await supabase.from("rep_notes")
          .update({ title, body: noteBody, pinned, tags, attachments })
          .eq("id", id).eq("code", claims.code)
          .select().maybeSingle();
        if (error) throw error;
        if (!data) return jsonResp({ error: "Not found" }, 404);
        await logActivity(supabase, claims, "note_update", { id });
        return jsonResp({ ok: true, note: data });
      } else {
        const { data, error } = await supabase.from("rep_notes")
          .insert({ code: claims.code, title, body: noteBody, pinned, tags, attachments })
          .select().maybeSingle();
        if (error) throw error;
        await logActivity(supabase, claims, "note_create", { id: data?.id });
        return jsonResp({ ok: true, note: data });
      }
    }

    if (action === "notes_delete") {
      const id = clean(body.id, 64);
      if (!id) return jsonResp({ error: "Missing id" }, 400);
      const { error } = await supabase.from("rep_notes").delete().eq("id", id).eq("code", claims.code);
      if (error) throw error;
      return jsonResp({ ok: true });
    }

    // ============ LIBRARY ============
    if (action === "library_list") {
      const q = clean(body.q, 200);
      const toolType = clean(body.tool_type, 64);
      const leadId = clean(body.lead_id, 64);
      let query = supabase.from("rep_library")
        .select("id, tool_type, title, input_data, output_data, file_url, lead_id, created_at")
        .eq("code", claims.code)
        .order("created_at", { ascending: false })
        .limit(MAX_LIBRARY);
      if (toolType) query = query.eq("tool_type", toolType);
      if (leadId) query = query.eq("lead_id", leadId);
      if (q) query = query.ilike("title", `%${q}%`);
      const { data, error } = await query;
      if (error) throw error;
      return jsonResp({ ok: true, items: data || [] });
    }

    if (action === "library_save") {
      const tool_type = clean(body.tool_type, 64);
      const title = clean(body.title, MAX_TITLE_LEN);
      if (!tool_type || !title) return jsonResp({ error: "Missing tool_type or title" }, 400);
      const input_data = (body.input_data && typeof body.input_data === "object") ? body.input_data : {};
      const output_data = (body.output_data && typeof body.output_data === "object") ? body.output_data : {};
      const file_url = clean(body.file_url, 1000);
      const lead_id = clean(body.lead_id, 64);

      const { data, error } = await supabase.from("rep_library")
        .insert({ code: claims.code, tool_type, title, input_data, output_data, file_url, lead_id })
        .select().maybeSingle();
      if (error) throw error;
      await logActivity(supabase, claims, "library_save", { tool_type, id: data?.id });
      return jsonResp({ ok: true, item: data });
    }

    if (action === "library_delete") {
      const id = clean(body.id, 64);
      if (!id) return jsonResp({ error: "Missing id" }, 400);
      const { error } = await supabase.from("rep_library").delete().eq("id", id).eq("code", claims.code);
      if (error) throw error;
      return jsonResp({ ok: true });
    }

    // ============ UNIFIED SEARCH ============
    if (action === "search") {
      const q = clean(body.q, 200);
      if (!q) return jsonResp({ ok: true, notes: [], items: [] });
      const [notesRes, libRes] = await Promise.all([
        supabase.from("rep_notes")
          .select("id, title, body, pinned, updated_at")
          .eq("code", claims.code)
          .or(`title.ilike.%${q}%,body.ilike.%${q}%`)
          .order("updated_at", { ascending: false })
          .limit(50),
        supabase.from("rep_library")
          .select("id, tool_type, title, file_url, created_at")
          .eq("code", claims.code)
          .ilike("title", `%${q}%`)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      await logActivity(supabase, claims, "workspace_search", { q });
      return jsonResp({ ok: true, notes: notesRes.data || [], items: libRes.data || [] });
    }

    return jsonResp({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    console.error("portal-workspace error:", e);
    return jsonResp({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
