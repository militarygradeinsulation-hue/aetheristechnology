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
]);

export const isComingSoonPriceId = (priceId?: string | null): boolean =>
  !!priceId && COMING_SOON_PRICE_IDS.has(priceId);
