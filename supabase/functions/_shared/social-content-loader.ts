import { linkedinCompanySlug, normalizeSocialScanUrl, selectSocialSearchSources, socialSearchQuery } from "./social-content-source.ts";

export class SocialContentScanError extends Error {
  constructor(public code: string, message: string, public status = 422) {
    super(message);
    this.name = "SocialContentScanError";
  }
}

export async function loadSocialContent(inputUrl: string, firecrawlKey: string): Promise<{
  text: string; urls: string[]; method: "direct-scrape" | "indexed-search";
}> {
  let url: string;
  try {
    url = normalizeSocialScanUrl(inputUrl);
  } catch (error) {
    throw new SocialContentScanError("INVALID_URL", error instanceof Error ? error.message : "Invalid URL", 400);
  }
  const linkedIn = Boolean(linkedinCompanySlug(url));
  let text = "";

  // LinkedIn company pages frequently return login walls; prefer indexed exact-slug evidence.
  if (!linkedIn) {
    try {
      const response = await fetch("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        signal: AbortSignal.timeout(15_000),
        headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
      });
      if (response.ok) {
        const body = await response.json();
        const candidate = String(body?.data?.markdown || body?.markdown || "");
        if (candidate.length >= 160 && !/join linkedin|sign in to linkedin|create an account to view/i.test(candidate.slice(0, 1200))) {
          text = candidate;
        }
      } else {
        console.warn("generate-social-content direct scrape HTTP", response.status);
        if ([401, 402, 429].includes(response.status)) {
          throw new SocialContentScanError("FIRECRAWL_UNAVAILABLE", "Firecrawl rejected this scan. Check your Firecrawl account or quota.", 502);
        }
      }
    } catch (error) {
      if (error instanceof SocialContentScanError) throw error;
      console.warn("generate-social-content direct scrape failed", error instanceof Error ? error.name : "unknown");
    }
    if (text.length >= 160) return { text: text.slice(0, 8000), urls: [url], method: "direct-scrape" };
  }

  try {
    const response = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: socialSearchQuery(url), limit: 5, sources: ["web"],
        scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
      }),
    });
    if (!response.ok) {
      console.warn("generate-social-content indexed search HTTP", response.status);
      if ([401, 402, 429].includes(response.status)) {
        throw new SocialContentScanError("FIRECRAWL_UNAVAILABLE", "Firecrawl search is unavailable. Check your Firecrawl account or quota.", 502);
      }
    } else {
      const sources = selectSocialSearchSources(await response.json(), url);
      if (sources.length) {
        text = sources.map((source) =>
          `SOURCE: ${source.url}\nTITLE: ${source.title}\nDESCRIPTION: ${source.description}\nPUBLIC TEXT: ${source.markdown}`
        ).join("\n\n");
        if (text.trim().length >= 160) {
          return { text: text.slice(0, 8000), urls: sources.map((source) => source.url), method: "indexed-search" };
        }
      }
    }
  } catch (error) {
    if (error instanceof SocialContentScanError) throw error;
    console.warn("generate-social-content indexed search failed", error instanceof Error ? error.name : "unknown");
  }
  throw new SocialContentScanError(
    "INSUFFICIENT_PUBLIC_EVIDENCE",
    linkedIn
      ? "LinkedIn did not provide enough public company information. Paste the company's website URL instead."
      : "The scan could not verify enough public content. Try a public company website URL.",
  );
}
