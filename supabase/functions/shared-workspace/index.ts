// Read-proxy for internal shared workspace + notifications (admin-only).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};
const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const URL_ = Deno.env.get("SUPABASE_URL")!;
    const isAdmin = await verifyAdminToken(getAdminTokenFromRequest(req), SVC);
    if (!isAdmin) return json(401, { error: "Unauthorized" });

    const supabase = createClient(URL_, SVC);
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "list") {
      const [t, n, f] = await Promise.all([
        supabase.from("shared_tasks").select("*").order("created_at", { ascending: false }),
        supabase.from("shared_notes").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("shared_files").select("*").order("created_at", { ascending: false }).limit(200),
      ]);
      return json(200, { tasks: t.data || [], notes: n.data || [], files: f.data || [] });
    }

    if (action === "notifications") {
      const recipient = String(body.recipient || "");
      if (!recipient) return json(400, { error: "recipient required" });
      const { data } = await supabase
        .from("shared_notifications")
        .select("*")
        .eq("recipient", recipient)
        .order("created_at", { ascending: false })
        .limit(50);
      return json(200, { notifications: data || [] });
    }

    if (action === "unread_count") {
      const recipient = String(body.recipient || "");
      if (!recipient) return json(400, { error: "recipient required" });
      const { count } = await supabase
        .from("shared_notifications")
        .select("id", { head: true, count: "exact" })
        .eq("recipient", recipient)
        .is("read_at", null);
      return json(200, { count: count || 0 });
    }

    return json(400, { error: "Unknown action" });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : "Unknown" });
  }
});
