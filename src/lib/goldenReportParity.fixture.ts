/**
 * Shared Golden Report fixture. Lives outside the test file so PDF render QA
 * and parity tests exercise the exact same detailed report.
 */
export const QA_CHAPTER = (no: number) => ({
  no,
  slug: `chapter-${no}`,
  title: `Chapter ${no} Title`,
  verdict: `Verdict for chapter ${no}`,
  what_we_found: `Found ${no}: the page https://www.odoo.com/page/section-${no} shows the headline "Build What Matters ${no}" with no meta description and a Lighthouse score of ${40 + no}/100.\n\nFound ${no}: paragraph two with a very long sentence that must wrap across several lines in the PDF without ever being truncated or replaced by an ellipsis.`,
  why_its_leaking: `Leaking because the canonical tag on https://www.odoo.com/page/section-${no} points elsewhere and the CTA button reads "Contact us ${no}".`,
  what_its_costing: `$1,000 - $2,000 per year for chapter ${no}.`,
  what_to_do: {
    this_week: [`Week action ${no}`],
    this_month: [`Month action ${no}`],
    this_quarter: [`Quarter action ${no}`],
  },
  evidence: [
    { label: `Source URL ${no}`, value: `https://www.odoo.com/page/section-${no}` },
    { label: `Observed copy ${no}`, value: `"Build What Matters ${no}"` },
    { label: `Method ${no}`, value: `Measured LCP 3.${no}s on the crawled page` },
  ],

});

export const QA_FULL_REPORT = {
  executive_summary: "Executive paragraph one.\n\nExecutive paragraph two.",
  overall_leakage: {
    annual_low: 4100,
    annual_high: 8900,
    currency: "USD",
    source: "priced_leaks",
    priced_leak_count: 5,
    calculation_version: 2,
  },
  top_leaks: [
    { rank: 1, name: "Proof Is Not Doing Enough Work", summary: "No case studies surfaced in crawl.", dollars_low: 1000, dollars_high: 2200, chapter_slug: "content" },
    { rank: 2, name: "Diluted Call To Action", summary: "Four competing CTAs on the homepage.", dollars_low: 900, dollars_high: 1800, chapter_slug: "conversion" },
  ],
  deliverables: {
    brand: {
      positioning: "Positioning statement.",
      target_audience: "Operations leaders at mid-market manufacturers.",
      value_proposition: "One clear value proposition.",
      voice: { summary: "Operator-grade, direct.", do: ["Lead with outcomes"], dont: ["Use the word synergy"] },
      messaging_pillars: [{ title: "Pillar One", detail: "Pillar one detail." }],
      differentiators: ["Differentiator alpha"],
      color_guidance: { summary: "Palette summary.", palette: [{ hex: "#875A7B", role: "Primary", use: "Key metrics" }] },
      typography_guidance: { headline: "Headline font", body: "Body font", notes: "Typography notes." },
      corrections: [{ issue: "Issue text", fix: "Fix text" }],
    },
    imagery: {
      visual_style: "Documentary style.",
      subjects: ["Hands in motion"],
      composition: "Composition notes.",
      lighting: "Lighting notes.",
      color_treatment: "Color treatment notes.",
      show: ["Real business outcomes"],
      avoid: ["Stock-photo models"],
      prompts: [{ title: "Manufacturing Inventory Dashboard", prompt: "A factory floor supervisor holds a tablet showing SKU counts." }],
    },
    posts: Array.from({ length: 12 }, (_, i) => ({
      platform: "LinkedIn",
      hook: `Hook number ${i + 1}`,
      body: `Body copy number ${i + 1}.`,
      cta: `CTA number ${i + 1}`,
      visual: `Visual note ${i + 1}`,
    })),
    schedule: {
      overview: "Thirty day schedule overview.",
      days: Array.from({ length: 30 }, (_, i) => ({
        day: i + 1,
        platform: "LinkedIn",
        time: "8:30 AM ET",
        purpose: "authority",
        topic: `Topic for day ${i + 1}`,
        visual: `Carousel concept for day ${i + 1}`,
      })),
    },
  },
  chapters: Array.from({ length: 14 }, (_, i) => chapter(i + 1)),
  report_consistency: {
    canonical_counts_sentence: "This report documents 18 findings and 5 uniquely priced leaks.",
    evidence_quality: {
      verified: 10, verified_pct: 55,
      inferred: 5, inferred_pct: 28,
      unverified: 3, unverified_pct: 17,
      contradicted: 0, contradicted_pct: 0,
    },
  },
  compiler: { state: "compiled" as const, violations: [], repairs: [] },
};

export const QA_META = { company: "Odoo", url: "www.odoo.com", scanId: "7d4630c0-8bb6-490a-a8f4-2dc1cd72008d" };
