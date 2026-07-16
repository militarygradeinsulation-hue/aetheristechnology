import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};

function cleanLinkedInText(md: string): string {
  // Strip common LinkedIn navigation / CTA cruft; keep the post body.
  const lines = md.split("\n").map((l) => l.trim());
  const drop = /^(sign in|join now|like|comment|repost|send|report this|see more|see less|activity|follow|·\s*\d+|show more|reactions|comments?$|share|©|cookie|privacy|user agreement|accessibility|community guidelines|hashtag|about|help center|linkedin corporation)/i;
  const filtered = lines.filter((l) => l && !drop.test(l) && !/^!\[.*\]\(.*\)$/.test(l));
  // Deduplicate consecutive repeats
  const out: string[] = [];
  for (const l of filtered) if (l !== out[out.length - 1]) out.push(l);
  return out.join("\n").slice(0, 8000);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");

    const token = getAdminTokenFromRequest(req);
    const ok = await verifyAdminToken(token, SERVICE);
    if (!ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const raw: string = (body?.url || "").toString().trim();
    if (!raw) return new Response(JSON.stringify({ error: "url required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    if (!/linkedin\.com/i.test(url)) {
      return new Response(JSON.stringify({ error: "Not a LinkedIn URL" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 2000,
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      console.error("firecrawl error:", r.status, t);
      return new Response(JSON.stringify({ error: `Scrape failed (${r.status}). LinkedIn may be blocking. Try pasting the post text instead.` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await r.json();
    const md: string = data?.data?.markdown || data?.markdown || "";
    const meta = data?.data?.metadata || data?.metadata || {};
    const cleaned = cleanLinkedInText(md);
    if (cleaned.length < 40) {
      return new Response(JSON.stringify({ error: "Post looks empty or gated. Try pasting the text or uploading a screenshot instead.", raw: md.slice(0, 400) }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Detect author from OG title if available (e.g. "Jane Doe on LinkedIn: ...")
    const ogTitle: string = meta.ogTitle || meta.title || "";
    const authorMatch = ogTitle.match(/^(.+?)\s+on LinkedIn/i);
    const author = authorMatch ? authorMatch[1].trim() : "";

    return new Response(JSON.stringify({
      ok: true,
      url,
      author,
      text: cleaned,
      title: ogTitle,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("linkedin-scrape-post error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
