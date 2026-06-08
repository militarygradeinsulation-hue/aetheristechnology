import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(7).max(40),
});

function generateCode(): string {
  // 8-char base36, uppercase, no ambiguous chars
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => alphabet[b % alphabet.length]).join("");
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "invalid_input", details: parsed.error.flatten().fieldErrors }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { name, email, phone } = parsed.data;
  const emailLc = email.toLowerCase();

  // Reuse existing code if this email is already on file
  const { data: existing } = await supabase
    .from("access_codes")
    .select("code")
    .ilike("email", emailLc)
    .maybeSingle();

  if (existing?.code) {
    await supabase
      .from("access_codes")
      .update({ name, phone, last_used_at: new Date().toISOString() })
      .eq("code", existing.code);
    return new Response(JSON.stringify({ code: existing.code, returning: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Generate a unique code (very low collision odds, but retry just in case)
  let code = generateCode();
  for (let i = 0; i < 5; i++) {
    const { data: clash } = await supabase
      .from("access_codes")
      .select("code")
      .eq("code", code)
      .maybeSingle();
    if (!clash) break;
    code = generateCode();
  }

  const { error: insertErr } = await supabase
    .from("access_codes")
    .insert({ code, name, email: emailLc, phone });

  if (insertErr) {
    console.error("access_codes insert failed", insertErr);
    return new Response(JSON.stringify({ error: "insert_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ code, returning: false }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
