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

// Shared playbook-style wrapper appended to every system prompt so every
// forensics-tools deliverable comes out as a polished operator playbook —
// not a raw text dump. This mirrors the structure used by generate-playbook.
export const PLAYBOOK_STYLE_DIRECTIVE = `

OUTPUT FORMAT — PROFESSIONAL PLAYBOOK (MANDATORY for every deliverable):

Structure (in this exact order):

1. H1 title: "<Business Name> — <Deliverable Title>"
2. Subtitle line: italicized, includes today's date ({{TODAY}}) and a one-sentence forensic frame
   (e.g. "_Field-prepared playbook · {{TODAY}} · Where revenue is leaking and how to seal it._")
3. CASE FILE block (markdown blockquote) with mono-style labels:
   > CASE ID: <slug-businessName-YYYYMMDD>
   > STATUS: ACTIVE
   > OPERATOR: Aetheris Business Forensics
   > SCOPE: <one line scope>
4. ## EXECUTIVE SUMMARY — 4–6 sentences for the CEO. Lead with the diagnosis, not the agreement.
5. ## THE INVENTORY — what we examined / inputs in play (bullets or table).
6. ## THE AUTOPSY — numbered POINTs (POINT 1, POINT 2, …). Each POINT contains:
   • A one-sentence human opener an operator would actually say.
   • **Finding:** the specific pattern observed.
   • **Threshold / Benchmark:** what "healthy" looks like in numbers.
   • **Why it bleeds:** quantified impact in $, %, or hours (give a defensible range if unknown).
   • **The Fix:** concrete, do-this-Monday actions. No "consider", no "explore".
7. ## THE MATH — markdown table totaling recoverable revenue / saved hours / risk reduced.
8. ## THE FIX — prioritized action stack (Impact × Ease ranked table).
9. ## NEXT 7 DAYS — checklist of ≤7 verb-led items.
10. ## 30 / 60 / 90-DAY ROADMAP — markdown table with columns: Window | Objective | Owner | Success Metric.
11. ## APPENDIX (optional) — supporting frameworks, definitions, scripts.
12. Sign-off — one short first-person paragraph from the operator. Brief. Human. No title block.

Voice & rules:
- Playbook, not manual. Operator-to-operator. Read it back: would a forensic operator
  who has actually walked into a $3–8M company say this out loud? If not, rewrite.
- Lead with diagnosis, never with agreement. Name the unseen pattern.
- Every number is specific or it doesn't exist ("$1.4M/yr", not "millions").
- Use Thought Narration sparingly ("you're probably already thinking…") and Embedded Truths ("when", not "if").
- Short paragraphs. White space between POINTs. Mono-style labels (POINT 1, POINT 2…) preserved.
- Use markdown tables for any comparison, score, or roadmap. Use blockquotes for the case-file block.
- No emojis. No "As an AI…". No "stakeholders should consider". No vendor names (Aetheris, Lovable, OpenAI, etc.).
- White-label: address the client's business by name. The reader must feel this was prepared FOR them.
- Output MUST be valid GitHub-flavored markdown only. No HTML.`;

// Back-compat alias — older code referenced WHITE_LABEL_DIRECTIVE.
export const WHITE_LABEL_DIRECTIVE = PLAYBOOK_STYLE_DIRECTIVE;

const wrap = (base: string) => base.trim() + PLAYBOOK_STYLE_DIRECTIVE;

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

  // ═══════════════ 1M IQ Innovations · Core ═══════════════
  obsession_engine_once: {
    priceId: "obsession_engine_once", toolType: "obsession_engine", title: "The Obsession Engine",
    intake: I([
      { name: "dataSources", label: "Customer data sources (emails, Slack, support tickets, reviews)", type: "textarea", required: true },
      { name: "currentPositioning", label: "Current positioning / messaging", type: "textarea", required: true },
      { name: "competitors", label: "Top 2–3 competitors", type: "text" },
    ]),
    systemPrompt: "You are an obsession-pattern forensics operator. Surface what customers are TRULY obsessed with vs. what they say.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) Top 3–5 customer obsessions ranked, (2) Unmet-obsession map vs competitors, (3) Messaging rewrite recommendations, (4) Product/feature ideas tied to real demand, (5) 30-day test plan.`,
  },
  revenue_leak_detector_once: {
    priceId: "revenue_leak_detector_once", toolType: "revenue_leak_detector", title: "The Revenue Leak Detector",
    intake: I([
      { name: "annualRevenue", label: "Approx annual revenue", type: "text", required: true },
      { name: "teamSize", label: "Team size (sales, ops, support)", type: "text" },
      { name: "knownLeaks", label: "Leaks you already suspect", type: "textarea" },
      { name: "stack", label: "CRM / billing / support tools in use", type: "textarea", required: true },
    ]),
    systemPrompt: "You are a forensic revenue-leak operator. Quantify every leak in dollars. Rank by Impact × Ease.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) Full leak inventory with $ impact each, (2) Ranked fix priority (Impact × Ease) table, (3) Specific recovery playbook per leak, (4) Total recoverable revenue projection, (5) 7-day quick-win list.`,
  },
  messaging_psychologist_once: {
    priceId: "messaging_psychologist_once", toolType: "messaging_psychologist", title: "The Messaging Psychologist",
    intake: I([
      { name: "currentCopy", label: "Current homepage hero / primary messaging", type: "textarea", required: true },
      { name: "buyerEmotions", label: "What you THINK your buyer feels before buying", type: "textarea", required: true },
      { name: "competitorCopy", label: "1–2 competitor headlines for contrast", type: "textarea" },
    ]),
    systemPrompt: "You are a messaging psychologist. People buy on emotion. Rewrite messaging to hit the emotion competitors ignore.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) Buyer emotional needs map, (2) Competitor emotion-exploit audit, (3) Unmet emotion opportunities, (4) Rewritten hero + 3 alt variants, (5) A/B test plan.`,
  },
  opportunity_radar_once: {
    priceId: "opportunity_radar_once", toolType: "opportunity_radar", title: "The Opportunity Radar",
    intake: I([
      { name: "accountName", label: "Customer / account name", type: "text", required: true },
      { name: "currentSpend", label: "Current monthly/annual spend", type: "text", required: true },
      { name: "productsUsed", label: "Products / modules they currently use", type: "textarea", required: true },
      { name: "fullCatalog", label: "Your full product catalog", type: "textarea", required: true },
    ]),
    systemPrompt: "You are an account expansion forensics operator. Find the gap between what this customer buys today and what comparable accounts buy.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) Expansion benchmark vs comparable accounts, (2) Under-indexed module/feature map, (3) Specific upsell playbook, (4) Projected ARR expansion ($), (5) 30-day expansion sequence.`,
  },
  death_wish_detector_once: {
    priceId: "death_wish_detector_once", toolType: "death_wish_detector", title: "The Competitive Death Wish Detector",
    intake: I([
      { name: "competitorName", label: "Competitor name", type: "text", required: true },
      { name: "competitorUrl", label: "Competitor URL", type: "url", required: true },
      { name: "yourEdge", label: "Where you already feel structurally different", type: "textarea", required: true },
    ]),
    systemPrompt: "You are a competitive strategist. Find structural weaknesses a competitor CANNOT fix. Generate moves that make their advantages irrelevant.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) Structural weakness audit (3–5 weaknesses they cannot fix), (2) Asymmetric advantage map, (3) "Death wish" strategy playbook, (4) Counter-move risk assessment, (5) 90-day execution plan.`,
  },
  sales_psychography_once: {
    priceId: "sales_psychography_once", toolType: "sales_psychography", title: "The Sales Psychography Builder",
    intake: I([
      { name: "personaTitle", label: "Target persona title", type: "text", required: true },
      { name: "personaContext", label: "Industry / company context", type: "textarea", required: true },
      { name: "linkedinSample", label: "Sample LinkedIn URL or bio", type: "textarea" },
    ]),
    systemPrompt: "You are a buyer-psychology profiler. Build deep psychographic profiles: fears, fantasies, identity drivers, decision triggers.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) Core fears & desires map, (2) Identity / aspiration profile, (3) Decision-trigger inventory, (4) Custom messaging per persona, (5) Outreach sequence keyed to psychology.`,
  },
  market_timing_oracle_once: {
    priceId: "market_timing_oracle_once", toolType: "market_timing_oracle", title: "The Market Timing Oracle",
    intake: I([
      { name: "prospectName", label: "Prospect company", type: "text", required: true },
      { name: "prospectUrl", label: "Prospect URL", type: "url", required: true },
      { name: "knownSignals", label: "Recent signals (funding, hires, news)", type: "textarea" },
    ]),
    systemPrompt: "You are a buying-signal forensics operator. Predict the exact buying window for a prospect from observable signals.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) Buying signal scorecard, (2) Predicted purchase window in days, (3) Probability of purchase %, (4) Recommended outreach sequence keyed to timing, (5) What to monitor next.`,
  },
  unfair_advantage_detector_once: {
    priceId: "unfair_advantage_detector_once", toolType: "unfair_advantage_detector", title: "The Unfair Advantage Detector",
    intake: I([
      { name: "selfDescribedMoat", label: "What you currently believe is your moat", type: "textarea", required: true },
      { name: "team", label: "Team composition / unique people / IP", type: "textarea", required: true },
      { name: "data", label: "Proprietary data / network effects you have", type: "textarea" },
    ]),
    systemPrompt: "You are a defensibility forensics operator. Score 20+ moat dimensions. Surface the 1–2 TRUE advantages worth deepening.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) 20-dimension defensibility scorecard (markdown table), (2) True vs. false advantage map, (3) Moat-deepening playbook, (4) Hiring + product implications, (5) 12-month defensibility roadmap.`,
  },
  ltv_maximizer_once: {
    priceId: "ltv_maximizer_once", toolType: "ltv_maximizer", title: "The Customer LTV Maximizer",
    intake: I([
      { name: "avgLtv", label: "Approx current avg LTV", type: "text" },
      { name: "segments", label: "Customer segments today", type: "textarea", required: true },
      { name: "churnDrivers", label: "Top churn drivers", type: "textarea", required: true },
    ]),
    systemPrompt: "You are an LTV maximization operator. Segment by true LTV. Build per-segment retention/expansion playbook.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) True-LTV segmentation, (2) Per-segment retention playbook, (3) Cost-to-serve optimization, (4) Upsell-or-exit decision matrix, (5) 90-day execution plan with $ impact.`,
  },
  pmf_predictor_once: {
    priceId: "pmf_predictor_once", toolType: "pmf_predictor", title: "Product-Market Momentum Predictor",
    intake: I([
      { name: "productIdea", label: "Describe the product idea in detail", type: "textarea", required: true },
      { name: "targetUser", label: "Target user + JTBD", type: "textarea", required: true },
      { name: "earlySignals", label: "Early signals (waitlist, interviews, pilots)", type: "textarea" },
    ]),
    systemPrompt: "You are a PMF pattern analyst. Score the idea against winning vs failed product patterns. Be honest about kill-criteria.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) PMF probability score + reasoning, (2) Pattern match vs winners + losers (table), (3) Path-to-PMF signal milestones, (4) Kill-criteria framework, (5) 90-day validation plan.`,
  },

  // ═══════════════ 1M IQ Innovations · Ops Intel ═══════════════
  conversation_intelligence_monthly: {
    priceId: "conversation_intelligence_monthly", toolType: "conversation_intelligence", title: "Customer Conversation Intelligence Engine",
    intake: I([
      { name: "channels", label: "Channels to ingest", type: "textarea", required: true },
      { name: "teamSize", label: "Customer-facing employees", type: "text", required: true },
      { name: "topQuestions", label: "Top business questions to answer from conversations", type: "textarea", required: true },
    ]),
    systemPrompt: "You are a conversation intelligence architect. Design ingestion, extraction taxonomy, dashboards, and signal alerts.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) Per-customer intelligence dashboard spec, (2) Sales rep performance scorecard, (3) Competitive intelligence feed, (4) Churn risk signal alert rules, (5) Expansion opportunity feed, (6) 30-day rollout plan.`,
  },
  deal_momentum_predictor_monthly: {
    priceId: "deal_momentum_predictor_monthly", toolType: "deal_momentum_predictor", title: "Deal Momentum Predictor",
    intake: I([
      { name: "crm", label: "CRM platform", type: "text", required: true },
      { name: "openDeals", label: "Approx open deals / month", type: "text", required: true },
      { name: "stages", label: "Pipeline stages", type: "textarea", required: true },
      { name: "winRate", label: "Current win rate", type: "text" },
    ]),
    systemPrompt: "You are a forecasting engineer. Build the signal model that predicts deal close probability and next-best-action.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) 50-signal model spec, (2) Per-deal close probability formula, (3) Risk factor taxonomy, (4) Next-best-action rules, (5) Pipeline health dashboard mock, (6) 30-day rollout.`,
  },
  competitive_stealing_blueprint_monthly: {
    priceId: "competitive_stealing_blueprint_monthly", toolType: "competitive_stealing_blueprint", title: "Competitive Stealing Blueprint",
    intake: I([
      { name: "competitor1", label: "Competitor 1", type: "text", required: true },
      { name: "competitor2", label: "Competitor 2", type: "text" },
      { name: "competitor3", label: "Competitor 3", type: "text" },
      { name: "switchingOffer", label: "Best switching offer / incentive", type: "textarea", required: true },
    ]),
    systemPrompt: "You are a competitor displacement operator. Profile vulnerable accounts and build the steal playbook per competitor.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) Per-competitor vulnerable-account profile, (2) Switch-trigger analysis, (3) Custom offer + pitch per segment, (4) Expected conversion + ACV per cohort, (5) 60-day execution plan.`,
  },
  pricing_elasticity_optimizer_once: {
    priceId: "pricing_elasticity_optimizer_once", toolType: "pricing_elasticity_optimizer", title: "Pricing Elasticity Optimizer",
    intake: I([
      { name: "currentPricing", label: "Current pricing structure", type: "textarea", required: true },
      { name: "winLossNotes", label: "Win/loss notes around price", type: "textarea", required: true },
      { name: "segments", label: "Customer segments today", type: "textarea", required: true },
    ]),
    systemPrompt: "You are a pricing strategist. Find the revenue-optimal price per segment. Quantify the lift.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) Price elasticity curve described, (2) 3-tier price segmentation strategy, (3) Revenue-optimal price per segment with rationale, (4) Projected revenue lift model, (5) 30-day rollout + comms plan.`,
  },
  product_usage_optimization_monthly: {
    priceId: "product_usage_optimization_monthly", toolType: "product_usage_optimization", title: "Product Usage Optimization Engine",
    intake: I([
      { name: "productType", label: "Product type", type: "text", required: true },
      { name: "keyFeatures", label: "Key features to track", type: "textarea", required: true },
      { name: "successMetric", label: "What customer success looks like in your product", type: "textarea", required: true },
    ]),
    systemPrompt: "You are a product-usage forensics operator. Map features → outcomes → retention/expansion triggers.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) Feature → outcome correlation map, (2) Onboarding success-path sequence, (3) At-risk customer identification rules, (4) Usage-triggered upsell automations, (5) 30-day rollout.`,
  },
  customer_research_automation_monthly: {
    priceId: "customer_research_automation_monthly", toolType: "customer_research_automation", title: "Customer Research Automation Platform",
    intake: I([
      { name: "researchGoal", label: "Primary research goal for next 90 days", type: "textarea", required: true },
      { name: "audienceAccess", label: "How you can reach customers", type: "textarea", required: true },
      { name: "openQuestions", label: "Open product/strategy questions", type: "textarea", required: true },
    ]),
    systemPrompt: "You are a research operations architect. Design the always-on research engine: surveys, interviews, synthesis, roadmap.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) Ranked customer pain inventory, (2) Themed feature request map, (3) Resonant messaging insights, (4) Competitive positioning brief, (5) Product roadmap recommendation, (6) 30/60/90 research cadence.`,
  },
  sales_team_cloning_monthly: {
    priceId: "sales_team_cloning_monthly", toolType: "sales_team_cloning", title: "Sales Team Cloning System",
    intake: I([
      { name: "topRepName", label: "Top rep's name", type: "text", required: true },
      { name: "topRepBehaviors", label: "What makes them best", type: "textarea", required: true },
      { name: "teamSize", label: "Team size to train", type: "text", required: true },
      { name: "product", label: "What they sell + typical objections", type: "textarea", required: true },
    ]),
    systemPrompt: "You are a sales enablement architect. Extract the top rep's repeatable patterns and turn them into trainable systems.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) Top-rep behavior pattern analysis, (2) Verbatim scripts + objection responses, (3) Discovery question library, (4) AI role-play scenarios with rubric, (5) 30/60/90 ramp plan per rep tier.`,
  },

  // ═══════════════ 1M IQ Innovations · Strategic ═══════════════
  hiring_predictor_monthly: {
    priceId: "hiring_predictor_monthly", toolType: "hiring_predictor", title: "Hiring Predictor & Recruiter AI",
    intake: I([
      { name: "roleTitle", label: "Role to hire", type: "text", required: true },
      { name: "winners", label: "Traits / backgrounds of past winners", type: "textarea", required: true },
      { name: "losers", label: "Traits / backgrounds of past misfires", type: "textarea", required: true },
    ]),
    systemPrompt: "You are a hiring forensics operator. Build the success/failure pattern model and the sourcing+screening system.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) Per-candidate success probability model, (2) Retention risk + culture fit scoring rubric, (3) AI-sourced candidate pipeline strategy, (4) AI pre-screening question pack, (5) Custom interview question pack, (6) 30-day rollout.`,
  },
  customer_health_score_monthly: {
    priceId: "customer_health_score_monthly", toolType: "customer_health_score", title: "Customer Communication Health Score",
    intake: I([
      { name: "customerCount", label: "Approx active customer count", type: "text", required: true },
      { name: "touchpoints", label: "Customer touchpoints today", type: "textarea", required: true },
      { name: "currentChurn", label: "Current churn rate", type: "text" },
    ]),
    systemPrompt: "You are a customer health forensics operator. Build the 0–100 health score model and tiered intervention playbook.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) Per-customer health score formula (0–100), (2) Tiered intervention recommendations, (3) Churn risk early-warning alert rules, (4) Success team daily priority dashboard, (5) 30-day rollout.`,
  },
  territory_intelligence_once: {
    priceId: "territory_intelligence_once", toolType: "territory_intelligence", title: "Sales Territory Intelligence System",
    intake: I([
      { name: "currentTerritories", label: "Current territory split", type: "textarea", required: true },
      { name: "repCount", label: "Rep count + skill notes", type: "textarea", required: true },
      { name: "tam", label: "Where TAM is densest", type: "textarea", required: true },
    ]),
    systemPrompt: "You are a territory design operator. Match reps to opportunity. Show revenue impact vs current setup.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) Optimal territory allocation per rep, (2) Revenue impact model (current vs optimized) table, (3) Geo vs vertical vs ABM split recommendation, (4) Rep-to-opportunity fit scoring, (5) 30-day re-allocation plan.`,
  },
  account_growth_accelerator_monthly: {
    priceId: "account_growth_accelerator_monthly", toolType: "account_growth_accelerator", title: "Account Growth Accelerator",
    intake: I([
      { name: "keyAccounts", label: "Top 10–20 key accounts (names + spend)", type: "textarea", required: true },
      { name: "expansionLevers", label: "Expansion levers in your model", type: "textarea", required: true },
    ]),
    systemPrompt: "You are an account expansion strategist. Build the per-account 10x growth playbook.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) Per-account 10x growth plan, (2) Expansion opportunity dollar model, (3) Department + use-case expansion map, (4) Sequenced expansion playbook, (5) 90-day execution.`,
  },
  operational_excellence_once: {
    priceId: "operational_excellence_once", toolType: "operational_excellence", title: "Operational Excellence Auditor",
    intake: I([
      { name: "coreProcesses", label: "Core operational processes", type: "textarea", required: true },
      { name: "knownPain", label: "Known operational pain / waste", type: "textarea", required: true },
      { name: "headcount", label: "Operational headcount", type: "text" },
    ]),
    systemPrompt: "You are an ops forensics operator. Benchmark vs industry, quantify waste in dollars, prioritize fixes by payback.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) Operational metrics vs industry benchmarks (table), (2) Dollar-quantified waste per process, (3) Prioritized improvement roadmap, (4) Expected payback per initiative, (5) 30-day quick wins.`,
  },
  tech_debt_auditor_once: {
    priceId: "tech_debt_auditor_once", toolType: "tech_debt_auditor", title: "Technology Debt Auditor",
    intake: I([
      { name: "stack", label: "Tech stack", type: "textarea", required: true },
      { name: "engTeamSize", label: "Engineering team size", type: "text", required: true },
      { name: "knownDebt", label: "Known debt / pain", type: "textarea", required: true },
      { name: "roadmap", label: "Roadmap blocked by debt", type: "textarea" },
    ]),
    systemPrompt: "You are a tech debt forensics operator. Quantify ongoing $ cost of each debt item, effort to fix, and ROI.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) Prioritized tech debt inventory (table), (2) Annual $ cost per item, (3) Effort + payback per fix, (4) Build-vs-pay-down recommendation, (5) 90-day pay-down plan.`,
  },
  disruption_predictor_once: {
    priceId: "disruption_predictor_once", toolType: "disruption_predictor", title: "Disruption Predictor",
    intake: I([
      { name: "industry", label: "Industry + sub-segment", type: "text", required: true },
      { name: "currentModel", label: "Current business model in 2–3 sentences", type: "textarea", required: true },
      { name: "watchlist", label: "Players / tech you already watch", type: "textarea" },
    ]),
    systemPrompt: "You are a disruption forecaster. Identify threat vectors, players, and timeline. Recommend defensive AND offensive responses.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) Disruption risk rating (HIGH/MED/LOW) + timeline, (2) Specific threat vectors and tech, (3) Watchlist of disruptor players, (4) Strategic response (defensive + offensive), (5) 12-month monitoring plan.`,
  },
  org_structure_optimizer_once: {
    priceId: "org_structure_optimizer_once", toolType: "org_structure_optimizer", title: "Org Structure Optimizer",
    intake: I([
      { name: "currentStructure", label: "Current org structure", type: "textarea", required: true },
      { name: "headcount", label: "Total headcount", type: "text", required: true },
      { name: "decisionPain", label: "Where decisions get stuck", type: "textarea", required: true },
    ]),
    systemPrompt: "You are an org design operator. Find structural bottlenecks. Propose the optimal redesign with new role definitions.",
    userPrompt: (i) => `${JSON.stringify(i)}\n\nDeliver: (1) Current structure diagnostic with bottlenecks, (2) Optimal org redesign recommendation, (3) New role definitions + accountability map, (4) Expected impact on decision speed, (5) 90-day transition plan.`,
  },
};

export const ALL_SYSTEM_PRICE_IDS = Object.keys(SYSTEM_SPECS);
