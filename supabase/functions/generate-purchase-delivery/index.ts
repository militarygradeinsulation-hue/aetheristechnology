import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { normalizePublicCompanyUrl } from "../_shared/company-audit-offers.ts";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Map tool types to the existing edge functions that generate content
const TOOL_FUNCTIONS: Record<string, string> = {
  social_content: "generate-social-content",
  sales_scripts: "generate-sales-scripts",
  content_calendar: "generate-content-calendar",
  follow_up_plan: "generate-follow-up-plan",
  strategic_questions: "generate-strategic-questions",
  brand_contradictions: "generate-brand-contradictions",
  friction_audit: "generate-friction-audit",
  website_report: "scan-website",
  digital_snapshot: "scan-website",
  strategy_blueprint: "scan-website",
};

serve(async (req) => {
  // This function uses the service role to read private paid orders. Reject
  // public anonymous calls before looking up a deliverable or starting a scan.
  const authorization = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (req.method !== "POST" || !SUPABASE_SERVICE_ROLE_KEY || authorization !== SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  try {
    const { deliverableId } = await req.json();
    if (!deliverableId) {
      return new Response(JSON.stringify({ error: "Missing deliverableId" }), { status: 400 });
    }

    // Fetch the deliverable
    const { data: deliverable, error: fetchErr } = await supabase
      .from("purchase_deliverables")
      .select("*")
      .eq("id", deliverableId)
      .single();

    if (fetchErr || !deliverable) {
      console.error("Fetch deliverable error:", fetchErr);
      return new Response(JSON.stringify({ error: "Deliverable not found" }), { status: 404 });
    }

    // Atomically claim only pending orders. Concurrent retries cannot generate
    // the same report multiple times and consume credits twice.
    const { data: claimed, error: claimError } = await supabase
      .from("purchase_deliverables")
      .update({ status: "generating" })
      .eq("id", deliverableId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) return new Response(JSON.stringify({ status: "already_claimed" }), {status: 200, headers: {"Content-Type":"application/json"}});

    const toolType = deliverable.tool_type;
    const inputData = deliverable.input_data as Record<string, unknown>;
    const edgeFn = TOOL_FUNCTIONS[toolType];

    if (!edgeFn) {
      await markFailed(deliverableId, `Unknown tool type: ${toolType}`);
      return new Response(JSON.stringify({ error: "Unknown tool type" }), { status: 400 });
    }

    try {
      // Build the request body based on tool type
      const body = buildRequestBody(toolType, inputData);

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/${edgeFn}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        console.error(`Generation failed for ${toolType}:`, errorText);
        await markFailed(deliverableId, `Generation failed: ${resp.status}`);
        return new Response(JSON.stringify({ error: "Generation failed" }), { status: 500 });
      }

      const result = await resp.json();

      // Record the result before notifying the customer. The payment webhook
      // alone must never be interpreted as report generation succeeding.
      const { error: saveError } = await supabase
        .from("purchase_deliverables")
        .update({
          status: "ready",
          output_data: result,
        })
        .eq("id", deliverableId)
        .eq("status", "generating");
      if (saveError) throw saveError;

      // Automatic email is optional best effort. The report remains accessible
      // on the paid return page even if an email provider is temporarily down.
      const websiteProducts: Record<string, string> = {
        website_report: "Automated Website Report",
        digital_snapshot: "Digital Snapshot",
        strategy_blueprint: "Strategy Blueprint",
      };
      if (websiteProducts[toolType] && deliverable.email && deliverable.stripe_session_id) {
        try {
          const emailResult = await sendTemplateEmail("website-report-ready", deliverable.email, {
            idempotencyKey: `report-ready-${deliverable.id}`,
            templateData: {
              title: websiteProducts[toolType],
              websiteUrl: normalizePublicCompanyUrl(inputData.website_url || inputData.websiteUrl).url,
              reportUrl: `https://aetheris.technology/checkout/return?type=deliverable&session_id=${encodeURIComponent(deliverable.stripe_session_id)}`,
            },
          });
          if (!emailResult.sent) console.warn("website report email suppressed:", deliverable.id);
        } catch (notifyError) {
          console.error("website report email could not be confirmed:", notifyError instanceof Error ? notifyError.message : "unknown");
        }
      }
      console.log(`Deliverable ${deliverableId} ready for ${toolType}`);
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      console.error("Generation error:", e);
      await markFailed(deliverableId, e.message || "Generation error");
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  } catch (e) {
    console.error("Handler error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});

async function markFailed(id: string, msg: string) {
  await supabase
    .from("purchase_deliverables")
    .update({ status: "failed", error_message: msg })
    .eq("id", id);
}

function buildRequestBody(toolType: string, input: Record<string, unknown>): Record<string, unknown> {
  // Use metadata from the checkout session to build generation requests
  // The website URL or business info from metadata is used as input
  const websiteUrl = (input.website_url as string) || (input.websiteUrl as string) || "https://example.com";
  const businessName = (input.business_name as string) || (input.businessName as string) || "";
  const industry = (input.industry as string) || "";

  switch (toolType) {
    case "social_content":
      return { websiteUrl, businessName, industry, count: 25 };
    case "sales_scripts":
      return { websiteUrl, businessName, industry };
    case "content_calendar":
      return { websiteUrl, businessName, industry, days: 30 };
    case "follow_up_plan":
      return { websiteUrl, businessName, industry };
    case "strategic_questions":
      return { websiteUrl, businessName, industry };
    case "brand_contradictions":
      return { websiteUrl, businessName };
    case "friction_audit":
      return { websiteUrl, businessName };
    case "website_report":
    case "digital_snapshot":
    case "strategy_blueprint":
      // Never charge a user and then scan example.com because checkout lacked a URL.
      return { url: normalizePublicCompanyUrl(input.website_url || input.websiteUrl).url, tier: toolType };
    default:
      return { websiteUrl, businessName };
  }
}
