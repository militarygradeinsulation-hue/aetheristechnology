// Executive Desk: private calendar / tasks / notes shared by Joseph, Braden and Dean only.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-portal-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// code -> executive identity
const EXEC_CODES: Record<string, string> = {
  "163675": "joseph",
  "963169": "braden",
  "482917": "dean",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const URL_ = Deno.env.get("SUPABASE_URL")!;

    let me: string | null = null;
    if (await verifyAdminToken(getAdminTokenFromRequest(req), SVC)) me = "joseph";
    if (!me) {
      const claims = await verifyPortalToken(getPortalTokenFromRequest(req), SVC);
      if (claims && EXEC_CODES[claims.code]) me = EXEC_CODES[claims.code];
    }
    if (!me) return json(401, { error: "Executive access only" });

    const supabase = createClient(URL_, SVC);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "list");

    if (action === "list") {
      const { data, error } = await supabase
        .from("exec_items")
        .select("*")
        .order("pinned", { ascending: false })
        .order("starts_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) return json(500, { error: error.message });
      return json(200, { ok: true, me, items: data || [] });
    }

    if (action === "create") {
      const title = String(body.title || "").trim();
      if (!title) return json(400, { error: "title required" });
      const kind = ["event", "meeting", "task", "note"].includes(body.kind) ? body.kind : "task";
      const { data, error } = await supabase
        .from("exec_items")
        .insert({
          kind,
          title: title.slice(0, 300),
          details: body.details ? String(body.details).slice(0, 8000) : null,
          starts_at: body.starts_at || null,
          ends_at: body.ends_at || null,
          all_day: !!body.all_day,
          status: ["open", "doing", "done"].includes(body.status) ? body.status : "open",
          priority: ["low", "normal", "high", "urgent"].includes(body.priority) ? body.priority : "normal",
          assignee: ["all", "joseph", "braden", "dean"].includes(body.assignee) ? body.assignee : "all",
          author: me,
          pinned: !!body.pinned,
        })
        .select()
        .single();
      if (error) return json(500, { error: error.message });
      return json(200, { ok: true, item: data });
    }

    if (action === "update") {
      const id = String(body.id || "");
      if (!id) return json(400, { error: "id required" });
      const patch: Record<string, unknown> = {};
      if (typeof body.title === "string") patch.title = body.title.slice(0, 300);
      if (typeof body.details === "string" || body.details === null) patch.details = body.details;
      if ("starts_at" in body) patch.starts_at = body.starts_at || null;
      if ("ends_at" in body) patch.ends_at = body.ends_at || null;
      if ("all_day" in body) patch.all_day = !!body.all_day;
      if (["open", "doing", "done"].includes(body.status)) patch.status = body.status;
      if (["low", "normal", "high", "urgent"].includes(body.priority)) patch.priority = body.priority;
      if (["all", "joseph", "braden", "dean"].includes(body.assignee)) patch.assignee = body.assignee;
      if ("pinned" in body) patch.pinned = !!body.pinned;
      if (["event", "meeting", "task", "note"].includes(body.kind)) patch.kind = body.kind;
      const { data, error } = await supabase.from("exec_items").update(patch).eq("id", id).select().single();
      if (error) return json(500, { error: error.message });
      return json(200, { ok: true, item: data });
    }

    if (action === "delete") {
      const id = String(body.id || "");
      if (!id) return json(400, { error: "id required" });
      const { error } = await supabase.from("exec_items").delete().eq("id", id);
      if (error) return json(500, { error: error.message });
      return json(200, { ok: true });
    }

    return json(400, { error: "Unknown action" });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : "Unknown" });
  }
});
