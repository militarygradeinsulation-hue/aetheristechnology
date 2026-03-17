import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TOPICS = [
  {
    category: "AI Misuse",
    angles: [
      "Companies using AI chatbots with zero training data from their own business",
      "Why your AI-generated content sounds like every other company's AI-generated content",
      "The hidden cost of AI hallucinations in customer-facing applications",
      "Your team is using 5 different AI tools that don't talk to each other",
      "AI without data governance is just expensive guessing",
      "Why fine-tuning matters and why nobody does it",
      "The AI vendor lock-in trap most businesses walk into blindly",
      "You automated the wrong processes and now everything is worse",
    ],
  },
  {
    category: "Marketing Failures",
    angles: [
      "Your Google Ads are sending traffic to pages with no conversion tracking",
      "Why your marketing agency reports impressions instead of revenue",
      "The $10K/month retainer that produces nothing measurable",
      "Your brand voice document is 40 pages nobody reads",
      "Why your competitor's ugly website outperforms your beautiful one",
      "The marketing stack nobody on your team knows how to use",
      "You're A/B testing button colors while your funnel has a hole in it",
      "Why your webinars generate attendees but zero pipeline",
    ],
  },
  {
    category: "CRM & Lead Journey",
    angles: [
      "Your sales team manually enters leads and loses 30% of them",
      "The follow-up gap: why leads go cold in 48 hours",
      "Your lead scoring model hasn't been updated since you built it",
      "Why marketing qualified leads and sales qualified leads are different universes",
      "The handoff problem: marketing generates leads, sales ignores them",
      "Your CRM has 50,000 contacts and you can't tell which ones matter",
      "Duplicate records are costing you more than you think",
      "Why your pipeline report lies to you every Monday morning",
    ],
  },
  {
    category: "Industry Specific",
    angles: [
      "Law firms spending $8K/month on marketing with no client attribution",
      "Real estate agencies using AI for listings but not for lead nurturing",
      "Dental practices paying for SEO while ignoring Google Business reviews",
      "Auto dealerships with $50K ad budgets and no follow-up automation",
      "Accounting firms that think a LinkedIn post is a marketing strategy",
      "Insurance agencies drowning in leads they never call back",
      "Veterinary clinics with no online booking losing to PetSmart",
      "HVAC companies bidding on Google Ads against their own organic listings",
    ],
  },
  {
    category: "Digital Intelligence",
    angles: [
      "You have analytics installed but nobody looks at the data",
      "The difference between data collection and data intelligence",
      "Why your monthly reports tell you what happened but not why",
      "Your competitors know more about your customers than you do",
      "The cost of making decisions without data: a real breakdown",
      "Why dashboards without alerts are just pretty wallpaper",
      "Your tech stack costs $15K/month and you use 20% of it",
      "The integration tax: what disconnected systems really cost",
    ],
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Pick a random topic
    const categoryObj = TOPICS[Math.floor(Math.random() * TOPICS.length)];
    const angle =
      categoryObj.angles[
        Math.floor(Math.random() * categoryObj.angles.length)
      ];

    const systemPrompt = `You are a sharp, no-BS business writer for Aetheris Technology — an AI consulting firm that exposes how businesses waste money on bad AI implementations, disconnected marketing, and broken CRM systems.

Your writing style:
- Aggressive, direct, and data-driven
- Use real statistics and cite sources (e.g., "McKinsey", "HubSpot", "Gartner")  
- Include specific dollar amounts and cost breakdowns
- Use tables for comparisons when appropriate (markdown tables)
- Call out specific failures without being mean — be educational
- Every post must make the reader realize they're doing something wrong
- Reference specific AI models by name (GPT, Gemini, Claude) to show expertise
- Include industry-specific examples

Structure every post:
1. A punchy opening that states the problem with a shocking stat
2. Detailed breakdown of what's going wrong (with numbers)
3. Why it happens (common mistakes)
4. What the right approach looks like
5. How Aetheris helps (reference the 14-Day Operational Systems Diagnostic, $5,000-$10,000)
6. End with contact info formatted exactly as:

---

**Ready to stop wasting money?**

📧 [aetheris.technology@outlook.com](mailto:aetheris.technology@outlook.com)
📞 (317) 376-2110
🔗 [Connect on LinkedIn](https://www.linkedin.com/in/aisystemsarchitect)

Posts should be 2,500-3,000 words. Write in markdown format.

CRITICAL: Return valid JSON. Escape all special characters in strings properly. Use \\n for newlines within JSON string values. Do not use literal newlines inside JSON string values. Escape backslashes as \\\\ and quotes as \\".`;

    const userPrompt = `Write a blog post about: "${angle}"

Category: ${categoryObj.category}

Make it specific, data-driven, and hard-hitting. Include real statistics, cost breakdowns with dollar amounts, and industry examples. The reader should feel uncomfortable about how they're currently doing things.

Return ONLY a valid JSON object with these fields:
- title: A provocative, attention-grabbing title (no quotes around it)
- slug: URL-friendly slug (lowercase, hyphens, no special chars)
- excerpt: 1-2 sentence hook that makes people click (under 200 chars)
- content: Full markdown blog post (2500-3000 words). IMPORTANT: Use \\n for newlines, escape all special chars for valid JSON.
- tags: Array of 3-5 relevant tags
- meta_description: SEO meta description under 160 chars
- location_focus: The industry or business area this targets

IMPORTANT: The entire response must be parseable by JSON.parse(). Do not include any text outside the JSON object.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const rawContent = aiResult.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error("No content returned from AI");
    }

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = rawContent;
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let postData;
    try {
      postData = JSON.parse(jsonStr);
    } catch (e1) {
      // Try to extract JSON object directly
      const objMatch = rawContent.match(/\{[\s\S]*\}/);
      if (objMatch) {
        try {
          postData = JSON.parse(objMatch[0]);
        } catch (e2) {
          // Last resort: try to fix common JSON issues
          let fixed = objMatch[0];
          // Fix unescaped control characters
          fixed = fixed.replace(/[\x00-\x1F\x7F]/g, (ch: string) => {
            if (ch === '\n') return '\\n';
            if (ch === '\r') return '\\r';
            if (ch === '\t') return '\\t';
            return '';
          });
          postData = JSON.parse(fixed);
        }
      } else {
        throw new Error("Could not parse AI response as JSON");
      }
    }

    // Check for duplicate slug
    const { data: existing } = await supabase
      .from("blog_posts")
      .select("slug")
      .eq("slug", postData.slug)
      .maybeSingle();

    if (existing) {
      // Append timestamp to make unique
      postData.slug = `${postData.slug}-${Date.now()}`;
    }

    // Insert the blog post
    const { data: insertedPost, error: insertError } = await supabase
      .from("blog_posts")
      .insert({
        title: postData.title,
        slug: postData.slug,
        excerpt: postData.excerpt,
        content: postData.content,
        author: "Aetheris AI Team",
        tags: postData.tags || [],
        meta_description: postData.meta_description,
        location_focus: postData.location_focus,
        is_published: true,
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error(`Failed to insert blog post: ${insertError.message}`);
    }

    console.log("Blog post created:", insertedPost.title);

    return new Response(
      JSON.stringify({
        success: true,
        post: {
          id: insertedPost.id,
          title: insertedPost.title,
          slug: insertedPost.slug,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("generate-blog error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
