import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://aetheris.technology";

const staticPages = [
  { loc: "/", changefreq: "weekly", priority: "1.0" },
  { loc: "/services", changefreq: "weekly", priority: "0.9" },
  { loc: "/blog", changefreq: "daily", priority: "0.9" },
  { loc: "/resources", changefreq: "weekly", priority: "0.8" },
  { loc: "/about", changefreq: "monthly", priority: "0.8" },
  { loc: "/contact", changefreq: "monthly", priority: "0.8" },
  { loc: "/assessment", changefreq: "monthly", priority: "0.9" },
  { loc: "/scan", changefreq: "weekly", priority: "0.9" },
  { loc: "/solutions", changefreq: "monthly", priority: "0.8" },
  { loc: "/why-us", changefreq: "monthly", priority: "0.7" },
  { loc: "/service-areas", changefreq: "monthly", priority: "0.7" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: posts, error } = await supabase
      .from("blog_posts")
      .select("slug, updated_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false });

    if (error) throw error;

    const urls = staticPages.map(
      (p) => `  <url>
    <loc>${SITE_URL}${p.loc}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
    );

    for (const post of posts || []) {
      const lastmod = post.updated_at ? `\n    <lastmod>${new Date(post.updated_at).toISOString().split("T")[0]}</lastmod>` : "";
      urls.push(`  <url>
    <loc>${SITE_URL}/blog/${post.slug}</loc>${lastmod}
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

    return new Response(xml, {
      headers: { ...corsHeaders, "Content-Type": "application/xml" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(`<error>${message}</error>`, {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/xml" },
    });
  }
});
