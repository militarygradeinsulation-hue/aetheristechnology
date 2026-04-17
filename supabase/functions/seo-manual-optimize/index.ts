// Admin-triggered SEO optimization: single route or full run.
// Gated by admin passcode header (matches AdminLogin client-side gate).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-code",
};

const ADMIN_CODE = "9822";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const adminCode = req.headers.get("x-admin-code");
    if (adminCode !== ADMIN_CODE) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const isSingleRoute = Array.isArray(body?.routes) && body.routes.length === 1;

    const upstream = fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/seo-weekly-optimize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...body, run_type: "manual" }),
    });

    if (isSingleRoute) {
      // Single route: small enough to wait for and return real results.
      const res = await upstream;
      const data = await res.json();
      return new Response(JSON.stringify(data), { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Full run: fire-and-forget so we beat the 150s edge timeout.
    // Results land in seo_optimization_log as each route completes.
    // @ts-expect-error EdgeRuntime is provided by Supabase Edge Functions runtime
    EdgeRuntime.waitUntil(
      upstream
        .then(r => r.text())
        .then(t => console.log("seo-weekly-optimize completed:", t.slice(0, 500)))
        .catch(err => console.error("seo-weekly-optimize background error:", err)),
    );

    return new Response(
      JSON.stringify({ ok: true, queued: true, message: "Full optimization started in background. Refresh in a few minutes to see results in the activity log." }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("seo-manual-optimize error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
