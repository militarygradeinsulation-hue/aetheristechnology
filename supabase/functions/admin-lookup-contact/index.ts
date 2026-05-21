// Admin: look up a contact by phone, email, name, or company.
// Searches local tables first, then RocketReach as a fallback.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const RR_BASE = "https://api.rocketreach.co/api/v2";

function normPhone(p: string): string {
  return (p || "").replace(/\D/g, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ok = await verifyAdminToken(getAdminTokenFromRequest(req), secret);
    if (!ok) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const phoneRaw = String(body.phone || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const company = String(body.company || "").trim();
    const linkedin = String(body.linkedin || "").trim();
    const useRocketReach = body.skipRocketReach !== true;

    if (!phoneRaw && !email && !name && !company && !linkedin) {
      return json({ error: "Provide phone, email, name, company, or linkedin." }, 400);
    }

    const phoneDigits = normPhone(phoneRaw);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, secret);

    const matches: any[] = [];
    const seen = new Set<string>();
    const addMatch = (source: string, row: any, label: string) => {
      const key = `${source}:${row.id || row.email || row.phone || JSON.stringify(row).slice(0, 80)}`;
      if (seen.has(key)) return;
      seen.add(key);
      matches.push({ source, label, data: row });
    };

    // Build OR filters per table
    const phoneLike = phoneDigits ? `%${phoneDigits.slice(-7)}%` : null;

    // customers
    {
      const filters: string[] = [];
      if (email) filters.push(`email.ilike.${email}`);
      if (phoneLike) filters.push(`phone.ilike.${phoneLike}`);
      if (name) filters.push(`name.ilike.%${name}%`);
      if (filters.length) {
        const { data } = await supabase.from("customers").select("*").or(filters.join(",")).limit(10);
        (data || []).forEach((r: any) => addMatch("customers", r, r.name || r.email || "Customer"));
      }
    }
    // drip_prospects
    {
      const filters: string[] = [];
      if (email) filters.push(`email.ilike.${email}`);
      if (name) filters.push(`business_name.ilike.%${name}%`);
      if (company) filters.push(`business_name.ilike.%${company}%`);
      if (filters.length) {
        const { data } = await supabase.from("drip_prospects").select("*").or(filters.join(",")).limit(10);
        (data || []).forEach((r: any) => addMatch("drip_prospects", r, r.business_name || r.email || "Drip lead"));
      }
    }
    // rep_leads
    {
      const filters: string[] = [];
      if (email) filters.push(`email.ilike.${email}`);
      if (phoneLike) filters.push(`phone.ilike.${phoneLike}`);
      if (name) filters.push(`contact_name.ilike.%${name}%`);
      if (company) filters.push(`business_name.ilike.%${company}%`);
      if (filters.length) {
        const { data } = await supabase.from("rep_leads").select("*").or(filters.join(",")).limit(10);
        (data || []).forEach((r: any) => addMatch("rep_leads", r, r.business_name || r.contact_name || r.email || "Rep lead"));
      }
    }
    // crm_contacts
    {
      const filters: string[] = [];
      if (email) filters.push(`email.ilike.${email}`);
      if (phoneLike) filters.push(`phone.ilike.${phoneLike}`);
      if (name) filters.push(`full_name.ilike.%${name}%`);
      if (filters.length) {
        const { data } = await supabase.from("crm_contacts").select("*").or(filters.join(",")).limit(10);
        (data || []).forEach((r: any) => addMatch("crm_contacts", r, r.full_name || r.email || "CRM contact"));
      }
    }
    // careers_applications
    {
      const filters: string[] = [];
      if (email) filters.push(`candidate_email.ilike.${email}`);
      if (phoneLike) filters.push(`candidate_phone.ilike.${phoneLike}`);
      if (name) filters.push(`candidate_name.ilike.%${name}%`);
      if (filters.length) {
        const { data } = await supabase
          .from("careers_applications")
          .select("id,candidate_name,candidate_email,candidate_phone,position,status,created_at")
          .or(filters.join(","))
          .limit(10);
        (data || []).forEach((r: any) => addMatch("careers_applications", r, `Applicant: ${r.candidate_name || r.candidate_email}`));
      }
    }
    // webinar_registrations
    if (email || name) {
      const filters: string[] = [];
      if (email) filters.push(`email.ilike.${email}`);
      if (name) filters.push(`name.ilike.%${name}%`);
      const { data } = await supabase
        .from("webinar_registrations")
        .select("id,name,email,rep_code,created_at,webinar_id")
        .or(filters.join(","))
        .limit(10);
      (data || []).forEach((r: any) => addMatch("webinar_registrations", r, `Webinar: ${r.name || r.email}`));
    }

    // RocketReach lookup
    let rocketreach: any = null;
    let rrError: string | null = null;
    if (useRocketReach) {
      const RR_KEY = Deno.env.get("ROCKETREACH_API_KEY");
      if (!RR_KEY) {
        rrError = "RocketReach not configured";
      } else {
        const headers = { "Api-Key": RR_KEY, "Content-Type": "application/json" };
        try {
          let person: any = null;
          // 1. Email lookup (most precise)
          if (email) {
            const r = await fetch(`${RR_BASE}/person/lookup?email=${encodeURIComponent(email)}`, { headers });
            const raw = await r.json().catch(() => null);
            if (r.ok && raw && (raw.id || raw.name)) person = raw;
          }
          // 2. LinkedIn URL lookup
          if (!person && linkedin) {
            const r = await fetch(`${RR_BASE}/person/lookup?li_url=${encodeURIComponent(linkedin)}`, { headers });
            const raw = await r.json().catch(() => null);
            if (r.ok && raw && (raw.id || raw.name)) person = raw;
          }
          // 3. Name + company
          if (!person && name && company) {
            const params = new URLSearchParams({ name, current_employer: company });
            const r = await fetch(`${RR_BASE}/person/lookup?${params.toString()}`, { headers });
            const raw = await r.json().catch(() => null);
            if (r.ok && raw && (raw.id || raw.name)) person = raw;
          }
          // 4. Phone search (RocketReach search supports phone in query)
          let phoneResults: any[] = [];
          if (phoneDigits.length >= 7) {
            const r = await fetch(`${RR_BASE}/search`, {
              method: "POST",
              headers,
              body: JSON.stringify({
                query: { phone: [phoneDigits] },
                start: 1,
                page_size: 5,
              }),
            });
            const sraw = await r.json().catch(() => null);
            if (r.ok && Array.isArray(sraw?.profiles)) {
              phoneResults = sraw.profiles;
              if (!person && phoneResults[0]) person = phoneResults[0];
            }
          }
          // 5. Generic name/company search
          let otherProfiles: any[] = [];
          if (!person && (name || company)) {
            const r = await fetch(`${RR_BASE}/search`, {
              method: "POST",
              headers,
              body: JSON.stringify({
                query: {
                  ...(name ? { name: [name] } : {}),
                  ...(company ? { current_employer: [company] } : {}),
                },
                start: 1,
                page_size: 5,
              }),
            });
            const sraw = await r.json().catch(() => null);
            if (r.ok && Array.isArray(sraw?.profiles)) {
              otherProfiles = sraw.profiles;
              if (!person && otherProfiles[0]) person = otherProfiles[0];
            }
          }

          if (person) {
            rocketreach = {
              id: person.id,
              name: person.name,
              title: person.current_title || person.normalized_title,
              employer: person.current_employer,
              location: [person.city, person.region, person.country].filter(Boolean).join(", "),
              linkedin_url: person.linkedin_url,
              profile_pic: person.profile_pic,
              emails: (person.emails || []).map((e: any) => ({ email: e.email, type: e.type, grade: e.grade, smtp_valid: e.smtp_valid })),
              phones: (person.phones || []).map((p: any) => ({ number: p.number, type: p.type })),
              job_history: (person.job_history || []).slice(0, 5).map((j: any) => ({
                title: j.title, company_name: j.company_name, start_date: j.start_date, end_date: j.end_date,
              })),
              links: person.links || {},
              additional: [...phoneResults, ...otherProfiles]
                .filter((p) => p && p.id !== person.id)
                .slice(0, 4)
                .map((p: any) => ({
                  id: p.id,
                  name: p.name,
                  title: p.current_title,
                  employer: p.current_employer,
                  linkedin_url: p.linkedin_url,
                  emails: (p.emails || []).slice(0, 2).map((e: any) => e.email),
                  phones: (p.phones || []).slice(0, 2).map((ph: any) => ph.number),
                })),
            };
          }
        } catch (e) {
          rrError = e instanceof Error ? e.message : String(e);
        }
      }
    }

    return json({
      ok: true,
      query: { phone: phoneRaw, email, name, company, linkedin },
      local_matches: matches,
      rocketreach,
      rocketreach_error: rrError,
    });
  } catch (e) {
    console.error("admin-lookup-contact error:", e);
    return json({ error: e instanceof Error ? e.message : "Server error" }, 500);
  }
});
