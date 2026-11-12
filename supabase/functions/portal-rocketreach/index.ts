import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";
import { discoverPublicBusinessContacts, safeBusinessUrl } from "../_shared/contact-discovery.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-portal-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
      .select("id,business_name,contact_name,email,phone,website,enrichment,enriched_at,claimed_by_code,assigned_to_code")
      .eq("id", leadId)
      .maybeSingle();
    if (leadErr || !lead) return jsonResp({ error: "Lead not found" }, 404);

    // Access: must be assigned or claimed by this rep
    if (lead.claimed_by_code !== claims.code && lead.assigned_to_code !== claims.code) {
      return jsonResp({ error: "Not your lead" }, 403);
    }

    const existing = (lead.enrichment as any)?.rocketreach;
    const existingFc = (lead.enrichment as any)?.firecrawl;
    const checkedAt = lead.enriched_at ? new Date(lead.enriched_at).getTime() : NaN;
    // Do not spend credits repeatedly on a recent scan without new evidence.
    if (!force && existingFc && Number.isFinite(checkedAt) &&
        Date.now() - checkedAt < 24 * 60 * 60 * 1000) {
      return jsonResp({ ok: true, cached: true, person: existing || null, firecrawl: existingFc });
    }

    const headers = { "Api-Key": RR_KEY || "", "Content-Type": "application/json" };
    const domain = domainFromUrl(lead.website);
    const name = (body.name || lead.contact_name || "").trim();
    const company = (body.company || lead.business_name || "").trim();
    const email = (body.email || lead.email || "").trim();

    // Bounded business-page discovery; do not incur search+scrape or AI
    // extraction costs on every request. Previously saved company metadata
    // remains available to Detective Mode.
    const FC_KEY = Deno.env.get("FIRECRAWL_API_KEY") || "";
    const websiteUrl = safeBusinessUrl(lead.website || "")?.origin || null;
    const firecrawlPromise = (async () => {
      if (!FC_KEY || !websiteUrl) return existingFc || null;
      const contacts = await discoverPublicBusinessContacts(websiteUrl, FC_KEY, {
        maxPages: 3, mapIfNeeded: true,
      });
      return {
        ...(existingFc && typeof existingFc === "object" ? existingFc : {}),
        json: {
          ...(existingFc?.json && typeof existingFc.json === "object" ? existingFc.json : {}),
          emails: contacts.all_emails, phones: contacts.all_phones,
        },
        markdown_excerpt: contacts.markdown_excerpt || existingFc?.markdown_excerpt || null,
        sitemap: contacts.candidate_pages,
        contact_evidence: contacts.evidence,
        contact_discovery: {
          status: contacts.status, pages_scanned: contacts.pages_scanned,
          requests: contacts.requests, verified: false,
        },
        fetched_at: new Date().toISOString(),
      };
    })();

    let person: any = null;
    let personFromSearch = false;
    let raw: any = null;

    let additionalProfiles: any[] = [];
    if (RR_KEY) {
    // 1) Try lookup by email first (most precise)
    if (email && !/^(?:info|sales|contact|hello|support|admin|office|help|team|reception)@/i.test(email)) {
      const url = `${RR_BASE}/person/lookup?email=${encodeURIComponent(email)}`;
      const r = await fetch(url, { headers });
      raw = await r.json().catch(() => null);
      if (r.ok && raw && (raw.id || raw.name) && (
        (raw.emails || []).some((e: any) => String(e.email || e).toLowerCase() === email.toLowerCase()) ||
        (name && String(raw.name || "").trim().toLowerCase() === name.toLowerCase())
      )) person = raw;
    }

    // 2) Fall back to name + company/domain lookup
    if (!person && name && (company || domain)) {
      const params = new URLSearchParams({ name });
      if (company) params.set("current_employer", company);
      if (domain) params.set("current_employer_domain", domain);
      const url = `${RR_BASE}/person/lookup?${params.toString()}`;
      const r = await fetch(url, { headers });
      raw = await r.json().catch(() => null);
      if (r.ok && raw && String(raw.name || "").trim().toLowerCase() === name.toLowerCase()) person = raw;
    }

    // 3) ALWAYS search by company/domain to surface 2-3 additional decision-makers
    if (company || domain) {
      const r = await fetch(`${RR_BASE}/person/search`, {
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
        // A company search supplies candidates, not a verified lead identity.
        if (!person && name) {
          const exact = additionalProfiles.find((p: any) =>
            String(p?.name || "").trim().toLowerCase() === name.toLowerCase());
          if (exact) { person = exact; personFromSearch = true; }
        }
        if (person) additionalProfiles = additionalProfiles.filter((p: any) =>
          p?.id !== person?.id && p?.name !== person?.name);
      }
    }

    // Search returns candidate summaries, not guaranteed revealed contact
    // information. On an explicit single-lead lookup, enrich at most ONE
    // identity-matched or first company candidate. Batch scans skip this
    // optional paid lookup to avoid multiplying RocketReach credits.
    let candidateLookupCalls = 0;
    if (body.enrich_candidates === true) {
      const candidate = personFromSearch && person && !(person.emails || []).length && !(person.phones || []).length
        ? person : !person ? additionalProfiles[0] : null;
      const identifier = candidate?.id ? "id=" + encodeURIComponent(String(candidate.id))
        : candidate?.linkedin_url ? "linkedin_url=" + encodeURIComponent(String(candidate.linkedin_url)) : "";
      if (identifier) {
        candidateLookupCalls++;
        try {
          const response = await fetch(RR_BASE + "/person/lookup?" + identifier, { headers });
          const detail = await response.json().catch(() => null);
          const expectedName = String(candidate?.name || "").trim().toLowerCase();
          if (response.ok && detail && expectedName &&
            String(detail.name || "").trim().toLowerCase() === expectedName) {
            if (person) person = detail;
            else additionalProfiles[0] = detail;
          }
        } catch { /* keep a search candidate; do not claim contact verification */ }
      }
    }

    }
    // A missing RocketReach key must not suppress public company contacts.
    const firecrawl = await firecrawlPromise;

    // ---- Backfill emails/phones from Firecrawl page extraction ----
    // This is the primary use case for deep scan: even when RocketReach finds no
    // person, surface every email/phone scraped from the prospect's website.
    const EMAIL_RE_PF = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const PHONE_RE_PF = /(\+?\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
    const fcEmails = new Set<string>();
    const fcPhones = new Set<string>();
    if (firecrawl) {
      const jsonE = Array.isArray((firecrawl as any)?.json?.emails) ? (firecrawl as any).json.emails : [];
      const jsonP = Array.isArray((firecrawl as any)?.json?.phones) ? (firecrawl as any).json.phones : [];
      jsonE.forEach((e: any) => { const s = String(e || "").trim().toLowerCase(); if (s && s.includes("@")) fcEmails.add(s); });
      jsonP.forEach((p: any) => { const s = String(p || "").trim(); if (s) fcPhones.add(s); });
      const text = [
        typeof (firecrawl as any)?.markdown_excerpt === "string" ? (firecrawl as any).markdown_excerpt : "",
        typeof (firecrawl as any)?.summary === "string" ? (firecrawl as any).summary : "",
        JSON.stringify((firecrawl as any)?.json || {}),
      ].join("\n");
      (text.match(EMAIL_RE_PF) || []).forEach(e => {
        const s = e.toLowerCase();
        if (!/\.(png|jpg|jpeg|gif|svg|webp)@/i.test(s) && !/(sentry|wixpress|example\.com|test@test)/i.test(s)) {
          fcEmails.add(s);
        }
      });
      (text.match(PHONE_RE_PF) || []).forEach(p => {
        const digits = p.replace(/\D/g, "");
        if (digits.length >= 10 && digits.length <= 13) fcPhones.add(p.trim());
      });
    }

    // If nothing found at all, return cached data (if any) or a soft empty response
    if (!person && !additionalProfiles.length && !firecrawl && fcEmails.size === 0 && fcPhones.size === 0) {
      const cachedRr = (lead.enrichment as any)?.rocketreach || null;
      const cachedFc = (lead.enrichment as any)?.firecrawl || null;
      if (cachedRr || cachedFc) {
        return jsonResp({ ok: true, cached: true, person: cachedRr, firecrawl: cachedFc, note: "No new data — showing previously saved scan" });
      }
      return jsonResp({
        ok: true,
        cached: false,
        person: null,
        firecrawl: null,
        note: lead.website
          ? "No matching person or company data found. Try adding a contact name or email to the lead and re-run."
          : "Add a website URL to the lead first — Firecrawl needs it to pull company info.",
      });
    }

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
      // de-prioritize generic mailboxes
      if (/^(info|sales|support|contact|hello|admin|office|hr|billing|noreply|no-reply)@/.test(addr)) s -= 30;
      // matching domain to website is good
      if (domain && addr.endsWith("@" + domain)) s += 15;
      return s;
    };
    const rawEmails = person ? (person.emails || [])
      .filter((e: any) => e?.smtp_valid !== false && e?.smtp_valid !== "invalid")
      .map((e: any) => ({
      email: e.email, type: e.type, grade: e.grade, smtp_valid: e.smtp_valid,
    })) : [];
    const rankedEmails = [...rawEmails].sort((a, b) => rankEmail(b) - rankEmail(a));
    const bestEmail = rankedEmails[0]?.email || null;
    const bestEmailReason = rankedEmails[0]
      ? [
          rankedEmails[0].type ? `type=${rankedEmails[0].type}` : null,
          rankedEmails[0].grade ? `grade=${rankedEmails[0].grade}` : null,
          rankedEmails[0].smtp_valid ? `smtp=${rankedEmails[0].smtp_valid}` : null,
          domain && String(rankedEmails[0].email || "").toLowerCase().endsWith("@" + domain) ? "domain match" : null,
        ].filter(Boolean).join(" · ")
      : null;

    // Merge Firecrawl-scraped emails/phones into the summary so they appear
    // even when RocketReach has no person match.
    const fcJsonEarly = (firecrawl as any)?.json || {};
    const mergedEmails = [...rankedEmails];
    const haveEmailAddrs = new Set(mergedEmails.map(e => String(e.email || "").toLowerCase()));
    [...fcEmails].forEach(addr => {
      if (!haveEmailAddrs.has(addr)) {
        mergedEmails.push({ email: addr, type: "website", grade: null, smtp_valid: null });
        haveEmailAddrs.add(addr);
      }
    });
    // Domain-match emails float to the top
    mergedEmails.sort((a, b) => {
      const aM = domain && String(a.email || "").toLowerCase().endsWith("@" + domain) ? 1 : 0;
      const bM = domain && String(b.email || "").toLowerCase().endsWith("@" + domain) ? 1 : 0;
      return bM - aM;
    });

    const personPhones = person ? (person.phones || []).map((p: any) => ({ number: p.number, type: p.type, is_premium: p.is_premium })) : [];
    const mergedPhones = [...personPhones];
    const havePhoneDigits = new Set(mergedPhones.map(p => String(p.number || "").replace(/\D/g, "")));
    [...fcPhones].forEach(num => {
      const digits = num.replace(/\D/g, "");
      if (!havePhoneDigits.has(digits)) {
        mergedPhones.push({ number: num, type: "website", is_premium: false });
        havePhoneDigits.add(digits);
      }
    });

    const summary = (person || additionalProfiles.length || mergedEmails.length || mergedPhones.length) ? {
      id: person?.id || null,
      name: person?.name || name || null,
      title: person?.current_title || person?.normalized_title || null,
      employer: person?.current_employer || company || fcJsonEarly?.legal_name || null,
      location: person ? [person.city, person.region, person.country].filter(Boolean).join(", ") : (fcJsonEarly?.headquarters || null),
      linkedin_url: person?.linkedin_url || fcJsonEarly?.social_links?.linkedin || null,
      emails: mergedEmails,
      best_email: mergedEmails[0]?.email || bestEmail || null,
      best_email_reason: bestEmailReason,
      phones: mergedPhones,
      profile_pic: person?.profile_pic || null,
      job_history: person ? (person.job_history || []).slice(0, 5).map((j: any) => ({
        title: j.title, company_name: j.company_name, start_date: j.start_date, end_date: j.end_date,
      })) : [],
      education: person ? (person.education || []).slice(0, 3) : [],
      links: person?.links || fcJsonEarly?.social_links || {},
      lookup_status: person?.status || (person ? null : "firecrawl_only"),
      source: person ? "rocketreach" : (mergedEmails.length || mergedPhones.length ? "website" : "company_candidates"),
      identity_status: person ? "matched" : name ? "unverified" : "company_only",
      contact_evidence: (firecrawl as any)?.contact_evidence || [],
      contact_lookup_calls: candidateLookupCalls,
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

    // Save to enrichment.rocketreach + firecrawl + append to deep_scan_history (full audit trail)
    const prevEnrichment = (lead.enrichment as any) || {};
    const prevHistory = Array.isArray(prevEnrichment.deep_scan_history) ? prevEnrichment.deep_scan_history : [];
    const historyEntry = {
      ran_at: new Date().toISOString(),
      ran_by: claims.code,
      forced: force,
      rocketreach: summary,
      firecrawl,
    };
    const newEnrichment = {
      ...prevEnrichment,
      ...(summary ? { rocketreach: summary } : {}),
      ...(firecrawl ? { firecrawl } : {}),
      deep_scan_history: [historyEntry, ...prevHistory].slice(0, 25),
    };
    const patch: Record<string, unknown> = { enrichment: newEnrichment, enriched_at: new Date().toISOString() };
    const fcJson = firecrawl?.json as any;
    const bestEmailFinal = (person && bestEmail) || [...fcEmails].find(addr =>
      !!domain && addr.endsWith("@" + domain)) || null;
    const bestPhoneFinal = (person && personPhones[0]?.number) || [...fcPhones][0] || null;
    const bestNameFinal = person?.name || null;
    const bestBusinessFinal = fcJson?.legal_name || null;
    // A refresh must not replace a known contact with a different person.
    if (bestEmailFinal && !lead.email) patch.email = String(bestEmailFinal).toLowerCase();
    if (bestPhoneFinal && !lead.phone) patch.phone = bestPhoneFinal;
    if (bestNameFinal && !lead.contact_name) patch.contact_name = bestNameFinal;
    if (bestBusinessFinal && !lead.business_name) patch.business_name = bestBusinessFinal;

    await supabase.from("rep_leads").update(patch).eq("id", leadId);

    try {
      const { data: rep } = await supabase.from("rep_codes").select("rep_name").eq("code", claims.code).maybeSingle();
      await supabase.from("rep_activity").insert({
        rep_code: claims.code,
        rep_name: rep?.rep_name || null,
        event: "lead_rocketreach",
        meta: { lead_id: leadId, person_id: summary?.id, has_email: !!summary?.emails?.length, has_phone: !!summary?.phones?.length, firecrawl: !!firecrawl },
      });
    } catch { /* ignore */ }

    return jsonResp({ ok: true, cached: false, person: summary, firecrawl });
  } catch (e) {
    console.error("portal-rocketreach error:", e);
    return jsonResp({ error: e instanceof Error ? e.message : "Server error" }, 500);
  }
});
