// Personal Content Engine token minter.
// Trades a shared personal key (in URL) for a short-lived admin token,
// so Joseph can use the Content Engine on mobile without logging in.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PERSONAL_ENGINE_KEY = Deno.env.get("PERSONAL_ENGINE_KEY");
const ADMIN_PIN = Deno.env.get("ADMIN_PIN");
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

async function signToken(exp: number, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${ADMIN_PIN}.${exp}`));
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${exp}.${hex}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!PERSONAL_ENGINE_KEY || !ADMIN_PIN) {
      return new Response(JSON.stringify({ error: "Not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const { key } = await req.json().catch(() => ({}));
    if (typeof key !== "string" || key.length < 20) {
      return new Response(JSON.stringify({ error: "invalid" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // constant-time compare
    const a = new TextEncoder().encode(key);
    const b = new TextEncoder().encode(PERSONAL_ENGINE_KEY);
    let ok = a.length === b.length;
    const len = Math.max(a.length, b.length);
    let diff = a.length ^ b.length;
    for (let i = 0; i < len; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
    ok = ok && diff === 0;
    if (!ok) {
      return new Response(JSON.stringify({ error: "invalid" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const exp = Date.now() + TOKEN_TTL_MS;
    const token = await signToken(exp, SERVICE);
    return new Response(JSON.stringify({ ok: true, token, exp }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "err" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
