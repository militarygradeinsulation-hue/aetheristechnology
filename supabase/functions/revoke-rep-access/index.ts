import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const admin = createClient(url, service);
    const { data: isAdminRow } = await admin.rpc("is_admin", { _user_id: claims.claims.sub });
    if (!isAdminRow) {
      return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: corsHeaders });
    }

    const { code } = await req.json();
    if (!code || typeof code !== "string") {
      return new Response(JSON.stringify({ error: "code required" }), { status: 400, headers: corsHeaders });
    }

    // Find rep
    const { data: rep } = await admin.from("rep_codes").select("id, rep_email").eq("code", code).maybeSingle();

    let auth_deleted = false;
    if (rep?.rep_email) {
      // Find any auth user with this email and delete them
      const { data: usersList } = await admin.auth.admin.listUsers();
      const match = usersList?.users?.find((u) => (u.email || "").toLowerCase() === rep.rep_email!.toLowerCase());
      if (match) {
        const { error: delErr } = await admin.auth.admin.deleteUser(match.id);
        if (!delErr) auth_deleted = true;
      }
    }

    // Delete rep_codes row — ON DELETE CASCADE handles mailbox, notes, library, settings
    const { error: repDelErr } = await admin.from("rep_codes").delete().eq("code", code);
    if (repDelErr) {
      return new Response(JSON.stringify({ error: repDelErr.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ revoked: true, auth_deleted }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});
