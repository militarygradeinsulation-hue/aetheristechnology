// Golden Report campaign generator.
// For each imported prospect:
//   1. Resolve a company URL (existing website_url, business email domain, or RocketReach lookup).
//   2. If no URL can be found → mark prospect skipped, DO NOT queue an email.
//   3. Kick off forensic-scan-all (Golden Report) for that URL.
//   4. Queue exactly ONE email with Joseph's fixed Golden Report handoff message
//      linking to the live Golden Report page for that scan.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SITE_BASE = "https://aetheris.technology";
const RR_BASE = "https://api.rocketreach.co/api/v2";

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "aol.com",
  "icloud.com", "live.com", "msn.com", "comcast.net", "att.net",
  "verizon.net", "sbcglobal.net", "ymail.com", "me.com", "mac.com",
  "protonmail.com", "proton.me", "mail.com", "gmx.com", "yandex.com",
]);

const SUBJECT = "I find where you're losing customers and money";

function buildBody(reportUrl: string, businessName: string | null): string {
  const who = businessName ? ` for ${escapeHtml(businessName)}` : "";
  return `<p>I find where you are losing customers and money.</p>
<p>Here's yours${who}: <a href="${reportUrl}">${reportUrl}</a></p>
<p>I'll answer your questions on it too. No cost, fees, or strings.</p>
<p>Joseph<br>
~ AI Architect, MS, BA, IBM<br>
<a href="https://aetheris.technology/">Aetheris.Technology</a><br>
<a href="https://www.linkedin.com/in/thejosephtoney">linkedin.com/in/thejosephtoney</a></p>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function domainFromEmail(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 0) return null;
  const d = email.slice(at + 1).toLowerCase().trim();
  if (!d || FREE_EMAIL_DOMAINS.has(d)) return null;
  return d;
}

function normalizeUrl(u: string | null | undefined): string | null {
  if (!u) return null;
  let s = String(u).trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try { const url = new URL(s); return url.origin; } catch { return null; }
}

// Ask RocketReach for a company URL, using email first then name+company.
async function rocketreachLookupUrl(
  rrKey: string,
  email: string | null,
  name: string | null,
  company: string | null,
  domainHint: string | null,
): Promise<{ url: string | null; company: string | null }> {
  const headers = { "Api-Key": rrKey, "Content-Type": "application/json" };
  let person: any = null;

  if (email) {
    try {
      const r = await fetch(`${RR_BASE}/person/lookup?email=${encodeURIComponent(email)}`, { headers });
      if (r.ok) {
        const raw = await r.json().catch(() => null);
        if (raw && (raw.id || raw.name)) person = raw;
      }
    } catch { /* ignore */ }
  }

  if (!person && name && (company || domainHint)) {
    try {
      const params = new URLSearchParams({ name });
      if (company) params.set("current_employer", company);
      if (domainHint) params.set("current_employer_domain", domainHint);
      const r = await fetch(`${RR_BASE}/person/lookup?${params.toString()}`, { headers });
      if (r.ok) {
        const raw = await r.json().catch(() => null);
        if (raw && (raw.id || raw.name)) person = raw;
      }
    } catch { /* ignore */ }
  }

  const links = person?.links || {};
  const candidates: string[] = [
    person?.current_employer_website,
    person?.current_employer_domain,
    links?.website,
    links?.company,
  ].filter((x): x is string => typeof x === "string" && x.length > 0);

  for (const c of candidates) {
    const u = normalizeUrl(c);
    if (u) return { url: u, company: person?.current_employer || company };
  }
  return { url: null, company: person?.current_employer || company };
}

async function kickOffGoldenScan(
  supabaseUrl: string,
  serviceKey: string,
  targetUrl: string,
  company: string | null,
): Promise<string | null> {
  try {
    const r = await fetch(`${supabaseUrl}/functions/v1/forensic-scan-all`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({ url: targetUrl, company: company || undefined }),
    });
    if (!r.ok) {
      console.error("forensic-scan-all failed", r.status, (await r.text()).slice(0, 200));
      return null;
    }
    const j = await r.json();
    return j?.scan_id || null;
  } catch (e) {
    console.error("kickOffGoldenScan error", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { batchSize = 10, concurrency = 3 } = await req.json().catch(() => ({}));

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RR_KEY = Deno.env.get("ROCKETREACH_API_KEY");
    if (!RR_KEY) throw new Error("ROCKETREACH_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Grab an active sequence just to satisfy the drip_emails.sequence_id FK.
    const { data: seqData } = await supabase
      .from("drip_sequences")
      .select("id")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    const sequenceId = seqData?.id || null;
    if (!sequenceId) {
      return new Response(JSON.stringify({ error: "No active drip sequence found (need one row in drip_sequences to attach emails to)." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cappedBatch = Math.min(batchSize, 100);
    // Claim the batch synchronously so parallel invocations don't double-process,
    // then do all the slow per-prospect work (RocketReach + forensic-scan-all) in the background.
    const { data: prospects, error: prospErr } = await supabase
      .from("drip_prospects")
      .select("*")
      .eq("status", "imported")
      .limit(cappedBatch);

    if (prospErr || !prospects || prospects.length === 0) {
      return new Response(JSON.stringify({ message: "No imported prospects to process", processed: 0, queued: 0, skipped_no_url: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Flip them to 'processing' immediately so re-runs won't grab the same rows.
    const ids = prospects.map((p) => p.id);
    await supabase.from("drip_prospects").update({ status: "processing" }).in("id", ids);

    const work = (async () => {
      let queued = 0;
      let skippedNoUrl = 0;
      let failed = 0;

      const chunkSize = Math.min(concurrency, 5);
      for (let c = 0; c < prospects.length; c += chunkSize) {
        const chunk = prospects.slice(c, c + chunkSize);
        const results = await Promise.allSettled(
          chunk.map(async (prospect) => {
            const email: string = prospect.email;
            const scraped = prospect.scraped_data || {};
            const contactName: string | null = scraped.name || scraped.contact_name || null;

            // 1. Resolve URL.
            const emailDomain = domainFromEmail(email);
            let url = normalizeUrl(prospect.website_url) || (emailDomain ? `https://${emailDomain}` : null);
            let companyName: string | null = prospect.business_name || null;

            if (!url) {
              const rr = await rocketreachLookupUrl(RR_KEY, email, contactName, companyName, emailDomain);
              url = rr.url;
              if (rr.company) companyName = rr.company;
            }

            if (!url) {
              skippedNoUrl++;
              await supabase.from("drip_prospects").update({
                status: "skipped",
                scraped_data: { ...scraped, skip_reason: "no_company_url", skipped_at: new Date().toISOString() },
              }).eq("id", prospect.id);
              return;
            }

            // 2. Kick off Golden Report scan.
            const scanId = await kickOffGoldenScan(SUPABASE_URL, SERVICE_KEY, url, companyName);
            if (!scanId) {
              failed++;
              await supabase.from("drip_prospects").update({
                status: "imported", // put back so it can be retried
                scraped_data: { ...scraped, scan_error: "forensic_scan_all_failed", audit_url: url },
              }).eq("id", prospect.id);
              return;
            }

            const reportUrl = `${SITE_BASE}/golden-report?scan=${scanId}`;

            const { error: insErr } = await supabase.from("drip_emails").insert({
              prospect_id: prospect.id,
              sequence_id: sequenceId,
              step_index: 0,
              scheduled_for: new Date().toISOString(),
              status: "pending",
              subject: SUBJECT,
              body_html: buildBody(reportUrl, companyName),
            });
            if (insErr) throw insErr;

            await supabase.from("drip_prospects").update({
              status: "active",
              website_url: prospect.website_url || url,
              business_name: prospect.business_name || companyName,
              scraped_data: {
                ...scraped,
                golden_scan_id: scanId,
                golden_report_url: reportUrl,
                audit_url: url,
                queued_at: new Date().toISOString(),
              },
            }).eq("id", prospect.id);

            queued++;
          })
        );

        for (const r of results) if (r.status === "rejected") failed++;
      }
      console.log(`generate-drip-batch done: queued=${queued} skipped=${skippedNoUrl} failed=${failed}`);
    })();

    // Fire-and-forget so gateway doesn't time out (Golden scans can take 90s+ each).
    // @ts-ignore EdgeRuntime is available in supabase edge runtime
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(work);
    } else {
      work.catch((e) => console.error("background work error", e));
    }

    return new Response(
      JSON.stringify({
        message: `Started background processing for ${prospects.length} prospects. Check drip_prospects for results.`,
        started: prospects.length,
        async: true,
      }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-drip-batch error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
