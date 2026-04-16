import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Map price IDs to delivery types and generation prompts
const DELIVERY_MAP: Record<string, { type: string; prompt: string }> = {
  scan_full_report_monthly: {
    type: "website_report",
    prompt: "Generate a comprehensive monthly website performance report with new findings, trend analysis, and improvement recommendations.",
  },
  digital_snapshot_monthly: {
    type: "digital_snapshot",
    prompt: "Generate a monthly digital presence snapshot covering SEO changes, content performance, and competitive shifts.",
  },
  scan_strategy_blueprint_monthly: {
    type: "strategy_blueprint",
    prompt: "Generate a monthly strategic update with refined recommendations, new market insights, and updated action items.",
  },
  social_content_pack_monthly: {
    type: "social_content",
    prompt: "Generate 25 social media posts (10 LinkedIn, 10 Facebook, 5 ad hooks) tailored to the subscriber's brand and recent performance.",
  },
  sales_script_pack_monthly: {
    type: "sales_scripts",
    prompt: "Generate refreshed sales scripts, objection handlers, and follow-up templates based on industry trends and past feedback.",
  },
  content_calendar_monthly: {
    type: "content_calendar",
    prompt: "Generate a 30-day content calendar with topics, hooks, captions, and optimal posting times adapted to seasonal trends.",
  },
  follow_up_plan_monthly: {
    type: "follow_up_plan",
    prompt: "Generate an updated follow-up cadence plan with refined timing, messaging, and channel recommendations.",
  },
  website_evaluation_monthly: {
    type: "website_evaluation",
    prompt: "Generate a monthly website evaluation comparing current state to last month, highlighting improvements and new issues.",
  },
  full_analytics_monthly: {
    type: "full_analytics",
    prompt: "Generate a comprehensive monthly analytics package with traffic analysis, conversion data, and growth recommendations.",
  },
  fourteen_day_diagnostic_monthly: {
    type: "diagnostic",
    prompt: "Generate a deep monthly business diagnostic covering operations, marketing, sales, and technology with executive-level insights.",
  },
  strategic_questions_monthly: {
    type: "strategic_questions",
    prompt: "Generate a fresh set of strategic questions based on the subscriber's evolving business context and past responses.",
  },
  brand_contradictions_monthly: {
    type: "brand_contradictions",
    prompt: "Re-audit the subscriber's brand for contradictions, tracking progress on previously identified issues and finding new ones.",
  },
  friction_audit_monthly: {
    type: "friction_audit",
    prompt: "Re-scan the subscriber's communication for friction vocabulary, tracking improvements and identifying new problem areas.",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subscription_id, stripe_invoice_id } = await req.json();
    if (!subscription_id) {
      return new Response(JSON.stringify({ error: "subscription_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get subscription details
    const { data: sub, error: subErr } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("stripe_subscription_id", subscription_id)
      .single();

    if (subErr || !sub) {
      console.error("Subscription not found:", subErr);
      return new Response(JSON.stringify({ error: "Subscription not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine delivery type from price_id
    const deliveryConfig = DELIVERY_MAP[sub.price_id];
    if (!deliveryConfig) {
      console.log("No delivery mapping for price:", sub.price_id);
      return new Response(JSON.stringify({ error: "No delivery config for this subscription" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get subscriber profile
    const { data: profile } = await supabase
      .from("subscriber_profiles")
      .select("*")
      .eq("subscription_id", sub.id)
      .single();

    // Get past deliveries (last 3)
    const { data: pastDeliveries } = await supabase
      .from("subscription_deliveries")
      .select("*")
      .eq("subscription_id", sub.id)
      .order("delivery_date", { ascending: false })
      .limit(3);

    // Get feedback on past deliveries
    const deliveryIds = (pastDeliveries || []).map((d: any) => d.id);
    let feedback: any[] = [];
    if (deliveryIds.length > 0) {
      const { data: fb } = await supabase
        .from("subscriber_feedback")
        .select("*")
        .in("delivery_id", deliveryIds);
      feedback = fb || [];
    }

    // Build context for AI
    const profileContext = profile
      ? `Business: ${profile.business_name || "Unknown"}
Industry: ${profile.industry || "Not specified"}
Target Audience: ${profile.target_audience || "General"}
Tone Preference: ${profile.tone_preference || "professional"}
Goals: ${(profile.goals || []).join(", ") || "Not specified"}
Website: ${profile.website_url || "None"}
Special Instructions: ${profile.notes || "None"}`
      : "No subscriber profile on file. Generate generic but high-quality content.";

    const historyContext = (pastDeliveries || []).length > 0
      ? `Past ${pastDeliveries!.length} deliveries exist. Feedback summary: ${feedback.map((f: any) => `Rating: ${f.rating > 0 ? "👍" : "👎"} — ${f.notes || "no notes"}`).join("; ") || "No feedback yet."}`
      : "This is the first delivery for this subscriber.";

    const monthNumber = (pastDeliveries || []).length + 1;
    const intelligenceBrief = monthNumber >= 3
      ? "\n\nIMPORTANT: This is month 3+. Include a 'Business Intelligence Brief' section at the end summarizing patterns you've observed, what's working, what should change, and strategic predictions."
      : "";

    const systemPrompt = `You are an elite AI business consultant for Aetheris Technology. You deliver personalized, actionable monthly packages to subscribers. Your tone should match their preference. Be specific, data-driven, and ruthlessly practical. No fluff. No filler. Every word earns its place.

SUBSCRIBER CONTEXT:
${profileContext}

DELIVERY HISTORY:
${historyContext}
This is Month #${monthNumber} of their subscription.${intelligenceBrief}

Respond with a JSON object containing:
- "title": A compelling title for this month's delivery
- "summary": 2-3 sentence executive summary
- "content": The full delivery content (use markdown formatting)
- "changes_from_last_month": What you adjusted based on feedback/patterns (or "First delivery" if month 1)
- "next_month_preview": What you plan to focus on next month`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const aiResponse = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: deliveryConfig.prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_delivery",
              description: "Generate the monthly delivery package",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  summary: { type: "string" },
                  content: { type: "string" },
                  changes_from_last_month: { type: "string" },
                  next_month_preview: { type: "string" },
                },
                required: ["title", "summary", "content", "changes_from_last_month", "next_month_preview"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_delivery" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let deliveryOutput: any;

    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      deliveryOutput = JSON.parse(toolCall.function.arguments);
    } catch {
      console.error("Failed to parse AI response:", JSON.stringify(aiData));
      throw new Error("Failed to parse AI delivery output");
    }

    // Store the delivery
    const { data: delivery, error: delErr } = await supabase
      .from("subscription_deliveries")
      .insert({
        subscription_id: sub.id,
        user_id: sub.user_id,
        delivery_type: deliveryConfig.type,
        output_data: deliveryOutput,
        stripe_invoice_id: stripe_invoice_id || null,
      })
      .select()
      .single();

    if (delErr) {
      console.error("Insert delivery error:", delErr);
      throw new Error("Failed to store delivery");
    }

    // Get subscriber email for notification
    const { data: profileData } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", sub.user_id)
      .single();

    // Send email notification via existing email infrastructure
    if (profileData?.email) {
      try {
        await supabase.rpc("enqueue_email", {
          queue_name: "transactional_email_queue",
          payload: {
            template_name: "monthly-delivery",
            recipient_email: profileData.email,
            data: {
              name: profileData.full_name || "Subscriber",
              delivery_title: deliveryOutput.title,
              delivery_summary: deliveryOutput.summary,
              delivery_type: deliveryConfig.type,
              portal_url: "https://aetheris.technology/my-subscription",
            },
          },
        });
      } catch (emailErr) {
        console.error("Email notification error:", emailErr);
        // Don't fail the delivery if email fails
      }
    }

    return new Response(JSON.stringify({ success: true, delivery_id: delivery.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Monthly delivery error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
