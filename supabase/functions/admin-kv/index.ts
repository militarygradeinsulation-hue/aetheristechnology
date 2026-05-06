// Admin key-value store for cross-device admin preferences (saved views, etc.)
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
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ok = await verifyAdminToken(getAdminTokenFromRequest(req), SERVICE);
    if (!ok) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const key = String(body.key || "");
    if (!key) return new Response(JSON.stringify({ error: "key required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (action === "get") {
      const { data } = await supabase.from("admin_kv").select("value, updated_at").eq("key", key).maybeSingle();
      return new Response(JSON.stringify({ value: data?.value ?? null, updated_at: data?.updated_at ?? null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (action === "set") {
      const value = body.value ?? {};
      const { error } = await supabase.from("admin_kv").upsert({ key, value, updated_at: new Date().toISOString() });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("admin-kv error", e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
