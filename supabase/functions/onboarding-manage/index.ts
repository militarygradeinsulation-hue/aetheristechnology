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
    const body = await req.json();
    const { action, id, slug, patch, key, base64 } = body;

    // ─── Screenshot management ───
    if (action === "list_screenshots") {
      const { data, error } = await supabase.storage
        .from("onboarding-assets")
        .list("screenshots", { limit: 1000 });
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const f of data || []) {
        const k = f.name.replace(/\.png$/i, "");
        const { data: pub } = supabase.storage
          .from("onboarding-assets")
          .getPublicUrl(`screenshots/${f.name}`);
        map[k] = `${pub.publicUrl}?v=${Date.now()}`;
      }
      return new Response(JSON.stringify({ ok: true, screenshots: map }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "upload_screenshot") {
      if (!key || !base64) {
        return new Response(JSON.stringify({ error: "key and base64 required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const safeKey = String(key).replace(/[^a-z0-9_\-]/gi, "_");
      const b64 = String(base64).replace(/^data:image\/[a-z]+;base64,/, "");
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const path = `screenshots/${safeKey}.png`;
      const { error: upErr } = await supabase.storage
        .from("onboarding-assets")
        .upload(path, bytes, { contentType: "image/png", upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage
        .from("onboarding-assets")
        .getPublicUrl(path);
      return new Response(JSON.stringify({ ok: true, url: `${pub.publicUrl}?v=${Date.now()}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_screenshot") {
      if (!key) {
        return new Response(JSON.stringify({ error: "key required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const safeKey = String(key).replace(/[^a-z0-9_\-]/gi, "_");
      await supabase.storage.from("onboarding-assets").remove([`screenshots/${safeKey}.png`]);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "attach_screenshots") {
      // Build map { routePath -> publicUrl } from current screenshots + routeHints.
      const routeHints: Record<string, string> = body.routeHints || {};
      const { data: shots } = await supabase.storage
        .from("onboarding-assets")
        .list("screenshots", { limit: 1000 });
      const keyToUrl: Record<string, string> = {};
      for (const f of shots || []) {
        const k = f.name.replace(/\.png$/i, "");
        const { data: pub } = supabase.storage
          .from("onboarding-assets")
          .getPublicUrl(`screenshots/${f.name}`);
        keyToUrl[k] = pub.publicUrl;
      }
      // routePath (e.g. "/portal?tab=leads") -> url
      const routeToUrl: Record<string, string> = {};
      for (const [k, route] of Object.entries(routeHints)) {
        if (keyToUrl[k]) routeToUrl[route] = keyToUrl[k];
      }
      // Also allow matching by key directly if slide.route happens to be a key
      const lookupForSlide = (slide: { route?: string; image_url?: string; title?: string; narration?: string }): string | undefined => {
        if (slide.route && routeToUrl[slide.route]) return routeToUrl[slide.route];
        if (slide.route && keyToUrl[slide.route]) return keyToUrl[slide.route];
        // Heuristic: pick screenshot whose key appears in slide title/narration
        const hay = `${slide.title || ""} ${slide.narration || ""}`.toLowerCase();
        let best: { key: string; score: number } | null = null;
        for (const k of Object.keys(keyToUrl)) {
          const tokens = k.split(/[_\-]/).filter(t => t.length > 2);
          let score = 0;
          for (const t of tokens) if (hay.includes(t)) score += 1;
          if (score > 0 && (!best || score > best.score)) best = { key: k, score };
        }
        return best ? keyToUrl[best.key] : undefined;
      };

      const { data: mods, error: modErr } = await supabase
        .from("onboarding_modules").select("id, slides_json");
      if (modErr) throw modErr;

      let updated = 0;
      let attached = 0;
      for (const m of mods || []) {
        const slides = (m.slides_json as Array<Record<string, unknown>>) || [];
        let changed = false;
        const next = slides.map((s) => {
          const url = lookupForSlide(s as { route?: string; image_url?: string; title?: string; narration?: string });
          if (url && (s as { image_url?: string }).image_url !== url) {
            changed = true;
            attached++;
            return { ...s, image_url: url };
          }
          return s;
        });
        if (changed) {
          const { error: uErr } = await supabase
            .from("onboarding_modules")
            .update({ slides_json: next })
            .eq("id", m.id);
          if (!uErr) updated++;
        }
      }
      return new Response(JSON.stringify({ ok: true, modules_updated: updated, slides_attached: attached, screenshots_available: Object.keys(keyToUrl).length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
