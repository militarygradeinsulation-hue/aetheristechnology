// Maps each of the 13 system priceIds to:
//  - tool_type slug (stored on purchase_deliverables)
//  - intake fields (asked of the client after purchase)
//  - AI system prompt + user prompt template (Lovable AI Gateway)
//  - human-readable title

export interface IntakeField {
  name: string;
  label: string;
  type: "text" | "textarea" | "url" | "email";
  required?: boolean;
  placeholder?: string;
}

export interface SystemSpec {
  priceId: string;
  toolType: string;
  title: string;
  intake: IntakeField[];
  systemPrompt: string;
  userPrompt: (intake: Record<string, string>) => string;
}

const COMMON_INTAKE: IntakeField[] = [
  { name: "businessName", label: "Business name", type: "text", required: true },
  { name: "websiteUrl", label: "Website URL", type: "url", required: true, placeholder: "https://..." },
  { name: "industry", label: "Industry", type: "text", required: true },
  { name: "icp", label: "Ideal customer / target buyer", type: "textarea", required: true, placeholder: "Who do you sell to? Job titles, company size, pain points." },
];

const I = (extra: IntakeField[] = []): IntakeField[] => [...COMMON_INTAKE, ...extra];

export const SYSTEM_SPECS: Record<string, SystemSpec> = {
  // ───────────── Tier 1 ($79–$149) ─────────────
  crm_health_check_once: {
    priceId: "crm_health_check_once",
    toolType: "crm_health_check",
    title: "CRM Health Check",
    intake: I([
      { name: "crmTool", label: "CRM you use (HubSpot, Salesforce, Pipedrive, etc.)", type: "text", required: true },
      { name: "pipelineStages", label: "Current pipeline stages (comma separated)", type: "textarea", required: true },
      { name: "biggestPain", label: "Biggest CRM pain right now", type: "textarea", required: true },
    ]),
    systemPrompt:
      "You are a CRM forensics operator. Diagnose where deals leak in this CRM setup. Be blunt, specific, and prescriptive. No fluff. Output as markdown.",
    userPrompt: (i) => `Business: ${i.businessName}\nWebsite: ${i.websiteUrl}\nIndustry: ${i.industry}\nICP: ${i.icp}\nCRM: ${i.crmTool}\nStages: ${i.pipelineStages}\nPain: ${i.biggestPain}\n\nProduce a CRM Health Check with: (1) 5 leak points ranked by $ impact, (2) Pipeline stage gaps, (3) Automation opportunities, (4) 7-day fix plan with concrete actions.`,
  },

  lead_flow_mapper_once: {
    priceId: "lead_flow_mapper_once",
    toolType: "lead_flow_map",
    title: "Lead Flow Mapper",
    intake: I([
      { name: "leadSources", label: "Lead sources (paid, organic, referral, outbound...)", type: "textarea", required: true },
      { name: "monthlyLeads", label: "Approx leads / month", type: "text" },
      { name: "currentFunnel", label: "Describe your current funnel from first touch to closed deal", type: "textarea", required: true },
    ]),
    systemPrompt: "You are a revenue operations forensics operator. Map lead flow and find leaks. Output structured markdown with diagrams in mermaid where useful.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nProduce a Lead Flow Map with: (1) Visual flow (mermaid), (2) Leak points + estimated lost revenue, (3) Conversion benchmarks per stage, (4) Top 3 fixes ranked by ROI.`,
  },

  competitor_landing_analysis_once: {
    priceId: "competitor_landing_analysis_once",
    toolType: "competitor_analysis",
    title: "Competitor Landing Page Analysis",
    intake: I([
      { name: "competitor1", label: "Competitor 1 URL", type: "url", required: true },
      { name: "competitor2", label: "Competitor 2 URL", type: "url" },
      { name: "competitor3", label: "Competitor 3 URL", type: "url" },
    ]),
    systemPrompt: "You are a conversion forensics operator. Tear down competitor landing pages and find positioning gaps. Output as markdown.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) Side-by-side analysis of headlines/value props, (2) CTAs and conversion patterns, (3) Their positioning weaknesses, (4) 5 specific opportunities to outflank them on copy and offer.`,
  },

  email_series_bundle_once: {
    priceId: "email_series_bundle_once",
    toolType: "email_series",
    title: "Email Series Bundle",
    intake: I([
      { name: "offer", label: "Primary offer to promote", type: "textarea", required: true },
      { name: "tone", label: "Tone (casual, blunt, polished...)", type: "text" },
    ]),
    systemPrompt: "You are a high-converting B2B copywriter. Write 4 email sequences (welcome, nurture, sales push, win-back) of 4 emails each.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nProduce 4 sequences × 4 emails. Each email: subject, preview text, body (markdown), CTA. Optimize for replies.`,
  },

  // ───────────── Tier 2 ($299–$399) ─────────────
  crm_setup_optimization_once: {
    priceId: "crm_setup_optimization_once",
    toolType: "crm_setup_plan",
    title: "CRM Setup & Optimization Plan",
    intake: I([
      { name: "crmTool", label: "CRM platform", type: "text", required: true },
      { name: "teamSize", label: "Sales team size", type: "text" },
      { name: "salesCycle", label: "Average sales cycle length", type: "text" },
      { name: "currentSetup", label: "Describe your current setup / what's broken", type: "textarea", required: true },
    ]),
    systemPrompt: "You are a CRM implementation operator. Build a complete setup blueprint.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) Recommended pipeline stages with definitions, (2) Required custom properties, (3) Automation workflows (with triggers + actions), (4) Reporting dashboards to build, (5) 30-day rollout plan, (6) Training checklist for the team.`,
  },

  landing_page_blueprint_once: {
    priceId: "landing_page_blueprint_once",
    toolType: "landing_page_blueprint",
    title: "Landing Page Blueprint",
    intake: I([
      { name: "offer", label: "Offer / product the page sells", type: "textarea", required: true },
      { name: "objections", label: "Top 3 objections buyers raise", type: "textarea", required: true },
      { name: "currentUrl", label: "Current landing page URL (if any)", type: "url" },
    ]),
    systemPrompt: "You are a landing page conversion architect. Produce a complete blueprint, not a draft.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) Hero section (headline, subhead, CTA), (2) Section-by-section wireframe with copy, (3) Objection-handling sections, (4) Social proof structure, (5) Form fields + CTA placement strategy, (6) A/B test ideas.`,
  },

  prospecting_list_builder_once: {
    priceId: "prospecting_list_builder_once",
    toolType: "prospecting_list",
    title: "Prospecting List Strategy",
    intake: I([
      { name: "titles", label: "Target job titles", type: "textarea", required: true },
      { name: "companySize", label: "Target company size", type: "text", required: true },
      { name: "geography", label: "Geographic focus", type: "text" },
      { name: "exclusions", label: "Companies to exclude", type: "textarea" },
    ]),
    systemPrompt: "You are a B2B prospecting strategist. Build a list-building playbook the client can execute (or hand to a researcher).",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) ICP firmographic + technographic filters, (2) Tool stack to build the list (Apollo, Sales Nav, etc.) with exact search strings, (3) Enrichment workflow, (4) Sample 25 example accounts that match (use realistic but illustrative names), (5) Outreach sequencing recommendation.`,
  },

  sales_team_onboarding_once: {
    priceId: "sales_team_onboarding_once",
    toolType: "sales_onboarding",
    title: "Sales Team Onboarding Program",
    intake: I([
      { name: "newHires", label: "How many new reps to onboard", type: "text", required: true },
      { name: "product", label: "What they'll be selling", type: "textarea", required: true },
    ]),
    systemPrompt: "You are a sales enablement operator. Build a 30-day onboarding program.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) Week-by-week onboarding plan, (2) Required reading/watching with topics, (3) Role-play scenarios, (4) Ramp-up quotas, (5) Certification checklist, (6) Manager check-in cadence.`,
  },

  // ───────────── Tier 3 ($999+) ─────────────
  lead_gen_sprint_once: {
    priceId: "lead_gen_sprint_once",
    toolType: "lead_gen_sprint",
    title: "30-Day Lead Gen Sprint Plan",
    intake: I([
      { name: "leadGoal", label: "Lead goal for the 30 days", type: "text", required: true },
      { name: "budget", label: "Available budget (paid + tools)", type: "text" },
      { name: "channels", label: "Channels you can execute on", type: "textarea", required: true },
    ]),
    systemPrompt: "You are a growth operator running a 30-day sprint. Build a daily execution plan.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) 30-day calendar (day-by-day actions), (2) Channel mix + budget allocation, (3) Outbound sequences (cold email + LinkedIn copy), (4) Lead magnet ideas, (5) Tracking dashboard fields, (6) Weekly review checkpoints.`,
  },

  sales_process_redesign_once: {
    priceId: "sales_process_redesign_once",
    toolType: "sales_process_redesign",
    title: "Sales Process Redesign",
    intake: I([
      { name: "currentProcess", label: "Walk through your current sales process step-by-step", type: "textarea", required: true },
      { name: "winRate", label: "Current win rate (if known)", type: "text" },
      { name: "biggestBottleneck", label: "Biggest bottleneck", type: "textarea", required: true },
    ]),
    systemPrompt: "You are a sales process forensics operator. Redesign the entire process.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) Current state diagnosis (where it leaks), (2) New stage definitions with exit criteria, (3) Required artifacts per stage (email templates, decks, contracts), (4) Forecast methodology, (5) Manager coaching framework, (6) 90-day rollout with milestones.`,
  },

  marketing_sales_alignment_once: {
    priceId: "marketing_sales_alignment_once",
    toolType: "marketing_sales_alignment",
    title: "Marketing-to-Sales Alignment Playbook",
    intake: I([
      { name: "mqlDef", label: "How is an MQL defined today (if at all)?", type: "textarea", required: true },
      { name: "handoffPain", label: "What breaks at the marketing→sales handoff?", type: "textarea", required: true },
    ]),
    systemPrompt: "You are a RevOps operator. Build the alignment playbook.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) Shared funnel definitions (MQL/SAL/SQL/Opp), (2) Lead scoring model, (3) SLA between marketing and sales, (4) Weekly sync agenda, (5) Shared dashboard spec, (6) 60-day implementation roadmap.`,
  },

  // ───────────── Recurring (monthly retainers) ─────────────
  sales_coaching_retainer_monthly: {
    priceId: "sales_coaching_retainer_monthly",
    toolType: "sales_coaching_kickoff",
    title: "Sales Coaching Kickoff",
    intake: I([
      { name: "reps", label: "Reps in the program (names + tenure)", type: "textarea", required: true },
      { name: "focusAreas", label: "Top focus areas (discovery, closing, objection handling...)", type: "textarea", required: true },
    ]),
    systemPrompt: "You are a sales coach. Build the first month's coaching plan.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) Baseline assessment per rep, (2) Weekly coaching cadence + topics for month 1, (3) Call review rubric, (4) Role-play scenarios, (5) Metrics to track improvement.`,
  },

  lead_nurture_automation_monthly: {
    priceId: "lead_nurture_automation_monthly",
    toolType: "lead_nurture_kickoff",
    title: "Lead Nurture Automation Kickoff",
    intake: I([
      { name: "stages", label: "Lifecycle stages you want to nurture", type: "textarea", required: true },
      { name: "platform", label: "Email/automation platform", type: "text", required: true },
    ]),
    systemPrompt: "You are a marketing automation operator. Build the nurture program.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) Nurture tracks per lifecycle stage, (2) Email cadence + sample subject lines, (3) Behavioral triggers, (4) Lead scoring updates, (5) Reporting fields, (6) Month 1 build checklist.`,
  },
};

export const ALL_SYSTEM_PRICE_IDS = Object.keys(SYSTEM_SPECS);
