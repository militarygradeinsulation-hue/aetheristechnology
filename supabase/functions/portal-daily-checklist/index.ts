// Daily Hustle checklist for reps + today's blog snippet ready to share.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-portal-token, x-admin-token",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SITE_URL = "https://aetheris.technology";
const MAIN_LINKEDIN = "https://www.linkedin.com/company/aetheris-technology/posts/";

function todayIndy(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Indiana/Indianapolis",
    year: "numeric", month: "2-digit", day: "2-digit",
  });
  return fmt.format(new Date()); // YYYY-MM-DD
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    let repCode: string | null = null;
    const portalClaims = await verifyPortalToken(getPortalTokenFromRequest(req), SERVICE).catch(() => null);
    if (portalClaims?.code) {
      repCode = portalClaims.code;
    } else {
      const adminOk = await verifyAdminToken(getAdminTokenFromRequest(req), SERVICE);
      if (!adminOk) return json({ error: "Unauthorized" }, 401);
      repCode = "ADMIN";
    }

    const admin = createClient(SUPABASE_URL, SERVICE);
    const today = todayIndy();
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const action = (body.action as string) || "get";

    // Ensure row exists for today (skip persistence for ADMIN preview)
    const persist = repCode !== "ADMIN";
    if (persist) {
      await admin.from("rep_daily_checklist").upsert(
        { rep_code: repCode, for_date: today },
        { onConflict: "rep_code,for_date", ignoreDuplicates: true },
      );
    }

    if (action === "update" && persist) {
      const patch: Record<string, unknown> = {};
      if (typeof body.notifications_reposted === "boolean") patch.notifications_reposted = body.notifications_reposted;
      if (typeof body.blog_posted === "boolean") patch.blog_posted = body.blog_posted;
      if (typeof body.connections_added === "number") {
        patch.connections_added = Math.max(0, Math.min(50, Math.floor(body.connections_added)));
      }
      if (Object.keys(patch).length > 0) {
        await admin.from("rep_daily_checklist").update(patch).eq("rep_code", repCode).eq("for_date", today);
      }
    }

    // Fetch checklist row
    const { data: checklist } = persist
      ? await admin.from("rep_daily_checklist")
          .select("notifications_reposted, connections_added, blog_posted")
          .eq("rep_code", repCode).eq("for_date", today).maybeSingle()
      : { data: null };

    // Today's content: pick the most recent blog OR playbook (whichever is newest).
    // Today = anything published in the last 36h so the post stays fresh through evening.
    const sinceISO = new Date(Date.now() - 36 * 3600 * 1000).toISOString();

    const [{ data: latestBlog }, { data: todayBlog }, { data: latestPlaybook }, { data: todayPlaybook }] =
      await Promise.all([
        admin.from("blog_posts")
          .select("id, title, slug, excerpt, tags, featured_image, published_at")
          .eq("is_published", true)
          .order("published_at", { ascending: false, nullsFirst: false })
          .limit(1).maybeSingle(),
        admin.from("blog_posts")
          .select("id, title, slug, excerpt, tags, featured_image, published_at")
          .eq("is_published", true)
          .gte("published_at", sinceISO)
          .order("published_at", { ascending: false })
          .limit(1).maybeSingle(),
        admin.from("playbooks")
          .select("id, title, subtitle, description, tags, file_url, published_at")
          .order("published_at", { ascending: false, nullsFirst: false })
          .limit(1).maybeSingle(),
        admin.from("playbooks")
          .select("id, title, subtitle, description, tags, file_url, published_at")
          .gte("published_at", sinceISO)
          .order("published_at", { ascending: false })
          .limit(1).maybeSingle(),
      ]);

    // Prefer something published today (blog beats playbook on tie). Fall back to latest ever.
    const blogPick = todayBlog || latestBlog;
    const pbPick = todayPlaybook || latestPlaybook;
    let kind: "blog" | "playbook" = "blog";
    let content:
      | { title: string; excerpt: string | null; tags: string[]; featured_image: string | null; published_at: string | null; share_url: string }
      | null = null;

    const refCode = repCode === "ADMIN" ? "" : repCode;
    const refSuffix = refCode ? `?ref=${refCode}` : "";

    const blogIsToday = !!todayBlog;
    const pbIsToday = !!todayPlaybook;
    if (pbIsToday && (!blogIsToday ||
        new Date(todayPlaybook!.published_at!).getTime() > new Date(todayBlog!.published_at!).getTime())) {
      kind = "playbook";
      content = pbPick && {
        title: pbPick.title,
        excerpt: pbPick.subtitle || pbPick.description || null,
        tags: pbPick.tags || [],
        featured_image: null,
        published_at: pbPick.published_at,
        share_url: `${SITE_URL}/playbooks${refSuffix}`,
      };
    } else if (blogPick) {
      kind = "blog";
      content = {
        title: blogPick.title,
        excerpt: blogPick.excerpt,
        tags: blogPick.tags || [],
        featured_image: blogPick.featured_image,
        published_at: blogPick.published_at,
        share_url: `${SITE_URL}/blog/${blogPick.slug}${refSuffix}`,
      };
    } else if (pbPick) {
      kind = "playbook";
      content = {
        title: pbPick.title,
        excerpt: pbPick.subtitle || pbPick.description || null,
        tags: pbPick.tags || [],
        featured_image: null,
        published_at: pbPick.published_at,
        share_url: `${SITE_URL}/playbooks${refSuffix}`,
      };
    }

    // Latest pulled LinkedIn post from main account (for the "repost" CTA).
    const { data: latestMainPost } = await admin.from("linkedin_post_queue")
      .select("linkedin_post_id, posted_at, content")
      .eq("status", "posted")
      .not("linkedin_post_id", "is", null)
      .order("posted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const shareSnippet = content
      ? [
          content.title,
          "",
          content.excerpt || "",
          "",
          kind === "playbook"
            ? "Grab the free playbook (and run the 14-Point Leak Audit on your business — 90 seconds):"
            : "Run the free 14-Point Leak Audit on your business — takes 90 seconds:",
          content.share_url,
          "",
          "#BusinessForensics #LeakAudit #Indianapolis",
        ].filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n")
      : null;


    let mainPostUrl = MAIN_LINKEDIN;
    if (latestMainPost?.linkedin_post_id) {
      const id = latestMainPost.linkedin_post_id;
      // share URN format: urn:li:share:1234 → /feed/update/urn:li:share:1234
      mainPostUrl = `https://www.linkedin.com/feed/update/${encodeURIComponent(id)}/`;
    }

    return json({
      date: today,
      checklist: checklist || {
        notifications_reposted: false,
        connections_added: 0,
        blog_posted: false,
      },
      blog: content ? {
        kind,
        title: content.title,
        slug: kind === "blog" ? blogPick?.slug : null,
        excerpt: content.excerpt,
        tags: content.tags,
        featured_image: content.featured_image,
        share_url: content.share_url,
        share_snippet: shareSnippet,
        published_at: content.published_at,
        is_today: kind === "blog" ? blogIsToday : pbIsToday,
      } : null,
      main_linkedin: {
        latest_post_url: mainPostUrl,
        company_url: MAIN_LINKEDIN,
      },
      rep_code: repCode,
    });
  } catch (e) {
    console.error("portal-daily-checklist error", e);
    return json({ error: (e as Error).message || "Internal error" }, 500);
  }
});
