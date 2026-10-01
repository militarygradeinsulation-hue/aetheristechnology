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

const GRAPH = "https://graph.facebook.com/v20.0";

async function getFacebookPage(supabase: any) {
  const { data } = await supabase.from("facebook_tokens").select("*").eq("id", 1).maybeSingle();
  if (!data || !data.page_access_token) throw new Error("Facebook Page is not connected");
  return data;
}

async function postToPage(pageId: string, accessToken: string, message: string): Promise<string> {
  const res = await fetch(`${GRAPH}/${pageId}/feed?access_token=${encodeURIComponent(accessToken)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ message }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("Facebook post failed:", res.status, err);
    throw new Error(`Facebook API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data?.id || "";
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

      const page = await getFacebookPage(admin);
      const postId = await postToPage(page.page_id, page.page_access_token, content);

      await admin.from("facebook_post_queue").insert({
        content,
        status: "posted",
        posted_at: new Date().toISOString(),
        facebook_post_id: postId,
        source_type: "manual",
      });

      return json({ success: true, facebookPostId: postId });
    }

    if (action === "post") {
      const { postId: queueId } = body;
      if (!queueId) return json({ error: "postId required" }, 400);

      const { data: item } = await admin.from("facebook_post_queue").select("*").eq("id", queueId).single();
      if (!item) return json({ error: "Post not found" }, 404);

      const page = await getFacebookPage(admin);
      const postId = await postToPage(page.page_id, page.page_access_token, item.content);

      await admin.from("facebook_post_queue").update({
        status: "posted",
        posted_at: new Date().toISOString(),
        facebook_post_id: postId,
      }).eq("id", queueId);

      return json({ success: true, facebookPostId: postId });
    }

    if (action === "process-queue") {
      const page = await getFacebookPage(admin);
      const now = new Date().toISOString();

      const { data: dueItems } = await admin
        .from("facebook_post_queue")
        .select("*")
        .in("status", ["queued", "approved"])
        .lte("scheduled_for", now)
        .order("scheduled_for")
        .limit(10);

      const results: { id: string; status: string; error?: string }[] = [];
      for (const item of dueItems || []) {
        try {
          const postId = await postToPage(page.page_id, page.page_access_token, item.content);
          await admin.from("facebook_post_queue").update({
            status: "posted",
            posted_at: new Date().toISOString(),
            facebook_post_id: postId,
          }).eq("id", item.id);
          results.push({ id: item.id, status: "posted" });
        } catch (err) {
          results.push({ id: item.id, status: "error", error: err instanceof Error ? err.message : "Unknown error" });
        }
        await new Promise((r) => setTimeout(r, 1500));
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

      const { error: insertError } = await admin.from("facebook_post_queue").insert(rows);
      if (insertError) throw insertError;

      return json({ queued: rows.length });
    }

    if (action === "list") {
      const { data, error } = await admin
        .from("facebook_post_queue")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return json({ posts: data || [] });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("facebook-post error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return json({ error: message }, 500);
  }
});
