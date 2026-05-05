// Mint a real portal token for any rep/partner code. Admin-only.
// Lets the Admin "Company Portal" preview load the actual rep's data.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { signPortalToken } from "../_shared/portal-token.ts";
import { verifyAdminToken } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminTok = req.headers.get("x-admin-token");
    const okAdmin = await verifyAdminToken(adminTok, SERVICE_KEY);
    if (!okAdmin) return json(401, { error: "Admin auth required" });

    const body = await req.json().catch(() => ({}));
    const code = String(body?.code || "").trim();
    if (!/^\d{4,12}$/.test(code)) return json(400, { error: "Invalid code" });

    const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await sb.from("rep_codes")
      .select("code, rep_name, rep_email, commission_rate, total_sales_cents, total_commission_cents, role, is_active")
      .eq("code", code)
      .maybeSingle();
    if (error || !data) return json(404, { error: "Rep not found" });

    const role: "rep" | "partner" = data.role === "partner" ? "partner" : "rep";
    const { token, exp } = await signPortalToken(data.code, role, SERVICE_KEY);

    return json(200, {
      ok: true,
      token,
      exp,
      profile: {
        code: data.code,
        rep_name: data.rep_name,
        rep_email: data.rep_email,
        commission_rate: Number(data.commission_rate),
        total_sales_cents: data.total_sales_cents,
        total_commission_cents: data.total_commission_cents,
        role,
      },
    });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
