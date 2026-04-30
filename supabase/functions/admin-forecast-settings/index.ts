// Admin-side CRUD for the Forecast Center settings + run history.
// Auth: admin HMAC token (PIN-9822 system).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const ALLOWED_KEYS = new Set([
  "is_active", "refresh_cadence_minutes", "web_window",
  "topic_queries", "industry_presets", "sources", "sections",
  "education_pool", "live_pulse_minutes",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const ok = await verifyAdminToken(getAdminTokenFromRequest(req), SERVICE);
    if (!ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE);
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "get");

    if (action === "get") {
      const { data: settings, error: sErr } = await admin
        .from("forecast_settings").select("*").eq("id", "default").maybeSingle();
      if (sErr) throw sErr;

      // Pull live candidate education items from blog + playbooks + content_engine
      const [blogs, books] = await Promise.all([
        admin.from("blog_posts").select("id,title,slug").eq("is_published", true).order("published_at", { ascending: false }).limit(40),
        admin.from("playbooks").select("id,title").order("published_at", { ascending: false }).limit(40),
      ]);

      const candidates = [
        ...(blogs.data || []).map((b) => ({ kind: "blog", id: String(b.id), title: b.title || b.slug || "Untitled", enabled: false })),
        ...(books.data || []).map((p) => ({ kind: "playbook", id: String(p.id), title: p.title || "Untitled", enabled: false })),
      ];

      return new Response(JSON.stringify({ settings, education_candidates: candidates }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      const patch = body?.patch || {};
      const clean: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(patch)) {
        if (ALLOWED_KEYS.has(k)) clean[k] = v;
      }
      if (typeof clean.refresh_cadence_minutes === "number" && clean.refresh_cadence_minutes < 30) {
        clean.refresh_cadence_minutes = 30;
      }
      if (typeof clean.live_pulse_minutes === "number" && clean.live_pulse_minutes < 5) {
        clean.live_pulse_minutes = 5;
      }
      if (typeof clean.web_window === "string" && !["h","d","w","m"].includes(clean.web_window as string)) {
        delete clean.web_window;
      }

      const { data, error } = await admin
        .from("forecast_settings")
        .update(clean)
        .eq("id", "default")
        .select("*")
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ settings: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list_runs") {
      const { data, error } = await admin
        .from("forecast_briefings")
        .select("briefing_date,generated_at,model,sources,companies,education,live_pulse")
        .order("briefing_date", { ascending: false })
        .limit(10);
      if (error) throw error;
      const runs = (data || []).map((r: Record<string, unknown>) => ({
        briefing_date: r.briefing_date,
        generated_at: r.generated_at,
        model: r.model,
        signal_count: Array.isArray(r.sources) ? (r.sources as unknown[]).length : 0,
        company_count: Array.isArray(r.companies) ? (r.companies as unknown[]).length : 0,
        education_count: Array.isArray(r.education) ? (r.education as unknown[]).length : 0,
        pulse_count: Array.isArray(r.live_pulse) ? (r.live_pulse as unknown[]).length : 0,
      }));
      return new Response(JSON.stringify({ runs }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "force_run") {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/forecast-generate-daily?force=true`, {
        method: "POST",
        headers: { "x-forecast-secret": SERVICE, "Content-Type": "application/json" },
        body: "{}",
      });
      const j = await r.json().catch(() => ({}));
      return new Response(JSON.stringify({ ok: r.ok, ...j }), {
        status: r.ok ? 200 : (r.status || 500),
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-forecast-settings error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
