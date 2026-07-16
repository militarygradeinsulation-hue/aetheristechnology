// Aetheris extension — push fixes live to the user's website CMS.
// Supports: WordPress (REST API + application password). Webflow/Shopify intentionally
// return a clear "manual export" payload because their auth flows are token-only.
//
// Security model: the user pastes their own site URL + WP username + application password
// (NOT their main password). We never persist credentials — they live only in the request.
// Every call is gated by a rep_codes / claim_codes access code.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function validateAccess(code: string): Promise<boolean> {
  if (!code || code.length < 3) return false;
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(url, key);
  const { data: rep } = await sb.from("rep_codes").select("is_active").eq("code", code).maybeSingle();
  if (rep?.is_active) return true;
  const { data: claim } = await sb.from("claim_codes").select("code").eq("code", code).maybeSingle();
  return !!claim;
}

function basicAuth(user: string, pass: string) {
  return "Basic " + btoa(`${user}:${pass}`);
}

async function wpDetectPostByUrl(siteUrl: string, pageUrl: string, auth: string): Promise<{ id: number; type: string; title: string; content: string } | null> {
  // Use WP REST search to find the post by URL slug.
  const slug = (() => {
    try {
      const p = new URL(pageUrl).pathname.replace(/^\/+|\/+$/g, "").split("/").pop() || "";
      return p;
    } catch { return ""; }
  })();
  if (!slug) {
    // Front page fallback
    const r = await fetch(`${siteUrl.replace(/\/+$/, "")}/wp-json/wp/v2/pages?per_page=1&orderby=date&order=asc`, { headers: { Authorization: auth } });
    if (!r.ok) return null;
    const arr = await r.json();
    const p = arr?.[0]; if (!p) return null;
    return { id: p.id, type: "pages", title: p.title?.rendered || "", content: p.content?.rendered || "" };
  }
  for (const type of ["pages", "posts"] as const) {
    const r = await fetch(`${siteUrl.replace(/\/+$/, "")}/wp-json/wp/v2/${type}?slug=${encodeURIComponent(slug)}`, { headers: { Authorization: auth } });
    if (!r.ok) continue;
    const arr = await r.json();
    if (Array.isArray(arr) && arr[0]) return { id: arr[0].id, type, title: arr[0].title?.rendered || "", content: arr[0].content?.rendered || "" };
  }
  return null;
}

function applyTextPatches(html: string, patches: Array<{ find: string; replace: string }>): { html: string; applied: number; missed: string[] } {
  let out = html; let applied = 0; const missed: string[] = [];
  for (const p of patches) {
    if (!p?.find) continue;
    if (out.includes(p.find)) { out = out.split(p.find).join(p.replace ?? ""); applied++; }
    else missed.push(p.find.slice(0, 80));
  }
  return { html: out, applied, missed };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const accessCode = String(body?.accessCode || "").trim().toUpperCase();
    if (!(await validateAccess(accessCode))) {
      return json({ error: "Invalid access code." }, 401);
    }
    const action = String(body?.action || "");
    const platform = String(body?.platform || "wordpress").toLowerCase();
    if (platform !== "wordpress") {
      return json({
        error: `Direct write-back for ${platform} is not yet supported. Use 'export' action to get a copy-paste patch.`,
        suggestion: "wordpress",
      }, 400);
    }

    const siteUrl = String(body?.siteUrl || "").trim().replace(/\/+$/, "");
    const username = String(body?.username || "").trim();
    const appPassword = String(body?.appPassword || "").trim();
    if (!siteUrl || !username || !appPassword) return json({ error: "siteUrl, username, appPassword required" }, 400);
    const auth = basicAuth(username, appPassword);

    if (action === "verify") {
      const r = await fetch(`${siteUrl}/wp-json/wp/v2/users/me`, { headers: { Authorization: auth } });
      if (!r.ok) return json({ ok: false, error: `WP auth failed (${r.status}). Make sure REST API is enabled and the user has an Application Password.` }, 400);
      const me = await r.json();
      return json({ ok: true, user: me?.name || me?.slug || username });
    }

    if (action === "detect") {
      const pageUrl = String(body?.pageUrl || "");
      const post = await wpDetectPostByUrl(siteUrl, pageUrl, auth);
      if (!post) return json({ ok: false, error: "Could not find a matching WordPress post or page for that URL." }, 404);
      return json({ ok: true, post });
    }

    if (action === "apply") {
      const pageUrl = String(body?.pageUrl || "");
      const patches: Array<{ find: string; replace: string }> = Array.isArray(body?.patches) ? body.patches.slice(0, 50) : [];
      const newTitle: string | null = typeof body?.newTitle === "string" ? body.newTitle.slice(0, 240) : null;
      const dryRun = body?.dryRun !== false; // default to dry run unless explicitly false
      const post = await wpDetectPostByUrl(siteUrl, pageUrl, auth);
      if (!post) return json({ ok: false, error: "Page not found in WordPress." }, 404);
      const patched = applyTextPatches(post.content, patches);
      const update: Record<string, unknown> = { content: patched.html };
      if (newTitle) update.title = newTitle;
      if (dryRun) {
        return json({ ok: true, dryRun: true, postId: post.id, type: post.type, patchesApplied: patched.applied, patchesMissed: patched.missed, preview: patched.html.slice(0, 4000) });
      }
      const r = await fetch(`${siteUrl}/wp-json/wp/v2/${post.type}/${post.id}`, {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        return json({ ok: false, error: `WP write failed (${r.status}): ${t.slice(0, 300)}` }, 400);
      }
      const result = await r.json();
      return json({ ok: true, dryRun: false, postId: post.id, type: post.type, patchesApplied: patched.applied, patchesMissed: patched.missed, link: result?.link || `${siteUrl}/?p=${post.id}` });
    }

    return json({ error: "Unknown action. Use verify|detect|apply." }, 400);
  } catch (e) {
    console.error("extension-cms-apply error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
