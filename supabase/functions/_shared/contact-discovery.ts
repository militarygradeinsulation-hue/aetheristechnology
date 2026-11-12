/**
 * Bounded, evidence-first company contact discovery shared by Aetheris scanners.
 * Public business pages only. A displayed phone/email is a published lead, NOT
 * proof of deliverability, consent, or ownership of a named person's inbox.
 *
 * Request budget: at most 3 Firecrawl scrapes and one map when page links
 * don't identify useful contact pages. No search+scrape or LLM JSON extraction.
 */
export type ContactKind = "email" | "phone";
export type ContactEvidence = {
  kind: ContactKind; value: string; source_url: string;
  method: "mailto" | "tel" | "page_text" | "structured_data";
  confidence: "published";
};
export type ContactDiscovery = {
  email?: string; phone?: string; contact_name?: string;
  all_emails: string[]; all_phones: string[];
  evidence: ContactEvidence[]; pages_scanned: string[];
  candidate_pages: string[]; requests: { scrape: number; map: number };
  markdown_excerpt?: string;
  status: "found" | "partial" | "not_found" | "unavailable";
};
export type SeedPage = {
  url: string; markdown?: string; html?: string; rawHtml?: string;
  links?: unknown[]; metadata?: Record<string, unknown>;
};
export type ContactOptions = { maxPages?: number; seed?: SeedPage; mapIfNeeded?: boolean };

const API = "https://api.firecrawl.dev/v2";
const EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE = /(?:\+?1[\s.\-]?)?(?:\(\d{3}\)|\d{3})[\s.\-]?\d{3}[\s.\-]?\d{4}(?:\s*(?:ext\.?|x)\s*\d{1,5})?/gi;
const GENERIC = /^(?:info|contact|hello|sales|support|office|service|inquiries|enquiries|team|admin|help|general|frontdesk|reception|hr|marketing|billing)$/i;
const BAD_EMAIL = /(?:example\.(?:com|org|net)|yourdomain|domain\.com|test@test|sentry|wixpress|noreply|no-reply|donotreply|\.png$|\.jpg$|\.jpeg$|\.webp$|\.svg$|\.gif$)/i;
const CONTACT_PATH = /(?:^|\/)(?:contact(?:-us)?|about(?:-us)?|team|staff|leadership|people|management|locations?|offices?|directory|impressum|support)(?:[\/.-]|$)/i;
const JUNK_PATH = /(?:^|\/)(?:privacy|terms|login|signin|register|blog|posts?|products?|shop|checkout|cart|jobs|careers|assets|wp-content)(?:[\/.-]|$)/i;

export function safeBusinessUrl(input: string): URL | null {
  try {
    const trimmed = input.trim().slice(0, 500);
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : "https://" + trimmed);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
      url.port || host.length > 253 || !host.includes(".") || host === "localhost" ||
      /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(host) ||
      /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(":") ||
      !/^[a-z0-9.-]+$/.test(host)) return null;
    url.hash = ""; url.search = "";
    return url;
  } catch { return null; }
}

const cleanEmail = (value: string): string | null => {
  const email = value.toLowerCase().trim().replace(/^[<("' ]+|[>)"',;: ]+$/g, "");
  if (email.length > 254 || !/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email) ||
    BAD_EMAIL.test(email) || email.includes("..")) return null;
  return email;
};
const cleanPhone = (value: string): string | null => {
  const phone = value.replace(/\s+/g, " ").trim();
  const base = phone.replace(/(?:ext\.?|x)\s*\d{1,5}$/i, "").trim();
  const digits = base.replace(/\D/g, "");
  if (!(digits.length === 10 || (digits.length === 11 && digits.startsWith("1")))) return null;
  const local = digits.slice(-10);
  if (/^(\d)\1{9}$/.test(local) || local.startsWith("000") || local.slice(3, 6) === "000") return null;
  return phone;
};
/** Decode only the email address published in Cloudflare's cfemail markup. */
export function decodeCloudflareEmail(hex: string): string | null {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length < 6 || hex.length % 2 !== 0) return null;
  const key = Number.parseInt(hex.slice(0, 2), 16);
  let value = "";
  for (let i = 2; i < hex.length; i += 2)
    value += String.fromCharCode(Number.parseInt(hex.slice(i, i + 2), 16) ^ key);
  return cleanEmail(value);
}
const decoded = (value: string): string => value
  .replace(/&commat;|&#0*64;|&#x0*40;/gi, "@")
  .replace(/&period;|&#0*46;|&#x0*2e;/gi, ".")
  .replace(/&amp;/gi, "&")
  .replace(/([\w.+-]+)\s*(?:\[at\]|\(at\))\s*([\w-]+)\s*(?:\[dot\]|\(dot\))\s*([a-z]{2,})/gi, "$1@$2.$3");

const normalizeSiteLink = (raw: unknown, origin: URL): string | null => {
  const input = typeof raw === "string" ? raw : raw && typeof raw === "object"
    ? String((raw as { url?: unknown; href?: unknown }).url ?? (raw as { href?: unknown }).href ?? "") : "";
  try {
    if (!input || /^(?:mailto|tel|javascript|data):/i.test(input)) return null;
    const link = new URL(input, origin);
    const safe = safeBusinessUrl(link.toString());
    if (!safe || safe.hostname.replace(/^www\./, "") !== origin.hostname.replace(/^www\./, "")) return null;
    if (JUNK_PATH.test(link.pathname)) return null;
    link.search = ""; link.hash = "";
    return link.origin + link.pathname.replace(/\/+$/, "");
  } catch { return null; }
};
export function contactPageCandidates(home: string, rawLinks: unknown[]): string[] {
  const base = safeBusinessUrl(home);
  if (!base) return [];
  const origin = new URL(base.origin);
  const unique = new Set<string>();
  for (const link of rawLinks) {
    const candidate = normalizeSiteLink(link, origin);
    if (candidate && candidate !== origin.origin && CONTACT_PATH.test(new URL(candidate).pathname))
      unique.add(candidate);
  }
  const priority = (u: string) => {
    const path = new URL(u).pathname.toLowerCase();
    if (/contact|inquir|support/.test(path)) return 0;
    if (/team|staff|leadership|people|management/.test(path)) return 1;
    if (/about|locations|offices/.test(path)) return 2;
    return 3;
  };
  return [...unique].sort((a, b) => priority(a) - priority(b) || a.length - b.length);
}

function extractPage(page: SeedPage): { evidence: ContactEvidence[]; links: unknown[]; name?: string } {
  const source = safeBusinessUrl(page.url);
  if (!source) return { evidence: [], links: [] };
  const md = decoded((page.markdown || "").slice(0, 35000));
  const html = decoded((page.html || page.rawHtml || "").slice(0, 40000));
  const seen = new Set<string>();
  const evidence: ContactEvidence[] = [];
  const add = (kind: ContactKind, raw: string, method: ContactEvidence["method"]) => {
    const value = kind === "email" ? cleanEmail(raw) : cleanPhone(raw);
    if (!value || seen.has(kind + ":" + value)) return;
    seen.add(kind + ":" + value);
    evidence.push({ kind, value, source_url: source.toString(), method, confidence: "published" });
  };
  for (const body of [md, html]) {
    for (const m of body.matchAll(/\bmailto:([^\s"'<>?)\]]+)/gi)) {
      try { add("email", decodeURIComponent(m[1]!.split("?")[0]), "mailto"); } catch { /* malformed URL */ }
    }
    for (const m of body.matchAll(/\btel:([+0-9().\s-]{10,25})/gi)) add("phone", m[1]!, "tel");
    for (const m of body.matchAll(/"telephone"\s*:\s*"([^"]+)"/gi)) add("phone", m[1]!, "structured_data");
    for (const m of body.matchAll(/"email"\s*:\s*"([^"]+)"/gi)) add("email", m[1]!, "structured_data");
  }
  for (const m of html.matchAll(/data-cfemail\s*=\s*["']([a-f0-9]+)["']/gi)) {
    const email = decodeCloudflareEmail(m[1]!);
    if (email) add("email", email, "structured_data");
  }
  for (const mail of md.match(EMAIL) || []) add("email", mail, "page_text");
  for (const phone of md.match(PHONE) || []) add("phone", phone, "page_text");
  // All contact data must exist in provider-returned text or page markup.
  // Do not infer person@domain addresses or synthesize numbers from company facts.
  const links: unknown[] = Array.isArray(page.links) ? [...page.links] : [];
  for (const m of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) links.push(m[1]!);
  for (const m of md.matchAll(/\]\(([^)]+)\)/g)) links.push(m[1]!);
  const nameMatch = md.match(/\b([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)\s*[,|\-–]\s*(?:Founder|CEO|President|Owner|Principal|Managing Partner|Director)\b/);
  return { evidence, links, name: nameMatch?.[1] };
}
const emailScore = (e: ContactEvidence, host: string): number => {
  const [local, domain] = e.value.split("@");
  return (domain === host || domain.endsWith("." + host) ? 90 : 30) +
    (local && GENERIC.test(local) ? 0 : 20) +
    (e.method === "mailto" || e.method === "structured_data" ? 8 : 0);
};
const phoneScore = (e: ContactEvidence): number => e.method === "tel" ? 100 : e.method === "structured_data" ? 95 : 70;

async function requestFirecrawl(path: string, payload: Record<string, unknown>, key: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(API + path, {
      method: "POST", signal: controller.signal,
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return null;
    const value = await response.json();
    return value?.success === false ? null : value;
  } catch { return null; }
  finally { clearTimeout(timer); }
}

export async function discoverPublicBusinessContacts(
  website: string, apiKey: string, opts: ContactOptions = {},
): Promise<ContactDiscovery> {
  const url = safeBusinessUrl(website);
  const blank = (status: ContactDiscovery["status"]): ContactDiscovery => ({
    all_emails: [], all_phones: [], evidence: [], pages_scanned: [],
    candidate_pages: [], requests: { scrape: 0, map: 0 }, status,
  });
  if (!url || !apiKey) return blank("unavailable");
  const origin = url.origin;
  const maxPages = Math.max(1, Math.min(4, Math.floor(opts.maxPages ?? 3)));
  const found: ContactEvidence[] = [], scanned: string[] = [], allLinks: unknown[] = [];
  let name: string | undefined, homepageText: string | undefined;
  const accept = (page: SeedPage) => {
    const extracted = extractPage(page);
    found.push(...extracted.evidence);
    allLinks.push(...extracted.links);
    if (!name) name = extracted.name;
    if (!homepageText && page.markdown) homepageText = page.markdown.slice(0, 5000);
    scanned.push(page.url);
  };
  const counts = { scrape: 0, map: 0 };
  const pageRead = async (target: string): Promise<boolean> => {
    if (counts.scrape >= maxPages) return false;
    counts.scrape++;
    const value = await requestFirecrawl("/scrape", {
      url: target, formats: ["markdown", "html", "links"], onlyMainContent: false,
    }, apiKey);
    const data = (value as { data?: SeedPage } | null)?.data ?? value as SeedPage | null;
    if (!data || (!data.markdown && !data.html && !data.rawHtml)) return false;
    accept({ ...data, url: target });
    return true;
  };
  const seed = opts.seed && safeBusinessUrl(opts.seed.url)?.hostname.replace(/^www\./, "") === url.hostname.replace(/^www\./, "")
    ? opts.seed : undefined;
  if (seed) accept(seed);
  else await pageRead(origin);
  const haveBoth = () => found.some(x => x.kind === "email") && found.some(x => x.kind === "phone");
  const tried = new Set(scanned.map(x => x.replace(/\/+$/, "")));
  const candidates = () => contactPageCandidates(origin, allLinks);
  let targets = candidates();
  if (!targets.length && !haveBoth() && opts.mapIfNeeded !== false && counts.scrape < maxPages) {
    counts.map++;
    const mapped = await requestFirecrawl("/map", { url: origin, limit: 35, includeSubdomains: false }, apiKey);
    const envelope = mapped as { links?: unknown[]; data?: { links?: unknown[] } } | null;
    const links = envelope?.links || envelope?.data?.links;
    if (Array.isArray(links)) allLinks.push(...links);
    targets = candidates();
  }
  for (const fallback of ["/contact", "/contact-us", "/team", "/about"]) {
    if (targets.length >= 6) break;
    targets.push(origin + fallback);
  }
  targets = [...new Set(targets)];
  for (const target of targets) {
    if (haveBoth() || counts.scrape >= maxPages) break;
    const normalized = target.replace(/\/+$/, "");
    if (tried.has(normalized)) continue;
    tried.add(normalized);
    await pageRead(target);
  }
  const grouped = new Map<string, ContactEvidence>();
  for (const item of found) {
    const key = item.kind + ":" + item.value;
    const previous = grouped.get(key);
    if (!previous || ((item.method === "tel" || item.method === "mailto") &&
      previous.method !== "tel" && previous.method !== "mailto")) grouped.set(key, item);
  }
  const evidence = [...grouped.values()];
  const emails = evidence.filter(x => x.kind === "email")
    .sort((a, b) => emailScore(b, url.hostname.replace(/^www\./, "")) - emailScore(a, url.hostname.replace(/^www\./, "")));
  const phones = evidence.filter(x => x.kind === "phone").sort((a, b) => phoneScore(b) - phoneScore(a));
  const email = emails[0]?.value, phone = phones[0]?.value;
  return {
    ...(email ? { email } : {}), ...(phone ? { phone } : {}),
    ...(name ? { contact_name: name } : {}),
    all_emails: emails.slice(0, 10).map(x => x.value),
    all_phones: phones.slice(0, 10).map(x => x.value),
    evidence, pages_scanned: scanned, candidate_pages: targets,
    requests: counts, ...(homepageText ? { markdown_excerpt: homepageText } : {}),
    status: email && phone ? "found" : email || phone ? "partial" : scanned.length ? "not_found" : "unavailable",
  };
}
