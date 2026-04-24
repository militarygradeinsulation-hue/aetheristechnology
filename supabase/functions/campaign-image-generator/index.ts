import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabaseAuth.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: claims.claims.sub });
    if (isAdmin !== true) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const { prompt, name } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "prompt required" }), { status: 400, headers: corsHeaders });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: `${prompt}. Add small "Aetheris AI Studio" watermark in the bottom-right corner.` }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      return new Response(JSON.stringify({ error: `AI error: ${txt}` }), { status: 502, headers: corsHeaders });
    }
    const aiData = await aiRes.json();
    const dataUrl: string | undefined = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!dataUrl?.startsWith("data:image/")) {
      return new Response(JSON.stringify({ error: "No image returned" }), { status: 502, headers: corsHeaders });
    }

    const base64 = dataUrl.split(",")[1];
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const fileName = `campaign-images/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.png`;
    const { error: upErr } = await admin.storage.from("playbooks").upload(fileName, bytes, { contentType: "image/png", upsert: false });
    if (upErr) throw upErr;
    const { data: pub } = admin.storage.from("playbooks").getPublicUrl(fileName);
    const publicUrl = pub.publicUrl;

    const { data: asset, error: insErr } = await admin.from("campaign_assets").insert({
      type: "image",
      name: name || prompt.slice(0, 60),
      url: publicUrl,
      metadata: { prompt },
    }).select().single();
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ok: true, asset }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("campaign-image-generator error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: corsHeaders });
  }
});
