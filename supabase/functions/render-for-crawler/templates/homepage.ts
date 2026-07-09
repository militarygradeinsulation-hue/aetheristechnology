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

  const title = override?.title || "Business is chaos. Chaos always has cause. | Aetheris — Chaos Theory Forensics";
  const description = override?.description || "Aetheris practices Chaos Theory Forensics. We fix any problem in any department or team, lift ROI and close losses by 30% on average — or it costs you nothing. Guaranteed. Indianapolis-based.";
  const keywords = override?.keywords || "chaos theory forensics, business forensics, fix any business problem, 30% ROI lift consulting, no cost guarantee consulting, revenue leak audit, operational diagnostics Indianapolis, business autopsy, department fix";

  const defaultFaqs = [
    { question: "What is Chaos Theory Forensics?", answer: "Chaos Theory Forensics is Aetheris's practice: business is chaos, and chaos always has a cause. We investigate established businesses, trace the damage back to where it begins, and remove it at the source — not the symptom." },
    { question: "What kinds of problems can Aetheris fix?", answer: "Any problem in any department or team — sales, marketing, operations, fulfillment, follow-up, hiring, tooling, cash flow. If there's a business unit bleeding money, time, or trust, we find the cause and remove it." },
    { question: "What results do clients see?", answer: "Our fix automatically lifts ROI and closes losses by 30% on average. One short conversation is often enough to identify massive changes waiting to happen inside your business." },
    { question: "What is the guarantee?", answer: "If we can't find or fix a problem, there is NO COST — guaranteed. You only pay when we've located the cause and removed it." },
    { question: "How do I get started?", answer: "Book one small conversation. Call (317) 376-2110, email aetheris.technology@outlook.com, or start the free self-scan at aetheris.technology/leak-audit." },
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
          <li><strong>Engagement</strong> — We close the leaks. Scoped per engagement, no ongoing-billing roulette.</li>
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
