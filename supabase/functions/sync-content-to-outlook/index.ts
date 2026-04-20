import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/microsoft_outlook";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate admin token
    const adminToken = req.headers.get("x-admin-token");
    if (!adminToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!secret) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");

    // Verify admin token
    const { verifyAdminToken } = await import("../_shared/admin-token.ts");
    const valid = await verifyAdminToken(adminToken, secret);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid admin token" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const OUTLOOK_API_KEY = Deno.env.get("MICROSOFT_OUTLOOK_API_KEY");
    if (!OUTLOOK_API_KEY) throw new Error("MICROSOFT_OUTLOOK_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, secret);

    // Fetch already-synced content IDs
    const { data: syncedRows } = await supabase
      .from("content_sync_log")
      .select("content_type, content_id");

    const syncedSet = new Set(
      (syncedRows || []).map((r: any) => `${r.content_type}:${r.content_id}`)
    );

    // Fetch published blogs not yet synced
    const { data: blogs } = await supabase
      .from("blog_posts")
      .select("id, title, excerpt, content, tags, meta_description, slug")
      .eq("is_published", true);

    // Fetch playbooks not yet synced
    const { data: playbooks } = await supabase
      .from("playbooks")
      .select("id, title, description, file_url, tags, subtitle");

    const results: { type: string; title: string; status: string }[] = [];

    const headers = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": OUTLOOK_API_KEY,
      "Content-Type": "application/json",
    };

    // Sync blogs
    for (const blog of blogs || []) {
      if (syncedSet.has(`blog:${blog.id}`)) continue;

      const growthTag = (blog.tags || []).find((t: string) =>
        ["brandjack", "newsjack", "namejack", "hottake", "authority"].includes(t)
      ) || "authority";

      const body = {
        subject: `[BLOG] ${blog.title}`,
        body: {
          contentType: "HTML",
          content: `
            <div style="font-family:Arial,sans-serif;max-width:700px;">
              <p style="color:#888;font-size:12px;">GROWTH FORMAT: <strong>${growthTag.toUpperCase()}</strong> | CONTENT TYPE: BLOG</p>
              <h1>${blog.title}</h1>
              <p style="color:#666;"><em>${blog.excerpt}</em></p>
              <hr/>
              ${blog.content}
              <hr/>
              <p style="font-size:12px;color:#888;">
                Tags: ${(blog.tags || []).join(", ")}<br/>
                Slug: ${blog.slug}<br/>
                URL: https://aetheris.technology/blog/${blog.slug}
              </p>
            </div>
          `,
        },
        toRecipients: [],
        isDraft: true,
      };

      const resp = await fetch(`${GATEWAY_URL}/me/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const err = await resp.text();
        console.error(`Failed to sync blog ${blog.id}: ${resp.status} ${err}`);
        results.push({ type: "blog", title: blog.title, status: `error: ${resp.status}` });
        continue;
      }

      const draft = await resp.json();

      await supabase.from("content_sync_log").insert({
        content_type: "blog",
        content_id: blog.id,
        outlook_message_id: draft.id,
      });

      results.push({ type: "blog", title: blog.title, status: "synced" });
    }

    // Sync playbooks
    for (const pb of playbooks || []) {
      if (syncedSet.has(`playbook:${pb.id}`)) continue;

      const body = {
        subject: `[PLAYBOOK] ${pb.title}`,
        body: {
          contentType: "HTML",
          content: `
            <div style="font-family:Arial,sans-serif;max-width:700px;">
              <p style="color:#888;font-size:12px;">CONTENT TYPE: PLAYBOOK</p>
              <h1>${pb.title}</h1>
              ${pb.subtitle ? `<h3>${pb.subtitle}</h3>` : ""}
              <p>${pb.description}</p>
              <hr/>
              <p><strong>Download:</strong> <a href="${pb.file_url}">${pb.file_url}</a></p>
              <p style="font-size:12px;color:#888;">Tags: ${(pb.tags || []).join(", ")}</p>
            </div>
          `,
        },
        toRecipients: [],
        isDraft: true,
      };

      const resp = await fetch(`${GATEWAY_URL}/me/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const err = await resp.text();
        console.error(`Failed to sync playbook ${pb.id}: ${resp.status} ${err}`);
        results.push({ type: "playbook", title: pb.title, status: `error: ${resp.status}` });
        continue;
      }

      const draft = await resp.json();

      await supabase.from("content_sync_log").insert({
        content_type: "playbook",
        content_id: pb.id,
        outlook_message_id: draft.id,
      });

      results.push({ type: "playbook", title: pb.title, status: "synced" });
    }

    const synced = results.filter((r) => r.status === "synced").length;
    const errors = results.filter((r) => r.status.startsWith("error")).length;

    return new Response(
      JSON.stringify({
        message: `Synced ${synced} items to Outlook drafts. ${errors} errors.`,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("sync-content-to-outlook error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
