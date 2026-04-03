import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const HASHTAG_POOLS = {
  marketingTech: [
    "MarketingAutomation", "RevOps", "LeadGeneration", "CRM",
    "MarketingStrategy", "AttributionModeling", "DemandGen",
    "B2BMarketing", "MarketingOps", "GrowthStrategy",
    "DigitalMarketing", "ContentStrategy", "MarketingROI",
  ],
  consulting: [
    "BusinessConsulting", "OperationalExcellence", "ManagementConsulting",
    "BusinessStrategy", "ProcessOptimization", "ChangeManagement",
    "ExecutiveLeadership", "BusinessTransformation", "StrategicPlanning",
    "Consulting", "BusinessGrowth", "Operations",
  ],
  aiTransformation: [
    "AIStrategy", "DigitalTransformation", "ArtificialIntelligence",
    "BusinessAutomation", "AIImplementation", "DataDriven",
    "MachineLearning", "AIforBusiness", "IntelligentAutomation",
    "FutureOfWork", "TechStrategy", "Innovation",
  ],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Accept offset and limit for chunked processing
    let offset = 0;
    let limit = 15; // Process 15 posts per invocation to stay within timeout
    try {
      const body = await req.json();
      if (body.offset !== undefined) offset = body.offset;
      if (body.limit !== undefined) limit = body.limit;
    } catch {}

    // Fetch published blog posts with pagination
    const { data: posts, error: fetchError } = await supabase
      .from("blog_posts")
      .select("id, title, content, tags, meta_description, excerpt")
      .eq("is_published", true)
      .order("published_at", { ascending: true })
      .range(offset, offset + limit - 1);

    if (fetchError) throw fetchError;

    console.log(`Processing ${posts.length} posts (offset: ${offset}, limit: ${limit})`);

    const BATCH_SIZE = 3;
    let updated = 0;
    let errors = 0;

    for (let i = 0; i < posts.length; i += BATCH_SIZE) {
      const batch = posts.slice(i, i + BATCH_SIZE);

      const promises = batch.map(async (post) => {
        try {
          // Use AI to classify and re-tag
          const prompt = `Analyze this blog post and return structured metadata.

TITLE: ${post.title}
EXCERPT: ${post.excerpt}
CONTENT (first 500 chars): ${post.content?.substring(0, 500)}

You must classify this post into EXACTLY ONE of these three pillars:
1. "marketingTech" — Marketing Technology Strategy, CRM, RevOps, lead generation, attribution, marketing automation
2. "consulting" — Business Consulting & Operational Systems, process optimization, change management, strategic planning
3. "aiTransformation" — AI & Digital Transformation, artificial intelligence, automation, machine learning, data-driven

You must also classify the funnel stage as one of: "Awareness", "Consideration", "Conversion"

Return a JSON object with:
- "pillar": one of "marketingTech", "consulting", "aiTransformation"
- "funnelStage": one of "Awareness", "Consideration", "Conversion"
- "tags": array of exactly 5 niche-specific hashtag strings (NO # prefix, NO branding tags like "AetherisAI") selected from these pools based on the pillar:
  marketingTech: ${HASHTAG_POOLS.marketingTech.join(", ")}
  consulting: ${HASHTAG_POOLS.consulting.join(", ")}
  aiTransformation: ${HASHTAG_POOLS.aiTransformation.join(", ")}
- "metaDescription": a compelling SEO meta description under 160 chars if the current one is missing or generic

Current tags: ${JSON.stringify(post.tags)}
Current meta_description: ${post.meta_description || "MISSING"}`;

          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                { role: "system", content: "You are a content strategist. Return ONLY valid JSON, no markdown." },
                { role: "user", content: prompt },
              ],
              tools: [{
                type: "function",
                function: {
                  name: "classify_post",
                  description: "Classify a blog post and return metadata",
                  parameters: {
                    type: "object",
                    properties: {
                      pillar: { type: "string", enum: ["marketingTech", "consulting", "aiTransformation"] },
                      funnelStage: { type: "string", enum: ["Awareness", "Consideration", "Conversion"] },
                      tags: { type: "array", items: { type: "string" }, minItems: 5, maxItems: 5 },
                      metaDescription: { type: "string" },
                    },
                    required: ["pillar", "funnelStage", "tags", "metaDescription"],
                    additionalProperties: false,
                  },
                },
              }],
              tool_choice: { type: "function", function: { name: "classify_post" } },
            }),
          });

          if (!aiResponse.ok) {
            console.error(`AI error for post ${post.id}: ${aiResponse.status}`);
            errors++;
            return;
          }

          const aiData = await aiResponse.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (!toolCall) {
            console.error(`No tool call for post ${post.id}`);
            errors++;
            return;
          }

          const metadata = JSON.parse(toolCall.function.arguments);

          // Clean tags - ensure no # prefix, no branding
          const cleanTags = metadata.tags
            .map((t: string) => t.replace(/^#/, ""))
            .filter((t: string) => !["AetherisAI", "Aetheris", "AetherisDigital"].includes(t))
            .slice(0, 5);

          const updateData: Record<string, unknown> = { tags: cleanTags };

          // Only update meta_description if it was missing or generic
          if (!post.meta_description || post.meta_description.length < 50) {
            updateData.meta_description = metadata.metaDescription;
          }

          const { error: updateError } = await supabase
            .from("blog_posts")
            .update(updateData)
            .eq("id", post.id);

          if (updateError) {
            console.error(`Update error for post ${post.id}:`, updateError);
            errors++;
          } else {
            updated++;
            console.log(`✓ Updated post ${post.id}: [${cleanTags.join(", ")}]`);
          }
        } catch (e) {
          console.error(`Error processing post ${post.id}:`, e);
          errors++;
        }
      });

      await Promise.all(promises);

      // Small delay between batches to avoid rate limits
      if (i + BATCH_SIZE < posts.length) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    return new Response(
      JSON.stringify({ success: true, total: posts.length, updated, errors, nextOffset: offset + limit }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Retrofit error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
