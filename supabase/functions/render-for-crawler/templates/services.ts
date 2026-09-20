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

  const title = override?.title || "Services & Engagements — Forensic Diagnostic | Aetheris AI";
  const description = override?.description || "Forensic Diagnostic, scoped after a conversation. Engagement scoped per leak. Indianapolis-based Chaos Theory Forensics Operator. No ongoing-billing roulette, no slide-deck deliverables.";
  const keywords = override?.keywords || "business forensics services, forensic diagnostic, AI consulting Indianapolis, leak audit, business consulting";

  const defaultFaqs = [
    { question: "How much is the 21-Day Revenue Diagnostic?", answer: "Pricing is set after a conversation and a look at your data — there is no rate card. The 21-day engagement includes operator-led intake autopsy, funnel pressure test, quote-to-close inspection, follow-up pulse check, ops friction map, tooling drag analysis, and the full leak ledger." },
    { question: "What does an engagement cost after the diagnostic?", answer: "Engagement pricing is scoped to the specific leaks we agree to close and depends on leak count, complexity, and required tooling/automation builds. Terms are agreed openly with the client once the Diagnostic proves the case. No active cases." },
    { question: "Do you have active cases?", answer: "No. Active Cases usually pay for activity, not outcomes. Every Aetheris engagement is scoped to specific leak closure with specific success criteria." },
    { question: "What's included in the 21-Day Revenue Diagnostic?", answer: "Operator interviews with you and key team members, data review (CRM, sales pipeline, ops metrics, tooling spend), 7-step Leak Audit applied to your business, and a written leak ledger with dollar-quantified findings, prioritized fix list, and projected ROI per fix." },
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
        description: "14-day operator-led Leak Audit. Quantified leak ledger delivered. Terms are set after a conversation and scope.",
        areaServed: { "@type": "Country", name: "United States" },
      },
    ],
  });

  return `${head}
  <body>
    <main>
      <header>
        <h1>Services & Engagements</h1>
        <p class="tldr"><strong>TL;DR:</strong> One front door — the 21-Day Revenue Diagnostic. From there, scoped engagements to close the leaks we found. Terms are agreed openly after the evidence is in. No active cases. No slide decks. No "discovery phases."</p>
      </header>

      <section>
        <h2>Free Leak Audit Self-Scan</h2>
        <p>Run the 7-step methodology yourself in ~20–30 minutes. Get a directional report. <a href="${SITE_URL}/leak-audit">Start at /leak-audit</a>.</p>
      </section>

      <section>
        <h2>Forensic Diagnostic</h2>
        <ul>
          <li>14-day operator-led audit</li>
          <li>Operator interviews with you + key team</li>
          <li>Data review across CRM, sales pipeline, ops, tooling</li>
          <li>Full 7-step Leak Audit run on your business</li>
          <li>Written leak ledger: dollar-quantified findings, prioritized fixes, projected ROI per fix</li>
        </ul>
        <p><strong>Front door for serious operators.</strong> Scope and terms are set after a conversation and a look at your data — not off a rate card.</p>
      </section>

      <section>
        <h2>Engagement — Scoped per leak</h2>
        <p>After the diagnostic, we scope engagement to the specific leaks worth closing. Pricing depends on leak count, build complexity, and required automation, and is agreed openly with the client before any work begins.</p>
        <ul>
          <li>No active cases</li>
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
