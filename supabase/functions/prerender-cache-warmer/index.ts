// Scheduled cache warmer.
// Iterates the prerender route list (5 marketing pages + every published
// blog_posts.slug) and forces regeneration via render-for-crawler?fresh=1.
//
// Schedule via pg_cron — see README/migration. Defaults to nightly.
// verify_jwt = false (called by cron via service-role bearer or directly).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const STATIC_ROUTES = [
  "/",
  "/business-diagnostic",
  "/about",
  "/leak-audit",
  "/services",
];

async function warmRoute(path: string): Promise<{ path: string; ok: boolean; status: number; bytes: number }> {
  try {
    const url = `${SUPABASE_URL}/functions/v1/render-for-crawler?path=${encodeURIComponent(path)}&fresh=1`;
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
    });
    const text = await r.text();
    return { path, ok: r.ok, status: r.status, bytes: text.length };
  } catch (e) {
    console.error("warmRoute failed", path, e);
    return { path, ok: false, status: 0, bytes: 0 };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startedAt = Date.now();

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Fetch all published blog slugs
    const { data: posts, error } = await supabase
      .from("blog_posts")
      .select("slug")
      .eq("is_published", true);
    if (error) throw error;

    const blogRoutes = (posts || []).map((p: { slug: string }) => `/blog/${p.slug}`);
    const allRoutes = [...STATIC_ROUTES, ...blogRoutes];

    // Warm in small concurrent batches to avoid hammering Supabase
    const BATCH = 4;
    const results: Array<{ path: string; ok: boolean; status: number; bytes: number }> = [];
    for (let i = 0; i < allRoutes.length; i += BATCH) {
      const slice = allRoutes.slice(i, i + BATCH);
      const batchResults = await Promise.all(slice.map(warmRoute));
      results.push(...batchResults);
    }

    const success = results.filter(r => r.ok).length;
    const failure = results.length - success;

    return new Response(
      JSON.stringify({
        ok: true,
        elapsed_ms: Date.now() - startedAt,
        total: results.length,
        success,
        failure,
        failed_routes: results.filter(r => !r.ok).map(r => ({ path: r.path, status: r.status })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("prerender-cache-warmer error", e);
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
