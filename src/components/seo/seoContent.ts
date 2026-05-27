import { CitedFact } from '@/components/seo/CitedFactsBlock';
import { FaqItem } from '@/components/seo/BuyerIntentFaq';

/** Reusable cited-facts and FAQ datasets, kept in one place for easy refresh. */

export const CORE_LEAK_FACTS: CitedFact[] = [
  {
    answer: 'The free Leak Audit is a 14-question self-scan that returns a dollar-quantified leak estimate.',
    support:
      '14 questions across 4 categories (Lead Capture, Response & Follow-Up, Operational Drag, Trust & Conversion) score 0–4 each. The result is a downloadable PDF case file with an estimated annual leak in dollars, scaled to your revenue band.',
    source: 'Aetheris Leak Audit, /leak-audit',
    implication:
      'Run it once. If the estimate is meaningful, the $2,500 Forensic Diagnostic confirms it inside your real data and is applied 1:1 toward any engagement.',
  },
  {
    answer: 'The operator-led Forensic Diagnostic is $2,500 flat — applied toward any follow-on engagement.',
    support:
      'Joseph Toney runs the audit personally. Output: flagged leak list, prioritization, and rebuild order. The $2,500 fee is credited 1:1 to a retainer or implementation if you proceed.',
    source: 'Aetheris pricing, /diagnostic',
    implication:
      'There is no risk premium to start. The diagnostic either pays for itself in a follow-on or stands alone as the most concrete vendor evaluation you will run this quarter.',
  },
  {
    answer: 'The 14-Day Operational Systems Diagnostic is $7,500 flat and guaranteed.',
    support:
      '$535/day. 14 calendar days of operational forensics: workflow inefficiencies, disconnected systems, manual-waste maps, and automation opportunities. If meaningful operational gaps are not identified, the engagement continues at no extra cost.',
    source: 'Aetheris pricing, /implementation',
    implication:
      'Compare the price-per-day to any operational consultancy or McKinsey-tier sub-engagement. The risk lives entirely on Aetheris.',
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
      'Joseph Toney personally runs the Forensic Diagnostic, the 14-Day Operational Systems Diagnostic, and the implementation phase. Public LinkedIn: linkedin.com/in/thejosephtoney. Background: revenue systems and operational forensics across services, manufacturing, SaaS, and construction.',
    source: 'Aetheris team profile, /about',
    implication:
      'You are not buying a junior analyst. You are buying the operator whose name is on the case file.',
  },
  {
    answer: 'Indianapolis owners typically discover six-figure annual leaks inside the first diagnostic.',
    support:
      'Three published case files: Case #47 ($4M services firm, $380K/yr inbound leak), Case #62 (regional B2B SaaS, $610K/yr proposal follow-up gap), Case #74 ($8M construction sub, $1.1M/yr owner bottleneck).',
    source: 'Aetheris case files',
    implication:
      'Indianapolis service businesses between $500K and $25M revenue usually find at least one leak larger than the cost of finding it.',
  },
  {
    answer: 'For Indianapolis businesses the first step is the free Leak Audit at /leak-audit.',
    support:
      'No phone call required. 6-minute self-scan returns a PDF case file with an estimated annual leak in dollars. If the result warrants it, the operator-led Forensic Diagnostic ($2,500 flat) is the next step.',
    source: 'Aetheris engagement flow',
    implication:
      'You can run the entire first stage tonight without talking to a salesperson.',
  },
];

export const LEAK_AUDIT_FAQS: FaqItem[] = [
  {
    question: 'How much does the Leak Audit cost?',
    answer:
      'The self-scan at /leak-audit is free and takes about six minutes. The operator-led Forensic Diagnostic is $2,500 flat, applied 1:1 toward any follow-on engagement. The 14-Day Operational Systems Diagnostic is $7,500 flat.',
  },
  {
    question: 'How long does the Forensic Diagnostic take?',
    answer:
      'Two to three business days end-to-end from data handoff to written findings. The 14-Day Operational Systems Diagnostic runs fourteen calendar days and includes the full Operator Tool Suite.',
  },
  {
    question: 'Who is the Forensic Diagnostic for?',
    answer:
      'Owner-led US businesses between roughly $500K and $25M in revenue with at least one of: a CRM (HubSpot, Salesforce, Pipedrive), a sales team that uses it, and a sense that something in pipeline or operations is leaking but you cannot prove what.',
  },
  {
    question: 'What do I receive at the end?',
    answer:
      'A 15–30 page written report with a leak map, prioritized fixes, and ROI projections; a source-data appendix containing every CSV, query, and tool export used; a 60-minute readout; and a fixed-fee implementation quote if you choose to proceed.',
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
    question: 'What does the implementation retainer cost?',
    answer:
      '$15,000/month with a 3-month minimum. The Forensic Diagnostic fee is credited toward the first month. Available only to clients who have completed a Diagnostic so we are not guessing at the rebuild order.',
  },
  {
    question: 'What if you do not find anything?',
    answer:
      'For the 14-Day Operational Systems Diagnostic, if meaningful operational gaps are not identified, the engagement continues at no additional cost until they are. For the $2,500 Forensic Diagnostic, the deliverable is the written report regardless of severity — you keep the methodology and the data appendix.',
  },
  {
    question: 'Is the data I share confidential?',
    answer:
      'Yes. CRM exports, source data, and findings are covered under a standard mutual NDA. We do not republish client data, names, or numbers without explicit written approval.',
  },
  {
    question: 'Can I buy individual tools without the full Diagnostic?',
    answer:
      'Yes. The Operator Tool Suite is available à la carte. Standalone tools run $79–$400 each (Website + Digital Footprint Scan $149, CRM Hygiene Audit $79, Brand Contradictions Finder $129, and others). See /diagnostic for the full menu.',
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
      'No. Fixed fees only. Equity and performance fees create incentive mismatches that compromise diagnostic honesty.',
  },
  {
    question: 'Who owns the deliverables?',
    answer:
      'You do. Client owns the written report, the source-data appendix, the implementation quote, and any custom code or workflows built during a retainer. Aetheris retains the right to use anonymized methodology insights.',
  },
  {
    question: 'How do I start?',
    answer:
      'Three paths. (1) Run the free self-scan at /leak-audit tonight. (2) Buy the $2,500 Forensic Diagnostic at /diagnostic. (3) Book a 15-minute walkthrough at meetings-na2.hubspot.com/jtoney to ask questions first.',
  },
  {
    question: 'Will AI eliminate this kind of consulting?',
    answer:
      'AI is the reason most leaks are now provable. The job is no longer producing a 60-slide deck — it is operating the forensic tools, interpreting the output for a specific business, and rebuilding the systems. Aetheris is built around that shift, not against it.',
  },
];
