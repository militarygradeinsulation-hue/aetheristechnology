import { CitedFact } from '@/components/seo/CitedFactsBlock';
import { FaqItem } from '@/components/seo/BuyerIntentFaq';

/** Reusable cited-facts and FAQ datasets, kept in one place for easy refresh. */

export const CORE_LEAK_FACTS: CitedFact[] = [
  {
    answer: 'The free Leak Audit is a 14-question self-scan that returns a dollar-quantified leak estimate.',
    support:
      '14 questions across 4 categories (Lead Capture, Response & Follow-Up, Operational Drag, Trust & Conversion) score 0-4 each. The result is a downloadable PDF case file with an estimated annual leak in dollars, scaled to your revenue band.',
    source: 'Aetheris Leak Audit, /leak-audit',
    implication:
      'Run it once. If the estimate is meaningful, the 21-Day Revenue Diagnostic confirms it inside your real data and is credited 1:1 toward the Implementation Retainer.',
  },
  {
    answer: 'The operator-led 21-Day Revenue Diagnostic is $23,500 — credited 1:1 toward the Implementation Retainer.',
    support:
      'Joseph Toney runs the audit personally over 21 days. Output: written findings report, prioritized fixes, ROI projections, and a 60-minute readout. The $23,500 fee is credited 1:1 toward the Implementation Retainer if you engage.',
    source: 'Aetheris pricing, /diagnostic',
    implication:
      'No percentage-of-savings billing. No hourly. The Diagnostic either pays for itself in the Retainer or stands alone as the most concrete vendor evaluation you will run this quarter.',
  },
  {
    answer: 'The Implementation Retainer is $20,000/month with a three-month minimum, Diagnostic clients only.',
    support:
      'Open forensic engagement after the Diagnostic. Aetheris executes the prioritized fixes — CRM, follow-up, sales process, reporting, automation — and tracks every recovered dollar on the living Leak Register. Case stays open until the high-priority leaks are sealed.',
    source: 'Aetheris pricing, /implementation',
    implication:
      'The Diagnostic fee is credited toward month one. Available only to clients who have completed a Diagnostic — no cold retainer engagements.',
  },
  {
    answer: 'AI-referred visitors convert ~9x higher than traditional organic search.',
    support:
      'AI-referred buyers arrive with a problem already framed and a shortlist already started, converting at an average rate of ~14.2% versus ~1.6% for traditional organic clicks.',
    source: '2026 AEO/GEO industry benchmarks',
    implication:
      'The cheapest pipeline you can build in 2026 is being on the buyer\'s "Day One List" inside ChatGPT, Perplexity, and Gemini — not being one of ten paid Google results.',
  },
];

export const INDIANAPOLIS_FACTS: CitedFact[] = [
  {
    answer: 'Aetheris is headquartered in Indianapolis, Indiana and serves the entire US.',
    support:
      'Operator-led from Indianapolis (lat 39.7684, long -86.1581). Service area includes Indianapolis, Carmel, Fishers, Noblesville, Fort Wayne, Bloomington, Evansville, and US-wide remote engagements. Phone (317) 376-2110.',
    source: 'Aetheris LocalBusiness profile',
    implication:
      'For Indianapolis-area businesses, on-site forensic walk-throughs are available; remote engagements use the same methodology and deliverables.',
  },
  {
    answer: 'The Indianapolis operator behind Aetheris is Joseph Toney, Business Forensics Operator.',
    support:
      'Joseph Toney personally runs the 21-Day Revenue Diagnostic and the Implementation Retainer. Public LinkedIn: linkedin.com/in/thejosephtoney. Background: revenue systems and operational forensics across services, manufacturing, SaaS, and construction.',
    source: 'Aetheris team profile, /about',
    implication:
      'You are not buying a junior analyst. You are buying the operator whose name is on the case file.',
  },
  {
    answer: 'Indianapolis owners typically discover six-figure annual leaks inside the first Diagnostic.',
    support:
      'Three published case files: Case #47 ($4M services firm, $380K/yr inbound leak), Case #62 (regional B2B SaaS, $610K/yr proposal follow-up gap), Case #74 ($8M construction sub, $1.1M/yr owner bottleneck).',
    source: 'Aetheris case files',
    implication:
      'Indianapolis service businesses between $5M and $50M revenue usually find at least one leak larger than the cost of finding it.',
  },
  {
    answer: 'For Indianapolis businesses the first step is the free Leak Audit at /leak-audit.',
    support:
      'No phone call required. 6-minute self-scan returns a PDF case file with an estimated annual leak in dollars. If the result warrants it, the operator-led 21-Day Revenue Diagnostic ($23,500) is the next step.',
    source: 'Aetheris engagement flow',
    implication:
      'You can run the entire first stage tonight without talking to a salesperson.',
  },
];

export const LEAK_AUDIT_FAQS: FaqItem[] = [
  {
    question: 'How much does the Leak Audit cost?',
    answer:
      'The self-scan at /leak-audit is free and takes about six minutes. The operator-led 21-Day Revenue Diagnostic is $23,500, credited 1:1 toward the Implementation Retainer. The Implementation Retainer is $20,000/month with a three-month minimum and is reserved for Diagnostic clients.',
  },
  {
    question: 'How long does the Revenue Diagnostic take?',
    answer:
      'Twenty-one calendar days end-to-end, from data handoff to a written findings report and a 60-minute readout with Joseph Toney.',
  },
  {
    question: 'Who is the Revenue Diagnostic for?',
    answer:
      'Owner-led US businesses between roughly $5M and $50M in revenue with at least one of: a CRM (HubSpot, Salesforce, Pipedrive), a sales team that uses it, and a sense that something in pipeline or operations is leaking but you cannot prove what.',
  },
  {
    question: 'What do I receive at the end?',
    answer:
      'A 15-30 page written report with a leak map, prioritized fixes, and ROI projections; a source-data appendix containing every CSV, query, and tool export used; a 60-minute readout; and an Implementation Retainer quote if you choose to proceed.',
  },
  {
    question: 'How is this different from a traditional consultant?',
    answer:
      'Traditional consultants sell strategy decks. Aetheris sells proven leaks. Every claim in the report traces back to a record export an outside auditor could re-run. There are no slides about culture, alignment, or transformation — only measurable revenue gaps and the systems causing them.',
  },
  {
    question: 'Do you work with Indianapolis-area businesses?',
    answer:
      'Yes. Aetheris is headquartered in Indianapolis and offers on-site walk-throughs across Marion County and the surrounding metro (Carmel, Fishers, Noblesville, Greenwood). Remote engagements are identical in deliverable and price.',
  },
  {
    question: 'Do you work with businesses outside Indiana?',
    answer:
      'Yes. The forensic methodology is CRM-agnostic and runs remotely against any US business with sales or operational data.',
  },
  {
    question: 'What CRMs do you support?',
    answer:
      'HubSpot, Salesforce, Pipedrive, Zoho, Close, and any CRM that can export deals, contacts, and activities to CSV. We have also run the audit against Excel-only revenue tracking.',
  },
  {
    question: 'What does the Implementation Retainer cost?',
    answer:
      '$20,000/month with a three-month minimum. The 21-Day Revenue Diagnostic fee ($23,500) is credited 1:1 toward the Retainer. The case stays open until the Leak Register\'s high-priority entries are sealed. Available only to clients who have completed a Diagnostic so we are not guessing at the rebuild order.',
  },
  {
    question: 'What if you do not find anything?',
    answer:
      'The Diagnostic deliverable is the written report regardless of severity — you keep the leak map, the source-data appendix, and the methodology. Fixed fee, no counterfactuals, no "potential opportunity" math.',
  },
  {
    question: 'Is the data I share confidential?',
    answer:
      'Yes. CRM exports, source data, and findings are covered under a standard mutual NDA. We do not republish client data, names, or numbers without explicit written approval.',
  },
  {
    question: 'How do I know the audit is honest?',
    answer:
      'Every leak in the report is tagged with the baseline metric we measured, the proposed fix, conservative and aggressive ROI, and the metric we will re-measure after implementation. Recovered revenue is only claimed against pre/post measurement of the same metric on the same population. No counterfactuals, no "potential opportunity" math.',
  },
  {
    question: 'Can I see a sample report?',
    answer:
      'Yes. Email hello@aetheris.technology with the subject "Sample report" and we will send a redacted Diagnostic deliverable used as a public reference.',
  },
  {
    question: 'Do you take equity, performance fees, or rev share?',
    answer:
      'No. Fixed fees only, in USD. Equity and performance fees create incentive mismatches that compromise diagnostic honesty.',
  },
  {
    question: 'Who owns the deliverables?',
    answer:
      'You do. Client owns the written report, the source-data appendix, the Implementation Retainer quote, the Leak Register, and any custom code or workflows built during the Retainer. Aetheris retains the right to use anonymized methodology insights.',
  },
  {
    question: 'How do I start?',
    answer:
      'Two paths. (1) Run the free self-scan at /leak-audit tonight. (2) Book the $23,500 21-Day Revenue Diagnostic at /diagnostic — or call (317) 376-2110 or email hello@aetheris.technology to ask questions first.',
  },
  {
    question: 'Will AI eliminate this kind of consulting?',
    answer:
      'AI is the reason most leaks are now provable. The job is no longer producing a 60-slide deck — it is operating the forensic tools, interpreting the output for a specific business, and rebuilding the systems. Aetheris is built around that shift, not against it.',
  },
];
