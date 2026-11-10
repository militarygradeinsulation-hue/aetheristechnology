/** Bounded, exact-company Firecrawl fallback for social content scans. */
export type SocialSource = { url: string; title: string; description: string; markdown: string };

const cleanHost = (host: string) => host.toLowerCase().replace(/^www\./, "");

export function normalizeSocialScanUrl(value: string): string {
  if (typeof value !== "string" || !value.trim() || value.length > 2048) {
    throw new Error("Enter a company website or a LinkedIn company URL.");
  }
  let parsed: URL;
  try {
    const raw = value.trim();
    parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new Error("Enter a valid public website URL.");
  }
  const host = cleanHost(parsed.hostname);
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password ||
      !host.includes(".") || host === "localhost" || host.endsWith(".local") ||
      /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) ||
      host === "[::1]") {
    throw new Error("Enter a public HTTPS website or LinkedIn company URL.");
  }
  parsed.hash = "";
  return parsed.toString();
}

export function linkedinCompanySlug(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (cleanHost(parsed.hostname) !== "linkedin.com") return null;
    return /^\/company\/([a-z0-9][a-z0-9-]*)(?:\/|$)/i.exec(parsed.pathname)?.[1].toLowerCase() || null;
  } catch {
    return null;
  }
}

export function socialSearchQuery(url: string): string {
  const parsed = new URL(url);
  const slug = linkedinCompanySlug(url);
  if (slug) return `site:linkedin.com/company/${slug} ${slug.replace(/-/g, " ")}`;
  return `site:${cleanHost(parsed.hostname)} services products about company`;
}

function matchingSource(candidate: string, target: string): boolean {
  try {
    const found = new URL(candidate);
    const wanted = new URL(target);
    if (!["http:", "https:"].includes(found.protocol)) return false;
    const slug = linkedinCompanySlug(target);
    if (slug) return linkedinCompanySlug(candidate) === slug;
    return cleanHost(found.hostname) === cleanHost(wanted.hostname);
  } catch {
    return false;
  }
}

export function selectSocialSearchSources(raw: unknown, target: string): SocialSource[] {
  if (!raw || typeof raw !== "object") return [];
  const json = raw as { data?: unknown; results?: unknown };
  const data = json.data as { web?: unknown } | undefined;
  const rows = Array.isArray(data?.web) ? data.web
    : Array.isArray(json.data) ? json.data
    : Array.isArray(json.results) ? json.results : [];
  const seen = new Set<string>();
  const sources: SocialSource[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const url = typeof item.url === "string" ? item.url : "";
    if (!matchingSource(url, target)) continue;
    const key = url.replace(/\/?(?:\?.*)?$/, "").toLowerCase();
    if (seen.has(key)) continue;
    const title = typeof item.title === "string" ? item.title.slice(0, 180) : "";
    const description = typeof item.description === "string" ? item.description.slice(0, 1200) : "";
    const markdown = typeof item.markdown === "string" ? item.markdown.slice(0, 4500) : "";
    const summary = `${title} ${description} ${markdown}`.trim();
    if (summary.length < 60) continue;
    if (!description && markdown.length < 120 &&
        /(?:sign in|join linkedin|create an account|log in)/i.test(summary)) continue;
    seen.add(key);
    sources.push({ url: url.slice(0, 2048), title, description, markdown });
    if (sources.length === 3) break;
  }
  return sources;
}
