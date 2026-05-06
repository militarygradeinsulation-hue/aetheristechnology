import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-portal-token",
};

const RR_BASE = "https://api.rocketreach.co/api/v2";

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function domainFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch { return null; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const RR_KEY = Deno.env.get("ROCKETREACH_API_KEY");
    if (!RR_KEY) return jsonResp({ error: "RocketReach not configured" }, 500);

    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const claims = await verifyPortalToken(getPortalTokenFromRequest(req), secret);
    if (!claims) return jsonResp({ error: "Unauthorized" }, 401);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, secret);
    const body = await req.json().catch(() => ({}));
    const leadId = String(body.id || "").trim();
    const force = !!body.force;
    if (!leadId) return jsonResp({ error: "Missing lead id" }, 400);

    const { data: lead, error: leadErr } = await supabase
      .from("rep_leads")
      .select("id,business_name,contact_name,email,website,enrichment,claimed_by_code,assigned_to_code")
      .eq("id", leadId)
      .maybeSingle();
    if (leadErr || !lead) return jsonResp({ error: "Lead not found" }, 404);

    // Access: must be assigned or claimed by this rep
    if (lead.claimed_by_code !== claims.code && lead.assigned_to_code !== claims.code) {
      return jsonResp({ error: "Not your lead" }, 403);
    }

    const existing = (lead.enrichment as any)?.rocketreach;
    const existingFc = (lead.enrichment as any)?.firecrawl;
    if (existing && existingFc && !force) {
      return jsonResp({ ok: true, cached: true, person: existing, firecrawl: existingFc });
    }

    const headers = { "Api-Key": RR_KEY, "Content-Type": "application/json" };
    const domain = domainFromUrl(lead.website);
    const name = (body.name || lead.contact_name || "").trim();
    const company = (body.company || lead.business_name || "").trim();
    const email = (body.email || lead.email || "").trim();

    // Kick off Firecrawl in parallel for max company detail
    const FC_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const websiteUrl = lead.website
      ? (lead.website.startsWith("http") ? lead.website : `https://${lead.website}`)
      : null;
    const firecrawlPromise = (async () => {
      if (!FC_KEY || !websiteUrl) return null;
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
          name || company ? fetch("https://api.firecrawl.dev/v2/search", {
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
          sitemap: Array.isArray((mapRes as any)?.links) ? (mapRes as any).links.slice(0, 50) : [],
          web_results: Array.isArray((searchRes as any)?.data) ? (searchRes as any).data.slice(0, 5).map((r: any) => ({
            url: r.url, title: r.title, description: r.description,
          })) : [],
          fetched_at: new Date().toISOString(),
        };
      } catch (e) {
        console.error("Firecrawl error:", e);
        return null;
      }
    })();

    let person: any = null;
    let raw: any = null;

    // 1) Try lookup by email first (most precise)
    if (email) {
      const url = `${RR_BASE}/person/lookup?email=${encodeURIComponent(email)}`;
      const r = await fetch(url, { headers });
      raw = await r.json().catch(() => null);
      if (r.ok && raw && (raw.id || raw.name)) person = raw;
    }

    // 2) Fall back to name + company/domain lookup
    if (!person && name && (company || domain)) {
      const params = new URLSearchParams({ name });
      if (company) params.set("current_employer", company);
      if (domain) params.set("current_employer_domain", domain);
      const url = `${RR_BASE}/person/lookup?${params.toString()}`;
      const r = await fetch(url, { headers });
      raw = await r.json().catch(() => null);
      if (r.ok && raw && (raw.id || raw.name)) person = raw;
    }

    // 3) Last resort: search by company/domain to surface decision-makers
    if (!person && (company || domain)) {
      const r = await fetch(`${RR_BASE}/search`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: {
            current_employer: company ? [company] : undefined,
            current_employer_domain: domain ? [domain] : undefined,
            current_title: ["CEO", "Owner", "Founder", "President", "VP", "Director"],
          },
          start: 1,
          page_size: 5,
        }),
      });
      raw = await r.json().catch(() => null);
      if (r.ok && raw?.profiles?.length) {
        person = { ...raw.profiles[0], _alternates: raw.profiles.slice(1) };
      }
    }

    const firecrawl = await firecrawlPromise;

    if (!person && !firecrawl) {
      return jsonResp({ error: "No RocketReach or Firecrawl match found", details: raw?.detail || null }, 404);
    }

    const summary = {
      id: person.id,
      name: person.name,
      title: person.current_title || person.normalized_title,
      employer: person.current_employer,
      location: [person.city, person.region, person.country].filter(Boolean).join(", "),
      linkedin_url: person.linkedin_url,
      emails: (person.emails || []).map((e: any) => ({
        email: e.email, type: e.type, grade: e.grade, smtp_valid: e.smtp_valid,
      })),
      phones: (person.phones || []).map((p: any) => ({ number: p.number, type: p.type, is_premium: p.is_premium })),
      profile_pic: person.profile_pic,
      job_history: (person.job_history || []).slice(0, 5).map((j: any) => ({
        title: j.title, company_name: j.company_name, start_date: j.start_date, end_date: j.end_date,
      })),
      education: (person.education || []).slice(0, 3),
      links: person.links || {},
      lookup_status: person.status,
      fetched_at: new Date().toISOString(),
    };

    // Save to enrichment.rocketreach + autosave any newly discovered email/phone if blank
    const newEnrichment = { ...(lead.enrichment as any || {}), rocketreach: summary };
    const patch: Record<string, unknown> = { enrichment: newEnrichment, enriched_at: new Date().toISOString() };
    if (!lead.email && summary.emails?.[0]?.email) patch.email = summary.emails[0].email.toLowerCase();
    if (summary.phones?.[0]?.number) {
      const { data: cur } = await supabase.from("rep_leads").select("phone").eq("id", leadId).maybeSingle();
      if (!cur?.phone) patch.phone = summary.phones[0].number;
    }
    if (!lead.contact_name && summary.name) patch.contact_name = summary.name;

    await supabase.from("rep_leads").update(patch).eq("id", leadId);

    try {
      const { data: rep } = await supabase.from("rep_codes").select("rep_name").eq("code", claims.code).maybeSingle();
      await supabase.from("rep_activity").insert({
        rep_code: claims.code,
        rep_name: rep?.rep_name || null,
        event: "lead_rocketreach",
        meta: { lead_id: leadId, person_id: summary.id, has_email: !!summary.emails?.length, has_phone: !!summary.phones?.length },
      });
    } catch { /* ignore */ }

    return jsonResp({ ok: true, cached: false, person: summary });
  } catch (e) {
    console.error("portal-rocketreach error:", e);
    return jsonResp({ error: e instanceof Error ? e.message : "Server error" }, 500);
  }
});
