import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const token = getAdminTokenFromRequest(req);
    const ok = await verifyAdminToken(token, SUPABASE_SERVICE_ROLE_KEY);
    if (!ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prompt, library_item_id, post_index, style } = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: "prompt required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Aetheris brand palette — locked across every style.
    // Charcoal background, amber primary, crimson reserved for leak signal only.
    const BRAND_PALETTE = `STRICT BRAND PALETTE — do not deviate:
  • Background: deep charcoal #0E0E10 to #1A1A1D (never pure black, never white)
  • Primary accent: amber/gold #D4A24C with subtle warm glow
  • Secondary: bone #E8E2D5 and graphite #2A2A2E
  • Crimson #B23A3A used ONLY for "leak" signals — a single dripping line, a redacted bar, a stamp. Never as the dominant color.
  • Mono micro-labels (if any visual text): JetBrains Mono feel, uppercase, tiny, amber on charcoal
  • Serif headlines (if any visual text): Fraunces feel, condensed, bone-colored
  • NO bright blues, no neon, no rainbow gradients, no pastel, no corporate stock-photo look`;

    const STYLES: Record<string, string> = {
      case_file: `Forensic CASE FILE document mockup. Manila folder texture aged to charcoal, "CASE #" stamp in amber JetBrains Mono, redaction bars, paperclip shadow, a single crimson signature line bleeding at the bottom edge. Flat-lay overhead view. Cinematic shadow.`,
      autopsy_diagram: `Anatomical/forensic autopsy diagram of a business process. Bone-white linework on charcoal, amber annotation arrows pointing to "leak points" with mono labels. One specific leak point dripping crimson. Style of a vintage medical chart crossed with a sales-ops flowchart.`,
      blueprint: `Architectural blueprint of a CRM pipeline. Dark charcoal paper, amber gridlines and measurement marks, isometric pipeline stages drawn in thin bone lines. One stage outlined in crimson with a dashed "BREACH" callout in mono.`,
      editorial_cartoon: `Editorial newspaper-cartoon illustration. Bold ink crosshatching, exaggerated character proportions, charcoal/bone palette with amber spot color. A single small crimson element acts as the focal "leak". Op-ed feel — never cute, never whimsical.`,
      data_macro: `Extreme macro photography aesthetic of data on a screen. Dark CRT glow, amber monospaced terminal text on charcoal, one row highlighted with a thin crimson underline. Shallow depth of field, film grain, subtle scan lines.`,
      noir_object: `Moody noir still-life. Single business object (filing cabinet, ledger, magnifying glass, broken pipeline gauge) on charcoal surface under a hard amber side-light. Long shadow. A trickle of crimson liquid pooling near the base. Cinematic, restrained.`,
      isometric: `Clean isometric vector illustration. Charcoal background, amber and bone geometric shapes representing the business system. One node rendered in crimson with a subtle "leak" emission. Flat shading, sharp edges, generous negative space.`,
    };

    const styleKey = (typeof style === "string" && STYLES[style]) ? style : "editorial_cartoon";
    const styleDirective = STYLES[styleKey];

    const imagePrompt = `${styleDirective}

${BRAND_PALETTE}

COMPOSITION RULES:
  • Subject of the piece: ${prompt}
  • No human faces with recognizable features. No real people. No celebrities.
  • No on-image headlines, captions, or paragraphs. Tiny mono labels are OK.
  • No logos, no brand marks, no watermarks (we add the Aetheris watermark separately).
  • Premium editorial feel — looks like it was commissioned for The Economist or Bloomberg Businessweek.
  • Aspect ratio square. High contrast. Cinematic.`;

    console.log("Generating image. Style:", styleKey, "Prompt:", imagePrompt.slice(0, 200));

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [{ role: "user", content: imagePrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const text = await aiResponse.text();
      console.error("AI gateway error:", status, text);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl || !imageUrl.startsWith("data:image")) {
      console.error("No image in response:", JSON.stringify(aiData).slice(0, 500));
      throw new Error("AI did not return an image");
    }

    // Extract base64 data and upload to storage
    const base64Match = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) throw new Error("Invalid base64 image format");

    const ext = base64Match[1] === "jpeg" ? "jpg" : base64Match[1];
    const base64Data = base64Match[2];
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const fileName = `${crypto.randomUUID()}.${ext}`;
    const storagePath = library_item_id
      ? `library/${library_item_id}/${post_index ?? 0}_${fileName}`
      : `standalone/${fileName}`;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error: uploadError } = await supabase.storage
      .from("content-images")
      .upload(storagePath, binaryData, {
        contentType: `image/${ext === "jpg" ? "jpeg" : ext}`,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from("content-images")
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;
    console.log("Image uploaded:", publicUrl);

    return new Response(JSON.stringify({ image_url: publicUrl, storage_path: storagePath }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-content-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
