import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const AYR_BASE = "https://api.ayrshare.com/api";

async function ayr(path: string, init: RequestInit = {}) {
  const key = Deno.env.get("AYRSHARE_API_KEY");
  if (!key) throw new Error("AYRSHARE_API_KEY is not configured");
  const res = await fetch(`${AYR_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body: unknown = text;
  try { body = JSON.parse(text); } catch { /* keep text */ }
  if (!res.ok) throw new Error(`Ayrshare ${res.status}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
  return body as any;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const ok = await verifyAdminToken(getAdminTokenFromRequest(req), serviceKey);
    if (!ok) return json({ error: "Unauthorized" }, 401);
    const admin = createClient(supabaseUrl, serviceKey);

    const { action, ...rest } = await req.json();

    if (action === "status") {
      return json({ enabled: !!Deno.env.get("AYRSHARE_API_KEY") });
    }

    if (action === "schedule") {
      const { content, platforms, scheduleDate, mediaUrls = [], source, sourceId, createdBy } = rest;
      if (!content || !Array.isArray(platforms) || platforms.length === 0) {
        return json({ error: "content and platforms[] are required" }, 400);
      }

      const payload: Record<string, unknown> = {
        post: content,
        platforms,
        mediaUrls: mediaUrls.length ? mediaUrls : undefined,
      };
      if (scheduleDate) payload.scheduleDate = scheduleDate;

      const result = await ayr("/post", { method: "POST", body: JSON.stringify(payload) });
      const ayrId = result?.id || result?.postIds?.[0]?.id || null;

      const { data: row, error: insErr } = await admin
        .from("social_scheduled_posts")
        .insert({
          ayrshare_id: ayrId,
          content,
          platforms,
          scheduled_for: scheduleDate || null,
          status: scheduleDate ? "scheduled" : "posted",
          source: source || null,
          source_id: sourceId || null,
          media_urls: mediaUrls,
          result,
          created_by: createdBy || null,
        })
        .select()
        .single();
      if (insErr) console.error("mirror insert failed:", insErr);

      return json({ success: true, ayrshareId: ayrId, post: row, result });
    }

    if (action === "list") {
      const { data, error } = await admin
        .from("social_scheduled_posts")
        .select("*")
        .order("scheduled_for", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return json({ posts: data || [] });
    }

    if (action === "delete") {
      const { id, ayrshareId } = rest;
      if (ayrshareId) {
        try { await ayr(`/post/${ayrshareId}`, { method: "DELETE" }); }
        catch (e) { console.warn("Ayrshare delete failed:", e); }
      }
      if (id) await admin.from("social_scheduled_posts").update({ status: "canceled" }).eq("id", id);
      return json({ success: true });
    }

    if (action === "analytics") {
      const { ayrshareId } = rest;
      if (!ayrshareId) return json({ error: "ayrshareId required" }, 400);
      const data = await ayr("/analytics/post", { method: "POST", body: JSON.stringify({ id: ayrshareId }) });
      return json({ analytics: data });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("social-scheduler error:", e);
    return json({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});
