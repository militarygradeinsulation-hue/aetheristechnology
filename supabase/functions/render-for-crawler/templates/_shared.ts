// Shared HTML helpers for crawler-facing prerender templates.
// Output is plain, semantic HTML — no JS required to consume.

export const SITE_URL = "https://aetheris.technology";
export const SITE_NAME = "Aetheris AI";
export const OG_IMAGE = `${SITE_URL}/aetheris-logo.png`;
export const PHONE = "(317) 376-2110";
export const EMAIL = "joseph@aetheris.technology";

export interface SeoOverride {
  title?: string | null;
  description?: string | null;
  keywords?: string | null;
  tldr?: string | null;
  faqs?: Array<{ question: string; answer: string }> | null;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeAttr(s: string): string {
  return escapeHtml(s);
}

export interface HeadOptions {
  title: string;
  description: string;
  path: string;
  keywords?: string;
  type?: "website" | "article";
  image?: string;
  jsonLd?: Array<Record<string, unknown>>;
  articleMeta?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    tags?: string[];
  };
}

export function renderHead(opts: HeadOptions): string {
  const url = `${SITE_URL}${opts.path}`;
  const image = opts.image || OG_IMAGE;
  const type = opts.type || "website";

  const articleTags = opts.articleMeta?.tags?.map(t =>
    `    <meta property="article:tag" content="${escapeAttr(t)}" />`
  ).join("\n") || "";

  const articleBlock = type === "article" ? `
    ${opts.articleMeta?.publishedTime ? `<meta property="article:published_time" content="${escapeAttr(opts.articleMeta.publishedTime)}" />` : ""}
    ${opts.articleMeta?.modifiedTime ? `<meta property="article:modified_time" content="${escapeAttr(opts.articleMeta.modifiedTime)}" />` : ""}
    ${opts.articleMeta?.author ? `<meta property="article:author" content="${escapeAttr(opts.articleMeta.author)}" />` : ""}
${articleTags}
` : "";

  const ldBlocks = (opts.jsonLd || [])
    .map(o => `    <script type="application/ld+json">${JSON.stringify(o)}</script>`)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(opts.title)}</title>
    <meta name="description" content="${escapeAttr(opts.description)}" />
    ${opts.keywords ? `<meta name="keywords" content="${escapeAttr(opts.keywords)}" />` : ""}
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <link rel="canonical" href="${escapeAttr(url)}" />
    <link rel="alternate" hreflang="en-us" href="${escapeAttr(url)}" />
    <meta name="generator" content="Aetheris Prerender v1" />

    <meta property="og:type" content="${type}" />
    <meta property="og:url" content="${escapeAttr(url)}" />
    <meta property="og:title" content="${escapeAttr(opts.title)}" />
    <meta property="og:description" content="${escapeAttr(opts.description)}" />
    <meta property="og:image" content="${escapeAttr(image)}" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:locale" content="en_US" />
    ${articleBlock}

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeAttr(opts.title)}" />
    <meta name="twitter:description" content="${escapeAttr(opts.description)}" />
    <meta name="twitter:image" content="${escapeAttr(image)}" />

${ldBlocks}
  </head>`;
}

export function organizationLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Aetheris AI",
    alternateName: ["Aetheris", "Aetheris Technology"],
    url: SITE_URL,
    logo: OG_IMAGE,
    telephone: PHONE,
    email: EMAIL,
    description: "Business Forensics Operator. Indianapolis-based AI consulting and operational diagnostics. The Leak Audit™ methodology finds and fixes the revenue your business is silently losing.",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Indianapolis",
      addressRegion: "IN",
      addressCountry: "US",
    },
    founder: { "@type": "Person", name: "Joseph Toney", jobTitle: "Business Forensics Operator" },
    sameAs: ["https://www.linkedin.com/company/aetheris-technology"],
  };
}

export function breadcrumbLd(items: Array<{ name: string; path: string }>): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export function faqLd(faqs: Array<{ question: string; answer: string }>): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(f => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export function speakableLd(selectors: string[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    speakable: { "@type": "SpeakableSpecification", cssSelector: selectors },
  };
}

export function renderFooter(): string {
  return `
    <footer>
      <hr />
      <p><strong>Aetheris AI</strong> — Business Forensics Operator</p>
      <p>Indianapolis, Indiana</p>
      <p>Phone: <a href="tel:+13173762110">${PHONE}</a></p>
      <p>Email: <a href="mailto:${EMAIL}">${EMAIL}</a></p>
      <p>
        <a href="${SITE_URL}/">Home</a> ·
        <a href="${SITE_URL}/leak-audit">Leak Audit</a> ·
        <a href="${SITE_URL}/business-diagnostic">Diagnostic</a> ·
        <a href="${SITE_URL}/services">Services</a> ·
        <a href="${SITE_URL}/about">About</a> ·
        <a href="${SITE_URL}/blog">Blog</a> ·
        <a href="${SITE_URL}/contact">Contact</a>
      </p>
    </footer>
  </body>
</html>`;
}

export function renderFaqSection(faqs: Array<{ question: string; answer: string }>): string {
  if (!faqs.length) return "";
  return `
    <section aria-labelledby="faq-heading">
      <h2 id="faq-heading">Frequently Asked Questions</h2>
      <dl>
        ${faqs.map(f => `
          <dt><strong>${escapeHtml(f.question)}</strong></dt>
          <dd>${escapeHtml(f.answer)}</dd>
        `).join("")}
      </dl>
    </section>`;
}

export async function fetchSeoOverride(
  supabaseUrl: string,
  serviceRoleKey: string,
  path: string
): Promise<SeoOverride | null> {
  try {
    const r = await fetch(
      `${supabaseUrl}/rest/v1/seo_overrides?path=eq.${encodeURIComponent(path)}&select=title,description,keywords,tldr,faqs&limit=1`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      }
    );
    if (!r.ok) return null;
    const rows = await r.json();
    return rows[0] || null;
  } catch {
    return null;
  }
}

export async function hashHtml(html: string): Promise<string> {
  const buf = new TextEncoder().encode(html);
  const digest = await crypto.subtle.digest("SHA-1", buf);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}
