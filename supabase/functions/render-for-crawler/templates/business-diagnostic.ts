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

export async function renderBusinessDiagnostic(
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<string> {
  const path = "/business-diagnostic";
  const override = await fetchSeoOverride(supabaseUrl, serviceRoleKey, path);

  const title = override?.title || "Free Business Diagnostic — Find Where You're Leaking | Aetheris AI";
  const description = override?.description || "20-question forensic diagnostic. Identifies the silent operational leaks costing you revenue — sales, ops, follow-up, fulfillment, tooling. Free PDF report. No login.";
  const keywords = override?.keywords || "business diagnostic, operational audit, revenue leak assessment, sales process diagnostic, business health check Indianapolis";

  const defaultFaqs = [
    { question: "How long does the diagnostic take?", answer: "About 8–12 minutes. 20 questions across five categories: sales motion, lead handling, operations, fulfillment, and tooling." },
    { question: "What do I get at the end?", answer: "A scored report identifying which of the five leak categories are bleeding revenue, with category-level severity and recommended next steps. Optional PDF download." },
    { question: "Is the diagnostic free?", answer: "Yes — completely free, no login required. Email is optional and only used to send a copy of the report." },
    { question: "Is this the same as the Forensic Diagnostic?", answer: "No. The free diagnostic is a self-administered scan that surfaces likely leak categories. The Forensic Diagnostic ($2,500 flat) is operator-led: 14 days of hands-on inspection, interviews, and a full leak ledger with dollar-quantified findings." },
    { question: "Who should take this?", answer: "Operators of $1M–$50M businesses who suspect revenue is leaking but can't name where. Especially useful if close rates are slipping, ops feel chaotic, or marketing spend isn't converting." },
  ];
  const faqs = override?.faqs?.length ? override.faqs : defaultFaqs;

  const head = renderHead({
    title,
    description,
    path,
    keywords,
    jsonLd: [
      organizationLd(),
      breadcrumbLd([
        { name: "Home", path: "/" },
        { name: "Business Diagnostic", path },
      ]),
      faqLd(faqs),
      speakableLd(["h1", ".tldr", "h2"]),
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "Aetheris Business Diagnostic",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        url: `${SITE_URL}${path}`,
      },
    ],
  });

  return `${head}
  <body>
    <main>
      <header>
        <h1>Free Business Diagnostic — Find Where You're Leaking</h1>
        <p class="tldr"><strong>TL;DR:</strong> 20 questions. About 10 minutes. You'll get a scored report identifying the operational leaks that are silently costing you revenue — and what to do about them. No login. No upsell wall.</p>
      </header>

      <section>
        <h2>What the diagnostic measures</h2>
        <ol>
          <li><strong>Sales motion</strong> — How quotes are built, how they close, where they stall.</li>
          <li><strong>Lead handling</strong> — Speed-to-lead, follow-up cadence, ghosted prospect recovery.</li>
          <li><strong>Operations</strong> — Where the team's time goes, what's manual that shouldn't be.</li>
          <li><strong>Fulfillment</strong> — Margin leaks between sale and delivery.</li>
          <li><strong>Tooling</strong> — Software you're paying for that doesn't pay you back.</li>
        </ol>
      </section>

      <section>
        <h2>What you get</h2>
        <ul>
          <li>Category-level scores (1–10) across all five leak vectors.</li>
          <li>A prioritized list of the leaks most likely costing you revenue right now.</li>
          <li>Specific next-step recommendations per category.</li>
          <li>Optional PDF download of the full report.</li>
        </ul>
      </section>

      <section>
        <h2>What this is NOT</h2>
        <p>This is a directional self-scan, not a forensic engagement. If you want an operator inside your business naming leaks in dollars and closing them, that's the <strong>Forensic Diagnostic</strong> — $2,500 flat, 14 days, full leak ledger. Fee applies toward any subsequent engagement.</p>
      </section>

      ${renderFaqSection(faqs)}

      <section>
        <h2>Take the diagnostic</h2>
        <p><a href="${SITE_URL}/business-diagnostic">Start the 20-question diagnostic →</a></p>
        <p>Or skip ahead: <a href="${SITE_URL}/leak-audit">Run the full Leak Audit self-scan</a> · <a href="${SITE_URL}/services">See engagement options</a></p>
      </section>
    </main>
    ${renderFooter()}`;
}
