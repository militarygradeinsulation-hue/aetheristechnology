import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getLinkedInToken(supabase: any) {
  const { data } = await supabase
    .from("linkedin_tokens")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (!data || !data.access_token) throw new Error("LinkedIn not connected");
  if (new Date(data.expires_at) < new Date()) throw new Error("LinkedIn token expired — reconnect");
  return data;
}

async function postToLinkedIn(accessToken: string, personUrn: string, content: string) {
  const res = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": "202401",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: personUrn,
      commentary: content,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("LinkedIn post failed:", res.status, err);
    throw new Error(`LinkedIn API error ${res.status}: ${err}`);
  }

  // LinkedIn returns the post URN in x-restli-id header
  const postId = res.headers.get("x-restli-id") || "";
  return postId;
}

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const body = await req.json();
    const { action } = body;

    // --- POST a single item from queue ---
    if (action === "post") {
      const { postId } = body;
      if (!postId) {
        return new Response(JSON.stringify({ error: "postId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: queueItem } = await supabase
        .from("linkedin_post_queue")
        .select("*")
        .eq("id", postId)
        .single();

      if (!queueItem) {
        return new Response(JSON.stringify({ error: "Post not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const li = await getLinkedInToken(supabase);
      const linkedinPostId = await postToLinkedIn(li.access_token, li.linkedin_person_urn, queueItem.content);

      await supabase
        .from("linkedin_post_queue")
        .update({
          status: "posted",
          posted_at: new Date().toISOString(),
          linkedin_post_id: linkedinPostId,
        })
        .eq("id", postId);

      return new Response(JSON.stringify({ success: true, linkedinPostId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- QUICK POST: post immediately without queue ---
    if (action === "quick-post") {
      const { content } = body;
      if (!content || typeof content !== "string") {
        return new Response(JSON.stringify({ error: "content required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const li = await getLinkedInToken(supabase);
      const linkedinPostId = await postToLinkedIn(li.access_token, li.linkedin_person_urn, content);

      // Also save to queue for history
      await supabase.from("linkedin_post_queue").insert({
        content,
        status: "posted",
        posted_at: new Date().toISOString(),
        linkedin_post_id: linkedinPostId,
        source_type: "manual",
      });

      return new Response(JSON.stringify({ success: true, linkedinPostId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- PROCESS QUEUE: post all due items ---
    if (action === "process-queue") {
      const li = await getLinkedInToken(supabase);
      const now = new Date().toISOString();

      const { data: dueItems } = await supabase
        .from("linkedin_post_queue")
        .select("*")
        .in("status", ["queued", "approved"])
        .lte("scheduled_for", now)
        .order("scheduled_for")
        .limit(10);

      const results: { id: string; status: string; error?: string }[] = [];

      for (const item of dueItems || []) {
        try {
          const linkedinPostId = await postToLinkedIn(li.access_token, li.linkedin_person_urn, item.content);
          await supabase.from("linkedin_post_queue").update({
            status: "posted",
            posted_at: new Date().toISOString(),
            linkedin_post_id: linkedinPostId,
          }).eq("id", item.id);
          results.push({ id: item.id, status: "posted" });
        } catch (err) {
          results.push({ id: item.id, status: "error", error: err.message });
        }
        // Rate limit: wait 2s between posts
        await new Promise(r => setTimeout(r, 2000));
      }

      return new Response(JSON.stringify({ processed: results.length, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- QUEUE FROM CONTENT: add generated social content to queue ---
    if (action === "queue-from-content") {
      const { posts } = body; // array of { content, format, scheduled_for }
      if (!Array.isArray(posts) || posts.length === 0) {
        return new Response(JSON.stringify({ error: "posts array required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const rows = posts.map((p: any) => ({
        content: p.content,
        format: p.format || null,
        source_type: "generated",
        status: "queued",
        scheduled_for: p.scheduled_for || null,
      }));

      const { error: insertError } = await supabase
        .from("linkedin_post_queue")
        .insert(rows);

      if (insertError) throw insertError;

      return new Response(JSON.stringify({ queued: rows.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("linkedin-post error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
