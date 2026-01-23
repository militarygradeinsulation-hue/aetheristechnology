import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Indiana cities and industries for varied content
const INDIANA_LOCATIONS = [
  "Indianapolis", "Fort Wayne", "Carmel", "Fishers", "Bloomington",
  "Evansville", "South Bend", "Lafayette", "Noblesville", "Greenwood",
  "Muncie", "Terre Haute", "Kokomo", "Anderson", "Elkhart"
];

const INDUSTRIES = [
  "Manufacturing", "Healthcare", "Logistics", "Construction", "Automotive",
  "Restaurant", "Retail", "Legal", "Real Estate", "Financial Services",
  "Agriculture", "Education", "Insurance", "E-commerce", "Professional Services"
];

const TOPICS = [
  "AI automation strategies",
  "machine learning implementation",
  "chatbot development",
  "workflow automation",
  "predictive analytics",
  "customer service AI",
  "inventory management with AI",
  "AI-powered marketing",
  "document processing automation",
  "voice AI solutions",
  "AI cost reduction strategies",
  "digital transformation",
  "AI employee training",
  "data-driven decision making",
  "AI security best practices",
  "competitive advantages with AI",
  "ROI of AI implementation",
  "AI integration challenges",
  "future of AI in business",
  "AI case studies"
];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 60);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Select random elements for variety
    const location = getRandomElement(INDIANA_LOCATIONS);
    const industry = getRandomElement(INDUSTRIES);
    const topic = getRandomElement(TOPICS);
    const today = new Date().toISOString().split('T')[0];

    console.log(`Generating blog post for ${industry} in ${location} about ${topic}`);

    // Generate the blog post using Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert AI content writer for Aetheris Technology, an AI automation company serving Indiana businesses. 
            
Your task is to create SEO-optimized blog posts that:
- Target local Indiana businesses and keywords
- Include actionable insights about AI and automation
- Use engaging, professional language
- Include relevant statistics and examples
- Are optimized for Google search with natural keyword placement

Always respond with valid JSON in this exact format:
{
  "title": "SEO-optimized title (60 chars max)",
  "excerpt": "Compelling excerpt that summarizes the post (150-200 chars)",
  "meta_description": "SEO meta description with keywords (155 chars max)",
  "content": "Full blog post content in markdown format (2000-2500 words)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`
          },
          {
            role: "user",
            content: `Create a unique, engaging blog post about "${topic}" specifically for ${industry} businesses in ${location}, Indiana.

Include these SEO elements:
- Primary keyword: "${topic} ${location} Indiana"
- Secondary keywords: "AI automation Indiana", "business automation ${location}", "${industry} AI solutions"
- Local references to ${location} and Indiana business landscape
- Practical tips and implementation strategies
- A compelling call-to-action for Aetheris Technology services

Make the content fresh, informative, and valuable for business owners looking to implement AI solutions. Include specific examples relevant to the ${industry} industry.`
          }
        ],
        temperature: 0.8,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content received from AI");
    }

    // Parse the JSON response
    let blogData;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                       content.match(/```\s*([\s\S]*?)\s*```/) ||
                       [null, content];
      const jsonStr = jsonMatch[1] || content;
      blogData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse blog content from AI");
    }

    // Generate unique slug with date
    const baseSlug = generateSlug(blogData.title);
    const slug = `${baseSlug}-${today}`;

    // Insert the blog post into the database
    const { data: insertedPost, error: insertError } = await supabase
      .from("blog_posts")
      .insert({
        title: blogData.title,
        slug: slug,
        excerpt: blogData.excerpt,
        content: blogData.content,
        meta_description: blogData.meta_description,
        tags: blogData.tags,
        location_focus: `${location}, IN`,
        author: "Aetheris AI Team",
        is_published: true,
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      throw new Error(`Failed to insert blog post: ${insertError.message}`);
    }

    console.log(`Successfully created blog post: ${insertedPost.title}`);

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
    console.error("Generate blog post error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
