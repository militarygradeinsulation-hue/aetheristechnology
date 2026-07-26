import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MAX_LEN = 280;

async function getXAccessToken(supabase: any): Promise<string> {
  const { data } = await supabase.from("x_tokens").select("*").eq("id", 1).maybeSingle();
  if (!data || !data.access_token) throw new Error("X is not connected");

  const expired = new Date(data.expires_at) < new Date();
  if (!expired) return data.access_token;

  if (!data.refresh_token) throw new Error("X token expired — reconnect");

  const clientId = Deno.env.get("X_CLIENT_ID")!;
  const clientSecret = Deno.env.get("X_CLIENT_SECRET");
  const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
  if (clientSecret) headers["Authorization"] = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;

  const res = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers,
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: data.refresh_token,
      client_id: clientId,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("X token refresh failed:", err);
    throw new Error("X token refresh failed — reconnect");
  }
  const refreshed = await res.json();
  const newExpiresAt = new Date(Date.now() + (refreshed.expires_in || 7200) * 1000).toISOString();
  await supabase.from("x_tokens").update({
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token || data.refresh_token,
    expires_at: newExpiresAt,
    updated_at: new Date().toISOString(),
  }).eq("id", 1);
  return refreshed.access_token;
}

async function postTweet(accessToken: string, text: string): Promise<string> {
  const res = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("X post failed:", res.status, err);
    throw new Error(`X API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data?.data?.id || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const ok = await verifyAdminToken(getAdminTokenFromRequest(req), serviceKey);
    if (!ok) return json({ error: "Unauthorized" }, 401);
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { action } = body;

    if (action === "quick-post") {
      const { content } = body;
      if (!content || typeof content !== "string") return json({ error: "content required" }, 400);
      if (content.length > MAX_LEN) return json({ error: `Tweet exceeds ${MAX_LEN} characters` }, 400);

      const accessToken = await getXAccessToken(admin);
      const xPostId = await postTweet(accessToken, content);

      await admin.from("x_post_queue").insert({
        content,
        status: "posted",
        posted_at: new Date().toISOString(),
        x_post_id: xPostId,
        source_type: "manual",
      });

      return json({ success: true, xPostId });
    }

    if (action === "post") {
      const { postId } = body;
      if (!postId) return json({ error: "postId required" }, 400);

      const { data: item } = await admin.from("x_post_queue").select("*").eq("id", postId).single();
      if (!item) return json({ error: "Post not found" }, 404);

      const accessToken = await getXAccessToken(admin);
      const xPostId = await postTweet(accessToken, item.content);

      await admin.from("x_post_queue").update({
        status: "posted",
        posted_at: new Date().toISOString(),
        x_post_id: xPostId,
      }).eq("id", postId);

      return json({ success: true, xPostId });
    }

    if (action === "process-queue") {
      const accessToken = await getXAccessToken(admin);
      const now = new Date().toISOString();

      const { data: dueItems } = await admin
        .from("x_post_queue")
        .select("*")
        .in("status", ["queued", "approved"])
        .lte("scheduled_for", now)
        .order("scheduled_for")
        .limit(10);

      const results: { id: string; status: string; error?: string }[] = [];
      for (const item of dueItems || []) {
        try {
          const xPostId = await postTweet(accessToken, item.content);
          await admin.from("x_post_queue").update({
            status: "posted",
            posted_at: new Date().toISOString(),
            x_post_id: xPostId,
          }).eq("id", item.id);
          results.push({ id: item.id, status: "posted" });
        } catch (err) {
          results.push({ id: item.id, status: "error", error: err instanceof Error ? err.message : "Unknown error" });
        }
        await new Promise((r) => setTimeout(r, 2000));
      }

      return json({ processed: results.length, results });
    }

    if (action === "queue-from-content") {
      const { posts } = body;
      if (!Array.isArray(posts) || posts.length === 0) return json({ error: "posts array required" }, 400);

      const rows = posts.map((p: any) => ({
        content: p.content,
        source_type: "generated",
        status: "queued",
        scheduled_for: p.scheduled_for || null,
      }));

      const { error: insertError } = await admin.from("x_post_queue").insert(rows);
      if (insertError) throw insertError;

      return json({ queued: rows.length });
    }

    if (action === "list") {
      const { data, error } = await admin
        .from("x_post_queue")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return json({ posts: data || [] });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("x-post error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return json({ error: message }, 500);
  }
});
