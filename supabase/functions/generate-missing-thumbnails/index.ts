import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  "Professional Services": "Modern corporate office with AI collaboration tools, professionals in meeting with digital displays, sleek boardroom setting, professional business photography with cyan accents, 16:9 aspect ratio",
  "Distribution": "Large modern distribution center with AI-powered conveyor systems and robotic sorting, package tracking displays, professional warehouse photography, 16:9 aspect ratio",
  "Small Business": "Modern small business office with AI tools on computer screens, entrepreneur working with digital assistants, warm professional photography, 16:9 aspect ratio"
};

function detectIndustry(title: string, tags: string[] | null): string {
  const text = (title + " " + (tags?.join(" ") || "")).toLowerCase();
  
  if (text.includes("manufacturing")) return "Manufacturing";
  if (text.includes("healthcare") || text.includes("medical")) return "Healthcare";
  if (text.includes("logistics") || text.includes("supply chain")) return "Logistics";
  if (text.includes("construction") || text.includes("building")) return "Construction";
  if (text.includes("automotive")) return "Automotive";
  if (text.includes("restaurant") || text.includes("food")) return "Restaurant";
  if (text.includes("retail") || text.includes("store")) return "Retail";
  if (text.includes("legal") || text.includes("law")) return "Legal";
  if (text.includes("real estate")) return "Real Estate";
  if (text.includes("financial") || text.includes("finance")) return "Financial Services";
  if (text.includes("agriculture") || text.includes("farm")) return "Agriculture";
  if (text.includes("education") || text.includes("school")) return "Education";
  if (text.includes("insurance")) return "Insurance";
  if (text.includes("e-commerce") || text.includes("ecommerce")) return "E-commerce";
  if (text.includes("distribution") || text.includes("warehouse") || text.includes("fulfillment")) return "Distribution";
  if (text.includes("small business")) return "Small Business";
  
  return "Professional Services";
}

async function generateThumbnail(
  industry: string,
  title: string,
  apiKey: string
): Promise<string | null> {
  try {
    const basePrompt = INDUSTRY_IMAGE_PROMPTS[industry] || INDUSTRY_IMAGE_PROMPTS["Professional Services"];
    const prompt = `${basePrompt}. Theme: ${title}. Ultra high resolution, professional business photography.`;

    console.log(`Generating thumbnail for industry: ${industry}`);

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
    const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const imageBytes = decode(base64Content);
    
    const fileName = `${slug}.png`;

    const { error } = await supabase.storage
      .from('blog-thumbnails')
      .upload(fileName, imageBytes, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) {
      console.error("Storage upload error:", error);
      return null;
    }

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

    // Get all posts without featured images
    const { data: posts, error: fetchError } = await supabase
      .from("blog_posts")
      .select("id, slug, title, tags, featured_image")
      .is("featured_image", null)
      .eq("is_published", true);

    if (fetchError) {
      throw new Error(`Failed to fetch posts: ${fetchError.message}`);
    }

    if (!posts || posts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No posts need thumbnails", updated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${posts.length} posts without thumbnails`);

    const results: { slug: string; success: boolean; url?: string }[] = [];

    for (const post of posts) {
      console.log(`Processing: ${post.slug}`);
      
      const industry = detectIndustry(post.title, post.tags);
      const thumbnailBase64 = await generateThumbnail(industry, post.title, LOVABLE_API_KEY);
      
      if (thumbnailBase64) {
        const imageUrl = await uploadThumbnailToStorage(supabase, thumbnailBase64, post.slug);
        
        if (imageUrl) {
          // Update the post with the new featured image
          const { error: updateError } = await supabase
            .from("blog_posts")
            .update({ featured_image: imageUrl })
            .eq("id", post.id);

          if (updateError) {
            console.error(`Failed to update post ${post.slug}:`, updateError);
            results.push({ slug: post.slug, success: false });
          } else {
            console.log(`Updated ${post.slug} with thumbnail: ${imageUrl}`);
            results.push({ slug: post.slug, success: true, url: imageUrl });
          }
        } else {
          results.push({ slug: post.slug, success: false });
        }
      } else {
        results.push({ slug: post.slug, success: false });
      }

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const successCount = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated thumbnails for ${successCount}/${posts.length} posts`,
        updated: successCount,
        results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Generate thumbnails error:", error);
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