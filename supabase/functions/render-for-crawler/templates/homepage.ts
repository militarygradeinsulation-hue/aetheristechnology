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

export async function renderHomepage(
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<string> {
  const path = "/";
  const override = await fetchSeoOverride(supabaseUrl, serviceRoleKey, path);

  const title = override?.title || "Your Business Is Leaking | Aetheris AI — Business Forensics Operator";
  const description = override?.description || "Indianapolis Business Forensics Operator. The Leak Audit™ methodology finds the silent revenue leaks killing your business — quotes that never close, leads that ghost, ops that bleed margin.";
  const keywords = override?.keywords || "business forensics, revenue leak audit, AI consulting Indianapolis, operational diagnostics, leak audit, business autopsy, conversion forensics";

  const defaultFaqs = [
    { question: "What is a Business Forensics Operator?", answer: "A forensic operator examines the working parts of your business — sales motion, ops, marketing, fulfillment — and finds the specific places where revenue, time, or trust is leaking. Unlike a generalist consultant, the deliverable is named leaks with dollar costs, not slide decks." },
    { question: "What is The Leak Audit™?", answer: "A 7-step forensic methodology: 1) Intake autopsy, 2) Funnel pressure test, 3) Quote-to-close inspection, 4) Follow-up pulse check, 5) Ops friction map, 6) Tooling drag analysis, 7) Leak ledger with prioritized fixes. Self-scan free at /leak-audit. Operator-led Forensic Diagnostic is $2,500 flat, applied toward engagement." },
    { question: "Why hire Aetheris instead of a typical consultant?", answer: "Most consultants bring frameworks. We bring a forensic posture: assume the leak exists, find it, prove it with numbers, then close it. No 90-day discovery phases, no slide-deck deliverables. The first deliverable is a named leak with a dollar figure attached." },
    { question: "Where is Aetheris based?", answer: "Indianapolis, Indiana. We work with operators across the U.S., but Indy is home base." },
    { question: "How do I get started?", answer: "Run the free self-scan at aetheris.technology/leak-audit — about 10 minutes. If you want a forensic operator on your business, the $2,500 Forensic Diagnostic is the front door. Call (317) 376-2110 or email joseph@aetheris.technology." },
  ];
  const faqs = override?.faqs?.length ? override.faqs : defaultFaqs;

  const head = renderHead({
    title,
    description,
    path,
    keywords,
    jsonLd: [
      organizationLd(),
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Aetheris AI",
        url: SITE_URL,
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/blog?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      breadcrumbLd([{ name: "Home", path: "/" }]),
      faqLd(faqs),
      speakableLd(["h1", ".tldr", "h2"]),
    ],
  });

  return `${head}
  <body>
    <main>
      <header>
        <h1>Your business is leaking. You just can't see it from the inside.</h1>
        <p class="tldr"><strong>TL;DR:</strong> Most businesses bleed 15–40% of available revenue through silent operational leaks — quotes that never close, leads that ghost, follow-ups that never fire, ops that hemorrhage margin. We find them. We name them in dollars. We close them.</p>
      </header>

      <section>
        <h2>The Leak Audit™ — 7-step forensic methodology</h2>
        <ol>
          <li><strong>Intake autopsy</strong> — How does a stranger become a paying customer? We map every touchpoint and time it.</li>
          <li><strong>Funnel pressure test</strong> — Where do prospects drop, stall, or vanish? We measure the friction.</li>
          <li><strong>Quote-to-close inspection</strong> — What % of quotes you send actually close? Most operators don't know. We find out.</li>
          <li><strong>Follow-up pulse check</strong> — When a lead goes cold, what fires? Usually nothing. That's a leak.</li>
          <li><strong>Ops friction map</strong> — Where does your team waste time on work that should be automated, delegated, or killed?</li>
          <li><strong>Tooling drag analysis</strong> — What software are you paying for that's actively slowing you down?</li>
          <li><strong>Leak ledger</strong> — Every leak named, dollar-quantified, prioritized by ROI. The deliverable.</li>
        </ol>
      </section>

      <section>
        <h2>How operators engage</h2>
        <ul>
          <li><strong>Free Self-Scan</strong> — Run The Leak Audit on your own business in ~10 minutes. <a href="${SITE_URL}/leak-audit">Start at /leak-audit</a>.</li>
          <li><strong>Forensic Diagnostic — $2,500 flat</strong> — Operator-led 14-day deep audit. Full leak ledger delivered. Fee applies toward any engagement.</li>
          <li><strong>Engagement</strong> — We close the leaks. Scoped per engagement, no retainer roulette.</li>
        </ul>
      </section>

      <section>
        <h2>Who this is for</h2>
        <ul>
          <li>Operators doing $1M–$50M who feel revenue is being left on the table but can't pinpoint where.</li>
          <li>Founders whose teams "are busy" but margin is shrinking.</li>
          <li>Sales orgs where the pipeline looks healthy but close rates lag.</li>
          <li>Companies that bought the AI/automation stack and aren't getting the returns the vendors promised.</li>
        </ul>
      </section>

      ${renderFaqSection(faqs)}

      <section>
        <h2>Get started</h2>
        <p><a href="${SITE_URL}/leak-audit">Run the free self-scan</a> · <a href="${SITE_URL}/business-diagnostic">Take the diagnostic</a> · <a href="${SITE_URL}/services">See engagement options</a></p>
        <p>Or call directly: <a href="tel:+13173762110">(317) 376-2110</a></p>
      </section>
    </main>
    ${renderFooter()}`;
}
