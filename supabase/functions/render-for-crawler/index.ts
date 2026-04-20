// Crawler-facing prerender endpoint.
// Returns fully-rendered HTML snapshots of high-priority routes for AI crawlers
// (ChatGPT-User, ClaudeBot, PerplexityBot, GPTBot, Googlebot, Bingbot,
//  LinkedInBot, facebookexternalhit, Twitterbot, Slackbot).
//
// Usage: GET /functions/v1/render-for-crawler?path=/leak-audit
//        GET /functions/v1/render-for-crawler?path=/blog/some-slug
//        GET /functions/v1/render-for-crawler?path=/leak-audit&fresh=1   (force regen)
//
// verify_jwt = false (public endpoint).

import { renderHomepage } from "./templates/homepage.ts";
import { renderBusinessDiagnostic } from "./templates/business-diagnostic.ts";
import { renderAbout } from "./templates/about.ts";
import { renderLeakAudit } from "./templates/leak-audit.ts";
import { renderServices } from "./templates/services.ts";
import { renderBlogPost } from "./templates/blog-post.ts";
import { hashHtml } from "./templates/_shared.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CACHE_TTL_DAYS = 7;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function normalizePath(raw: string): string {
  let p = raw || "/";
  if (!p.startsWith("/")) p = "/" + p;
  // strip trailing slash except for root
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  // strip query/hash if accidentally included
  p = p.split("?")[0].split("#")[0];
  return p;
}

async function readCache(route: string): Promise<{ html: string; etag: string; generated_at: string } | null> {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/prerender_cache?route=eq.${encodeURIComponent(route)}&select=html,etag,generated_at&limit=1`,
    { headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` } }
  );
  if (!r.ok) return null;
  const rows = await r.json();
  return rows[0] || null;
}

async function writeCache(route: string, html: string, etag: string): Promise<void> {
  await fetch(
    `${SUPABASE_URL}/rest/v1/prerender_cache?on_conflict=route`,
    {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({ route, html, etag, generated_at: new Date().toISOString() }),
    }
  );
}

function isFresh(generatedAt: string): boolean {
  const age = Date.now() - new Date(generatedAt).getTime();
  return age < CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
}

async function generate(path: string): Promise<string | null> {
  if (path === "/") return await renderHomepage(SUPABASE_URL, SERVICE_ROLE_KEY);
  if (path === "/business-diagnostic") return await renderBusinessDiagnostic(SUPABASE_URL, SERVICE_ROLE_KEY);
  if (path === "/about") return await renderAbout(SUPABASE_URL, SERVICE_ROLE_KEY);
  if (path === "/leak-audit") return await renderLeakAudit(SUPABASE_URL, SERVICE_ROLE_KEY);
  if (path === "/services") return await renderServices(SUPABASE_URL, SERVICE_ROLE_KEY);
  if (path.startsWith("/blog/")) {
    const slug = path.slice("/blog/".length);
    if (!slug || slug.includes("/")) return null;
    return await renderBlogPost(SUPABASE_URL, SERVICE_ROLE_KEY, slug);
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const rawPath = url.searchParams.get("path") || "/";
    const path = normalizePath(rawPath);
    const forceFresh = url.searchParams.get("fresh") === "1";

    // Try cache
    if (!forceFresh) {
      const cached = await readCache(path);
      if (cached && isFresh(cached.generated_at)) {
        // ETag handling
        const ifNoneMatch = req.headers.get("If-None-Match");
        if (ifNoneMatch && ifNoneMatch === `"${cached.etag}"`) {
          return new Response(null, {
            status: 304,
            headers: { ...corsHeaders, ETag: `"${cached.etag}"` },
          });
        }
        return new Response(cached.html, {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
            ETag: `"${cached.etag}"`,
            "X-Prerender-Cache": "HIT",
            "X-Prerender-Generated-At": cached.generated_at,
          },
        });
      }
    }

    // Generate fresh
    const html = await generate(path);
    if (!html) {
      return new Response(
        `<!DOCTYPE html><html><head><title>Not Found</title></head><body><h1>404 — Not Found</h1><p>No prerender template for path: ${path}</p></body></html>`,
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }

    const etag = await hashHtml(html);
    // Fire-and-forget cache write (don't block response)
    writeCache(path, html, etag).catch((e) => console.error("Cache write failed", path, e));

    return new Response(html, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        ETag: `"${etag}"`,
        "X-Prerender-Cache": "MISS",
        "X-Prerender-Generated-At": new Date().toISOString(),
      },
    });
  } catch (e) {
    console.error("render-for-crawler error", e);
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(
      `<!DOCTYPE html><html><head><title>Error</title></head><body><h1>500 — Render error</h1><pre>${msg}</pre></body></html>`,
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }
});
