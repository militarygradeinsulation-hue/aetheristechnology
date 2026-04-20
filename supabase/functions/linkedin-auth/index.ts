import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = getAdminTokenFromRequest(req);
    const valid = await verifyAdminToken(token, serviceKey);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, code, redirect_uri } = await req.json();
    const clientId = Deno.env.get("LINKEDIN_CLIENT_ID")!;
    const clientSecret = Deno.env.get("LINKEDIN_CLIENT_SECRET")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // --- AUTHORIZE: return the OAuth URL ---
    if (action === "authorize") {
      const scopes = "openid profile w_member_social";
      const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect_uri)}&scope=${encodeURIComponent(scopes)}&state=admin_oauth`;
      return new Response(JSON.stringify({ url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- CALLBACK: exchange code for tokens ---
    if (action === "callback") {
      // Exchange code for access token
      const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.text();
        console.error("LinkedIn token exchange failed:", err);
        return new Response(JSON.stringify({ error: "Token exchange failed", details: err }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token || null;
      const expiresIn = tokenData.expires_in || 5184000; // default 60 days

      // Get user info to find person URN
      const userInfoRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      let personUrn = "";
      if (userInfoRes.ok) {
        const userInfo = await userInfoRes.json();
        personUrn = `urn:li:person:${userInfo.sub}`;
      }

      // Upsert into linkedin_tokens
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
      const { error: dbError } = await supabase
        .from("linkedin_tokens")
        .upsert({
          id: 1,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAt,
          linkedin_person_urn: personUrn,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });

      if (dbError) {
        console.error("DB error storing LinkedIn tokens:", dbError);
        return new Response(JSON.stringify({ error: "Failed to store tokens" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, personUrn }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- STATUS: check if connected ---
    if (action === "status") {
      const { data } = await supabase
        .from("linkedin_tokens")
        .select("linkedin_person_urn, expires_at")
        .eq("id", 1)
        .maybeSingle();

      if (!data || !data.expires_at) {
        return new Response(JSON.stringify({ connected: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const expired = new Date(data.expires_at) < new Date();
      return new Response(JSON.stringify({
        connected: !expired,
        personUrn: data.linkedin_person_urn,
        expiresAt: data.expires_at,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("linkedin-auth error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
