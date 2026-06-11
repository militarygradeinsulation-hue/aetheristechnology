// Aetheris Extension — Contact Finder
// Given the current page URL, scrapes the site (Firecrawl) for emails / phones /
// leadership / social links AND queries RocketReach for top decision-makers at
// the domain. Returns a single merged payload for the side panel.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RR_BASE = "https://api.rocketreach.co/api/v2";
const FC_BASE = "https://api.firecrawl.dev/v2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function hostnameOf(url: string): string | null {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch { return null; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const url = String(body.url || body.pageUrl || "").trim();
    if (!url) return json({ error: "Missing url" }, 400);

    const domain = hostnameOf(url);
    if (!domain) return json({ error: "Invalid url" }, 400);

    const FC_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const RR_KEY = Deno.env.get("ROCKETREACH_API_KEY");

    // -------- Firecrawl: scrape homepage + likely contact / about pages --------
    const firecrawlPromise = (async () => {
      if (!FC_KEY) return null;
      try {
        const fullUrl = url.startsWith("http") ? url : `https://${url}`;
        const [scrape, map] = await Promise.all([
          fetch(`${FC_BASE}/scrape`, {
            method: "POST",
            headers: { Authorization: `Bearer ${FC_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              url: fullUrl,
              formats: ["markdown", "links", {
                type: "json",
                prompt: "Extract: emails (array of strings), phones (array of strings), addresses (array), leadership (array of {name,title,email,linkedin}), social_links (object: linkedin, twitter, facebook, instagram, youtube), legal_name, tagline.",
              }],
              onlyMainContent: true,
            }),
          }).then(r => r.json()).catch(() => null),
          fetch(`${FC_BASE}/map`, {
            method: "POST",
            headers: { Authorization: `Bearer ${FC_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ url: fullUrl, search: "contact about team leadership", limit: 25 }),
          }).then(r => r.json()).catch(() => null),
        ]);

        const sd = (scrape as any)?.data || scrape || {};
        const links = Array.isArray((map as any)?.links) ? (map as any).links : [];
        const normLinks = links.map((l: any) => typeof l === "string" ? l : (l?.url || l?.href || "")).filter(Boolean);

        // Pull contact / about / team pages too, max 3 extra scrapes.
        const extraTargets = normLinks
          .filter((l: string) => /\/(contact|about|team|leadership|company|staff)/i.test(l))
          .slice(0, 3);
        const extraScrapes = await Promise.all(extraTargets.map((t: string) =>
          fetch(`${FC_BASE}/scrape`, {
            method: "POST",
            headers: { Authorization: `Bearer ${FC_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              url: t,
              formats: ["markdown", {
                type: "json",
                prompt: "Extract: emails (array), phones (array), leadership (array of {name,title,email,linkedin}).",
              }],
              onlyMainContent: true,
            }),
          }).then(r => r.json()).catch(() => null)
        ));

        return {
          home: sd,
          extras: extraScrapes.map((r, i) => ({ url: extraTargets[i], data: (r as any)?.data || r })).filter(x => x.data),
          sitemap: normLinks.slice(0, 50),
        };
      } catch (e) {
        console.error("Firecrawl error:", e);
        return null;
      }
    })();

    // -------- RocketReach: top decision-makers at this domain --------
    const rocketreachPromise = (async () => {
      if (!RR_KEY) return null;
      try {
        const r = await fetch(`${RR_BASE}/search`, {
          method: "POST",
          headers: { "Api-Key": RR_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({
            query: {
              current_employer_domain: [domain],
              current_title: ["CEO","Owner","Founder","President","COO","CFO","CMO","CRO","VP","Director","Head","Marketing","Sales"],
            },
            start: 1,
            page_size: 8,
          }),
        });
        const data = await r.json().catch(() => null);
        if (!r.ok || !data?.profiles) return null;
        return (data.profiles as any[]).slice(0, 8).map((p) => ({
          id: p.id,
          name: p.name,
          title: p.current_title || p.normalized_title,
          employer: p.current_employer,
          linkedin_url: p.linkedin_url,
          location: [p.city, p.region, p.country].filter(Boolean).join(", "),
          profile_pic: p.profile_pic,
          emails: (p.emails || []).map((e: any) => ({ email: e.email, type: e.type, grade: e.grade, smtp_valid: e.smtp_valid })),
          phones: (p.phones || []).map((ph: any) => ({ number: ph.number, type: ph.type })),
        }));
      } catch (e) {
        console.error("RocketReach error:", e);
        return null;
      }
    })();

    const [firecrawl, rocketreach] = await Promise.all([firecrawlPromise, rocketreachPromise]);

    // ----- Merge / extract emails + phones -----
    const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const PHONE_RE = /(\+?\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
    const emails = new Set<string>();
    const phones = new Set<string>();
    const leadership: Array<{ name?: string; title?: string; email?: string; linkedin?: string; source: string }> = [];
    const socials: Record<string, string> = {};
    let companyName: string | null = null;
    let tagline: string | null = null;

    const ingest = (payload: any, source: string) => {
      const j = payload?.json || {};
      (j.emails || []).forEach((e: any) => { const s = String(e || "").trim().toLowerCase(); if (s.includes("@")) emails.add(s); });
      (j.phones || []).forEach((p: any) => { const s = String(p || "").trim(); if (s) phones.add(s); });
      (j.leadership || []).forEach((l: any) => leadership.push({
        name: l?.name, title: l?.title, email: l?.email, linkedin: l?.linkedin, source,
      }));
      if (j.social_links && typeof j.social_links === "object") {
        Object.entries(j.social_links).forEach(([k, v]) => { if (v) socials[k] = String(v); });
      }
      if (j.legal_name && !companyName) companyName = String(j.legal_name);
      if (j.tagline && !tagline) tagline = String(j.tagline);
      const md = typeof payload?.markdown === "string" ? payload.markdown : "";
      (md.match(EMAIL_RE) || []).forEach((e) => {
        const s = e.toLowerCase();
        if (!/\.(png|jpg|jpeg|gif|svg|webp)@/i.test(s) && !/(sentry|wixpress|example\.com|test@test)/i.test(s)) emails.add(s);
      });
      (md.match(PHONE_RE) || []).forEach((p) => {
        const digits = p.replace(/\D/g, "");
        if (digits.length >= 10 && digits.length <= 13) phones.add(p.trim());
      });
    };

    if (firecrawl?.home) ingest(firecrawl.home, "homepage");
    (firecrawl?.extras || []).forEach((x: any) => ingest(x.data, x.url));

    // Rank: domain-match emails first, generic mailboxes last.
    const rankedEmails = [...emails].sort((a, b) => {
      const aDom = a.endsWith("@" + domain) ? 1 : 0;
      const bDom = b.endsWith("@" + domain) ? 1 : 0;
      if (aDom !== bDom) return bDom - aDom;
      const aGen = /^(info|sales|support|contact|hello|admin|office|hr|billing|noreply|no-reply)@/.test(a) ? 1 : 0;
      const bGen = /^(info|sales|support|contact|hello|admin|office|hr|billing|noreply|no-reply)@/.test(b) ? 1 : 0;
      return aGen - bGen;
    });

    return json({
      ok: true,
      domain,
      company: companyName,
      tagline,
      emails: rankedEmails,
      phones: [...phones],
      socials,
      leadership_from_site: leadership,
      decision_makers: rocketreach || [],
      sources: {
        firecrawl: !!firecrawl,
        rocketreach: !!rocketreach,
        rocketreach_configured: !!RR_KEY,
        firecrawl_configured: !!FC_KEY,
      },
      fetched_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("extension-contacts error:", e);
    return json({ error: e instanceof Error ? e.message : "Server error" }, 500);
  }
});
