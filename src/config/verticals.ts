// Single source of truth for all vertical landing pages.
// Add a new industry here and route automatically inherits the full AEO machinery.

export interface VerticalUseCase {
  category: 'Strategy' | 'Governance' | 'Technology' | 'Marketing & Operations';
  title: string;
  description: string;
}

export interface VerticalStat {
  value: string;
  label: string;
}

export interface VerticalFAQ {
  question: string;
  answer: string;
}

export interface VerticalHowToStep {
  name: string;
  text: string;
}

export interface VerticalConfig {
  slug: string;          // route segment, e.g. "ai-for-healthcare"
  industry: string;      // "Healthcare"
  industryLower: string; // "healthcare"
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  heroEyebrow: string;
  heroHeadline: string;
  heroSubheadline: string;
  painHook: string;        // The blunt callout
  tldr: string;            // Speakable answer-first card
  useCases: VerticalUseCase[];
  stats: VerticalStat[];
  roiAngle: string;
  faqs: VerticalFAQ[];
  howToSteps: VerticalHowToStep[]; // exactly 5
}

export const VERTICALS: VerticalConfig[] = [
  // ─────────────────────────────────────────────────────────── Healthcare
  {
    slug: 'ai-for-healthcare',
    industry: 'Healthcare',
    industryLower: 'healthcare',
    metaTitle: 'AI for Healthcare | HIPAA-Aware AI Consulting',
    metaDescription: 'AI strategy and automation for healthcare operations. HIPAA-aware deployment, intake automation, clinical ops, and revenue cycle. Indianapolis-based.',
    keywords: 'AI for healthcare, healthcare AI consulting, HIPAA AI, clinical automation, revenue cycle AI, patient intake automation, AI for hospitals, healthcare AI strategy',
    heroEyebrow: 'AI for Healthcare',
    heroHeadline: 'Your clinic is drowning in admin work that AI eliminates in weeks.',
    heroSubheadline: 'HIPAA-aware AI strategy, intake automation, and revenue-cycle ops for clinics, MSOs, and specialty practices.',
    painHook: 'Front desk burnout. Prior auth backlog. Documentation eating clinician evenings. None of this requires another EHR module, it requires AI deployed where the bleeding actually happens.',
    tldr: 'Healthcare organizations adopting AI report 30–50% reductions in administrative load and 15–25% faster claims cycles. The wins are in intake, documentation, prior authorization, denial management, and patient follow-up, not in flashy clinical AI.',
    useCases: [
      { category: 'Strategy', title: 'Use Case Prioritization for Clinical Ops', description: 'Map every admin and clinical workflow against ROI, risk, and HIPAA exposure. Pilot the highest-leverage 3, not 30.' },
      { category: 'Governance', title: 'HIPAA-Aware Responsible AI Framework', description: 'PHI handling, BAA-covered model selection, audit trails, and bias review built into every deployment from day one.' },
      { category: 'Technology', title: 'Ambient Documentation & Intake Agents', description: 'LLM-driven scribes, intake bots, and triage agents that integrate with EHR APIs and reduce clinician note time by 60%.' },
      { category: 'Marketing & Operations', title: 'Revenue Cycle Automation', description: 'Prior auth workflow automation, denial management agents, and patient billing follow-up sequences.' },
    ],
    stats: [
      { value: '30–50%', label: 'Admin load reduction with AI ops' },
      { value: '60%', label: 'Less clinician documentation time' },
      { value: '$150B', label: 'US healthcare admin waste annually' },
      { value: '15–25%', label: 'Faster claims cycle with AI denial mgmt' },
    ],
    roiAngle: 'A 12-provider practice burning $400K/year on admin overflow can typically recover 25–40% of that within 6 months by deploying intake, documentation, and prior auth automation. ROI is fast because the cost is already on the books, you just stop paying it.',
    faqs: [
      { question: 'Is AI in healthcare HIPAA compliant?', answer: 'Only when deployed correctly. HIPAA compliance requires BAA-covered AI models (Azure OpenAI, AWS Bedrock with BAA), strict PHI handling, audit trails, and minimum necessary data exposure. Aetheris AI architects every healthcare engagement around HIPAA from day one.' },
      { question: 'What are the highest-ROI AI use cases for clinics?', answer: 'In order: ambient clinical documentation, intake and scheduling automation, prior authorization workflow agents, denial management, and patient follow-up sequences. These hit existing cost centers, fastest payback.' },
      { question: 'Can AI replace EHR systems?', answer: 'No, and it shouldn\'t. AI augments your EHR by automating the work that happens around it, intake forms, charting, billing follow-up, prior auth packets. Your EHR stays the system of record.' },
      { question: 'How long does healthcare AI deployment take?', answer: 'Diagnostic and roadmap: 2 weeks. First pilot live: 4–8 weeks. Full operational deployment of 3 high-ROI use cases: 90–120 days. Aetheris AI runs a 14-Day Operational Diagnostic specifically scoped for healthcare ops.' },
      { question: 'Does AI work for small practices, not just hospitals?', answer: 'Especially for small practices. A 3–10 provider clinic gets disproportionate ROI because admin overhead is a larger percentage of revenue. Most clinic AI wins are off-the-shelf tools deployed correctly, not custom builds.' },
    ],
    howToSteps: [
      { name: 'Map clinical and admin workflows', text: 'Document every patient touchpoint from inquiry to billing. Identify where staff time and revenue leak.' },
      { name: 'Score use cases by ROI and HIPAA risk', text: 'Rank automation candidates against revenue impact, deployment cost, and PHI exposure.' },
      { name: 'Pilot intake and documentation first', text: 'Start with ambient scribes and intake agents, fastest payback, lowest clinical risk, highest staff buy-in.' },
      { name: 'Layer revenue cycle automation', text: 'Add prior auth, denial management, and billing follow-up agents once intake is stable.' },
      { name: 'Measure, govern, expand', text: 'Track time saved, claims cycle improvement, and patient satisfaction. Scale to next-priority use cases quarterly.' },
    ],
  },

  // ─────────────────────────────────────────────────────────── Finance
  {
    slug: 'ai-for-finance',
    industry: 'Finance',
    industryLower: 'finance',
    metaTitle: 'AI for Finance | Compliance-First AI Consulting',
    metaDescription: 'AI strategy for banks, lenders, RIAs, and accounting firms. Compliance-first deployment, underwriting automation, fraud, and client ops.',
    keywords: 'AI for finance, financial services AI, AI for banks, AI for lending, AI for RIAs, fraud detection AI, AML automation, AI compliance',
    heroEyebrow: 'AI for Financial Services',
    heroHeadline: 'Your underwriters are doing $30/hour work that AI does in 8 seconds.',
    heroSubheadline: 'Compliance-first AI for banks, lenders, RIAs, and accounting firms. Underwriting acceleration, fraud, AML, and client ops.',
    painHook: 'Manual document review. Reconciliation queues. KYC packets bouncing between three teams. Every day you don\'t deploy AI here, a competitor closes loans you took 14 days to underwrite.',
    tldr: 'Financial services firms using AI report 40–70% faster document processing, 25% better fraud detection, and underwriting cycles compressed from days to hours. The competitive moat is operational speed, not flashier dashboards.',
    useCases: [
      { category: 'Strategy', title: 'AI ROI Analysis for Loan Operations', description: 'Quantify pipeline value lost to slow underwriting, KYC delays, and exception handling, then prioritize against deployment cost.' },
      { category: 'Governance', title: 'Model Risk & Explainable AI', description: 'XAI for credit decisions, bias mitigation for fair lending compliance, and full audit trails for SR 11-7 and OCC review.' },
      { category: 'Technology', title: 'Document Intelligence & Underwriting Agents', description: 'LLM extraction from tax returns, bank statements, and W-2s. Underwriting copilots that surface decision-grade summaries in seconds.' },
      { category: 'Marketing & Operations', title: 'AML, Fraud & Client Communications', description: 'Real-time fraud signals, AML alert triage agents, and AI-driven client onboarding sequences for RIAs and wealth managers.' },
    ],
    stats: [
      { value: '40–70%', label: 'Faster document processing' },
      { value: '8 sec', label: 'AI underwriting summary vs. 2 hours manual' },
      { value: '25%', label: 'Improvement in fraud detection precision' },
      { value: '$50B+', label: 'Annual fraud losses AI could materially reduce' },
    ],
    roiAngle: 'A regional lender doing $200M annual originations typically loses 15–25% of pipeline to underwriting cycle time. AI document intelligence and underwriting agents can recover that within 90 days, that\'s $30M–$50M of additional capacity at zero new headcount.',
    faqs: [
      { question: 'How is AI used in financial services?', answer: 'Document extraction, underwriting acceleration, fraud detection, AML alert triage, KYC automation, client onboarding, portfolio analytics, and intelligent reconciliation. The highest-ROI deployments compress operational cycle time on revenue-generating workflows.' },
      { question: 'Is AI compliant with financial regulations?', answer: 'Yes, when governance is built in. Compliance requires explainable models for credit decisions, bias testing for fair lending, full audit trails (SR 11-7, OCC, FINRA), and model risk management. Aetheris AI builds governance into every financial deployment.' },
      { question: 'Can AI replace underwriters?', answer: 'No, it amplifies them. AI handles the 80% of document review, data extraction, and policy-rule application that drains underwriter time. Humans keep authority on edge cases, exceptions, and final approval.' },
      { question: 'How does AI improve fraud detection?', answer: 'Pattern detection across millions of transactions in real time, behavioral baselining per customer, network analysis for ring detection, and false-positive reduction. Banks using AI fraud platforms report 20–40% better precision and material reductions in investigator workload.' },
      { question: 'What\'s the fastest AI win for a small bank or credit union?', answer: 'Document intelligence for loan applications. Off-the-shelf LLM extraction can compress an 8-hour underwriting prep to 15 minutes. Deployment is 60–90 days and ROI hits the first month.' },
    ],
    howToSteps: [
      { name: 'Quantify cycle-time pain', text: 'Measure days-to-decision, exception volume, and pipeline drop-off at each underwriting stage.' },
      { name: 'Build the compliance frame first', text: 'Define model risk policy, XAI requirements, audit logging, and bias testing protocols before model selection.' },
      { name: 'Pilot document intelligence', text: 'Deploy LLM extraction on tax returns, bank statements, and pay stubs. Measure time saved per file.' },
      { name: 'Add underwriting & fraud agents', text: 'Layer decision-grade summarization, alert triage, and exception routing on top of document intelligence.' },
      { name: 'Govern and scale', text: 'Quarterly model review, drift monitoring, and expansion to AML, KYC refresh, and portfolio analytics.' },
    ],
  },

  // ─────────────────────────────────────────────────────────── Logistics
  {
    slug: 'ai-for-logistics',
    industry: 'Logistics',
    industryLower: 'logistics',
    metaTitle: 'AI for Logistics | Routing, Forecasting & Ops AI',
    metaDescription: 'AI for 3PLs, freight brokers, and supply chain operators. Routing optimization, demand forecasting, dispatch automation, and exception management.',
    keywords: 'AI for logistics, AI for 3PL, AI for freight brokers, supply chain AI, route optimization AI, demand forecasting AI, dispatch automation, logistics AI consulting',
    heroEyebrow: 'AI for Logistics & Supply Chain',
    heroHeadline: 'Your dispatchers are babysitting spreadsheets while competitors run AI.',
    heroSubheadline: 'AI for 3PLs, freight brokers, and supply chain ops. Routing, forecasting, dispatch automation, and exception management.',
    painHook: 'Manual load matching. Phone-tag with carriers. Reactive exception handling. Every freight broker still doing this in 2026 is being out-margined by ones that aren\'t.',
    tldr: 'Logistics operators using AI cut empty miles by 10–20%, improve forecast accuracy by 30%, and automate 50–70% of routine dispatch decisions. The margin recovery is immediate and compounds with volume.',
    useCases: [
      { category: 'Strategy', title: 'Network Optimization Strategy', description: 'Map lane economics, carrier mix, and load profitability. Identify where AI routing and load matching unlock margin.' },
      { category: 'Governance', title: 'Data Quality & Decision Auditability', description: 'Clean shipment data, defined data contracts, and explainable routing decisions for shipper and carrier accountability.' },
      { category: 'Technology', title: 'Routing, Matching & Forecasting Models', description: 'Multi-stop optimization, dynamic load matching, demand forecasting, and ETA prediction with real-time signal ingestion.' },
      { category: 'Marketing & Operations', title: 'Dispatch & Exception Agents', description: 'AI agents that triage tracking exceptions, draft carrier communications, and surface only the decisions humans need to make.' },
    ],
    stats: [
      { value: '10–20%', label: 'Empty miles eliminated with AI routing' },
      { value: '30%', label: 'Demand forecast accuracy improvement' },
      { value: '50–70%', label: 'Routine dispatch decisions automated' },
      { value: '$80B', label: 'Annual US trucking inefficiency cost' },
    ],
    roiAngle: 'A mid-size 3PL doing $50M revenue typically loses $2M–$4M annually to empty miles, manual load matching, and exception firefighting. AI routing and dispatch agents recover the majority of that within 6 months, pure margin, no new revenue required.',
    faqs: [
      { question: 'How is AI used in logistics?', answer: 'Route optimization, dynamic load matching, demand forecasting, ETA prediction, exception management, dispatch automation, freight rate prediction, and warehouse slotting. The highest-ROI deployments compress dispatcher decisions and reduce empty miles.' },
      { question: 'Can AI replace freight brokers?', answer: 'No, it makes good brokers 5x more productive. AI handles load matching, carrier communications, rate analysis, and exception triage. Human brokers stay focused on relationships, negotiation, and complex problem solving.' },
      { question: 'What\'s the fastest AI win for a 3PL?', answer: 'AI dispatch and exception triage agents. They sit on top of your existing TMS, triage tracking issues, draft carrier emails, and surface only the decisions humans need to make. Deployment is 30–60 days.' },
      { question: 'Does AI work for small fleets and brokerages?', answer: 'Yes. Off-the-shelf AI tools for routing, load matching, and dispatch automation are now affordable for fleets under 50 trucks and brokerages under $20M revenue. The math works because labor is the dominant cost.' },
      { question: 'How accurate is AI demand forecasting in logistics?', answer: 'Properly built models improve forecast MAPE by 25–40% over moving-average methods. Accuracy depends on data quality, signal ingestion (weather, fuel, lane indices), and feedback loops. Aetheris AI builds the data foundation first, models second.' },
    ],
    howToSteps: [
      { name: 'Audit lane and load economics', text: 'Calculate margin per lane, empty mile cost, and exception rate. Find where AI moves the needle most.' },
      { name: 'Clean shipment and carrier data', text: 'AI is only as good as the data feeding it. Standardize TMS records, carrier profiles, and event logs first.' },
      { name: 'Pilot dispatch and exception agents', text: 'Layer AI on top of the TMS to triage exceptions and draft carrier comms. Fastest payback, lowest risk.' },
      { name: 'Deploy routing and forecasting models', text: 'Add multi-stop optimization, demand forecasting, and ETA prediction once dispatch agents are stable.' },
      { name: 'Measure margin recovery and expand', text: 'Track empty miles, dispatcher productivity, and exception cycle time. Scale to warehousing and pricing AI.' },
    ],
  },

  // ─────────────────────────────────────────────────────────── Construction
  {
    slug: 'ai-for-construction',
    industry: 'Construction',
    industryLower: 'construction',
    metaTitle: 'AI for Construction | Bid, RFI & Field Ops AI',
    metaDescription: 'AI for GCs, subcontractors, and construction firms. Bid analysis, RFI automation, schedule risk, safety vision, and field ops intelligence.',
    keywords: 'AI for construction, construction AI consulting, bid analysis AI, RFI automation, construction safety AI, schedule risk AI, AI for GCs, AI for subcontractors',
    heroEyebrow: 'AI for Construction',
    heroHeadline: 'Your PMs lose $200K projects to RFIs they could have answered in seconds.',
    heroSubheadline: 'AI for GCs, subs, and construction firms. Bid intelligence, RFI automation, schedule risk modeling, and safety vision.',
    painHook: 'PDFs everywhere. RFIs taking weeks. Schedule slippage discovered after the fact. Construction is the last industry getting digitized, and the firms that move first eat everyone else\'s lunch.',
    tldr: 'Construction firms deploying AI report 25–40% faster bid turnaround, RFI cycle compression from weeks to hours, 15–30% reduction in schedule slippage, and meaningful safety incident reductions through computer vision.',
    useCases: [
      { category: 'Strategy', title: 'Bid Strategy & Pursuit Intelligence', description: 'AI-driven bid go/no-go scoring, win-rate analytics, and historical pattern matching against past won/lost projects.' },
      { category: 'Governance', title: 'Document Control & Audit Trails', description: 'Versioned RFI logs, AI-generated change-order summaries, and immutable audit trails for litigation defense.' },
      { category: 'Technology', title: 'Plan Reading, RFI & Schedule Agents', description: 'LLM-powered plan/spec extraction, RFI auto-drafts grounded in project documents, and schedule risk forecasting.' },
      { category: 'Marketing & Operations', title: 'Field Safety Vision & Daily Reports', description: 'Computer vision for PPE compliance and hazard detection. AI-drafted daily reports from field photos and voice notes.' },
    ],
    stats: [
      { value: '25–40%', label: 'Faster bid turnaround with AI' },
      { value: 'Hours', label: 'RFI cycle vs. weeks manually' },
      { value: '15–30%', label: 'Schedule slippage reduction' },
      { value: '$1.6T', label: 'Global construction productivity gap' },
    ],
    roiAngle: 'A mid-market GC bidding $200M annually typically wins 20–30% of pursuits. Lifting win rate by even 5 points through AI bid intelligence is $10M–$15M in additional revenue. Add RFI compression and schedule risk reduction, and construction AI pays for itself on a single project.',
    faqs: [
      { question: 'How is AI used in construction?', answer: 'Plan and spec extraction, bid analysis and pursuit scoring, RFI auto-drafting, schedule risk modeling, change order analysis, computer vision for safety and progress tracking, and daily report automation. The wins are in document-heavy and field-visibility workflows.' },
      { question: 'Can AI read construction plans and specs?', answer: 'Yes, modern multimodal LLMs and document AI can extract scope, quantities, and clarifying questions from plans and specs at near-human accuracy. They drastically compress estimating prep time and surface RFI opportunities pre-bid.' },
      { question: 'What\'s the fastest AI win for a GC?', answer: 'RFI automation. AI grounded in project documents drafts RFI responses in minutes instead of days, with citations to plan sheets and specs. PMs review and send. Deployment is 30–60 days, ROI hits on the next project.' },
      { question: 'Is AI safe for safety-critical construction work?', answer: 'AI augments safety, it doesn\'t replace OSHA-compliant programs. Computer vision detects PPE violations, unsafe behaviors, and hazard zones in real time. Humans still own safety culture, training, and incident response.' },
      { question: 'Does construction AI work for small GCs and subcontractors?', answer: 'Yes. Off-the-shelf bid analysis, RFI tooling, and field reporting AI are affordable for firms under $50M revenue. The smaller the back office, the more leverage AI provides.' },
    ],
    howToSteps: [
      { name: 'Inventory document and field workflows', text: 'Map where PMs, estimators, and field teams spend time, bids, RFIs, dailies, schedules, change orders.' },
      { name: 'Pilot AI on RFIs and bid prep', text: 'Fastest win. Document-heavy, repetitive, high-leverage. Measure cycle time before and after.' },
      { name: 'Deploy field vision and daily reports', text: 'Add safety vision and AI-drafted daily reports from photos and voice notes once back-office AI is stable.' },
      { name: 'Layer schedule risk and change-order analytics', text: 'Predict slippage, score change orders for margin impact, and surface risks before they hit the field.' },
      { name: 'Govern, measure, expand', text: 'Track win rate, RFI cycle, schedule variance, and safety incidents. Expand to procurement and warranty workflows.' },
    ],
  },

  // ─────────────────────────────────────────────────────────── Manufacturing
  {
    slug: 'ai-for-manufacturing',
    industry: 'Manufacturing',
    industryLower: 'manufacturing',
    metaTitle: 'AI for Manufacturing | Predictive & Quality AI',
    metaDescription: 'AI for manufacturers and industrial operators. Predictive maintenance, quality vision, demand forecasting, and shop floor intelligence.',
    keywords: 'AI for manufacturing, manufacturing AI consulting, predictive maintenance AI, quality inspection AI, computer vision manufacturing, industrial AI, AI for factories',
    heroEyebrow: 'AI for Manufacturing',
    heroHeadline: 'Unplanned downtime is robbing you blind, and you\'re still scheduling maintenance by calendar.',
    heroSubheadline: 'AI for manufacturers and industrial operators. Predictive maintenance, quality vision, demand forecasting, and shop floor intelligence.',
    painHook: 'Calendar-based PMs. Reactive quality holds. Demand forecasts built in Excel. Manufacturing is the highest-leverage industry for AI and most plants haven\'t deployed a single useful model.',
    tldr: 'Manufacturers using AI report 25–40% reductions in unplanned downtime, 30–50% improvements in defect detection, and 15–25% better demand forecast accuracy. Most wins come from off-the-shelf predictive maintenance and computer vision, not custom models.',
    useCases: [
      { category: 'Strategy', title: 'OEE & Throughput AI Strategy', description: 'Map availability, performance, and quality losses against AI deployment ROI. Pilot where the OEE gap is biggest.' },
      { category: 'Governance', title: 'Industrial Data Foundation', description: 'OT/IT integration, sensor data contracts, model versioning, and operator override protocols for plant-floor AI.' },
      { category: 'Technology', title: 'Predictive Maintenance & Quality Vision', description: 'Vibration and thermal anomaly detection, computer vision for defect identification, and root-cause analytics on production data.' },
      { category: 'Marketing & Operations', title: 'Demand Forecasting & S&OP AI', description: 'AI-driven demand forecasts, supplier risk modeling, and inventory optimization integrated into S&OP cycles.' },
    ],
    stats: [
      { value: '25–40%', label: 'Reduction in unplanned downtime' },
      { value: '30–50%', label: 'Better defect detection vs. manual QC' },
      { value: '15–25%', label: 'Improved demand forecast accuracy' },
      { value: '$1T', label: 'Annual cost of unplanned industrial downtime' },
    ],
    roiAngle: 'A $100M plant with 10% unplanned downtime is bleeding $10M+ annually in lost throughput. Predictive maintenance and quality vision typically recover 25–40% of that within a year, that\'s $2.5M–$4M to the bottom line on infrastructure that already exists.',
    faqs: [
      { question: 'How is AI used in manufacturing?', answer: 'Predictive maintenance, quality inspection via computer vision, demand forecasting, supplier risk modeling, energy optimization, root-cause analytics, and shop floor agent assistants. The fastest payback is in downtime reduction and defect detection.' },
      { question: 'What\'s the fastest AI win for a manufacturer?', answer: 'Computer vision quality inspection or predictive maintenance on a single high-value asset. Off-the-shelf platforms can deploy in 60–90 days with measurable defect reduction or downtime avoidance in the first quarter.' },
      { question: 'Does AI require new sensors or PLCs?', answer: 'Sometimes, but most plants have more usable data than they realize. SCADA, MES, and existing sensor streams typically have enough signal to start. Aetheris AI starts with a data audit before recommending hardware investment.' },
      { question: 'Is AI predictive maintenance accurate enough to trust?', answer: 'Properly trained models on critical assets achieve 80%+ failure prediction accuracy with weeks of lead time. Accuracy depends on sensor quality, data history, and operator feedback loops. AI augments, operators still own the maintenance decision.' },
      { question: 'Can small manufacturers benefit from AI?', answer: 'Yes. Off-the-shelf computer vision and predictive maintenance tools are now affordable for plants under $50M revenue. Smaller plants often see faster ROI because every avoided downtime hour is a larger percentage of throughput.' },
    ],
    howToSteps: [
      { name: 'Audit OEE losses and data availability', text: 'Identify the largest availability, performance, and quality losses. Inventory existing SCADA, MES, and sensor data.' },
      { name: 'Pilot on a single high-value asset', text: 'Predictive maintenance on a critical line or vision QC on a high-defect-cost product. Prove ROI on one win first.' },
      { name: 'Build the industrial data foundation', text: 'OT/IT integration, sensor data contracts, model versioning, and operator override protocols.' },
      { name: 'Layer demand and supplier AI', text: 'Add demand forecasting, supplier risk, and inventory optimization once shop-floor AI is stable.' },
      { name: 'Govern, measure, scale', text: 'Track downtime, defect rate, forecast accuracy, and OEE. Expand to additional lines and energy optimization.' },
    ],
  },

  // ─────────────────────────────────────────────────────────── SaaS
  {
    slug: 'ai-for-saas',
    industry: 'SaaS',
    industryLower: 'saas',
    metaTitle: 'AI for SaaS | Product, GTM & Customer Ops AI',
    metaDescription: 'AI strategy for SaaS founders and operators. AI-native product features, GTM automation, customer success AI, and operational efficiency.',
    keywords: 'AI for SaaS, AI for software companies, AI product strategy, GTM AI, customer success AI, SaaS automation, AI native SaaS, SaaS AI consulting',
    heroEyebrow: 'AI for SaaS',
    heroHeadline: 'Your competitors shipped AI features last quarter. You\'re still in roadmap meetings.',
    heroSubheadline: 'AI for SaaS founders and operators. Product strategy, GTM automation, customer success AI, and operational efficiency.',
    painHook: 'Buyers now expect AI inside your product. Your CS team is drowning in tickets that AI handles in seconds. Your SDRs spend half their day on tasks an AI agent does in five minutes. Every quarter you wait, churn compounds.',
    tldr: 'SaaS companies that integrate AI into product, GTM, and customer ops report 20–40% lifts in activation, 30–50% reductions in CS ticket volume, and meaningful pricing power gains. The competitive bar is now AI-native, not AI-adjacent.',
    useCases: [
      { category: 'Strategy', title: 'AI Product & Roadmap Strategy', description: 'Where to embed AI in your product, what to build vs. buy, and how to defend pricing power against AI-native competitors.' },
      { category: 'Governance', title: 'AI Trust, Privacy & Data Strategy', description: 'Model selection, customer data isolation, SOC 2-aligned AI governance, and transparent AI disclosures for enterprise buyers.' },
      { category: 'Technology', title: 'AI Features & Agentic Workflows', description: 'LLM-powered in-product assistants, RAG over customer data, agentic workflows, and embedded copilots that drive activation and stickiness.' },
      { category: 'Marketing & Operations', title: 'GTM & Customer Success AI', description: 'AI SDR sequences, lead scoring, churn prediction, in-app onboarding bots, and AI-driven support deflection.' },
    ],
    stats: [
      { value: '20–40%', label: 'Activation lift from AI in-product' },
      { value: '30–50%', label: 'Reduction in CS ticket volume' },
      { value: '5x', label: 'SDR productivity with AI sequencing' },
      { value: '70%+', label: 'B2B buyers expect AI in 2026 SaaS' },
    ],
    roiAngle: 'A $10M ARR SaaS with 80% gross retention is leaking $2M+ annually to churn. AI in-product assistants, churn prediction, and AI-driven CS typically lift retention 5–10 points within 12 months, that\'s $500K–$1M of recovered ARR with no new logos required.',
    faqs: [
      { question: 'What does "AI-native SaaS" actually mean?', answer: 'A SaaS product where AI is embedded in the core workflow, not bolted on as a chatbot. Examples: AI that drafts work for the user, agentic features that complete tasks autonomously, and RAG over customer data that produces decision-grade output. AI-native products defend pricing power.' },
      { question: 'Should we build our own LLM features or buy?', answer: 'Buy when the AI capability is commodity (transcription, generic chat, content generation). Build when the AI is core to your differentiation, requires deep integration with your data model, or unlocks new pricing tiers. Aetheris AI provides Build vs. Buy Analysis specifically for SaaS.' },
      { question: 'How do AI features affect SaaS pricing?', answer: 'AI-native features support 20–50% pricing premiums when they materially compress customer time-to-value. Pure AI add-on features rarely command standalone pricing, they get bundled. Pricing strategy should be designed alongside the AI feature, not after.' },
      { question: 'What\'s the fastest AI win for a SaaS GTM team?', answer: 'AI SDR and email sequencing. Tools like Clay, Apollo AI, and custom LLM agents can 5x outbound productivity in 60 days. Lead scoring and churn prediction follow once data foundations are in place.' },
      { question: 'How do we add AI without spooking enterprise customers?', answer: 'Transparent disclosures, customer data isolation, opt-in AI features, SOC 2-aligned governance, and clear training data policies. Enterprise AI sales now require an AI trust narrative as core as security.' },
    ],
    howToSteps: [
      { name: 'Audit product, GTM, and CS workflows', text: 'Find where AI compresses customer time-to-value (product) and where AI compresses internal cost (GTM, CS).' },
      { name: 'Pick one AI product feature and one ops AI', text: 'Ship a meaningful AI feature in-product (defends pricing) and deploy AI in GTM or CS (cuts cost). Two parallel pilots.' },
      { name: 'Build AI trust and governance early', text: 'Model selection, data isolation, SOC 2 alignment, and customer-facing AI disclosures before enterprise scrutiny hits.' },
      { name: 'Measure activation, retention, and unit economics', text: 'Track AI feature adoption, churn delta, CS deflection rate, and SDR productivity. Tie to ARR impact.' },
      { name: 'Reprice and expand', text: 'Once AI features prove value, restructure pricing tiers around AI capability and expand to agentic workflows and RAG.' },
    ],
  },
];

export const VERTICAL_BY_SLUG: Record<string, VerticalConfig> = Object.fromEntries(
  VERTICALS.map(v => [v.slug, v])
);
