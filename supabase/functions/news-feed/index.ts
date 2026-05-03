// Aetheris News public feed + admin CRUD.
// Public actions (no auth): list, get, increment_view.
// Admin actions (require x-admin-token): create, update, delete.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SVC);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "list");

    const PUBLIC_ACTIONS = new Set(["list", "get", "increment_view"]);
    let isAdmin = false;
    if (!PUBLIC_ACTIONS.has(action)) {
      const tok = getAdminTokenFromRequest(req);
      isAdmin = await verifyAdminToken(tok, SVC);
      if (!isAdmin) return json(401, { error: "Unauthorized" });
    }

    if (action === "list") {
      const includeDrafts = !!body.include_drafts && isAdmin;
      const limit = Math.min(Number(body.limit) || 50, 200);
      let q = supabase.from("news_posts").select("*").order("published_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).limit(limit);
      if (!includeDrafts) q = q.eq("published", true);
      const { data, error } = await q;
      if (error) throw error;
      return json(200, { posts: data || [] });
    }

    if (action === "admin_list") {
      // explicit admin-only listing including drafts
      const tok = getAdminTokenFromRequest(req);
      const ok = await verifyAdminToken(tok, SVC);
      if (!ok) return json(401, { error: "Unauthorized" });
      const { data, error } = await supabase
        .from("news_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return json(200, { posts: data || [] });
    }

    if (action === "get") {
      const slug = String(body.slug || "");
      if (!slug) return json(400, { error: "slug required" });
      const { data, error } = await supabase
        .from("news_posts")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) return json(404, { error: "Not found" });
      return json(200, { post: data });
    }

    if (action === "increment_view") {
      const slug = String(body.slug || "");
      if (!slug) return json(400, { error: "slug required" });
      const { data: cur } = await supabase.from("news_posts").select("view_count").eq("slug", slug).maybeSingle();
      const next = (cur?.view_count || 0) + 1;
      await supabase.from("news_posts").update({ view_count: next }).eq("slug", slug);
      return json(200, { ok: true });
    }

    if (action === "create") {
      const title = String(body.title || "").trim();
      if (!title) return json(400, { error: "title required" });
      let slug = String(body.slug || "").trim() || slugify(title);
      // Ensure unique
      const { data: exists } = await supabase.from("news_posts").select("id").eq("slug", slug).maybeSingle();
      if (exists) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
      const published = !!body.published;
      const insert = {
        title,
        slug,
        summary: body.summary ? String(body.summary).slice(0, 500) : null,
        body: String(body.body || ""),
        cover_image_url: body.cover_image_url || null,
        category: body.category || null,
        tags: Array.isArray(body.tags) ? body.tags.slice(0, 20).map(String) : [],
        author_name: body.author_name ? String(body.author_name).slice(0, 80) : "Aetheris Operator",
        published,
        published_at: published ? new Date().toISOString() : null,
      };
      const { data, error } = await supabase.from("news_posts").insert(insert).select().single();
      if (error) throw error;
      return json(200, { post: data });
    }

    if (action === "update") {
      const id = String(body.id || "");
      if (!id) return json(400, { error: "id required" });
      const patch: Record<string, unknown> = {};
      const fields = ["title", "slug", "summary", "body", "cover_image_url", "category", "tags", "author_name", "published"];
      for (const f of fields) if (f in body) patch[f] = body[f];
      if ("published" in body) {
        const { data: cur } = await supabase.from("news_posts").select("published_at,published").eq("id", id).maybeSingle();
        if (body.published && !cur?.published_at) patch.published_at = new Date().toISOString();
      }
      const { data, error } = await supabase.from("news_posts").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return json(200, { post: data });
    }

    if (action === "delete") {
      const id = String(body.id || "");
      if (!id) return json(400, { error: "id required" });
      const { error } = await supabase.from("news_posts").delete().eq("id", id);
      if (error) throw error;
      return json(200, { ok: true });
    }

    return json(400, { error: "Unknown action" });
  } catch (e) {
    console.error("news-feed error", e);
    return json(500, { error: (e as Error).message || "Server error" });
  }
});
