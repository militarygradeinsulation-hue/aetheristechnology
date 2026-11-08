/** Normalize Firecrawl v2 search results without trusting arbitrary page content. */
export function normalizeFirecrawlSearchResponse(raw: unknown) {
  const record = raw && typeof raw === "object" ? raw as Record<string, any> : {};
  const data = record.data;
  const records = Array.isArray(data?.web) ? data.web
    : Array.isArray(data) ? data : [];
  return records.slice(0, 10).filter((item: any) =>
    item && typeof item.url === "string" && /^https?:\/\//i.test(item.url)
  ).map((item: any) => ({
    title: String(item.title || "").slice(0, 240),
    url: String(item.url).slice(0, 2048),
    description: String(item.description || "").slice(0, 600),
    snippet: String(item.markdown || item.content || "").slice(0, 400),
  }));
}
