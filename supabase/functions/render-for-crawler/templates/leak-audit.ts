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

export async function renderLeakAudit(
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<string> {
  const path = "/leak-audit";
  const override = await fetchSeoOverride(supabaseUrl, serviceRoleKey, path);

  const title = override?.title || "The Leak Audit™ — 7-Step Forensic Methodology | Aetheris AI";
  const description = override?.description || "The Leak Audit™ is a 7-step forensic methodology that finds the silent revenue leaks in operational businesses. Free self-scan, or operator-led $2,500 Forensic Diagnostic.";
  const keywords = override?.keywords || "leak audit, revenue leak audit, business autopsy, forensic methodology, operational audit, sales process audit Indianapolis";

  const defaultFaqs = [
    { question: "What is The Leak Audit™?", answer: "A 7-step forensic methodology for finding operational revenue leaks: intake autopsy, funnel pressure test, quote-to-close inspection, follow-up pulse check, ops friction map, tooling drag analysis, and leak ledger." },
    { question: "Free vs. paid — what's the difference?", answer: "The free self-scan walks you through the 7 steps with guided questions and produces a directional report you fill out yourself. The $2,500 Forensic Diagnostic is operator-led: we run the audit on your business, interview your team, examine your data, and deliver a quantified leak ledger." },
    { question: "How long is the free self-scan?", answer: "About 20–30 minutes if you have your basic numbers in front of you. Faster if you skip steps." },
    { question: "What's in the leak ledger?", answer: "A prioritized list of every leak we identified, each with: a description of the leak, an estimated annual dollar cost, a difficulty-to-close score, a recommended fix, and a projected ROI." },
    { question: "Does the $2,500 fee apply toward an engagement?", answer: "Yes. If you engage us to close the leaks we found, the full $2,500 applies as a credit." },
  ];
  const faqs = override?.faqs?.length ? override.faqs : defaultFaqs;

  const head = renderHead({
    title,
    description,
    path,
    keywords,
    jsonLd: [
      organizationLd(),
      breadcrumbLd([{ name: "Home", path: "/" }, { name: "The Leak Audit", path }]),
      faqLd(faqs),
      speakableLd(["h1", ".tldr", "h2"]),
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: "The Leak Audit™ — 7-Step Forensic Methodology",
        description: "How to find the silent revenue leaks in an operational business.",
        step: [
          { "@type": "HowToStep", name: "Intake Autopsy", text: "Map every touchpoint a stranger crosses to become a paying customer. Time each one." },
          { "@type": "HowToStep", name: "Funnel Pressure Test", text: "Identify where prospects drop, stall, or vanish. Measure the friction." },
          { "@type": "HowToStep", name: "Quote-to-Close Inspection", text: "Calculate the actual % of quotes that close. Most operators don't know this number." },
          { "@type": "HowToStep", name: "Follow-up Pulse Check", text: "Audit what happens when a lead goes cold. Usually nothing — that's the leak." },
          { "@type": "HowToStep", name: "Ops Friction Map", text: "Find time the team wastes on work that should be automated, delegated, or killed." },
          { "@type": "HowToStep", name: "Tooling Drag Analysis", text: "Audit software spend. Identify what's actively slowing the business down." },
          { "@type": "HowToStep", name: "Leak Ledger", text: "Compile every leak with dollar cost and prioritized fix. The deliverable." },
        ],
      },
    ],
  });

  return `${head}
  <body>
    <main>
      <header>
        <h1>The Leak Audit™ — Find What's Bleeding Out of Your Business</h1>
        <p class="tldr"><strong>TL;DR:</strong> A 7-step forensic methodology for finding the silent revenue leaks that operators can't see from the inside. Free self-scan. Or hire an operator to run it on your business — $2,500 flat, 14 days, full leak ledger delivered.</p>
      </header>

      <section>
        <h2>The 7 steps</h2>
        <ol>
          <li><strong>Intake Autopsy.</strong> Map every touchpoint a stranger crosses to become a paying customer. Time each one. Most operators discover their intake takes 3–7 days when they think it takes 24 hours.</li>
          <li><strong>Funnel Pressure Test.</strong> Where do prospects drop, stall, or vanish? Measure the drop-off at every stage. The biggest leak is usually invisible.</li>
          <li><strong>Quote-to-Close Inspection.</strong> Calculate the actual % of quotes that close. If you don't know this number, you have your first leak.</li>
          <li><strong>Follow-up Pulse Check.</strong> When a lead goes cold, what fires? For most operators: nothing. That's the cheapest leak to close and the one most worth closing.</li>
          <li><strong>Ops Friction Map.</strong> Where does the team waste time on work that should be automated, delegated, or killed entirely?</li>
          <li><strong>Tooling Drag Analysis.</strong> Audit every software subscription. Identify what's actively slowing the business down — usually 2–4 tools per company.</li>
          <li><strong>Leak Ledger.</strong> Compile every identified leak: description, annual dollar cost, difficulty-to-close, recommended fix, projected ROI. Prioritize. Close the easy money first.</li>
        </ol>
      </section>

      <section>
        <h2>Two ways to run the audit</h2>
        <ul>
          <li><strong>Free Self-Scan</strong> (20–30 min) — Guided 7-step walkthrough. You answer the questions. You get a directional report.</li>
          <li><strong>Forensic Diagnostic — $2,500 flat</strong> — We run it on your business. 14 days. Operator-led. Full quantified leak ledger. Fee applies toward any engagement.</li>
        </ul>
      </section>

      ${renderFaqSection(faqs)}

      <section>
        <h2>Run the audit</h2>
        <p><a href="${SITE_URL}/leak-audit">Start the free self-scan →</a></p>
        <p>Or book the Forensic Diagnostic: <a href="tel:+13173762110">(317) 376-2110</a> · <a href="mailto:joseph@aetheris.technology">joseph@aetheris.technology</a></p>
      </section>
    </main>
    ${renderFooter()}`;
}
