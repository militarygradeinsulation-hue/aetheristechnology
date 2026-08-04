// Industries our licensed Connectors already have relationships in.
// Aetheris focuses on manufacturing and construction; everything else is
// warm-introduction territory a Connector can open.
export type ConnectorIndustry = { industry: string; primaryLeak: string; typicalLoss: string };

export const CONNECTOR_INDUSTRIES: ConnectorIndustry[] = [
  { industry: "Accounting & Bookkeeping", primaryLeak: "Scope creep and unbilled hours buried in client work.", typicalLoss: "$120K-$600K / yr" },
  { industry: "Architecture & Design", primaryLeak: "Unpaid design iterations and proposal-to-contract drag.", typicalLoss: "$150K-$800K / yr" },
  { industry: "Automotive & Dealerships", primaryLeak: "Lead response lag and service-bay throughput loss.", typicalLoss: "$200K-$1.4M / yr" },
  { industry: "B2B SaaS", primaryLeak: "Trial-to-paid drop and renewal silent churn.", typicalLoss: "$150K-$1M / yr" },
  { industry: "Construction", primaryLeak: "Bid follow-up gaps and RFI cycle bleed.", typicalLoss: "$200K-$1.2M / yr" },
  { industry: "Education & Training", primaryLeak: "Enrollment fall-off and course completion drop.", typicalLoss: "$100K-$700K / yr" },
  { industry: "E-commerce & Retail", primaryLeak: "Cart abandonment and post-purchase retention drop.", typicalLoss: "$200K-$1.5M / yr" },
  { industry: "Finance", primaryLeak: "Underwriting cycle drag and KYC handoff loss.", typicalLoss: "$400K-$2.5M / yr" },
  { industry: "Healthcare", primaryLeak: "Intake fall-off and prior-auth aging.", typicalLoss: "$180K-$900K / yr" },
  { industry: "Home Services & Trades", primaryLeak: "Estimate response lag and tech-utilization gaps.", typicalLoss: "$120K-$800K / yr" },
  { industry: "Hospitality & Hotels", primaryLeak: "Direct booking loss and ancillary revenue gaps.", typicalLoss: "$200K-$1.5M / yr" },
  { industry: "Legal & Law Firms", primaryLeak: "Intake conversion drop and matter-aging WIP.", typicalLoss: "$200K-$1.2M / yr" },
  { industry: "Logistics", primaryLeak: "Quote response lag and lane-margin invisibility.", typicalLoss: "$250K-$2M / yr" },
  { industry: "Creative Studios & Production Shops", primaryLeak: "Scope creep, unbilled revisions, engagement drift.", typicalLoss: "$150K-$900K / yr" },
  { industry: "Medical Practices & Dental", primaryLeak: "Missed recall and unbilled treatment plans.", typicalLoss: "$150K-$800K / yr" },
  { industry: "Professional Services", primaryLeak: "Proposal cycle drag and project-margin erosion.", typicalLoss: "$150K-$1M / yr" },
  { industry: "Real Estate", primaryLeak: "Lead response lag and pipeline ghosting.", typicalLoss: "$150K-$1M / yr" },
  { industry: "Specialty Manufacturing", primaryLeak: "Quote-to-close drag and stalled deals after Day 3.", typicalLoss: "$300K-$1.8M / yr" },
  { industry: "Technology & IT Services", primaryLeak: "Ticket-resolution drag and contract renewal silence.", typicalLoss: "$180K-$1.2M / yr" },
  { industry: "Travel & Tourism", primaryLeak: "Booking abandonment and upsell capture gaps.", typicalLoss: "$120K-$900K / yr" },
  { industry: "Wellness, Spa & Fitness", primaryLeak: "Membership churn and class/booking under-utilization.", typicalLoss: "$80K-$500K / yr" },
];

export const CONNECTOR_FOCUS = ["Manufacturing", "Construction & Contracting"];
