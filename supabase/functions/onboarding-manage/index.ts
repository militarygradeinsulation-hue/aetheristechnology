import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminToken = getAdminTokenFromRequest(req);
    const isAdmin = await verifyAdminToken(adminToken, SERVICE_ROLE);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { action, id, slug, patch } = await req.json();

    if (action === "update") {
      if (!id && !slug) {
        return new Response(JSON.stringify({ error: "id or slug required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const allowed: Record<string, unknown> = {};
      if (patch && typeof patch === "object") {
        for (const k of ["title", "summary", "slides_json", "order_index", "status"]) {
          if (k in patch) allowed[k] = (patch as Record<string, unknown>)[k];
        }
      }
      // Recompute total_duration_sec if slides_json provided
      if (Array.isArray(allowed.slides_json)) {
        let total = 0;
        for (const s of allowed.slides_json as Array<{ duration_sec?: number }>) {
          total += Number(s?.duration_sec) || 0;
        }
        allowed.total_duration_sec = Math.round(total * 10) / 10;
      }

      const q = supabase.from("onboarding_modules").update(allowed);
      const { data, error } = await (id ? q.eq("id", id) : q.eq("slug", slug)).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, module: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      if (!id && !slug) {
        return new Response(JSON.stringify({ error: "id or slug required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Best-effort: remove audio assets folder
      try {
        const targetSlug = slug || (await supabase.from("onboarding_modules").select("slug").eq("id", id).single()).data?.slug;
        if (targetSlug) {
          const { data: files } = await supabase.storage.from("onboarding-assets").list(`audio/${targetSlug}`, { limit: 1000 });
          if (files && files.length) {
            await supabase.storage.from("onboarding-assets").remove(files.map((f) => `audio/${targetSlug}/${f.name}`));
          }
        }
      } catch { /* ignore */ }

      const q = supabase.from("onboarding_modules").delete();
      const { error } = await (id ? q.eq("id", id) : q.eq("slug", slug));
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
