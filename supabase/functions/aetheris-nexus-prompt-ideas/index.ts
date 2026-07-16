// Aetheris Nexus — image prompt brainstorm.
// Takes a user's rough image idea and returns 4 refined, distinct prompt variants.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("POST only", { status: 405, headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
  if (claimsErr || !claims?.claims?.sub) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { prompt } = await req.json().catch(() => ({}));
  if (!prompt || typeof prompt !== "string") {
    return new Response(JSON.stringify({ error: "prompt required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const system = `You are an expert image-prompt art director for the Aetheris AI Studio.
The user gives you a rough image idea. Return exactly 4 distinct, richly-detailed prompt variants that a text-to-image model can render.
Each variant should take a different angle: (1) cinematic photo-realistic, (2) editorial illustration / graphic, (3) close-up macro or product-shot, (4) a bold conceptual / metaphorical take.
Every prompt: one sentence, 20-45 words, includes subject, style, lighting, composition, mood. No numbering, no quotes, no preamble.
Return ONLY strict JSON in the shape: {"prompts":["...","...","...","..."]}`;

  const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!upstream.ok) {
    const txt = await upstream.text();
    return new Response(JSON.stringify({ error: `Gateway ${upstream.status}: ${txt}` }), {
      status: upstream.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const data = await upstream.json();
  const raw = data?.choices?.[0]?.message?.content ?? "{}";
  let prompts: string[] = [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed?.prompts)) prompts = parsed.prompts.filter((p: unknown) => typeof p === "string").slice(0, 4);
  } catch { /* ignore */ }

  return new Response(JSON.stringify({ prompts }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
