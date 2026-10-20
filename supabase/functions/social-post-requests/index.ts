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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const ok = await verifyAdminToken(getAdminTokenFromRequest(req), serviceKey);
    if (!ok) return json({ error: "Unauthorized" }, 401);
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const { platform, content, mediaUrl, notes } = body;
      if (!platform || !content) return json({ error: "platform and content required" }, 400);

      const { data, error } = await admin
        .from("social_post_requests")
        .insert({ platform, content, media_url: mediaUrl || null, notes: notes || null })
        .select()
        .single();
      if (error) throw error;
      return json({ success: true, request: data });
    }

    if (action === "list") {
      const { status } = body;
      let query = admin.from("social_post_requests").select("*").order("created_at", { ascending: false }).limit(100);
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return json({ requests: data || [] });
    }

    if (action === "claim") {
      const { id, claimedBy } = body;
      if (!id) return json({ error: "id required" }, 400);
      const { data, error } = await admin
        .from("social_post_requests")
        .update({ status: "claimed", claimed_by: claimedBy || "agent", claimed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("status", "pending")
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) return json({ error: "Already claimed or not pending" }, 409);
      return json({ success: true, request: data });
    }

    if (action === "complete") {
      const { id, resultUrl } = body;
      if (!id) return json({ error: "id required" }, 400);
      const { data, error } = await admin
        .from("social_post_requests")
        .update({ status: "posted", result_url: resultUrl || null, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return json({ success: true, request: data });
    }

    if (action === "fail") {
      const { id, reason } = body;
      if (!id) return json({ error: "id required" }, 400);
      const { data, error } = await admin
        .from("social_post_requests")
        .update({ status: "failed", failure_reason: reason || null, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return json({ success: true, request: data });
    }

    if (action === "skip") {
      const { id } = body;
      if (!id) return json({ error: "id required" }, 400);
      const { error } = await admin
        .from("social_post_requests")
        .update({ status: "skipped", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === "delete") {
      const { id } = body;
      if (!id) return json({ error: "id required" }, 400);
      const { error } = await admin.from("social_post_requests").delete().eq("id", id);
      if (error) throw error;
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("social-post-requests error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return json({ error: message }, 500);
  }
});
