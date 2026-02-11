import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, type = "playground" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!prompt) {
      throw new Error("Prompt is required");
    }

    let enhancedPrompt = "";
    
    switch (type) {
      case "playground":
      case "rendering":
        enhancedPrompt = `Create a photorealistic playground rendering: ${prompt}. 
          The image should show a modern, safe playground with appropriate safety surfacing, 
          proper fall zones, accessible equipment, and natural elements. 
          Professional architectural visualization style, bright daylight, inviting atmosphere.
          Ultra high resolution, 16:9 aspect ratio.`;
        break;

      case "interior":
        enhancedPrompt = `Create a photorealistic interior design visualization: ${prompt}. 
          The image should show a beautifully designed interior space with attention to lighting, 
          materials, textures, furniture placement, and spatial flow. 
          Professional interior photography style, natural and artificial lighting.
          Ultra high resolution, 16:9 aspect ratio.`;
        break;

      case "homebuilding":
        enhancedPrompt = `Create a photorealistic home building concept rendering: ${prompt}. 
          The image should show an architectural visualization of a home exterior or construction concept, 
          with attention to materials, landscaping, proportions, and curb appeal. 
          Professional architectural photography style, golden hour lighting.
          Ultra high resolution, 16:9 aspect ratio.`;
        break;
      
      case "signage":
        enhancedPrompt = `Design a professional safety sign: ${prompt}. 
          Clean, modern design with clear iconography. Include relevant safety symbols.
          Professional signage design, high contrast, easy to read, family-friendly style.
          Square format, suitable for printing.`;
        break;
      
      case "marketing":
        enhancedPrompt = `Create a marketing visual for professional services: ${prompt}. 
          Professional, trustworthy, modern design. Suitable for social media or promotional materials.
          16:9 aspect ratio, vibrant colors, professional quality.`;
        break;
      
      default:
        enhancedPrompt = prompt;
    }

    console.log(`Generating ${type} image with prompt:`, enhancedPrompt.substring(0, 100) + "...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: enhancedPrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      console.error("No image in response:", JSON.stringify(data).substring(0, 500));
      throw new Error("No image generated");
    }

    return new Response(
      JSON.stringify({ 
        imageUrl,
        type,
        message: data.choices?.[0]?.message?.content || "Image generated successfully"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating image:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
