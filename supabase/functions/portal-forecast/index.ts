// Portal-side reader for the Forecast Center.
// Auth: portal HMAC token. Some actions are partner-only.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-portal-token, x-admin-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STALE_HOURS = 20;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminTokRaw = getAdminTokenFromRequest(req);
    const portalTokRaw = getPortalTokenFromRequest(req);
    const adminOk = await verifyAdminToken(adminTokRaw, SERVICE);
    const portalClaims = adminOk ? null : await verifyPortalToken(portalTokRaw, SERVICE);
    if (!adminOk && !portalClaims) {
      console.warn("portal-forecast unauthorized", {
        hasAdminTok: !!adminTokRaw,
        adminTokLen: adminTokRaw?.length || 0,
        hasPortalTok: !!portalTokRaw,
        portalTokLen: portalTokRaw?.length || 0,
      });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Admin acts as a partner-equivalent for permission checks.
    const claims = portalClaims ?? { code: "ADMIN", role: "partner" as const };

    const admin = createClient(SUPABASE_URL, SERVICE);
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "get_today");

    // Public-facing settings (sections + cadence/pulse minutes only)
    const { data: settings } = await admin
      .from("forecast_settings")
      .select("sections,live_pulse_minutes,refresh_cadence_minutes,is_active")
      .eq("id", "default").maybeSingle();

    if (action === "get_today") {
      const { data: latest } = await admin
        .from("forecast_briefings")
        .select("*")
        .order("briefing_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      const ageHours = latest
        ? (Date.now() - new Date(latest.generated_at).getTime()) / 3600000
        : Infinity;

      const cadenceHours = settings?.refresh_cadence_minutes ? settings.refresh_cadence_minutes / 60 : STALE_HOURS;
      if (settings?.is_active !== false && (!latest || ageHours > cadenceHours)) {
        fetch(`${SUPABASE_URL}/functions/v1/forecast-generate-daily`, {
          method: "POST",
          headers: { "x-forecast-secret": SERVICE, "Content-Type": "application/json" },
          body: "{}",
        }).catch((e) => console.warn("trigger generate failed", e));
      }

      return new Response(JSON.stringify({
        briefing: latest,
        age_hours: ageHours === Infinity ? null : ageHours,
        settings: settings || null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "live_pulse") {
      const { data: latest } = await admin
        .from("forecast_briefings")
        .select("live_pulse,generated_at,briefing_date")
        .order("briefing_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      return new Response(JSON.stringify({
        live_pulse: latest?.live_pulse || [],
        generated_at: latest?.generated_at || null,
        live_pulse_minutes: settings?.live_pulse_minutes || 15,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "regenerate") {
      if (claims.role !== "partner") {
        return new Response(JSON.stringify({ error: "Partner only" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const r = await fetch(`${SUPABASE_URL}/functions/v1/forecast-generate-daily?force=true`, {
        method: "POST",
        headers: { "x-forecast-secret": SERVICE, "Content-Type": "application/json" },
        body: "{}",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        return new Response(JSON.stringify({ error: j?.error || "Regenerate failed" }), {
          status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: latest } = await admin
        .from("forecast_briefings").select("*")
        .order("briefing_date", { ascending: false }).limit(1).maybeSingle();
      return new Response(JSON.stringify({ ok: true, briefing: latest }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "push_lead") {
      const company = body?.company || {};
      const name = String(company?.name || "").trim();
      const website = String(company?.website || "").trim();
      if (!name) {
        return new Response(JSON.stringify({ error: "Missing company name" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const today = new Date().toISOString().slice(0, 10);
      const externalId = website || `forecast:${today}:${name.toLowerCase().replace(/\s+/g, "-")}`;

      const { data: existing } = await admin
        .from("rep_leads").select("id").eq("external_id", externalId).maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ ok: true, duplicate: true, id: existing.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: ins, error: insErr } = await admin.from("rep_leads").insert({
        business_name: name,
        website: website || null,
        industry: company?.industry || null,
        location: company?.location || "Indianapolis, Indiana",
        notes: [
          company?.signal ? `Signal: ${company.signal}` : null,
          company?.why ? `Why: ${company.why}` : null,
          company?.source_url ? `Source: ${company.source_url}` : null,
        ].filter(Boolean).join("\n") || null,
        source: `forecast:${today}`,
        status: "new",
        why_fit: company?.why || null,
        external_id: externalId,
        created_by_code: claims.code,
      }).select("id").single();
      if (insErr) throw insErr;

      // Audit
      try {
        await admin.from("rep_activity").insert({
          rep_code: claims.code,
          action: "forecast_push_lead",
          metadata: { company: name, website, briefing_date: today },
        });
      } catch (_) { /* non-fatal */ }

      return new Response(JSON.stringify({ ok: true, id: ins.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("portal-forecast error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
