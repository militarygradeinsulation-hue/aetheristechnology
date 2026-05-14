import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";
import { getHubSpotAccessToken, HUBSPOT_API_BASE } from "../_shared/hubspot-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function sanitizeHtml(s: string): string {
  // Strip <script> and inline event handlers; HubSpot will further sanitize.
  return s
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "");
}

async function hsFetch(path: string, accessToken: string, init: RequestInit = {}) {
  const res = await fetch(`${HUBSPOT_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body: unknown = text;
  try { body = JSON.parse(text); } catch { /* keep text */ }
  if (!res.ok) {
    throw new Error(`HubSpot ${res.status}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
  }
  return body as any;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const ok = await verifyAdminToken(getAdminTokenFromRequest(req), serviceKey);
    if (!ok) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: account, error } = await admin
      .from("accounts")
      .select("id, hubspot_access_token_encrypted, hubspot_refresh_token_encrypted, hubspot_access_token_expires_at")
      .not("hubspot_access_token_encrypted", "is", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!account) return json({ error: "HubSpot is not connected." }, 400);

    const token = await getHubSpotAccessToken(admin, account);
    const { action, ...rest } = await req.json();

    if (action === "list-blogs") {
      const data = await hsFetch("/cms/v3/blogs/blogs?limit=50", token);
      return json({ blogs: (data.results || []).map((b: any) => ({ id: b.id, name: b.name, slug: b.slug })) });
    }

    if (action === "list-scheduled") {
      const data = await hsFetch("/cms/v3/blogs/posts?state=SCHEDULED&limit=50&sort=publishDate", token);
      return json({ posts: data.results || [] });
    }

    if (action === "schedule-post" || action === "publish-now") {
      const { contentGroupId, name, postBody, metaDescription, publishDate, slug, featuredImage } = rest;
      if (!contentGroupId || !name || !postBody) return json({ error: "contentGroupId, name, postBody required" }, 400);

      const isSchedule = action === "schedule-post";
      const body: Record<string, unknown> = {
        contentGroupId,
        name,
        postBody: sanitizeHtml(postBody),
        metaDescription: metaDescription ?? "",
        slug: slug || undefined,
        featuredImage: featuredImage || undefined,
        state: isSchedule ? "SCHEDULED" : "PUBLISHED",
        useFeaturedImage: !!featuredImage,
      };
      if (isSchedule) {
        if (!publishDate) return json({ error: "publishDate required for schedule-post" }, 400);
        body.publishDate = publishDate;
      } else {
        body.publishImmediately = true;
      }

      const created = await hsFetch("/cms/v3/blogs/posts", token, {
        method: "POST",
        body: JSON.stringify(body),
      });
      return json({ success: true, post: { id: created.id, url: created.url, state: created.state, publishDate: created.publishDate } });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("hubspot-blog-publish error:", e);
    return json({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});
