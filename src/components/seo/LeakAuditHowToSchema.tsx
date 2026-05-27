import React from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * HowTo JSON-LD for The Leak Audit™ 7-step methodology.
 * Emits schema only (no UI) — the visible steps already live on /methodology
 * and inside the LeakAuditPage. Surfaces the methodology to AI engines for
 * "how does the leak audit work" style queries.
 */
const STEPS = [
  {
    name: 'Define the leak',
    text: 'A revenue leak is a measurable gap between revenue you should have captured and revenue you actually captured, attributable to a specific operational, sales, or system failure — never a forecast.',
  },
  {
    name: 'Measure baseline',
    text: 'Pull a 12-month snapshot from the system of record (HubSpot, Salesforce, or CSV) and sample three layers: lead-to-contact speed, deal-stage progression, and touch frequency. Missing data is named, never estimated around.',
  },
  {
    name: 'Score the four categories',
    text: 'Score Lead Capture, Response & Follow-Up, Operational Drag, and Trust & Conversion against a 14-point rubric. Each scored 0–4 from Never to Always systemized.',
  },
  {
    name: 'Attribute recovered revenue',
    text: 'Tag every leak with baseline metric, proposed fix, conservative + aggressive ROI, and the metric we will re-measure after implementation. Recovered revenue requires same-metric, same-population proof.',
  },
  {
    name: 'Scope in vs out',
    text: 'In scope: CRM data, sales activity, attribution, cadences, handoffs. Out of scope: pricing strategy, brand strategy, hiring, capital structure, legal compliance, shop-floor manufacturing.',
  },
  {
    name: 'Deliver the case file',
    text: 'Written 15–30 page report, source-data appendix (CSVs + queries), 60-minute readout, and a fixed-fee implementation quote. Every claim traces back to a record export anyone can re-verify.',
  },
  {
    name: 'Rebuild the broken systems',
    text: 'Optional follow-on implementation at $15K/month retainer or fixed-fee project. The $2,500 Forensic Diagnostic fee is applied 1:1 toward any engagement.',
  },
];

interface Props {
  pageUrl?: string;
}

export const LeakAuditHowToSchema: React.FC<Props> = ({ pageUrl }) => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'The Leak Audit™ — 7-Step Business Forensics Methodology',
    description:
      'Aetheris\'s 7-step forensic process for finding and proving revenue leaks inside an existing business, used in the free self-scan and the operator-led Forensic Diagnostic.',
    totalTime: 'P14D',
    estimatedCost: { '@type': 'MonetaryAmount', currency: 'USD', value: '2500' },
    ...(pageUrl ? { mainEntityOfPage: pageUrl } : {}),
    step: STEPS.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
};

export default LeakAuditHowToSchema;
