// PIN-token-gated admin data endpoint. Reads/writes the dashboard tables using
// the service role so we don't need a Supabase Auth session for the admin UI.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const token = getAdminTokenFromRequest(req);
    const ok = await verifyAdminToken(token, SUPABASE_SERVICE_ROLE_KEY);
    if (!ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (action === "dashboard") {
      const [subRes, evtRes] = await Promise.all([
        supabase.from("contact_submissions").select("*").order("created_at", { ascending: false }),
        supabase.from("site_events").select("*").order("created_at", { ascending: false }).limit(1000),
      ]);
      return new Response(
        JSON.stringify({ submissions: subRes.data || [], events: evtRes.data || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "crm") {
      const env = body.env || null;
      let salesQ = supabase.from("sales").select("*").order("occurred_at", { ascending: false }).limit(500);
      let commQ = supabase.from("commissions").select("*").order("created_at", { ascending: false }).limit(500);
      if (env) { salesQ = salesQ.eq("environment", env); commQ = commQ.eq("environment", env); }
      const [salesR, custR, commR, actR] = await Promise.all([
        salesQ,
        supabase.from("customers").select("*").order("last_seen_at", { ascending: false }).limit(500),
        commQ,
        supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(500),
      ]);
      return new Response(JSON.stringify({
        sales: salesR.data || [], customers: custR.data || [],
        commissions: commR.data || [], activity: actR.data || [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "mark_commission_paid") {
      const { id, payout_reference } = body;
      const { error } = await supabase.from("commissions").update({
        status: "paid", paid_at: new Date().toISOString(), payout_reference: payout_reference || null,
      }).eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "toggle_read") {
      const { id, is_read } = body;
      if (!id) {
        return new Response(JSON.stringify({ error: "id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase.from("contact_submissions").update({ is_read }).eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_submission") {
      const { id } = body;
      if (!id) {
        return new Response(JSON.stringify({ error: "id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase.from("contact_submissions").delete().eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "leads_browser") {
      const filter = (body.filter as string) || "pool";
      const search = (body.search as string) || "";
      const minScore = typeof body.minScore === "number" ? body.minScore : null;

      let q = supabase
        .from("rep_leads")
        .select(
          "id,business_name,contact_name,email,phone,website,industry,location,score,why_fit,status,source,claimed_by_code,assigned_to_code,assignment_expires_at,enrichment,enriched_at,created_at",
        )
        .order("score", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(200);

      if (filter === "pool") q = q.is("claimed_by_code", null).is("assigned_to_code", null);
      if (filter === "assigned") q = q.is("claimed_by_code", null).not("assigned_to_code", "is", null);
      if (filter === "claimed") q = q.not("claimed_by_code", "is", null);
      if (search.trim()) {
        const s = search.trim();
        q = q.or(`business_name.ilike.%${s}%,website.ilike.%${s}%,industry.ilike.%${s}%`);
      }
      if (minScore !== null) q = q.gte("score", minScore);

      const nowIso = new Date().toISOString();
      const [leadsR, repsR, dripR] = await Promise.all([
        q,
        supabase.from("rep_codes").select("code,rep_name,is_active,role").order("rep_name"),
        supabase
          .from("rep_leads")
          .select("assigned_to_code")
          .is("claimed_by_code", null)
          .not("assigned_to_code", "is", null)
          .gt("assignment_expires_at", nowIso)
          .limit(5000),
      ]);

      if (leadsR.error) throw leadsR.error;
      const dripCounts: Record<string, number> = {};
      (dripR.data || []).forEach((r: any) => {
        if (r.assigned_to_code) dripCounts[r.assigned_to_code] = (dripCounts[r.assigned_to_code] || 0) + 1;
      });

      return new Response(
        JSON.stringify({
          leads: leadsR.data || [],
          reps: repsR.data || [],
          dripCounts,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-data error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
