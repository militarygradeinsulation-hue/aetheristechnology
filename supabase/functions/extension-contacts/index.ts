// Aetheris Extension — Contact Finder
// Given the current page URL, scrapes the site (Firecrawl) for emails / phones /
// leadership / social links AND queries RocketReach for top decision-makers at
// the domain. Returns a single merged payload for the side panel.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { discoverPublicBusinessContacts, safeBusinessUrl } from "../_shared/contact-discovery.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RR_BASE = "https://api.rocketreach.co/api/v2";
// A contact lookup uses paid APIs. Require an active rep code and rate limit
// before initiating any discovery request. No service key leaves the server.
const contactUsage = new Map<string, { count: number; until: number }>();
async function authorizeContactScan(code: string): Promise<boolean> {
  if (!/^[A-Z0-9_-]{3,60}$/.test(code)) return false;
  const url = Deno.env.get("SUPABASE_URL");
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !secret) return false;
  const db = createClient(url, secret);
  const { data, error } = await db.from("rep_codes")
    .select("code,is_active").eq("code", code).maybeSingle();
  return !error && data?.is_active === true;
}
function contactLimitReached(code: string): boolean {
  const now = Date.now(), current = contactUsage.get(code);
  if (!current || current.until <= now) {
    contactUsage.set(code, { count: 1, until: now + 3_600_000 });
    return false;
  }
  if (current.count >= 5) return true;
  current.count++;
  return false;
}
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
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    const body = await req.json().catch(() => ({}));
    const accessCode = String(body.accessCode || "").trim().toUpperCase();
    if (!(await authorizeContactScan(accessCode))) return json({ error: "Active rep access code required" }, 401);
    if (contactLimitReached(accessCode)) return json({ error: "Contact research limit reached (5 per hour)" }, 429);
    const url = String(body.url || body.pageUrl || "").trim();
    if (!url) return json({ error: "Missing url" }, 400);

    const domain = safeBusinessUrl(url)?.hostname.replace(/^www\./, "") || null;
    if (!domain) return json({ error: "Invalid public company URL" }, 400);

    const FC_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const RR_KEY = Deno.env.get("ROCKETREACH_API_KEY");

    // Same capped, evidence-backed collector used by manual lead enrichment.
    // Return the previous home/extras/sitemap fields for extension compatibility.
    const firecrawlPromise = (async () => {
      if (!FC_KEY) return null;
      const contactScan = await discoverPublicBusinessContacts(url, FC_KEY, {
        maxPages: 3, mapIfNeeded: true,
      });
      return {
        home: {
          markdown: contactScan.markdown_excerpt || "",
          json: { emails: contactScan.all_emails, phones: contactScan.all_phones },
        },
        extras: [],
        sitemap: contactScan.candidate_pages,
        evidence: contactScan.evidence,
        discovery_status: contactScan.status,
        pages_scanned: contactScan.pages_scanned,
        requests: contactScan.requests,
      };
    })();

    // -------- RocketReach: top decision-makers at this domain --------
    const rocketreachPromise = (async () => {
      if (!RR_KEY) return null;
      try {
        const r = await fetch(`${RR_BASE}/person/search`, {
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
      contact_evidence: firecrawl?.evidence || [],
      contact_discovery: firecrawl ? {
        status: firecrawl.discovery_status,
        pages_scanned: firecrawl.pages_scanned,
        requests: firecrawl.requests,
      } : null,
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
