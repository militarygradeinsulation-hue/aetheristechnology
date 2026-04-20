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

export async function renderServices(
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<string> {
  const path = "/services";
  const override = await fetchSeoOverride(supabaseUrl, serviceRoleKey, path);

  const title = override?.title || "Services & Pricing — Forensic Diagnostic & Engagements | Aetheris AI";
  const description = override?.description || "Forensic Diagnostic $2,500 flat. Engagement scoped per leak. Indianapolis-based Business Forensics Operator. No retainer roulette, no slide-deck deliverables.";
  const keywords = override?.keywords || "business forensics pricing, forensic diagnostic cost, AI consulting pricing Indianapolis, leak audit pricing, business consulting cost";

  const defaultFaqs = [
    { question: "How much is the Forensic Diagnostic?", answer: "$2,500 flat. 14 days. Includes operator-led intake autopsy, funnel pressure test, quote-to-close inspection, follow-up pulse check, ops friction map, tooling drag analysis, and the full leak ledger. Fee applies toward any engagement." },
    { question: "What does an engagement cost after the diagnostic?", answer: "Engagement pricing is scoped to the specific leaks we agree to close. Typically ranges $5K–$50K depending on leak count, complexity, and required tooling/automation builds. No retainers." },
    { question: "Do you have monthly retainers?", answer: "No. Retainers usually pay for activity, not outcomes. Every Aetheris engagement is scoped to specific leak closure with specific success criteria." },
    { question: "What's included in the Forensic Diagnostic?", answer: "Operator interviews with you and key team members, data review (CRM, sales pipeline, ops metrics, tooling spend), 7-step Leak Audit applied to your business, and a written leak ledger with dollar-quantified findings, prioritized fix list, and projected ROI per fix." },
    { question: "Do you work with companies outside Indianapolis?", answer: "Yes. We work with operators across the U.S. Most engagements are remote with optional onsite if it's worth the travel cost." },
  ];
  const faqs = override?.faqs?.length ? override.faqs : defaultFaqs;

  const head = renderHead({
    title,
    description,
    path,
    keywords,
    jsonLd: [
      organizationLd(),
      breadcrumbLd([{ name: "Home", path: "/" }, { name: "Services", path }]),
      faqLd(faqs),
      speakableLd(["h1", ".tldr", "h2"]),
      {
        "@context": "https://schema.org",
        "@type": "Service",
        name: "Forensic Diagnostic",
        provider: { "@type": "Organization", name: "Aetheris AI", url: SITE_URL },
        description: "14-day operator-led Leak Audit. Quantified leak ledger delivered. Fee applies toward any engagement.",
        offers: { "@type": "Offer", price: "2500", priceCurrency: "USD" },
        areaServed: { "@type": "Country", name: "United States" },
      },
    ],
  });

  return `${head}
  <body>
    <main>
      <header>
        <h1>Services & Pricing</h1>
        <p class="tldr"><strong>TL;DR:</strong> One front door — the $2,500 Forensic Diagnostic. From there, scoped engagements to close the leaks we found. No retainers. No slide decks. No "discovery phases."</p>
      </header>

      <section>
        <h2>Free Leak Audit Self-Scan — $0</h2>
        <p>Run the 7-step methodology yourself in ~20–30 minutes. Get a directional report. <a href="${SITE_URL}/leak-audit">Start at /leak-audit</a>.</p>
      </section>

      <section>
        <h2>Forensic Diagnostic — $2,500 flat</h2>
        <ul>
          <li>14-day operator-led audit</li>
          <li>Operator interviews with you + key team</li>
          <li>Data review across CRM, sales pipeline, ops, tooling</li>
          <li>Full 7-step Leak Audit run on your business</li>
          <li>Written leak ledger: dollar-quantified findings, prioritized fixes, projected ROI per fix</li>
          <li>Fee applies toward any subsequent engagement</li>
        </ul>
        <p><strong>Front door for serious operators.</strong> If you don't get a leak ledger worth at least $2,500 in identified annualized leak value, fee refunded.</p>
      </section>

      <section>
        <h2>Engagement — Scoped per leak</h2>
        <p>After the diagnostic, we scope engagement to the specific leaks worth closing. Typical range: $5K–$50K. Pricing depends on leak count, build complexity, and required automation.</p>
        <ul>
          <li>No retainers</li>
          <li>No "transformation roadmaps"</li>
          <li>Specific outcomes, specific success criteria, specific timeline</li>
        </ul>
      </section>

      ${renderFaqSection(faqs)}

      <section>
        <h2>Get started</h2>
        <p><a href="${SITE_URL}/leak-audit">Run the free self-scan</a> · <a href="${SITE_URL}/contact">Book the Forensic Diagnostic</a></p>
        <p>Or call directly: <a href="tel:+13173762110">(317) 376-2110</a></p>
      </section>
    </main>
    ${renderFooter()}`;
}
