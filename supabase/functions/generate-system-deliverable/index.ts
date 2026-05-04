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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { deliverableId } = await req.json();
    if (!deliverableId) {
      return new Response(JSON.stringify({ error: "Missing deliverableId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: deliverable, error } = await supabase
      .from("purchase_deliverables")
      .select("*")
      .eq("id", deliverableId)
      .single();

    if (error || !deliverable) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const spec = SYSTEM_SPECS[deliverable.price_id];
    if (!spec) {
      return new Response(JSON.stringify({ error: "Unknown system" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("purchase_deliverables")
      .update({ status: "generating" })
      .eq("id", deliverableId);

    const intake = (deliverable.intake_data || {}) as Record<string, string>;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const WHITE_LABEL = `\n\nOUTPUT REQUIREMENTS (MANDATORY):
- WHITE-LABEL deliverable prepared FOR ${intake.businessName || "the client"}. Address it to them by name.
- Begin with H1: "${intake.businessName || "Client"} — ${spec.title}". Subtitle line with today's date (${new Date().toISOString().slice(0,10)}).
- Section 2: 4–6 sentence Executive Summary for a CEO.
- Use H2/H3 structure, short paragraphs, bullet lists, markdown tables.
- Every recommendation must be CONCRETE and ACTIONABLE. Quantify impact in $/%/hours where possible.
- End with: (a) "Next 7 Days" checklist (≤7 verb-led items), (b) "30/60/90-Day Roadmap" markdown table.
- Tone: blunt, operator-grade, forensic. No fluff, no emojis, no "I", no AI/vendor mentions.
- Output VALID GitHub-flavored markdown only. No HTML.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: spec.systemPrompt + WHITE_LABEL },
          { role: "user", content: spec.userPrompt(intake) },
        ],
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error:", aiResp.status, t);
      await supabase
        .from("purchase_deliverables")
        .update({ status: "failed", error_message: `AI ${aiResp.status}` })
        .eq("id", deliverableId);
      return new Response(JSON.stringify({ error: "AI failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const content = aiJson.choices?.[0]?.message?.content || "";

    await supabase
      .from("purchase_deliverables")
      .update({
        status: "ready",
        output_data: { markdown: content, title: spec.title, generatedAt: new Date().toISOString() },
      })
      .eq("id", deliverableId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("handler error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
