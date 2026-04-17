// Admin-triggered SEO optimization: single route or full run.
// Validates Supabase JWT and admin status server-side.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function requireAdmin(req: Request): Promise<{ ok: true } | { ok: false; res: Response }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { ok: false, res: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { ok: false, res: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: user.id });
  if (isAdmin !== true) {
    return { ok: false, res: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.res;

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
      const res = await upstream;
      const data = await res.json();
      return new Response(JSON.stringify(data), { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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
