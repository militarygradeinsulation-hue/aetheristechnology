// Per-case-study "How Aetheris delivers this" — specific to that problem,
// referencing concrete tools from the Aetheris arsenal. Keyed by case id.
// Written case-by-case, no shared boilerplate.

export interface CaseDelivery {
  tools: string[];
  experience: string;
}

export const CASE_DELIVERY: Record<number, CaseDelivery> = {
  1: {
    tools: ['HubSpot Mirror', 'Detective Mode', 'Duplicate-Detection SQL', 'Governance Playbook'],
    experience: 'We connect our HubSpot Mirror, run the duplicate/decay detector against every contact, then write the governance rules directly into the workflow so bad records never enter the CRM again — not a one-time scrub, a permanent gate.',
  },
  2: {
    tools: ['Forensic Diagnostic', 'Sales/Marketing Alignment Interview', 'Custom Lead-Scoring Playbook', 'HubSpot Mirror'],
    experience: 'The Diagnostic surfaces the actual definition gap between the two teams in week one; we then hard-code the joint scoring model (firmographics + engagement + negatives) into HubSpot with routing thresholds you can watch in real time.',
  },
  3: {
    tools: ['HubSpot Mirror', 'Real-Time Validation Edge Function', 'Smart Form Generator', 'Detective Mode'],
    experience: 'Instead of chasing decay quarterly, we deploy a validation edge function that intercepts every write — form, import, integration — and rejects broken records at the door. The mirror tracks decay rate weekly so you see it fall.',
  },
  4: {
    tools: ['Identity Resolution Engine', 'Contacts Scanner', 'Enrichment Pipeline', 'HubSpot Mirror'],
    experience: 'Our contacts scanner + identity-resolution layer runs before HubSpot ever writes — matches on domain, phone, name variants — so the 37% unserviceable rate collapses. We measure it back in rep hours reclaimed, not just clean records.',
  },
  5: {
    tools: ['Email Validation Edge Function', 'Drip Sequences', 'Engagement Segmentation SQL', 'Sender-Reputation Monitor'],
    experience: 'We wire progressive profiling into every capture point, cull stale addresses on a rolling 90-day window, and rebuild your drip cadence around engagement segments — inbox placement becomes an operational metric, not a mystery.',
  },
  6: {
    tools: ['Forensic Scan All', 'Data Mapping Diagram', 'Edge Function Integration Fleet', 'Golden Report'],
    experience: 'Our Forensic Scan All treats your CRM, MAP, analytics, and ERP as one system and maps every break in the flow. We then ship the integration edge functions to make one system the source of truth — measured against the 92% discrepancy drop.',
  },
  7: {
    tools: ['Website Scanner', 'Friction Audit', 'AI Landing Studio', 'Content Engine'],
    experience: 'Same pattern: we scan the site, prove the homepage is eating your ad spend, then ship dedicated per-campaign landers via AI Landing Studio with matched email nurture — the 200% revenue lift comes from removing homepage friction, not spending more.',
  },
  8: {
    tools: ['Friction Audit', 'Exit-Intent Playbook', 'Content Engine', 'Behavioral Segmentation'],
    experience: 'The Friction Audit finds where high-traffic pages bleed — we install targeted exit-intent captures tied to your best guides (not a generic pop-up) and segment by behavior on the way in.',
  },
  9: {
    tools: ['Content Calendar', 'Playbook Generator', 'Journey Mapper', 'Drip Sequences'],
    experience: 'We audit your content library, map the research-stage gap, and generate a distribution playbook that routes research prospects into a nurture + trial funnel — so the content you already paid for actually converts.',
  },
  10: {
    tools: ['AI Landing Studio', 'A/B Variant Engine', 'Traffic-Source Personalization', 'Detective Mode'],
    experience: 'Our AI Landing Studio spins per-event variants with source-based personalization; Detective Mode watches the lifts and kills the losers automatically — the same discipline that took DragCon UK from 12.7% to 31.9%.',
  },
  11: {
    tools: ['Friction Audit', 'Keyword-Cost Analysis', 'Content Engine', 'Drip Sequences'],
    experience: 'We diagnose which keywords are burning CAC without paying back, then shift budget to top-of-funnel captures + a nurture sequence we write for you — pipeline stays full, cost per lead halves.',
  },
  12: {
    tools: ['Content Engine', 'Content Calendar', 'Repurposing Playbook', 'Distribution Automation'],
    experience: 'Content Engine takes each existing asset and generates 8-12 distribution formats (LinkedIn, email, ads, snippets); the Calendar schedules them; the mirror tells you which pieces actually source pipeline.',
  },
  13: {
    tools: ['Friction Audit', 'Website Scanner', 'AI Landing Studio', 'Form Analyzer'],
    experience: 'Our Friction Audit walks your homepage → contact page like a prospect would, flagging every weak CTA and unclear value line. We rewrite the copy, restructure the form with benefit explainers, and A/B test iteratively.',
  },
  14: {
    tools: ['Brand Contradictions', 'Content Engine', 'Buyer-Education Playbook', 'Detective Mode'],
    experience: 'Brand Contradictions surfaces where you\'re selling features to an audience that doesn\'t know the category yet; Content Engine then produces the editorial pieces that educate first, sell second — same shift Indochino ran.',
  },
  15: {
    tools: ['Friction Audit', 'Detective Mode', 'Session-Replay Analysis', 'Checkout Rebuild Playbook'],
    experience: 'We ingest your session recordings and heatmaps, isolate the abandonment triggers on high-value products, then redesign the PLPs, filtering, and checkout with the operator — not a design guess, a measured rebuild.',
  },
  16: {
    tools: ['AI Landing Studio', 'Intent-Match Engine', 'Content Engine', 'Regional Playbook Generator'],
    experience: 'AI Landing Studio generates region-specific pages at scale with intent-matched value props and CTAs — the same architecture that got ACT Fibernet a 31% lift, without hand-building 50 landers.',
  },
  17: {
    tools: ['Friction Audit', 'AI Landing Studio', 'USP Testing Framework', 'Exit-Intent Playbook'],
    experience: 'We drop a USP-focused explainer block on your product pages, test versions live, and pair it with exit-intent capture — the exact stack behind the +66.2% revenue lift.',
  },
  18: {
    tools: ['Friction Audit', 'Trust-Signal Audit', 'Content Engine', 'Social Proof Playbook'],
    experience: 'We map every trust drop-off on your funnel (reviews, guarantees, badges, proof), rewrite the sequence in which they appear, and measure lift — the operator equivalent of a full CRO retainer, delivered in 30 days.',
  },
  19: {
    tools: ['Friction Audit', 'Detective Mode', 'A/B Copy Engine', 'Analytics Instrumentation'],
    experience: 'We instrument your funnel end-to-end so we can prove which micro-copy changes move the needle — the operator runs 4-6 tests a month, not one guess a quarter.',
  },
  20: {
    tools: ['AI Landing Studio', 'Personalization Engine', 'Content Engine', 'Detective Mode'],
    experience: 'Landing Studio serves personalized hero/CTA variants by segment; Detective Mode compounds the winners — same "test-and-scale" loop that has delivered category-leading conversion lifts.',
  },
  21: {
    tools: ['Rep Portal + Time Clock', 'Sales Coach AI', 'Stalled-Deal Detector', 'Quota Engine'],
    experience: 'We wire the rep portal to HubSpot so every rep\'s pipeline, time, and follow-ups are one dashboard; the stalled-deal detector flags decay before quota misses; Sales Coach AI writes the next best action per deal.',
  },
  22: {
    tools: ['Forensic Diagnostic', 'Sales Playbook Generator', 'Rep Portal', 'Team Training'],
    experience: 'The Diagnostic finds the actual process breaks; the Playbook Generator ships a rep-ready workflow (stages, criteria, exit reasons); Team Training scores each rep on adherence — enforced, not suggested.',
  },
  23: {
    tools: ['Forecast Briefings', 'HubSpot Mirror', 'Owner-Overload Detector', 'Detective Mode'],
    experience: 'We generate a weekly forecast briefing straight from mirror data — with owner-overload and stalled-deal flags — so leadership stops guessing and reps stop editing next Friday\'s number.',
  },
  24: {
    tools: ['Sales Coach AI', 'Call Recording Analysis', 'Rep Notes', 'Team Training'],
    experience: 'Sales Coach AI grades every recorded call, extracts the coaching moments, and writes personalized reps drills — turning ride-alongs into a nightly report leadership can actually act on.',
  },
  25: {
    tools: ['Rep Portal', 'Territory Optimizer SQL', 'Commission Engine', 'Owner-Overload Detector'],
    experience: 'We run the owner-overload detector against your book, rebalance territories using the SQL optimizer, and update the commission engine in the same migration — so no rep gets shafted by the reshuffle.',
  },
  26: {
    tools: ['Drip Sequences', 'Rep Notes + Follow-up Automation', 'Sales Coach AI', 'Detective Mode'],
    experience: 'Every touch (call, email, meeting) posts back to the rep portal; the follow-up engine auto-drafts the next email; Detective Mode flags accounts going cold — reps focus on selling, not admin.',
  },
  27: {
    tools: ['HubSpot Mirror', 'Custom Lead-Scoring Playbook', 'Marketing/Sales Alignment Interview', 'Nurture Automation'],
    experience: 'We rebuild your scoring model with both teams in the room, then automate the nurture and hand-off in HubSpot — MQL → SQL becomes a measured, dispute-free hand-off.',
  },
  28: {
    tools: ['Attribution Model Rebuild', 'HubSpot Mirror', 'Forecast Briefings', 'Golden Report'],
    experience: 'We install a first + multi-touch attribution model against real revenue (not opportunity), publish it in the Golden Report, and stop the "which channel won?" argument at the source.',
  },
  29: {
    tools: ['Content Calendar', 'Content Engine', 'Social Content Generator', 'Playbook Generator'],
    experience: 'The Content Calendar plans 90 days of themes; Content Engine + Social Content generator produces the assets; the Playbook Generator ships the distribution rules — one operator running the marketing team\'s output.',
  },
  30: {
    tools: ['Brand Contradictions', 'Content Engine', 'Voice Enforcement Engine', 'Detective Mode'],
    experience: 'Brand Contradictions catches every off-voice asset before publish; the Voice Enforcement engine rewrites drafts to the brand persona automatically — consistency at the scale of a full content team.',
  },
  31: {
    tools: ['Drip Sequences', 'Behavioral Segmentation SQL', 'Engagement Scoring', 'Email Validation Edge Function'],
    experience: 'We rebuild your lifecycle emails around live behavior (not lists), score engagement per contact, and prune deadweight monthly — every send earns its place in the calendar.',
  },
  32: {
    tools: ['Ad-Spend Forensic Audit', 'Friction Audit', 'AI Landing Studio', 'Detective Mode'],
    experience: 'We tear apart your paid accounts against landing performance, kill the ads sending traffic to broken pages, and replace the pages with Landing Studio versions — same budget, doubled ROAS.',
  },
  33: {
    tools: ['Tool Generator', 'AI Creation Studio', 'Aetheris AI Gateway', 'Edge Function Fleet'],
    experience: 'We use the same stack we built Aetheris on — Tool Generator + AI Creation Studio on top of our own AI Gateway — to ship your custom agent in days. Our own 40+ edge functions are the proof of concept.',
  },
  34: {
    tools: ['Custom Chatbot Builder', 'Rep Notes Integration', 'HubSpot Mirror', 'Sales Coach AI'],
    experience: 'We build the chatbot against your actual product docs, wire it into HubSpot so every conversation becomes a lead + notes, and let Sales Coach AI score which chats deserve rep attention.',
  },
  35: {
    tools: ['Forecasting AI', 'HubSpot Mirror', 'Historical Pattern Detector', 'Forecast Briefings'],
    experience: 'We train a predictive model on your last 24 months of pipeline + closed data, publish weekly forecast briefings, and expose the deal-level probability inside HubSpot — leadership plans against numbers, not vibes.',
  },
  36: {
    tools: ['Document Automation Playbook', 'Edge Function Workflow', 'HubSpot Mirror', 'RPA Recipe'],
    experience: 'We map the manual document path, generate the automation via edge functions + the operator\'s RPA recipes, and hand you back the hours — same 80% cycle-time cuts other ops teams report.',
  },
  37: {
    tools: ['Custom AI Agent Generator', 'Ops Automation Playbook', 'Aetheris AI Gateway', 'Detective Mode'],
    experience: 'Our custom agent framework builds ops-specific agents (routing, triage, categorization) trained on your data — no vendor lock-in, deployed on our AI Gateway, monitored by Detective Mode.',
  },
  38: {
    tools: ['Personalization Engine', 'Content Engine', 'AI Landing Studio', 'HubSpot Mirror'],
    experience: 'We segment your audience from the mirror, generate personalized copy per segment via Content Engine, and serve it dynamically via Landing Studio — 1:1 marketing at 1:many cost.',
  },
  39: {
    tools: ['Predictive Scoring Model', 'Custom Lead-Scoring Playbook', 'Detective Mode', 'HubSpot Mirror'],
    experience: 'We train a predictive score on closed-won patterns, install it in HubSpot next to your existing score, and let Detective Mode auto-route the highest-probability leads — measured lift within 30 days.',
  },
  40: {
    tools: ['Forensic Diagnostic', 'P&L Reconstruction', 'Cost Leak Detector', 'Golden Report'],
    experience: 'The Diagnostic prices every operational leak in dollars — revenue lost, margin burned, hours wasted — and the Golden Report ships you a signed 90-day recovery plan tied to those exact leaks.',
  },
  41: {
    tools: ['Cash-Flow Forensic Audit', 'AR/AP Automation Playbook', 'Edge Function Workflow', 'Forecast Briefings'],
    experience: 'We audit AR/AP for leak points (late invoicing, missed dunning, unbilled work), automate the collection cadence, and publish a weekly cash briefing — DSO drops without hiring.',
  },
  42: {
    tools: ['Process Mapping Playbook', 'RPA Recipe', 'Cost Leak Detector', 'Rep Portal Time Clock'],
    experience: 'We map every manual process against its true labor cost (using the Time Clock data), rank by ROI, and automate the top 5 — you get the P&L back before we bill you again.',
  },
  43: {
    tools: ['Pricing Forensic Audit', 'Contract Analysis Engine', 'Brand Contradictions', 'Golden Report'],
    experience: 'We reverse-engineer where your pricing is leaking (undercharging, discount decay, missing anchors), rebuild the pricing page + proposal template, and prove the lift in the Golden Report.',
  },
  44: {
    tools: ['Vendor Spend Audit', 'Contract Analysis Engine', 'Cost Leak Detector', 'Forecast Briefings'],
    experience: 'We pull every vendor contract, flag duplicated tools + auto-renewals + underused seats, and hand you a signed spend-reduction plan — usually 15-25% cut in the first 60 days.',
  },
  45: {
    tools: ['Custom Ticket-Routing Agent', 'Aetheris AI Gateway', 'Sales Coach AI (adapted)', 'Detective Mode'],
    experience: 'We build the NLP router on our AI Gateway trained on your ticket history, auto-tag + auto-route with 85%+ accuracy, and let Detective Mode grade CSAT drift live — response time collapses.',
  },
  46: {
    tools: ['Onboarding Automation Playbook', 'Edge Function Workflow', 'Document Automation', 'HubSpot Mirror'],
    experience: 'We map your onboarding, replace every manual step with edge-function workflows + document automation, and track the funnel in HubSpot — weeks become hours, abandonment falls off.',
  },
  47: {
    tools: ['Post-Sale Automation Playbook', 'Edge Function Workflow', 'Rep Notes Integration', 'Drip Sequences'],
    experience: 'We automate license/certificate generation and the welcome sequence via edge functions, keep the rep in the loop with auto-notes, and ship the customer a self-serve portal — no more day-1 friction.',
  },
  48: {
    tools: ['Order Flow Automation', 'Inventory Integration Edge Function', 'Real-Time Sync', 'Detective Mode'],
    experience: 'We integrate your storefront ↔ inventory ↔ shipping via edge functions with a live sync, install a self-serve tracking portal, and let Detective Mode flag exceptions — accuracy above 95% is enforced by architecture.',
  },
  49: {
    tools: ['Custom Validation Agent', 'Aetheris AI Gateway', 'Compliance-Aware Workflow', 'Human-in-Loop Escalation'],
    experience: 'For regulated workflows (claims, medical, financial), we build validation agents on our AI Gateway with compliance rules encoded and human escalation baked in — same accuracy gains, without the audit risk.',
  },
  50: {
    tools: ['Predictive Analytics Model', 'IoT/Sensor Integration', 'Edge Function Ingest', 'Detective Mode Alerts'],
    experience: 'We ingest sensor telemetry into our stack, train a failure-prediction model on your history, and wire the alerts into the rep/ops portal — reactive maintenance becomes a scheduled operation.',
  },
};
