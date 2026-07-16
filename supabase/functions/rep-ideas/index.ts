// Idea Room — reps submit ideas, admin reviews/edits/deletes/checks off.
// Auth: portal HMAC token (reps) OR admin HMAC token (admin).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-portal-token, x-admin-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Try admin auth first, then portal auth
    const adminToken = getAdminTokenFromRequest(req);
    const isAdmin = adminToken ? await verifyAdminToken(adminToken, SERVICE_KEY) : false;

    let repCode: string | null = null;
    let repName: string | null = null;
    if (!isAdmin) {
      const pTok = getPortalTokenFromRequest(req);
      const claims = await verifyPortalToken(pTok, SERVICE_KEY);
      if (!claims) return json({ error: "Unauthorized" }, 401);
      repCode = claims.code;
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "list");

    if (!isAdmin && repCode) {
      const { data } = await sb.from("rep_codes").select("rep_name").eq("code", repCode).maybeSingle();
      repName = (data as any)?.rep_name ?? null;
    }

    if (action === "list") {
      let q = sb.from("rep_ideas").select("*").order("created_at", { ascending: false });
      if (!isAdmin) q = q.eq("rep_code", repCode!);
      const { data, error } = await q;
      if (error) throw error;
      return json({ ok: true, ideas: data ?? [] });
    }

    if (action === "create") {
      const title = String(body.title || "").trim().slice(0, 200);
      const text = String(body.body || "").trim().slice(0, 5000);
      const category = String(body.category || "general").slice(0, 40);
      const priority = String(body.priority || "normal").slice(0, 20);
      if (title.length < 3) return json({ error: "Title too short" }, 400);
      if (text.length < 3) return json({ error: "Idea body too short" }, 400);
      const code = isAdmin ? "ADMIN" : repCode!;
      const name = isAdmin ? "Admin" : repName;
      const { data, error } = await sb
        .from("rep_ideas")
        .insert({ rep_code: code, rep_name: name, title, body: text, category, priority })
        .select()
        .single();
      if (error) throw error;
      return json({ ok: true, idea: data });
    }

    if (action === "update_own") {
      // Reps can edit their own idea body/title/category while status is 'new'
      const id = String(body.id || "");
      if (!id) return json({ error: "Missing id" }, 400);
      const patch: Record<string, unknown> = {};
      if (typeof body.title === "string") patch.title = body.title.trim().slice(0, 200);
      if (typeof body.body === "string") patch.body = body.body.trim().slice(0, 5000);
      if (typeof body.category === "string") patch.category = body.category.slice(0, 40);
      if (typeof body.priority === "string") patch.priority = body.priority.slice(0, 20);
      let q = sb.from("rep_ideas").update(patch).eq("id", id);
      if (!isAdmin) q = q.eq("rep_code", repCode!).in("status", ["new", "reviewing"]);
      const { data, error } = await q.select().maybeSingle();
      if (error) throw error;
      if (!data) return json({ error: "Not editable" }, 403);
      return json({ ok: true, idea: data });
    }

    if (action === "delete") {
      const id = String(body.id || "");
      if (!id) return json({ error: "Missing id" }, 400);
      let q = sb.from("rep_ideas").delete().eq("id", id);
      // Reps can only delete their own 'new' ideas
      if (!isAdmin) q = q.eq("rep_code", repCode!).eq("status", "new");
      const { error, count } = await q.select("*", { count: "exact", head: true });
      if (error) throw error;
      return json({ ok: true, deleted: count ?? 0 });
    }

    // ADMIN-ONLY actions below
    if (!isAdmin) return json({ error: "Admin only" }, 403);

    if (action === "admin_update") {
      const id = String(body.id || "");
      if (!id) return json({ error: "Missing id" }, 400);
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      const STATUSES = new Set(["new", "reviewing", "approved", "in_progress", "done", "rejected"]);
      if (typeof body.status === "string" && STATUSES.has(body.status)) {
        patch.status = body.status;
        patch.reviewed_at = new Date().toISOString();
        patch.reviewed_by = "Admin";
        if (body.status === "done") patch.completed_at = new Date().toISOString();
      }
      if (typeof body.admin_notes === "string") patch.admin_notes = body.admin_notes.slice(0, 5000);
      if (typeof body.admin_reply === "string") patch.admin_reply = body.admin_reply.slice(0, 5000);
      if (typeof body.priority === "string") patch.priority = body.priority.slice(0, 20);
      if (typeof body.title === "string") patch.title = body.title.trim().slice(0, 200);
      if (typeof body.body === "string") patch.body = body.body.trim().slice(0, 5000);
      const { data, error } = await sb.from("rep_ideas").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return json({ ok: true, idea: data });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
});
