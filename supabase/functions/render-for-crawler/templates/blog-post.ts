import {
  renderHead,
  renderFooter,
  organizationLd,
  breadcrumbLd,
  speakableLd,
  escapeHtml,
  SITE_URL,
} from "./_shared.ts";

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  meta_description: string | null;
  featured_image: string | null;
  author: string;
  published_at: string | null;
  updated_at: string | null;
  tags: string[] | null;
}

// Minimal markdown → HTML for crawler consumption.
// Handles headings, paragraphs, lists, links, bold, italic, code blocks.
// Real users get the React renderer; this is just for bots.
function markdownToHtml(md: string): string {
  let html = md.trim();

  // Code blocks ```lang ... ```
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_m, _lang, code) =>
    `<pre><code>${escapeHtml(code)}</code></pre>`
  );

  // Headings
  html = html.replace(/^###### (.+)$/gm, "<h6>$1</h6>");
  html = html.replace(/^##### (.+)$/gm, "<h5>$1</h5>");
  html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h2>$1</h2>"); // demote to h2 (page already has h1)

  // Bold + italic
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");

  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Inline code
  html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>");

  // Lists — collapse consecutive list lines into <ul>/<ol>
  const lines = html.split("\n");
  const out: string[] = [];
  let inUl = false;
  let inOl = false;
  let paraBuf: string[] = [];

  const flushPara = () => {
    if (paraBuf.length) {
      const text = paraBuf.join(" ").trim();
      if (text) out.push(`<p>${text}</p>`);
      paraBuf = [];
    }
  };
  const closeLists = () => {
    if (inUl) { out.push("</ul>"); inUl = false; }
    if (inOl) { out.push("</ol>"); inOl = false; }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*[-*+]\s+/.test(line)) {
      flushPara();
      if (inOl) { out.push("</ol>"); inOl = false; }
      if (!inUl) { out.push("<ul>"); inUl = true; }
      out.push(`<li>${line.replace(/^\s*[-*+]\s+/, "")}</li>`);
    } else if (/^\s*\d+\.\s+/.test(line)) {
      flushPara();
      if (inUl) { out.push("</ul>"); inUl = false; }
      if (!inOl) { out.push("<ol>"); inOl = true; }
      out.push(`<li>${line.replace(/^\s*\d+\.\s+/, "")}</li>`);
    } else if (/^<(h[1-6]|pre|blockquote|ul|ol)/.test(line)) {
      flushPara();
      closeLists();
      out.push(line);
    } else if (line === "") {
      flushPara();
      closeLists();
    } else {
      paraBuf.push(line);
    }
  }
  flushPara();
  closeLists();

  return out.join("\n");
}

async function fetchPost(
  supabaseUrl: string,
  serviceRoleKey: string,
  slug: string
): Promise<BlogPost | null> {
  const r = await fetch(
    `${supabaseUrl}/rest/v1/blog_posts?slug=eq.${encodeURIComponent(slug)}&is_published=eq.true&select=slug,title,excerpt,content,meta_description,featured_image,author,published_at,updated_at,tags&limit=1`,
    { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } }
  );
  if (!r.ok) return null;
  const rows = await r.json();
  return rows[0] || null;
}

export async function renderBlogPost(
  supabaseUrl: string,
  serviceRoleKey: string,
  slug: string
): Promise<string | null> {
  const post = await fetchPost(supabaseUrl, serviceRoleKey, slug);
  if (!post) return null;

  const path = `/blog/${post.slug}`;
  const title = post.title.length > 60 ? post.title : `${post.title} | Aetheris AI`;
  const description = (post.meta_description || post.excerpt).slice(0, 155);
  const image = post.featured_image || undefined;

  const head = renderHead({
    title,
    description,
    path,
    type: "article",
    image,
    keywords: post.tags?.join(", "),
    articleMeta: {
      publishedTime: post.published_at || undefined,
      modifiedTime: post.updated_at || undefined,
      author: post.author,
      tags: post.tags || undefined,
    },
    jsonLd: [
      organizationLd(),
      breadcrumbLd([
        { name: "Home", path: "/" },
        { name: "Blog", path: "/blog" },
        { name: post.title, path },
      ]),
      speakableLd(["h1", ".excerpt", "h2"]),
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: post.title,
        description,
        image: image ? [image] : undefined,
        datePublished: post.published_at,
        dateModified: post.updated_at,
        author: { "@type": "Person", name: post.author },
        publisher: {
          "@type": "Organization",
          name: "Aetheris AI",
          logo: { "@type": "ImageObject", url: `${SITE_URL}/aetheris-logo.png` },
        },
        mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}${path}` },
        keywords: post.tags?.join(", "),
      },
    ],
  });

  const bodyHtml = markdownToHtml(post.content || "");
  const publishedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "";

  return `${head}
  <body>
    <main>
      <article>
        <header>
          <h1>${escapeHtml(post.title)}</h1>
          <p class="excerpt">${escapeHtml(post.excerpt)}</p>
          <p>
            By <strong>${escapeHtml(post.author)}</strong>
            ${publishedDate ? ` · Published ${publishedDate}` : ""}
          </p>
          ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(post.title)}" />` : ""}
          ${post.tags?.length ? `<p>Tags: ${post.tags.map(t => `<span>${escapeHtml(t)}</span>`).join(", ")}</p>` : ""}
        </header>
        <section>${bodyHtml}</section>
        <hr />
        <section>
          <h2>About Aetheris AI</h2>
          <p>Aetheris AI is the Indianapolis-based Business Forensics Operator behind The Leak Audit™ — a 7-step methodology for finding the silent revenue leaks in operational businesses.</p>
          <p><a href="${SITE_URL}/leak-audit">Run the free Leak Audit self-scan →</a></p>
          <p><a href="${SITE_URL}/services">See engagement options</a> · Call <a href="tel:+13173762110">(317) 376-2110</a></p>
        </section>
      </article>
    </main>
    ${renderFooter()}`;
}
