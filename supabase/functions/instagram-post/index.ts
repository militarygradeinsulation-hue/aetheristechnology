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

async function getInstagramAccount(supabase: any) {
  const { data } = await supabase.from("facebook_tokens").select("*").eq("id", 1).maybeSingle();
  if (!data || !data.page_access_token) throw new Error("Facebook Page is not connected");
  if (!data.ig_user_id) throw new Error("No Instagram Business account is linked to the connected Facebook Page");
  return data;
}

// Instagram Graph API publishing is a two-step "media container" flow: create
// a container from an image URL, then publish it once IG has fetched the image.
async function publishImage(igUserId: string, accessToken: string, imageUrl: string, caption: string): Promise<string> {
  const createRes = await fetch(`${GRAPH}/${igUserId}/media?access_token=${encodeURIComponent(accessToken)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ image_url: imageUrl, caption }),
  });
  if (!createRes.ok) {
    const err = await createRes.text();
    console.error("Instagram media create failed:", createRes.status, err);
    throw new Error(`Instagram API error ${createRes.status}: ${err}`);
  }
  const created = await createRes.json();
  const creationId = created?.id;
  if (!creationId) throw new Error("Instagram did not return a media container id");

  const publishRes = await fetch(`${GRAPH}/${igUserId}/media_publish?access_token=${encodeURIComponent(accessToken)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ creation_id: creationId }),
  });
  if (!publishRes.ok) {
    const err = await publishRes.text();
    console.error("Instagram publish failed:", publishRes.status, err);
    throw new Error(`Instagram API error ${publishRes.status}: ${err}`);
  }
  const published = await publishRes.json();
  return published?.id || "";
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
      const { caption = "", mediaUrl } = body;
      if (!mediaUrl || typeof mediaUrl !== "string") {
        return json({ error: "mediaUrl required — Instagram's API can't publish text-only posts" }, 400);
      }

      const ig = await getInstagramAccount(admin);
      const postId = await publishImage(ig.ig_user_id, ig.page_access_token, mediaUrl, caption);

      await admin.from("instagram_post_queue").insert({
        caption,
        media_url: mediaUrl,
        media_type: "IMAGE",
        status: "posted",
        posted_at: new Date().toISOString(),
        instagram_post_id: postId,
        source_type: "manual",
      });

      return json({ success: true, instagramPostId: postId });
    }

    if (action === "post") {
      const { postId: queueId } = body;
      if (!queueId) return json({ error: "postId required" }, 400);

      const { data: item } = await admin.from("instagram_post_queue").select("*").eq("id", queueId).single();
      if (!item) return json({ error: "Post not found" }, 404);

      const ig = await getInstagramAccount(admin);
      const postId = await publishImage(ig.ig_user_id, ig.page_access_token, item.media_url, item.caption || "");

      await admin.from("instagram_post_queue").update({
        status: "posted",
        posted_at: new Date().toISOString(),
        instagram_post_id: postId,
      }).eq("id", queueId);

      return json({ success: true, instagramPostId: postId });
    }

    if (action === "process-queue") {
      const ig = await getInstagramAccount(admin);
      const now = new Date().toISOString();

      const { data: dueItems } = await admin
        .from("instagram_post_queue")
        .select("*")
        .in("status", ["queued", "approved"])
        .lte("scheduled_for", now)
        .order("scheduled_for")
        .limit(10);

      const results: { id: string; status: string; error?: string }[] = [];
      for (const item of dueItems || []) {
        try {
          const postId = await publishImage(ig.ig_user_id, ig.page_access_token, item.media_url, item.caption || "");
          await admin.from("instagram_post_queue").update({
            status: "posted",
            posted_at: new Date().toISOString(),
            instagram_post_id: postId,
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
        caption: p.caption || p.content || "",
        media_url: p.mediaUrl,
        media_type: "IMAGE",
        source_type: "generated",
        status: "queued",
        scheduled_for: p.scheduled_for || null,
      }));
      if (rows.some((r) => !r.media_url)) return json({ error: "Every post needs a mediaUrl" }, 400);

      const { error: insertError } = await admin.from("instagram_post_queue").insert(rows);
      if (insertError) throw insertError;

      return json({ queued: rows.length });
    }

    if (action === "list") {
      const { data, error } = await admin
        .from("instagram_post_queue")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return json({ posts: data || [] });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("instagram-post error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return json({ error: message }, 500);
  }
});
