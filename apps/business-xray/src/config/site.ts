/**
 * Site-wide configuration. Edit here, not in components.
 * ENQUIRY_EMAIL receives mailto drafts — matches the public Aetheris contact-page address; verify inbox delivery before launch.
 */
export const SITE = {
  company: "Aetheris Technology",
  product: "Aetheris Business X-Ray",
  promise: "Find where your business may be losing money — and what to investigate first.",
  enquiryEmail: "aetheris.technology@outlook.com",
};

export interface ServiceTier {
  id: "free" | "verified" | "roadmap";
  name: string;
  price: string;
  summary: string;
  includes: string[];
  delivery: string;
}

/** Indicative service offerings. Paid tiers are delivered by a person and scoped by email first. */
export const TIERS: ServiceTier[] = [
  {
    id: "free",
    name: "Free X-Ray",
    price: "$0",
    summary: "The self-serve questionnaire and report on this site.",
    includes: [
      "13–18 question guided scan, about 4 minutes",
      "People / Process / Systems friction map",
      "Possible annual opportunity range with all assumptions shown",
      "Three priority findings and a 30-day plan",
      "Printable PDF and JSON copy you keep",
    ],
    delivery: "Instant, runs in your browser. Nothing is uploaded.",
  },
  {
    id: "verified",
    name: "Verified Review",
    price: "$199",
    summary: "A person checks your top findings against your real records.",
    includes: [
      "Review of your X-Ray and the data you choose to share",
      "Findings re-labelled as verified, revised or not supported",
      "Updated opportunity ranges based on your records",
      "Written summary of what the evidence shows",
    ],
    delivery: "Manual service. Scope, timing and payment agreed by email before any work starts.",
  },
  {
    id: "roadmap",
    name: "Correction Roadmap",
    price: "$599",
    summary: "Verified Review plus a sequenced plan to fix what's confirmed.",
    includes: [
      "Everything in Verified Review",
      "Step-by-step corrections for people, process and systems",
      "Fix-before-buy guidance: tools only where evidence supports them",
      "Measures to track so you can see if changes worked",
    ],
    delivery: "Manual service. Scope, timing and payment agreed by email before any work starts.",
  },
];