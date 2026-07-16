import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyAdminToken } from "../_shared/admin-token.ts";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-portal-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminTok = req.headers.get("x-admin-token");
    const okAdmin = await verifyAdminToken(adminTok, service);
    if (!okAdmin) {
      const portalTok = getPortalTokenFromRequest(req);
      const portal = await verifyPortalToken(portalTok, service);
      if (!portal || portal.role !== "partner") {
        return json(401, { error: "Admin or partner auth required" });
      }
    }

    const { code } = await req.json().catch(() => ({}));
    if (!code || typeof code !== "string") {
      return json(400, { error: "code required" });
    }

    const admin = createClient(url, service, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Find rep
    const { data: rep } = await admin
      .from("rep_codes")
      .select("id, rep_email")
      .eq("code", code)
      .maybeSingle();

    let auth_deleted = false;
    if (rep?.rep_email) {
      const { data: usersList } = await admin.auth.admin.listUsers();
      const match = usersList?.users?.find(
        (u) => (u.email || "").toLowerCase() === rep.rep_email!.toLowerCase(),
      );
      if (match) {
        const { error: delErr } = await admin.auth.admin.deleteUser(match.id);
        if (!delErr) auth_deleted = true;
      }
    }

    // Delete rep_codes row — ON DELETE CASCADE handles mailbox, notes, library, settings
    const { error: repDelErr } = await admin.from("rep_codes").delete().eq("code", code);
    if (repDelErr) return json(500, { error: repDelErr.message });

    return json(200, { revoked: true, auth_deleted });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
