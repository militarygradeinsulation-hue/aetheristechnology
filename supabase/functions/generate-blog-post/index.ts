import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

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

// Industry-specific image prompts for thumbnails
const INDUSTRY_IMAGE_PROMPTS: Record<string, string> = {
  "Manufacturing": "Modern manufacturing facility with robotic arms and AI systems, digital displays showing analytics, industrial setting with blue and cyan accent lighting, professional photography, 16:9 aspect ratio",
  "Healthcare": "Modern hospital or medical facility with AI-powered diagnostic screens, doctors using tablets with holographic data displays, clean white and cyan color scheme, professional healthcare photography, 16:9 aspect ratio",
  "Logistics": "Large modern warehouse with automated systems, conveyor belts and robotic sorting, digital tracking displays, professional logistics photography with blue lighting accents, 16:9 aspect ratio",
  "Construction": "Modern construction site with digital tablets showing AI blueprints, workers using smart technology, cranes and building in progress, professional photography with warm and cyan tones, 16:9 aspect ratio",
  "Automotive": "Modern automotive factory with robotic assembly line, AI quality control screens, sleek car production, professional industrial photography with blue accent lighting, 16:9 aspect ratio",
  "Restaurant": "Modern restaurant kitchen with digital order screens, chefs working efficiently with AI-powered systems, warm lighting with tech displays, professional food industry photography, 16:9 aspect ratio",
  "Retail": "Modern retail store with AI-powered checkout systems, digital price displays, customers shopping with smart technology, professional retail photography with bright lighting, 16:9 aspect ratio",
  "Legal": "Modern law office with AI document analysis on screens, professional attorneys using tablets, sophisticated office environment, professional corporate photography with blue tones, 16:9 aspect ratio",
  "Real Estate": "Modern real estate office with AI property analysis displays, virtual home tours on screens, professional agents with tablets, clean office photography with warm accents, 16:9 aspect ratio",
  "Financial Services": "Modern financial office with AI analytics dashboards, traders using multiple screens with data visualization, professional corporate photography with blue and green tones, 16:9 aspect ratio",
  "Agriculture": "Modern farm with AI-powered tractors and drones, digital crop monitoring displays, green fields with technology integration, professional agricultural photography, 16:9 aspect ratio",
  "Education": "Modern classroom or university with AI learning platforms, students using tablets, digital whiteboards with interactive content, professional education photography, 16:9 aspect ratio",
  "Insurance": "Modern insurance office with AI risk analysis dashboards, professional agents using tablets, digital document processing, clean corporate photography with blue accents, 16:9 aspect ratio",
  "E-commerce": "Modern e-commerce fulfillment center with AI inventory systems, package sorting automation, digital tracking displays, professional logistics photography, 16:9 aspect ratio",
  "Professional Services": "Modern corporate office with AI collaboration tools, professionals in meeting with digital displays, sleek boardroom setting, professional business photography with cyan accents, 16:9 aspect ratio"
};

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

async function generateThumbnail(
  industry: string,
  topic: string,
  location: string,
  apiKey: string
): Promise<string | null> {
  try {
    const basePrompt = INDUSTRY_IMAGE_PROMPTS[industry] || INDUSTRY_IMAGE_PROMPTS["Professional Services"];
    const prompt = `${basePrompt}. Theme: ${topic} for ${location} Indiana businesses. Ultra high resolution, professional business photography.`;

    console.log(`Generating thumbnail with prompt: ${prompt.substring(0, 100)}...`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      console.error("Image generation failed:", response.status);
      return null;
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error("No image URL in response");
      return null;
    }

    return imageUrl;
  } catch (error) {
    console.error("Error generating thumbnail:", error);
    return null;
  }
}

async function uploadThumbnailToStorage(
  supabase: any,
  base64Data: string,
  slug: string
): Promise<string | null> {
  try {
    // Extract the base64 content (remove data:image/png;base64, prefix)
    const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const imageBytes = decode(base64Content);
    
    const fileName = `${slug}.png`;

    const { data, error } = await supabase.storage
      .from('blog-thumbnails')
      .upload(fileName, imageBytes, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) {
      console.error("Storage upload error:", error);
      return null;
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('blog-thumbnails')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error("Error uploading thumbnail:", error);
    return null;
  }
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

    // Generate thumbnail for the blog post
    console.log("Generating thumbnail...");
    let featuredImageUrl: string | null = null;
    
    const thumbnailBase64 = await generateThumbnail(industry, topic, location, LOVABLE_API_KEY);
    if (thumbnailBase64) {
      featuredImageUrl = await uploadThumbnailToStorage(supabase, thumbnailBase64, slug);
      console.log(`Thumbnail uploaded: ${featuredImageUrl}`);
    } else {
      console.log("Thumbnail generation failed, proceeding without image");
    }

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
        featured_image: featuredImageUrl,
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
          featured_image: insertedPost.featured_image,
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