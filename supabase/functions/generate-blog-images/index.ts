import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Accept offset/limit for chunked processing
    let offset = 0;
    let limit = 5; // Process 5 at a time (image gen is slow)
    let forceRegenerate = false;
    try {
      const body = await req.json();
      if (body.offset !== undefined) offset = body.offset;
      if (body.limit !== undefined) limit = body.limit;
      if (body.forceRegenerate) forceRegenerate = body.forceRegenerate;
    } catch {}

    // Fetch posts that need images
    let query = supabase
      .from("blog_posts")
      .select("id, title, slug, excerpt, tags")
      .eq("is_published", true)
      .order("published_at", { ascending: false });

    if (!forceRegenerate) {
      query = query.is("featured_image", null);
    }

    const { data: posts, error: fetchError } = await query.range(offset, offset + limit - 1);

    if (fetchError) throw fetchError;

    console.log(`Processing ${posts.length} posts (offset: ${offset}, limit: ${limit})`);

    let generated = 0;
    let errors = 0;

    for (const post of posts) {
      try {
        // Create a unique, descriptive prompt based on the post's actual content
        const tagContext = (post.tags || []).slice(0, 3).join(", ");
        
        const prompt = `Create a professional, cinematic business photography style image for a blog article. 

ARTICLE TITLE: "${post.title}"
ARTICLE SUMMARY: "${post.excerpt?.substring(0, 200)}"
TOPICS: ${tagContext}

Requirements:
- Photorealistic, editorial-quality business/technology image
- Dark moody lighting with amber/gold accent highlights
- Must visually represent the SPECIFIC topic of this article (not generic)
- Include subtle visual metaphors related to the title
- Professional corporate feel, think Harvard Business Review or McKinsey
- No text, no watermarks, no logos in the image
- 16:9 aspect ratio composition
- Rich detail and depth of field
- Color palette: deep blacks, dark blues, warm amber/gold accents`;

        console.log(`Generating image for: ${post.title}`);

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3.1-flash-image-preview",
            messages: [{ role: "user", content: prompt }],
            modalities: ["image", "text"],
          }),
        });

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          console.error(`AI error for ${post.slug}: ${aiResponse.status} ${errText}`);
          errors++;
          // Wait before continuing to avoid rate limits
          await new Promise(r => setTimeout(r, 5000));
          continue;
        }

        const aiData = await aiResponse.json();
        const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (!imageData) {
          console.error(`No image returned for ${post.slug}`);
          errors++;
          continue;
        }

        // Extract base64 data
        const base64Match = imageData.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
        if (!base64Match) {
          console.error(`Invalid image format for ${post.slug}`);
          errors++;
          continue;
        }

        const imageFormat = base64Match[1] === "jpg" ? "jpeg" : base64Match[1];
        const base64Data = base64Match[2];
        const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

        // Upload to storage with unique filename
        const fileName = `${post.slug}.${imageFormat === "jpeg" ? "jpg" : imageFormat}`;
        
        const { error: uploadError } = await supabase.storage
          .from("blog-thumbnails")
          .upload(fileName, imageBytes, {
            contentType: `image/${imageFormat}`,
            upsert: true,
          });

        if (uploadError) {
          console.error(`Upload error for ${post.slug}:`, uploadError);
          errors++;
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("blog-thumbnails")
          .getPublicUrl(fileName);

        // Update the post
        const { error: updateError } = await supabase
          .from("blog_posts")
          .update({ featured_image: urlData.publicUrl })
          .eq("id", post.id);

        if (updateError) {
          console.error(`DB update error for ${post.slug}:`, updateError);
          errors++;
        } else {
          generated++;
          console.log(`✓ Generated image for: ${post.title}`);
        }

        // Rate limit delay between generations
        await new Promise(r => setTimeout(r, 3000));
      } catch (e) {
        console.error(`Error processing ${post.slug}:`, e);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: posts.length, 
        generated, 
        errors, 
        nextOffset: offset + limit,
        remaining: posts.length === limit // if we got a full batch, there are likely more
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Image generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
