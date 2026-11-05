// Shared lead enrichment helper.
// 1) Scrapes the company's site (homepage + likely contact/about pages) via Firecrawl.
// 2) Extracts contact info: real-person emails first, then generic mailboxes
//    (info@, contact@, sales@, hello@, support@, admin@) as a fallback so we
//    NEVER leave a lead without contact info when the site exposes one.
// 3) Pulls a phone number and a likely contact name (from "About"/leadership).

const GENERIC_PREFIXES = [
  "info", "contact", "sales", "hello", "support", "admin",
  "team", "office", "marketing", "help", "service", "enquiries", "inquiries",
];

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(\+?1[\s.\-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/g;

const JUNK_EMAIL_HINTS = [
  "sentry", "wixpress", "example.", "yourdomain", "domain.com",
  "@2x", ".png", ".jpg", ".jpeg", ".svg", ".webp", ".gif",
];

function normalizeDomain(url: string): string {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    return u.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return url.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

function scoreEmail(email: string, domain: string): number {
  const e = email.toLowerCase();
  if (JUNK_EMAIL_HINTS.some(h => e.includes(h))) return -1;
  const [local, host] = e.split("@");
  if (!local || !host) return -1;
  // Strongly prefer same-domain matches
  const domainScore = host === domain || host.endsWith(`.${domain}`) ? 50 : 0;
  // Real person (has a dot or looks like first.last / firstl)
  const isGeneric = GENERIC_PREFIXES.includes(local);
  const personScore = isGeneric ? 0 : (local.includes(".") ? 30 : 15);
  // Generic mailboxes still count, just lower
  const genericScore = isGeneric ? 10 : 0;
  return domainScore + personScore + genericScore;
}

async function firecrawlScrape(url: string, apiKey: string): Promise<string> {
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: false,
        waitFor: 1500,
      }),
    });
    if (!res.ok) return "";
    const data = await res.json();
    return (data?.data?.markdown || data?.markdown || "").slice(0, 20000);
  } catch {
    return "";
  }
}

export interface EnrichedContact {
  email?: string;
  phone?: string;
  contact_name?: string;
  all_emails?: string[];
}

/**
 * Try the homepage first, then /contact, /about, /team — stop as soon as we
 * have a same-domain real-person email. Always return the best generic
 * mailbox we find if no person email is present.
 */
export async function enrichLeadFromWebsite(
  website: string,
  apiKey: string,
): Promise<EnrichedContact> {
  if (!website || !apiKey) return {};
  const domain = normalizeDomain(website);
  const base = `https://${domain}`;
  const paths = ["", "/contact", "/contact-us", "/about", "/about-us", "/team", "/leadership"];

  const found = new Map<string, number>(); // email -> score
  let phone: string | undefined;
  let contactName: string | undefined;

  for (const p of paths) {
    const md = await firecrawlScrape(`${base}${p}`, apiKey);
    if (!md) continue;

    // Emails
    const emails = md.match(EMAIL_RE) || [];
    for (const raw of emails) {
      const e = raw.toLowerCase();
      const s = scoreEmail(e, domain);
      if (s < 0) continue;
      if (!found.has(e) || (found.get(e) ?? 0) < s) found.set(e, s);
    }

    // Phone (first plausible US-style number)
    if (!phone) {
      const m = md.match(PHONE_RE);
      if (m && m[0]) phone = m[0].trim();
    }

    // Contact name — look for "Founder", "CEO", "Owner", "President" lines
    if (!contactName) {
      const nameMatch = md.match(
        /([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)\s*[,\-–|]\s*(?:Founder|Co-?Founder|CEO|Owner|President|Principal|Managing Partner|Director)/,
      );
      if (nameMatch) contactName = nameMatch[1];
    }

    // Stop early if we already have a same-domain person email
    const top = [...found.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 65) break;
  }

  const sorted = [...found.entries()].sort((a, b) => b[1] - a[1]);
  const best = sorted[0]?.[0];

  return {
    email: best,
    phone,
    contact_name: contactName,
    all_emails: sorted.slice(0, 5).map(([e]) => e),
  };
}
