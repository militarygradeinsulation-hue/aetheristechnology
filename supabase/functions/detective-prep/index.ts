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
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-portal-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

// ---- Contact extraction from Firecrawl + raw page text ---------------------
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(\+?\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;

function extractContactsFromFirecrawl(fc: any, domain: string | null): { emails: string[]; phones: string[] } {
  const emails = new Set<string>();
  const phones = new Set<string>();
  if (!fc) return { emails: [], phones: [] };
  const jsonE = Array.isArray(fc?.json?.emails) ? fc.json.emails : [];
  const jsonP = Array.isArray(fc?.json?.phones) ? fc.json.phones : [];
  jsonE.forEach((e: any) => { const s = String(e || "").trim().toLowerCase(); if (s && s.includes("@")) emails.add(s); });
  jsonP.forEach((p: any) => { const s = String(p || "").trim(); if (s) phones.add(s); });
  const text = [
    typeof fc?.markdown_excerpt === "string" ? fc.markdown_excerpt : "",
    typeof fc?.summary === "string" ? fc.summary : "",
    JSON.stringify(fc?.json || {}),
  ].join("\n");
  (text.match(EMAIL_RE) || []).forEach(e => emails.add(e.toLowerCase()));
  (text.match(PHONE_RE) || []).forEach(p => {
    const digits = p.replace(/\D/g, "");
    if (digits.length >= 10 && digits.length <= 13) phones.add(p.trim());
  });
  // Light cleanup: drop obvious non-contact emails (assets, .png@, sentry, wixpress, etc.)
  const filteredEmails = [...emails].filter(e =>
    !/\.(png|jpg|jpeg|gif|svg|webp)@/i.test(e) &&
    !/(sentry|wixpress|example\.com|test@test)/i.test(e)
  );
  // Prefer emails matching the company domain first
  filteredEmails.sort((a, b) => {
    const aMatch = domain && a.endsWith("@" + domain) ? 1 : 0;
    const bMatch = domain && b.endsWith("@" + domain) ? 1 : 0;
    return bMatch - aMatch;
  });
  return { emails: filteredEmails, phones: [...phones] };
}

function mergeContactsFromFirecrawl(rr: any, fc: any, domain: string | null, name: string, company: string): any {
  const { emails, phones } = extractContactsFromFirecrawl(fc, domain);
  if (!rr && emails.length === 0 && phones.length === 0) return null;

  const existing = rr || {
    id: null,
    name: name || null,
    title: null,
    employer: company || (fc?.json?.legal_name || null),
    location: fc?.json?.headquarters || null,
    linkedin_url: fc?.json?.social_links?.linkedin || null,
    emails: [],
    best_email: null,
    phones: [],
    profile_pic: null,
    job_history: [],
    education: [],
    links: fc?.json?.social_links || {},
    additional_contacts: [],
    fetched_at: new Date().toISOString(),
    source: "firecrawl_only",
  };

  // Merge emails — RR-ranked first, then site-extracted that aren't already present
  const haveEmails = new Set((existing.emails || []).map((e: any) => String(e?.email || "").toLowerCase()));
  const mergedEmails = [...(existing.emails || [])];
  emails.forEach(addr => {
    if (!haveEmails.has(addr)) {
      mergedEmails.push({ email: addr, type: "website", grade: null, smtp_valid: null, source: "firecrawl" });
      haveEmails.add(addr);
    }
  });

  // Merge phones
  const havePhones = new Set((existing.phones || []).map((p: any) => String(p?.number || "").replace(/\D/g, "")));
  const mergedPhones = [...(existing.phones || [])];
  phones.forEach(num => {
    const digits = num.replace(/\D/g, "");
    if (!havePhones.has(digits)) {
      mergedPhones.push({ number: num, type: "website", is_premium: false, source: "firecrawl" });
      havePhones.add(digits);
    }
  });

  return {
    ...existing,
    emails: mergedEmails,
    phones: mergedPhones,
    best_email: existing.best_email || mergedEmails[0]?.email || null,
  };
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

// ---- Personality dossier --------------------------------------------------
// Pulls public-web signals about the person (LinkedIn, podcasts, interviews,
// bios, alumni pages, news mentions) and uses Lovable AI to synthesize a
// rep-ready personality brief: backstory, hobbies, talking points, etc.
async function runPersonality(opts: {
  name: string; company: string; domain: string | null;
  linkedinUrl?: string | null; rocketreach: any; firecrawl: any;
  FC_KEY: string; LOV_KEY: string;
}) {
  const { name, company, domain, linkedinUrl, rocketreach, firecrawl, FC_KEY, LOV_KEY } = opts;
  if (!name) return null;

  // 1) Targeted web search for personal signal
  const personQuery = [
    `"${name}"`,
    company ? `"${company}"` : (domain || ""),
    "(linkedin OR podcast OR interview OR bio OR speaker OR alumni OR volunteer OR hobby OR family OR charity)",
  ].filter(Boolean).join(" ");

  const searchPromise = fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${FC_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: personQuery, limit: 8 }),
  }).then(r => r.ok ? r.json() : null).catch(() => null);

  // 2) Scrape the LinkedIn profile (or any URL passed) as markdown
  const liPromise = linkedinUrl
    ? fetch("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${FC_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url: linkedinUrl, formats: ["markdown", "summary"], onlyMainContent: true, waitFor: 1500 }),
      }).then(r => r.ok ? r.json() : null).catch(() => null)
    : Promise.resolve(null);

  const [searchRaw, liRaw] = await Promise.all([searchPromise, liPromise]);

  const searchResults = Array.isArray((searchRaw as any)?.data)
    ? (searchRaw as any).data.slice(0, 8).map((r: any) => ({
        url: r.url, title: r.title, description: r.description,
      }))
    : Array.isArray((searchRaw as any)?.web?.results)
      ? (searchRaw as any).web.results.slice(0, 8).map((r: any) => ({
          url: r.url, title: r.title, description: r.description,
        }))
      : [];

  const liScrape = (liRaw as any)?.data || liRaw;
  const linkedinContext = liScrape ? {
    summary: liScrape?.summary || null,
    markdown_excerpt: typeof liScrape?.markdown === "string" ? liScrape.markdown.slice(0, 5000) : null,
  } : null;

  // If we got essentially nothing extra, still try with what we have.
  const hasAnySignal = searchResults.length > 0 || !!linkedinContext || !!rocketreach || !!firecrawl;
  if (!hasAnySignal) return null;

  const contextPayload = {
    target: { name, company, domain, linkedin_url: linkedinUrl || null },
    rocketreach: rocketreach ? {
      title: rocketreach.title, employer: rocketreach.employer, location: rocketreach.location,
      linkedin_url: rocketreach.linkedin_url,
      job_history: rocketreach.job_history, education: rocketreach.education, links: rocketreach.links,
    } : null,
    company_profile: firecrawl?.json || null,
    company_summary: firecrawl?.summary || null,
    web_results: searchResults,
    linkedin: linkedinContext,
  };

  const SYSTEM = [
    "You are a sales-intel analyst building a PERSONALITY BRIEF for a rep about to do outreach.",
    "Goal: surface human connection points — backstory, hobbies, passions, communication style, talking points, and conversation icebreakers.",
    "Only use facts visible in the supplied context. NEVER invent. If a field can't be supported, return an empty array or null.",
    "Cite every claim with a short evidence string and the source URL it came from when possible.",
    "Keep it specific, useful, and warm — this is for a human conversation, not a profile dump.",
    "CURRENCY RULE (NON-NEGOTIABLE): any monetary figure must be in US Dollars (USD), formatted like $1,200 or $1.4M. Never use €, £, ¥, EUR, GBP, CAD, AUD, or any other currency.",
    "Return strict JSON matching the schema. No prose outside JSON.",
  ].join(" ");

  const SCHEMA_HINT = `{
  "summary": "1-2 sentence read on who this person is (style + what they care about)",
  "backstory": ["short bullet about origin / career arc / notable transitions"],
  "hobbies_interests": ["specific hobby or interest with detail"],
  "values_causes": ["volunteer work, charities, causes they champion"],
  "communication_style": "how they show up (e.g. blunt operator, story-driven, data-first)",
  "talking_points": [{"point": "specific topic to bring up", "why": "why it resonates with them"}],
  "icebreakers": ["1-sentence opener a rep could actually say"],
  "shared_ground_hints": ["common-ground angles (alma mater, hometown, sports team, prior employer)"],
  "watch_outs": ["things to AVOID — pet peeves, sensitive topics, prior bad vendor experiences"],
  "recent_signals": [{"signal": "recent post/podcast/award/job change", "when": "rough date if known", "url": "source"}],
  "sources": [{"url": "...", "what": "what this source provided"}],
  "confidence": "low | medium | high"
}`;

  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOV_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `Build the personality brief for this person.\n\nSCHEMA:\n${SCHEMA_HINT}\n\nCONTEXT:\n${JSON.stringify(contextPayload).slice(0, 24000)}` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) {
      console.error("personality AI error", r.status, await r.text().catch(() => ""));
      return { error: `ai_${r.status}`, web_results: searchResults };
    }
    const j = await r.json();
    const txt = j?.choices?.[0]?.message?.content || "{}";
    let parsed: any;
    try { parsed = JSON.parse(txt); } catch { parsed = { raw: txt }; }
    return {
      ...parsed,
      web_results: searchResults,
      fetched_at: new Date().toISOString(),
    };
  } catch (e) {
    console.error("personality build failed", e);
    return null;
  }
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
    const wantPersonality = body.personality !== false;

    if (!websiteRaw && !company && !name && !email) {
      return json({ error: "Provide website, business_name, contact_name, or email." }, 400);
    }

    const websiteUrl = websiteRaw
      ? (websiteRaw.startsWith("http") ? websiteRaw : `https://${websiteRaw}`)
      : null;
    const domain = domainFromUrl(websiteUrl);

    const FC_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const RR_KEY = Deno.env.get("ROCKETREACH_API_KEY");
    const LOV_KEY = Deno.env.get("LOVABLE_API_KEY") || "";
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

    const [scan, firecrawl, rocketreachRaw] = await Promise.all([scanPromise, fcPromise, rrPromise]);

    // Backfill emails/phones from the website scrape so deep scan always returns
    // contacts when they exist on the page, even if RocketReach finds no person.
    const rocketreach = mergeContactsFromFirecrawl(rocketreachRaw, firecrawl, domain, name, company);

    // Personality dossier — runs after RR/FC so we can hand it LinkedIn URL etc.
    const personality = (wantPersonality && name && FC_KEY && LOV_KEY)
      ? await runPersonality({
          name, company, domain,
          linkedinUrl: rocketreach?.linkedin_url || null,
          rocketreach, firecrawl, FC_KEY, LOV_KEY,
        })
      : null;

    return json({
      ok: true,
      scan,
      firecrawl,
      rocketreach,
      personality,
      missing_keys: {
        firecrawl: !FC_KEY,
        rocketreach: !RR_KEY,
        personality: !LOV_KEY || !FC_KEY,
      },
    });
  } catch (e) {
    console.error("detective-prep error:", e);
    return json({ error: e instanceof Error ? e.message : "Server error" }, 500);
  }
});
