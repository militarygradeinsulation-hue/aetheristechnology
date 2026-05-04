// Client-side mirror of forensics system intake fields (titles + fields only).
// AI prompts live server-side in supabase/functions/_shared/system-prompts.ts.

export interface IntakeField {
  name: string;
  label: string;
  type: "text" | "textarea" | "url";
  required?: boolean;
  placeholder?: string;
}

export interface ForensicsSystem {
  priceId: string;
  title: string;
  tier: string;
  intake: IntakeField[];
}

const COMMON: IntakeField[] = [
  { name: "businessName", label: "Business name", type: "text", required: true },
  { name: "websiteUrl", label: "Website URL", type: "url", required: true, placeholder: "https://..." },
  { name: "industry", label: "Industry", type: "text", required: true },
  { name: "icp", label: "Ideal customer / target buyer", type: "textarea", required: true },
];
const I = (extra: IntakeField[] = []): IntakeField[] => [...COMMON, ...extra];

export const FORENSICS_SYSTEMS: ForensicsSystem[] = [
  { priceId: "crm_health_check_once", title: "CRM Health Check", tier: "Tier 1",
    intake: I([
      { name: "crmTool", label: "CRM you use", type: "text", required: true },
      { name: "pipelineStages", label: "Current pipeline stages", type: "textarea", required: true },
      { name: "biggestPain", label: "Biggest CRM pain right now", type: "textarea", required: true },
    ])},
  { priceId: "lead_flow_mapper_once", title: "Lead Flow Mapper", tier: "Tier 1",
    intake: I([
      { name: "leadSources", label: "Lead sources", type: "textarea", required: true },
      { name: "monthlyLeads", label: "Approx leads / month", type: "text" },
      { name: "currentFunnel", label: "Current funnel from first touch to close", type: "textarea", required: true },
    ])},
  { priceId: "competitor_landing_analysis_once", title: "Competitor Landing Page Analysis", tier: "Tier 1",
    intake: I([
      { name: "competitor1", label: "Competitor 1 URL", type: "url", required: true },
      { name: "competitor2", label: "Competitor 2 URL", type: "url" },
      { name: "competitor3", label: "Competitor 3 URL", type: "url" },
    ])},
  { priceId: "email_series_bundle_once", title: "Email Series Bundle", tier: "Tier 1",
    intake: I([
      { name: "offer", label: "Primary offer to promote", type: "textarea", required: true },
      { name: "tone", label: "Tone (casual, blunt, polished...)", type: "text" },
    ])},
  { priceId: "crm_setup_optimization_once", title: "CRM Setup & Optimization Plan", tier: "Tier 2",
    intake: I([
      { name: "crmTool", label: "CRM platform", type: "text", required: true },
      { name: "teamSize", label: "Sales team size", type: "text" },
      { name: "salesCycle", label: "Average sales cycle length", type: "text" },
      { name: "currentSetup", label: "Current setup / what's broken", type: "textarea", required: true },
    ])},
  { priceId: "landing_page_blueprint_once", title: "Landing Page Blueprint", tier: "Tier 2",
    intake: I([
      { name: "offer", label: "Offer / product the page sells", type: "textarea", required: true },
      { name: "objections", label: "Top 3 objections buyers raise", type: "textarea", required: true },
      { name: "currentUrl", label: "Current landing page URL (if any)", type: "url" },
    ])},
  { priceId: "prospecting_list_builder_once", title: "Prospecting List Strategy", tier: "Tier 2",
    intake: I([
      { name: "titles", label: "Target job titles", type: "textarea", required: true },
      { name: "companySize", label: "Target company size", type: "text", required: true },
      { name: "geography", label: "Geographic focus", type: "text" },
      { name: "exclusions", label: "Companies to exclude", type: "textarea" },
    ])},
  { priceId: "sales_team_onboarding_once", title: "Sales Team Onboarding Program", tier: "Tier 2",
    intake: I([
      { name: "newHires", label: "How many new reps to onboard", type: "text", required: true },
      { name: "product", label: "What they'll be selling", type: "textarea", required: true },
    ])},
  { priceId: "lead_gen_sprint_once", title: "30-Day Lead Gen Sprint Plan", tier: "Tier 3",
    intake: I([
      { name: "leadGoal", label: "Lead goal for the 30 days", type: "text", required: true },
      { name: "budget", label: "Available budget (paid + tools)", type: "text" },
      { name: "channels", label: "Channels you can execute on", type: "textarea", required: true },
    ])},
  { priceId: "sales_process_redesign_once", title: "Sales Process Redesign", tier: "Tier 3",
    intake: I([
      { name: "currentProcess", label: "Walk through your current sales process step-by-step", type: "textarea", required: true },
      { name: "winRate", label: "Current win rate (if known)", type: "text" },
      { name: "biggestBottleneck", label: "Biggest bottleneck", type: "textarea", required: true },
    ])},
  { priceId: "marketing_sales_alignment_once", title: "Marketing-to-Sales Alignment Playbook", tier: "Tier 3",
    intake: I([
      { name: "mqlDef", label: "How is an MQL defined today (if at all)?", type: "textarea", required: true },
      { name: "handoffPain", label: "What breaks at the marketing→sales handoff?", type: "textarea", required: true },
    ])},
  { priceId: "sales_coaching_retainer_monthly", title: "Sales Coaching Kickoff", tier: "Recurring",
    intake: I([
      { name: "reps", label: "Reps in the program (names + tenure)", type: "textarea", required: true },
      { name: "focusAreas", label: "Top focus areas", type: "textarea", required: true },
    ])},
  { priceId: "lead_nurture_automation_monthly", title: "Lead Nurture Automation Kickoff", tier: "Recurring",
    intake: I([
      { name: "stages", label: "Lifecycle stages you want to nurture", type: "textarea", required: true },
      { name: "platform", label: "Email/automation platform", type: "text", required: true },
    ])},

  // ===== 1M IQ Innovations · Core =====
  { priceId: "obsession_engine_once", title: "The Obsession Engine", tier: "1M IQ · Core",
    intake: I([
      { name: "dataSources", label: "Customer data sources you can share (emails, Slack, support tickets, reviews...)", type: "textarea", required: true },
      { name: "currentPositioning", label: "Current positioning / messaging in one paragraph", type: "textarea", required: true },
      { name: "competitors", label: "Top 2–3 competitors", type: "text" },
    ])},
  { priceId: "revenue_leak_detector_once", title: "The Revenue Leak Detector", tier: "1M IQ · Core",
    intake: I([
      { name: "annualRevenue", label: "Approx annual revenue", type: "text", required: true },
      { name: "teamSize", label: "Team size (sales, ops, support)", type: "text" },
      { name: "knownLeaks", label: "Leaks you already suspect", type: "textarea" },
      { name: "stack", label: "CRM / billing / support tools in use", type: "textarea", required: true },
    ])},
  { priceId: "messaging_psychologist_once", title: "The Messaging Psychologist", tier: "1M IQ · Core",
    intake: I([
      { name: "currentCopy", label: "Paste current homepage hero / primary messaging", type: "textarea", required: true },
      { name: "buyerEmotions", label: "What you THINK your buyer feels before buying", type: "textarea", required: true },
      { name: "competitorCopy", label: "1–2 competitor headlines for contrast", type: "textarea" },
    ])},
  { priceId: "opportunity_radar_once", title: "The Opportunity Radar", tier: "1M IQ · Core",
    intake: I([
      { name: "accountName", label: "Customer / account name", type: "text", required: true },
      { name: "currentSpend", label: "Current monthly/annual spend", type: "text", required: true },
      { name: "productsUsed", label: "Products / modules they currently use", type: "textarea", required: true },
      { name: "fullCatalog", label: "Your full product catalog", type: "textarea", required: true },
    ])},
  { priceId: "death_wish_detector_once", title: "The Competitive Death Wish Detector", tier: "1M IQ · Core",
    intake: I([
      { name: "competitorName", label: "Competitor name", type: "text", required: true },
      { name: "competitorUrl", label: "Competitor URL", type: "url", required: true },
      { name: "yourEdge", label: "Where you already feel structurally different", type: "textarea", required: true },
    ])},
  { priceId: "sales_psychography_once", title: "The Sales Psychography Builder", tier: "1M IQ · Core",
    intake: I([
      { name: "personaTitle", label: "Target persona title", type: "text", required: true },
      { name: "personaContext", label: "Industry / company context for this persona", type: "textarea", required: true },
      { name: "linkedinSample", label: "Sample LinkedIn URL or bio for this persona", type: "textarea" },
    ])},
  { priceId: "market_timing_oracle_once", title: "The Market Timing Oracle", tier: "1M IQ · Core",
    intake: I([
      { name: "prospectName", label: "Prospect company", type: "text", required: true },
      { name: "prospectUrl", label: "Prospect URL", type: "url", required: true },
      { name: "knownSignals", label: "Recent signals you've seen (funding, hires, news...)", type: "textarea" },
    ])},
  { priceId: "unfair_advantage_detector_once", title: "The Unfair Advantage Detector", tier: "1M IQ · Core",
    intake: I([
      { name: "selfDescribedMoat", label: "What you currently believe is your moat", type: "textarea", required: true },
      { name: "team", label: "Team composition / unique people / IP", type: "textarea", required: true },
      { name: "data", label: "Proprietary data / network effects you have", type: "textarea" },
    ])},
  { priceId: "ltv_maximizer_once", title: "The Customer LTV Maximizer", tier: "1M IQ · Core",
    intake: I([
      { name: "avgLtv", label: "Approx current avg LTV", type: "text" },
      { name: "segments", label: "Customer segments today (named tiers if any)", type: "textarea", required: true },
      { name: "churnDrivers", label: "Top churn drivers you know of", type: "textarea", required: true },
    ])},
  { priceId: "pmf_predictor_once", title: "Product-Market Momentum Predictor", tier: "1M IQ · Core",
    intake: I([
      { name: "productIdea", label: "Describe the product idea in detail", type: "textarea", required: true },
      { name: "targetUser", label: "Target user + their job-to-be-done", type: "textarea", required: true },
      { name: "earlySignals", label: "Any early signals (waitlist, interviews, paid pilots)", type: "textarea" },
    ])},

  // ===== 1M IQ Innovations · Ops Intel =====
  { priceId: "conversation_intelligence_monthly", title: "Customer Conversation Intelligence Engine", tier: "1M IQ · Ops Intel",
    intake: I([
      { name: "channels", label: "Channels to ingest (Zoom, phone, email, Slack, support)", type: "textarea", required: true },
      { name: "teamSize", label: "Number of customer-facing employees", type: "text", required: true },
      { name: "topQuestions", label: "Top business questions you want answered from conversations", type: "textarea", required: true },
    ])},
  { priceId: "deal_momentum_predictor_monthly", title: "Deal Momentum Predictor", tier: "1M IQ · Ops Intel",
    intake: I([
      { name: "crm", label: "CRM platform", type: "text", required: true },
      { name: "openDeals", label: "Approx open deals / month", type: "text", required: true },
      { name: "stages", label: "Pipeline stages", type: "textarea", required: true },
      { name: "winRate", label: "Current win rate (if known)", type: "text" },
    ])},
  { priceId: "competitive_stealing_blueprint_monthly", title: "Competitive Stealing Blueprint", tier: "1M IQ · Ops Intel",
    intake: I([
      { name: "competitor1", label: "Competitor 1", type: "text", required: true },
      { name: "competitor2", label: "Competitor 2", type: "text" },
      { name: "competitor3", label: "Competitor 3", type: "text" },
      { name: "switchingOffer", label: "Best switching offer / incentive you can deploy", type: "textarea", required: true },
    ])},
  { priceId: "pricing_elasticity_optimizer_once", title: "Pricing Elasticity Optimizer", tier: "1M IQ · Ops Intel",
    intake: I([
      { name: "currentPricing", label: "Current pricing structure", type: "textarea", required: true },
      { name: "winLossNotes", label: "Win/loss notes around price (paste anything you have)", type: "textarea", required: true },
      { name: "segments", label: "Customer segments today", type: "textarea", required: true },
    ])},
  { priceId: "product_usage_optimization_monthly", title: "Product Usage Optimization Engine", tier: "1M IQ · Ops Intel",
    intake: I([
      { name: "productType", label: "Product type (SaaS / app / platform)", type: "text", required: true },
      { name: "keyFeatures", label: "Key features to track", type: "textarea", required: true },
      { name: "successMetric", label: "What 'customer success' looks like in your product", type: "textarea", required: true },
    ])},
  { priceId: "customer_research_automation_monthly", title: "Customer Research Automation Platform", tier: "1M IQ · Ops Intel",
    intake: I([
      { name: "researchGoal", label: "Primary research goal for the next 90 days", type: "textarea", required: true },
      { name: "audienceAccess", label: "How you can reach customers (list size, channels)", type: "textarea", required: true },
      { name: "openQuestions", label: "Open product/strategy questions you need answered", type: "textarea", required: true },
    ])},
  { priceId: "sales_team_cloning_monthly", title: "Sales Team Cloning System", tier: "1M IQ · Ops Intel",
    intake: I([
      { name: "topRepName", label: "Your top rep's name", type: "text", required: true },
      { name: "topRepBehaviors", label: "What you observe makes them best (calls, follow-up, framing...)", type: "textarea", required: true },
      { name: "teamSize", label: "Team size to train", type: "text", required: true },
      { name: "product", label: "What they sell + typical objections", type: "textarea", required: true },
    ])},

  // ===== 1M IQ Innovations · Strategic =====
  { priceId: "hiring_predictor_monthly", title: "Hiring Predictor & Recruiter AI", tier: "1M IQ · Strategic",
    intake: I([
      { name: "roleTitle", label: "Role to hire", type: "text", required: true },
      { name: "winners", label: "Traits / backgrounds of past WINNERS in this role", type: "textarea", required: true },
      { name: "losers", label: "Traits / backgrounds of past misfires in this role", type: "textarea", required: true },
    ])},
  { priceId: "customer_health_score_monthly", title: "Customer Communication Health Score", tier: "1M IQ · Strategic",
    intake: I([
      { name: "customerCount", label: "Approx active customer count", type: "text", required: true },
      { name: "touchpoints", label: "Customer touchpoints today (CSM, support, product)", type: "textarea", required: true },
      { name: "currentChurn", label: "Current churn rate (if known)", type: "text" },
    ])},
  { priceId: "territory_intelligence_once", title: "Sales Territory Intelligence System", tier: "1M IQ · Strategic",
    intake: I([
      { name: "currentTerritories", label: "Current territory split (geo / vertical / ABM)", type: "textarea", required: true },
      { name: "repCount", label: "Rep count + skill notes", type: "textarea", required: true },
      { name: "tam", label: "Where your TAM is densest", type: "textarea", required: true },
    ])},
  { priceId: "account_growth_accelerator_monthly", title: "Account Growth Accelerator", tier: "1M IQ · Strategic",
    intake: I([
      { name: "keyAccounts", label: "Top 10–20 key accounts (names + spend)", type: "textarea", required: true },
      { name: "expansionLevers", label: "Expansion levers in your model (seats, modules, departments)", type: "textarea", required: true },
    ])},
  { priceId: "operational_excellence_once", title: "Operational Excellence Auditor", tier: "1M IQ · Strategic",
    intake: I([
      { name: "coreProcesses", label: "Core operational processes (order, fulfill, support, billing...)", type: "textarea", required: true },
      { name: "knownPain", label: "Known operational pain / waste", type: "textarea", required: true },
      { name: "headcount", label: "Operational headcount", type: "text" },
    ])},
  { priceId: "tech_debt_auditor_once", title: "Technology Debt Auditor", tier: "1M IQ · Strategic",
    intake: I([
      { name: "stack", label: "Tech stack (languages, frameworks, infra)", type: "textarea", required: true },
      { name: "engTeamSize", label: "Engineering team size", type: "text", required: true },
      { name: "knownDebt", label: "Known debt items / pain", type: "textarea", required: true },
      { name: "roadmap", label: "Product roadmap blocked by debt (if any)", type: "textarea" },
    ])},
  { priceId: "disruption_predictor_once", title: "Disruption Predictor", tier: "1M IQ · Strategic",
    intake: I([
      { name: "industry", label: "Industry + sub-segment", type: "text", required: true },
      { name: "currentModel", label: "Your current business model in 2–3 sentences", type: "textarea", required: true },
      { name: "watchlist", label: "Players / tech you already watch", type: "textarea" },
    ])},
  { priceId: "org_structure_optimizer_once", title: "Org Structure Optimizer", tier: "1M IQ · Strategic",
    intake: I([
      { name: "currentStructure", label: "Current org structure (departments, layers, reporting)", type: "textarea", required: true },
      { name: "headcount", label: "Total headcount", type: "text", required: true },
      { name: "decisionPain", label: "Where decisions get stuck today", type: "textarea", required: true },
    ])},
];

// Public checkout is disabled for these priceIds — they render a red "Coming Soon"
// badge on /services and cannot be added to the Mix & Match bundle. Admins can
// still run them free-of-charge from the Admin → Forensics Systems panel.
// To re-enable sales, remove the priceId from this set.
export const COMING_SOON_PRICE_IDS: ReadonlySet<string> = new Set<string>([
  ...FORENSICS_SYSTEMS.map(s => s.priceId),
  // Monthly variants surfaced in ServicesPricing but not in this catalog
  "crm_health_check_monthly",
  "lead_flow_mapper_monthly",
  // 1M IQ Innovations — net-new categories, public checkout disabled
  "obsession_engine_once", "obsession_engine_monthly",
  "revenue_leak_detector_once", "revenue_leak_detector_monthly",
  "messaging_psychologist_once", "messaging_psychologist_monthly",
  "opportunity_radar_once", "opportunity_radar_monthly",
  "death_wish_detector_once",
  "sales_psychography_once", "sales_psychography_monthly",
  "market_timing_oracle_once", "market_timing_oracle_monthly",
  "unfair_advantage_detector_once",
  "ltv_maximizer_once",
  "pmf_predictor_once",
  // More 1M IQ Innovations (#11–#20, distinct from prior set)
  "conversation_intelligence_monthly",
  "deal_momentum_predictor_monthly",
  "competitive_stealing_blueprint_monthly",
  "pricing_elasticity_optimizer_once", "pricing_elasticity_optimizer_monthly",
  "product_usage_optimization_monthly",
  "customer_research_automation_monthly",
  "sales_team_cloning_monthly",
  // 1M IQ Innovations #31–#40 (skipped #34, #37 — overlap with Customer Research Automation)
  "hiring_predictor_monthly",
  "customer_health_score_monthly",
  "territory_intelligence_once",
  "account_growth_accelerator_monthly",
  "operational_excellence_once",
  "tech_debt_auditor_once",
  "disruption_predictor_once",
  "org_structure_optimizer_once",
]);

export const isComingSoonPriceId = (priceId?: string | null): boolean =>
  !!priceId && COMING_SOON_PRICE_IDS.has(priceId);
