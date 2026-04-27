// Admin endpoint to approve/reject a tuning proposal and apply it to audit_tuning_config.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const auth = req.headers.get("Authorization");
    if (!auth) return j({ error: "Unauthorized" }, 401);
    const { data: { user } } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return j({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) return j({ error: "Forbidden" }, 403);

    const { proposal_id, action } = await req.json(); // action: 'approve' | 'reject'
    if (!proposal_id || !["approve", "reject"].includes(action)) return j({ error: "bad request" }, 400);

    const { data: prop } = await supabase.from("audit_tuning_proposals").select("*").eq("id", proposal_id).maybeSingle();
    if (!prop) return j({ error: "not found" }, 404);
    if (prop.status !== "pending") return j({ error: "already reviewed" }, 400);

    if (action === "reject") {
      await supabase.from("audit_tuning_proposals").update({ status: "rejected", reviewed_by: user.id }).eq("id", proposal_id);
      return j({ ok: true });
    }

    // approve → apply to config
    const value = (prop.proposed_value as any)?.value;
    await supabase.from("audit_tuning_config").update({ [prop.field]: value, updated_at: new Date().toISOString() }).eq("id", 1);
    await supabase.from("audit_tuning_proposals").update({
      status: "approved",
      applied_at: new Date().toISOString(),
      reviewed_by: user.id,
    }).eq("id", proposal_id);

    return j({ ok: true, applied: { [prop.field]: value } });
  } catch (e: any) {
    console.error("[audit-apply-proposal] error", e);
    return j({ error: e.message }, 500);
  }
});

function j(b: any, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
