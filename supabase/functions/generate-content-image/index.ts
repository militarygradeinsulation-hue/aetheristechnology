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

    const isFree = style === "free";
    const styleKey = isFree ? "free" : ((typeof style === "string" && STYLES[style]) ? style : "editorial_cartoon");

    const imagePrompt = isFree
      ? `${prompt}

COMPOSITION RULES:
  • No celebrities or recognizable real people unless explicitly described.
  • No on-image headlines or paragraphs of text unless explicitly requested.
  • High quality, sharp focus, well-composed.`
      : `PRIMARY SUBJECT (this is THE thing you must render — not a stylistic suggestion, the literal subject of the image):

>>> ${prompt} <<<

The image MUST be a literal visual depiction of the subject above. Do not substitute a generic placeholder. Do not invent an unrelated scene. The subject sentence drives composition; the rendering style below is HOW you depict it, not WHAT you depict.

RENDERING STYLE — depict the subject above using this visual language:
${STYLES[styleKey]}

${BRAND_PALETTE}

COMPOSITION RULES:
  • The subject above is mandatory. If the subject mentions a CRM, render a CRM. If it mentions a pipeline, render a pipeline. If it mentions a dollar figure, stamp it visibly. If it mentions a manila folder, draw a manila folder.
  • No human faces with recognizable features. No real people. No celebrities.
  • No on-image headlines, captions, or paragraphs. Tiny mono labels are OK and encouraged when they reinforce the subject.
  • No logos, no brand marks, no watermarks (we add the Aetheris watermark separately).
  • Premium editorial feel — looks like it was commissioned for The Economist or Bloomberg Businessweek.
  • Aspect ratio square. High contrast. Cinematic.`;

    const callModel = async (model: string, promptText: string) => {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: promptText }],
          modalities: ["image", "text"],
        }),
      });
      return r;
    };

    const FORCE = `\n\nIMPORTANT: Respond by GENERATING THE IMAGE itself. Do not describe it in words. Output the image only.`;

    console.log("Generating image. Style:", styleKey);
    let aiResponse = await callModel("google/gemini-2.5-flash-image", imagePrompt + FORCE);
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

    let aiData = await aiResponse.json();
    let imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    // Fallback: retry on the preview model with the forced instruction
    if (!imageUrl || !imageUrl.startsWith("data:image")) {
      console.warn("First model returned no image; retrying with gemini-3.1-flash-image-preview");
      const retry = await callModel("google/gemini-3.1-flash-image-preview", imagePrompt + FORCE);
      if (retry.ok) {
        aiData = await retry.json();
        imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      }
    }

    if (!imageUrl || !imageUrl.startsWith("data:image")) {
      console.error("No image in response:", JSON.stringify(aiData).slice(0, 500));
      throw new Error("AI did not return an image. Try a more visual prompt (describe the scene, not the message).");
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

    // Best-effort: log to shared admin image library so it shows in the Video Creator's Image Library
    try {
      await supabase.from("admin_image_studio").insert({
        prompt: typeof prompt === "string" ? prompt.slice(0, 2000) : "",
        url: publicUrl,
        storage_path: storagePath,
        source: "generated",
        model: "google/gemini-3.1-flash-image-preview",
        metadata: { from: "generate-content-image", library_item_id: library_item_id ?? null, post_index: post_index ?? null, style: style ?? null },
      });
    } catch (logErr) {
      console.warn("admin_image_studio log failed (non-fatal)", logErr);
    }

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
