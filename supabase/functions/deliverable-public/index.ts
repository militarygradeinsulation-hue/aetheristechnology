import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SYSTEM_SPECS } from "../_shared/system-prompts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token || token.length < 16) {
      return json({ error: "Invalid token" }, 400);
    }

    const { data: deliverable, error } = await supabase
      .from("purchase_deliverables")
      .select("id, price_id, status, intake_data, output_data, error_message, email, created_at")
      .eq("access_token", token)
      .maybeSingle();

    if (error || !deliverable) return json({ error: "Not found" }, 404);

    const spec = SYSTEM_SPECS[deliverable.price_id];
    const meta = spec
      ? { title: spec.title, intakeFields: spec.intake }
      : { title: "Your deliverable", intakeFields: [] };

    if (req.method === "GET") {
      return json({ deliverable, meta });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const intake = body.intake || {};

      // basic shape check
      if (typeof intake !== "object" || Array.isArray(intake)) {
        return json({ error: "Invalid intake" }, 400);
      }

      await supabase
        .from("purchase_deliverables")
        .update({ intake_data: intake, status: "pending" })
        .eq("id", deliverable.id);

      // trigger AI generation (fire and forget)
      fetch(`${SUPABASE_URL}/functions/v1/generate-system-deliverable`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ deliverableId: deliverable.id }),
      }).catch((e) => console.error("trigger failed:", e));

      return json({ success: true });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
