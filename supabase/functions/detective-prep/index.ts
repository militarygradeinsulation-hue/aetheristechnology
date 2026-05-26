// Detective Prep — adhoc dossier builder.
// Pulls website scan + Firecrawl company profile + RocketReach person/company search
// for any {website, business_name, contact_name, email} input, WITHOUT requiring a
// saved lead row. Used by Detective Mode in admin tools and rep My Tools (standalone
// + as a fallback when the lead doesn't yet have rocketreach/firecrawl enrichment).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-portal-token",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const RR_BASE = "https://api.rocketreach.co/api/v2";

function domainFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch { return null; }
}

async function runFirecrawl(websiteUrl: string, name: string, company: string, domain: string | null, FC_KEY: string) {
  try {
    const [scrapeRes, mapRes, searchRes] = await Promise.all([
      fetch("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${FC_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          url: websiteUrl,
          formats: ["markdown", "summary", "links", "branding", {
            type: "json",
            prompt: "Extract company info: legal_name, tagline, description, services (array), industries (array), founded_year, employee_count, headquarters, locations (array), phones (array), emails (array), social_links (object: linkedin, twitter, facebook, instagram, youtube), leadership (array of {name,title}), key_clients (array), tech_stack (array), unique_selling_points (array)"
          }],
          onlyMainContent: true,
        }),
      }).then(r => r.json()).catch(() => null),
      fetch("https://api.firecrawl.dev/v2/map", {
        method: "POST",
        headers: { Authorization: `Bearer ${FC_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url: websiteUrl, limit: 50 }),
      }).then(r => r.json()).catch(() => null),
      (name || company) ? fetch("https://api.firecrawl.dev/v2/search", {
        method: "POST",
        headers: { Authorization: `Bearer ${FC_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `${name || ""} ${company || domain || ""} site:linkedin.com OR contact OR email`.trim(),
          limit: 5,
        }),
      }).then(r => r.json()).catch(() => null) : null,
    ]);
    const sd = (scrapeRes as any)?.data || scrapeRes;
    return {
      summary: sd?.summary || null,
      json: sd?.json || null,
      branding: sd?.branding || null,
      links_count: Array.isArray(sd?.links) ? sd.links.length : 0,
      metadata: sd?.metadata || null,
      markdown_excerpt: typeof sd?.markdown === "string" ? sd.markdown.slice(0, 4000) : null,
      sitemap: Array.isArray((mapRes as any)?.links)
        ? (mapRes as any).links.slice(0, 50).map((l: any) => typeof l === "string" ? l : (l?.url || l?.href || "")).filter(Boolean)
        : [],
      web_results: Array.isArray((searchRes as any)?.data) ? (searchRes as any).data.slice(0, 5).map((r: any) => ({
        url: r.url, title: r.title, description: r.description,
      })) : [],
      fetched_at: new Date().toISOString(),
    };
  } catch (e) {
    console.error("Firecrawl error:", e);
    return null;
  }
}

async function runRocketReach(RR_KEY: string, name: string, company: string, email: string, domain: string | null) {
  const headers = { "Api-Key": RR_KEY, "Content-Type": "application/json" };
  let person: any = null;

  // 1) email lookup
  if (email) {
    try {
      const r = await fetch(`${RR_BASE}/person/lookup?email=${encodeURIComponent(email)}`, { headers });
      const raw = await r.json().catch(() => null);
      if (r.ok && raw && (raw.id || raw.name)) person = raw;
    } catch { /* noop */ }
  }
  // 2) name + company/domain
  if (!person && name && (company || domain)) {
    try {
      const params = new URLSearchParams({ name });
      if (company) params.set("current_employer", company);
      if (domain) params.set("current_employer_domain", domain);
      const r = await fetch(`${RR_BASE}/person/lookup?${params.toString()}`, { headers });
      const raw = await r.json().catch(() => null);
      if (r.ok && raw && (raw.id || raw.name)) person = raw;
    } catch { /* noop */ }
  }
  // 3) company search for decision-makers
  let additionalProfiles: any[] = [];
  if (company || domain) {
    try {
      const r = await fetch(`${RR_BASE}/search`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: {
            current_employer: company ? [company] : undefined,
            current_employer_domain: domain ? [domain] : undefined,
            current_title: ["CEO", "Owner", "Founder", "President", "COO", "CFO", "CMO", "VP", "Director", "Head", "Manager"],
          },
          start: 1,
          page_size: 8,
        }),
      });
      const sraw = await r.json().catch(() => null);
      if (r.ok && sraw?.profiles?.length) {
        additionalProfiles = sraw.profiles;
        if (!person) {
          person = additionalProfiles[0];
          additionalProfiles = additionalProfiles.slice(1);
        } else {
          additionalProfiles = additionalProfiles.filter((p: any) => p?.id !== person?.id && p?.name !== person?.name);
        }
      }
    } catch { /* noop */ }
  }

  if (!person && !additionalProfiles.length) return null;

  const rankEmail = (e: any): number => {
    let s = 0;
    const t = String(e?.type || "").toLowerCase();
    const g = String(e?.grade || "").toUpperCase();
    const addr = String(e?.email || "").toLowerCase();
    if (t.includes("professional") || t.includes("work") || t.includes("current")) s += 60;
    else if (t.includes("personal")) s += 10;
    else s += 25;
    if (e?.smtp_valid === "valid" || e?.smtp_valid === true) s += 30;
    else if (e?.smtp_valid === "invalid" || e?.smtp_valid === false) s -= 40;
    const gradeMap: Record<string, number> = { "A+": 25, A: 22, "A-": 20, B: 15, C: 8, D: 3, F: -20 };
    s += gradeMap[g] ?? 0;
    if (/^(info|sales|support|contact|hello|admin|office|hr|billing|noreply|no-reply)@/.test(addr)) s -= 30;
    if (domain && addr.endsWith("@" + domain)) s += 15;
    return s;
  };
  const rawEmails = person ? (person.emails || []).map((e: any) => ({
    email: e.email, type: e.type, grade: e.grade, smtp_valid: e.smtp_valid,
  })) : [];
  const rankedEmails = [...rawEmails].sort((a, b) => rankEmail(b) - rankEmail(a));
  return person ? {
    id: person.id,
    name: person.name,
    title: person.current_title || person.normalized_title,
    employer: person.current_employer,
    location: [person.city, person.region, person.country].filter(Boolean).join(", "),
    linkedin_url: person.linkedin_url,
    emails: rankedEmails,
    best_email: rankedEmails[0]?.email || null,
    phones: (person.phones || []).map((p: any) => ({ number: p.number, type: p.type, is_premium: p.is_premium })),
    profile_pic: person.profile_pic,
    job_history: (person.job_history || []).slice(0, 5).map((j: any) => ({
      title: j.title, company_name: j.company_name, start_date: j.start_date, end_date: j.end_date,
    })),
    education: (person.education || []).slice(0, 3),
    links: person.links || {},
    additional_contacts: additionalProfiles.slice(0, 3).map((p: any) => {
      const emails = (p.emails || []).map((e: any) => ({ email: e.email, type: e.type, grade: e.grade, smtp_valid: e.smtp_valid }));
      const ranked = [...emails].sort((a, b) => rankEmail(b) - rankEmail(a));
      return {
        id: p.id,
        name: p.name,
        title: p.current_title || p.normalized_title,
        employer: p.current_employer,
        linkedin_url: p.linkedin_url,
        location: [p.city, p.region, p.country].filter(Boolean).join(", "),
        best_email: ranked[0]?.email || null,
        emails: ranked,
        phones: (p.phones || []).map((ph: any) => ({ number: ph.number, type: ph.type })),
        profile_pic: p.profile_pic,
      };
    }),
    fetched_at: new Date().toISOString(),
  } : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminOk = await verifyAdminToken(getAdminTokenFromRequest(req), secret);
    const portalOk = adminOk ? true : !!(await verifyPortalToken(getPortalTokenFromRequest(req), secret));
    if (!adminOk && !portalOk) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const websiteRaw = String(body.website || "").trim();
    const company = String(body.business_name || body.company || "").trim();
    const name = String(body.contact_name || body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const wantScan = body.scan !== false;
    const wantFirecrawl = body.firecrawl !== false;
    const wantRR = body.rocketreach !== false;

    if (!websiteRaw && !company && !name && !email) {
      return json({ error: "Provide website, business_name, contact_name, or email." }, 400);
    }

    const websiteUrl = websiteRaw
      ? (websiteRaw.startsWith("http") ? websiteRaw : `https://${websiteRaw}`)
      : null;
    const domain = domainFromUrl(websiteUrl);

    const FC_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const RR_KEY = Deno.env.get("ROCKETREACH_API_KEY");
    const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";

    // Run scan-website, Firecrawl, RocketReach in parallel
    const scanPromise = (wantScan && websiteUrl)
      ? fetch(`${SUPA_URL}/functions/v1/scan-website`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON}`, apikey: ANON },
          body: JSON.stringify({ url: websiteUrl }),
        }).then(r => r.ok ? r.json() : null).catch(() => null)
      : Promise.resolve(null);

    const fcPromise = (wantFirecrawl && FC_KEY && websiteUrl)
      ? runFirecrawl(websiteUrl, name, company, domain, FC_KEY)
      : Promise.resolve(null);

    const rrPromise = (wantRR && RR_KEY)
      ? runRocketReach(RR_KEY, name, company, email, domain)
      : Promise.resolve(null);

    const [scan, firecrawl, rocketreach] = await Promise.all([scanPromise, fcPromise, rrPromise]);

    return json({
      ok: true,
      scan,
      firecrawl,
      rocketreach,
      missing_keys: {
        firecrawl: !FC_KEY,
        rocketreach: !RR_KEY,
      },
    });
  } catch (e) {
    console.error("detective-prep error:", e);
    return json({ error: e instanceof Error ? e.message : "Server error" }, 500);
  }
});
