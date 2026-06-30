// Aetheris Nexus — streaming image generation (passthrough to AI Gateway).
// Client applies the Aetheris watermark client-side via canvas overlay.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("POST only", { status: 405, headers: corsHeaders });
  if (!LOVABLE_API_KEY) return new Response("Missing LOVABLE_API_KEY", { status: 500, headers: corsHeaders });

  const { prompt, model } = await req.json().catch(() => ({}));
  if (!prompt) return new Response(JSON.stringify({ error: "prompt required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const chosen = model || "openai/gpt-image-2";
  const isGemini = chosen.startsWith("google/");

  const body = isGemini
    ? {
        model: chosen,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
        stream: true,
      }
    : {
        model: chosen,
        prompt,
        size: "1024x1024",
        quality: "low",
        n: 1,
        stream: true,
        partial_images: 1,
      };

  const upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!upstream.ok || !upstream.body) {
    const txt = await upstream.text();
    return new Response(JSON.stringify({ error: `Gateway ${upstream.status}: ${txt}` }), {
      status: upstream.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(upstream.body, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
});
