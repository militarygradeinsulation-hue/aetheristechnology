import {
  renderHead,
  renderFooter,
  renderFaqSection,
  organizationLd,
  breadcrumbLd,
  faqLd,
  speakableLd,
  fetchSeoOverride,
  SITE_URL,
} from "./_shared.ts";

export async function renderAbout(
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<string> {
  const path = "/about";
  const override = await fetchSeoOverride(supabaseUrl, serviceRoleKey, path);

  const title = override?.title || "About Aetheris AI — Joseph Toney, Business Forensics Operator | Indianapolis";
  const description = override?.description || "Joseph Toney runs Aetheris as a Business Forensics Operator. Indianapolis-based. Operator background, not consultant. Finds the revenue your business is silently losing.";
  const keywords = override?.keywords || "Joseph Toney, Aetheris AI, business forensics, Indianapolis consultant, AI operator, leak audit founder";

  const defaultFaqs = [
    { question: "Who is Joseph Toney?", answer: "Founder of Aetheris and a Business Forensics Operator based in Indianapolis. Background as an operator inside revenue-generating businesses, not as a career consultant. Built The Leak Audit™ methodology after watching the same operational leaks bleed company after company." },
    { question: "What does Aetheris actually do?", answer: "We run forensic diagnostics on operational businesses, find the silent revenue leaks, name them in dollars, and close them. Engagement structure: Free Self-Scan → $2,500 Forensic Diagnostic → scoped engagement to fix what we found." },
    { question: "Why 'forensics' instead of 'consulting'?", answer: "Consultants build frameworks. Forensic operators look for specific evidence of leaks: missing follow-up, stalled quotes, unbillable hours, tools nobody uses. The deliverable isn't a deck — it's a named leak with a dollar figure attached." },
    { question: "Where is Aetheris located?", answer: "Indianapolis, Indiana. We work with operators across the U.S. but Indy is home." },
    { question: "How do I work with Joseph directly?", answer: "Call (317) 376-2110 or email joseph@aetheris.technology. The fastest path to working together is the $2,500 Forensic Diagnostic." },
  ];
  const faqs = override?.faqs?.length ? override.faqs : defaultFaqs;

  const head = renderHead({
    title,
    description,
    path,
    keywords,
    jsonLd: [
      organizationLd(),
      breadcrumbLd([{ name: "Home", path: "/" }, { name: "About", path }]),
      faqLd(faqs),
      speakableLd(["h1", ".tldr", "h2"]),
      {
        "@context": "https://schema.org",
        "@type": "Person",
        name: "Joseph Toney",
        jobTitle: "Business Forensics Operator",
        worksFor: { "@type": "Organization", name: "Aetheris AI", url: SITE_URL },
        url: `${SITE_URL}/about`,
        telephone: "(317) 376-2110",
        email: "joseph@aetheris.technology",
        address: { "@type": "PostalAddress", addressLocality: "Indianapolis", addressRegion: "IN", addressCountry: "US" },
      },
    ],
  });

  return `${head}
  <body>
    <main>
      <header>
        <h1>Joseph Toney — Business Forensics Operator</h1>
        <p class="tldr"><strong>TL;DR:</strong> Operator-built, not consultant-built. Aetheris exists because most "consulting" is talk and most operators don't have time for it. The Leak Audit™ is what I wished someone had run on my businesses ten years ago.</p>
      </header>

      <section>
        <h2>The shift from consulting to forensics</h2>
        <p>Most consulting deliverables are slide decks. Most slide decks change nothing. The forensic posture is different: assume the leak exists, find it, prove it with numbers, then close it. Indianapolis-based. Operator-grade.</p>
      </section>

      <section>
        <h2>How I work</h2>
        <ul>
          <li><strong>No discovery theater.</strong> 14 days, not 90. The first deliverable is a named leak with a dollar figure.</li>
          <li><strong>No retainer roulette.</strong> Engagements are scoped to specific leaks with specific outcomes.</li>
          <li><strong>No "AI guru" gradients.</strong> The methodology is forensic, not aspirational. We look for evidence of bleeding, not opportunities for "transformation."</li>
        </ul>
      </section>

      <section>
        <h2>Contact</h2>
        <p>Phone: <a href="tel:+13173762110">(317) 376-2110</a></p>
        <p>Email: <a href="mailto:joseph@aetheris.technology">joseph@aetheris.technology</a></p>
        <p>Indianapolis, Indiana</p>
      </section>

      ${renderFaqSection(faqs)}

      <section>
        <h2>Start here</h2>
        <p><a href="${SITE_URL}/leak-audit">Free Leak Audit self-scan</a> · <a href="${SITE_URL}/services">Engagement options</a> · <a href="${SITE_URL}/contact">Contact</a></p>
      </section>
    </main>
    ${renderFooter()}`;
}
