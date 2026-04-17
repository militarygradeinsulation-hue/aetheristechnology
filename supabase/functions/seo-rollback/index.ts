// Admin-only rollback: restore a route's seo_override from a prior log entry.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: claims.claims.sub });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { log_id, clear } = await req.json();

    if (clear) {
      // Wipe override entirely (revert to page defaults)
      const { error } = await admin.from("seo_overrides").delete().eq("path", clear);
      if (error) throw error;
      await admin.from("seo_optimization_log").insert({
        route: clear, before: {}, after: {}, run_type: "rollback", status: "cleared", ai_reasoning: "Override cleared by admin",
      });
      return new Response(JSON.stringify({ ok: true, action: "cleared", path: clear }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!log_id) throw new Error("log_id required");

    const { data: logEntry, error: logErr } = await admin
      .from("seo_optimization_log")
      .select("*")
      .eq("id", log_id)
      .maybeSingle();
    if (logErr || !logEntry) throw new Error("Log entry not found");

    // Use "before" snapshot to restore
    const before = logEntry.before as Record<string, unknown>;
    if (!before || Object.keys(before).length === 0) throw new Error("No 'before' snapshot to restore");

    const { data: existing } = await admin
      .from("seo_overrides")
      .select("version")
      .eq("path", logEntry.route)
      .maybeSingle();

    await admin.from("seo_overrides").upsert({
      path: logEntry.route,
      title: before.title ?? null,
      description: before.description ?? null,
      keywords: before.keywords ?? null,
      tldr: before.tldr ?? null,
      faqs: before.faqs ?? [],
      version: (existing?.version ?? 0) + 1,
      applied_at: new Date().toISOString(),
    }, { onConflict: "path" });

    await admin.from("seo_optimization_log").insert({
      route: logEntry.route,
      before: logEntry.after,
      after: before,
      run_type: "rollback",
      status: "rolled_back",
      ai_reasoning: `Rolled back to log entry ${log_id}`,
    });

    return new Response(JSON.stringify({ ok: true, action: "rolled_back", path: logEntry.route }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("seo-rollback error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
