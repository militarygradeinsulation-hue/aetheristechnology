// 6-Week Aetheris Operator Academy curriculum.
// Educational arc: Week 1 = identity & offers · Week 2 = toolbelt & portal mastery ·
// Week 3 = prospecting & outbound · Week 4 = discovery & qualification ·
// Week 5 = pitch, objections, close mechanics · Week 6 = scale, referrals, certification.

export interface Task6W { id: string; label: string; detail?: string; route?: string; }
export interface Session6W { id: string; title: string; minutes: number; goal: string; tasks: Task6W[]; }
export interface Lesson6W { title: string; body: string; keyTakeaways?: string[]; }
export interface Resource6W { label: string; url: string; }
export interface DayPlan6W {
  week: number;
  day: number; // 1..42
  weekTheme: string;
  weekOutcome: string;
  theme: string;
  tagline: string;
  lesson?: Lesson6W;
  resources?: Resource6W[];
  sessions: Session6W[];
  successMetric?: string;
}

// Helper for compactness
const t = (id: string, label: string, detail?: string, route?: string): Task6W => ({ id, label, detail, route });
const s = (id: string, title: string, minutes: number, goal: string, tasks: Task6W[]): Session6W => ({ id, title, minutes, goal, tasks });

// ─────────────────────────────────────────────────────────────
// WEEK 1 — IDENTITY, OFFERS, THE WHY
// ─────────────────────────────────────────────────────────────
const W1_THEME = "Identity · Who We Are, What We Sell, Why It Matters";
const W1_OUT = "End of week: you can pitch the Forensic Diagnostic cold without a deck and explain the leak metaphor to any operator.";

const week1: DayPlan6W[] = [
  {
    week: 1, day: 1, weekTheme: W1_THEME, weekOutcome: W1_OUT,
    theme: "Day 1 · The Forensic Operator Identity",
    tagline: "Why we say 'leaking' instead of 'optimizing' — and why it converts.",
    lesson: {
      title: "We are operators, not consultants.",
      body: `Consultants sell decks. Operators sell repairs.

Aetheris is a Business Forensics firm. Our wedge: specialty manufacturers doing $5M–$25M in revenue. Our hook: "Your business is leaking. You just can't see it from the inside."

The leak metaphor isn't marketing fluff — it's diagnostic language. A CEO can argue with "you should optimize your funnel." A CEO cannot argue with "you are bleeding $312K/year through stalled HubSpot deals." One sounds like an opinion. The other sounds like an autopsy.

Joseph (CEO) is a Marine, former Director of Strategy at a $25M aerospace firm with SpaceX accounts, IBM/Harvard/Google/HubSpot certified, 20 years building revenue systems for manufacturers. That's the operator credential stack. Lead with it.`,
      keyTakeaways: [
        "Forensic > influencer. Operator > consultant.",
        "We name the bleed in dollars and days, never in vibes.",
        "Credentials open doors that gradients close.",
      ],
    },
    resources: [
      { label: "Brand Strategy Memo", url: "/portal?tab=documents" },
      { label: "Operator Bio + Credentials PDF", url: "/credentials" },
      { label: "Public Methodology page", url: "/methodology" },
    ],
    sessions: [
      s("w1d1-s1", "Morning · Read & Internalize", 90, "Absorb the brand voice deeply enough to write in it.", [
        t("w1d1-s1-1", "Read Brand Strategy doc end to end (twice)", "Second pass: highlight 5 phrases you'd repeat to a prospect.", "/portal?tab=documents"),
        t("w1d1-s1-2", "Read the Methodology page word for word", "This is what every prospect gets before pricing.", "/methodology"),
        t("w1d1-s1-3", "Read Joseph's bio + Credentials PDF", "Memorize: Marine, SpaceX-tier aerospace, IBM/Harvard/Google/HubSpot.", "/credentials"),
        t("w1d1-s1-4", "Watch the Welcome onboarding video", undefined, "/portal?tab=onboarding"),
      ]),
      s("w1d1-s2", "Midday · The Pitch", 60, "Pitch in 12 seconds, 30 seconds, and 2 minutes.", [
        t("w1d1-s1-5", "Write the 12-second version in your notes", "'We find the $200K–$2M your business is leaking through broken CRM and follow-up.'"),
        t("w1d1-s1-6", "Write the 30-second version", "Add: who it's for (specialty mfrs $5–$25M), the deliverable (Diagnostic), the price ($18.5K fixed)."),
        t("w1d1-s1-7", "Write the 2-minute version", "Add: 21-day timeline, retainer upsell, methodology bullets."),
        t("w1d1-s1-8", "Record yourself saying all three on your phone, listen back"),
      ]),
      s("w1d1-s3", "Afternoon · Portal Setup", 60, "Get your operating system live.", [
        t("w1d1-s1-9", "Log into Rep Portal, set your cursor + tab colors", undefined, "/portal"),
        t("w1d1-s1-10", "Clock IN", undefined, "/portal?tab=home"),
        t("w1d1-s1-11", "Post a 'Day 1 done' on the Team Message Board", undefined, "/portal?tab=messages"),
        t("w1d1-s1-12", "Clock OUT"),
      ]),
    ],
    successMetric: "You can recite the 30-second pitch from memory without filler words.",
  },
  {
    week: 1, day: 2, weekTheme: W1_THEME, weekOutcome: W1_OUT,
    theme: "Day 2 · The Offer Stack ($18.5K, $15K/mo, Forensic $2.5K)",
    tagline: "Know every product, price, what's included, what's NOT.",
    lesson: {
      title: "Two public offers. One private wedge. Zero discounting.",
      body: `Public Offer #1 — 21-Day Revenue Diagnostic, $18,500 flat fee.
We map where CRM, sales follow-up, and lead flow are losing money. Deliverable: written report, prioritized fixes, ROI projections, implementation roadmap. CRM-agnostic (runs on a CSV export). No percentage-of-savings games. No retainer required.

Public Offer #2 — Implementation Retainer, $15,000/month, 3-month minimum.
Only available to Diagnostic clients. We do the actual repair.

Private Wedge — Forensic Diagnostic, $2,500 flat (applied toward engagement).
Used in outbound when $18.5K is too big a first ask. Same forensic frame, scoped tighter, credits in.

Pilot pricing ($9,500 for first three) exists in outreach scripts only — never on the public site, never volunteered. If a prospect references it, you confirm. You never offer it unprompted.`,
      keyTakeaways: [
        "$18.5K Diagnostic is the default ask. Don't lead with $2.5K unless they object on size.",
        "Retainer is ONLY sold post-Diagnostic. Never bundle them on the first call.",
        "We don't discount. We re-scope.",
      ],
    },
    resources: [
      { label: "Pricing & Business Model memo", url: "/portal?tab=documents" },
      { label: "Services page (what prospects see)", url: "/services" },
      { label: "Methodology PDF", url: "/methodology" },
    ],
    sessions: [
      s("w1d2-s1", "Morning · Offer Memorization", 75, "Recite every offer cold.", [
        t("w1d2-s1-1", "Make flashcards: name, price, deliverable, timeline, who it's for"),
        t("w1d2-s1-2", "Quiz yourself 5x — speak each offer aloud"),
        t("w1d2-s1-3", "Walk every paragraph of the Services page", undefined, "/services"),
        t("w1d2-s1-4", "Walk the Catalog page if it exists", undefined, "/catalog"),
      ]),
      s("w1d2-s2", "Midday · The Why-Buy-Now List", 60, "Build the urgency triggers that justify each offer.", [
        t("w1d2-s2-1", "List 5 triggers that signal a prospect needs the $2.5K Forensic"),
        t("w1d2-s2-2", "List 5 triggers that signal they need the $18.5K Diagnostic"),
        t("w1d2-s2-3", "List 3 triggers that flip them into Retainer at month 1"),
      ]),
      s("w1d2-s3", "Afternoon · Self-Diagnostic", 60, "Eat your own dog food.", [
        t("w1d2-s3-1", "Run the free Leak Audit on your last employer or a friend's company", undefined, "/leak-audit"),
        t("w1d2-s3-2", "Read the output as if you were the CEO. Write down what would move you to buy."),
        t("w1d2-s3-3", "Complete the Day 2 training quiz", undefined, "/portal?tab=training"),
        t("w1d2-s3-4", "Clock OUT"),
      ]),
    ],
    successMetric: "You can name all three offers, prices, and inclusions without notes.",
  },
  {
    week: 1, day: 3, weekTheme: W1_THEME, weekOutcome: W1_OUT,
    theme: "Day 3 · The Ideal Client Profile (ICP)",
    tagline: "Specialty manufacturers, $5M–$25M, US-based. Know them cold.",
    lesson: {
      title: "We hunt narrow. That's the unfair advantage.",
      body: `Internal wedge: commercial playground equipment manufacturers. Public wedge: "specialty manufacturers." Same prospect, different language.

Why this ICP:
• They have real revenue ($5M–$25M = mature enough to have a CRM, small enough that owner cares about every $50K leak).
• They've usually bought HubSpot or Salesforce but never finished the setup.
• They have a salesperson who does outbound by hand and forgets follow-up.
• They run trade shows, generate hundreds of leads, then watch 80% die in inboxes.

Out of scope (politely decline or refer):
• Pre-revenue startups
• B2C/e-commerce only
• Sub-$2M revenue (no CRM yet = no leak yet)
• $100M+ enterprises (politics, procurement, not our gig)`,
      keyTakeaways: [
        "Bigger is not better. Specialty + middle-market = best fit.",
        "If they don't use HubSpot or Salesforce, they're a Diagnostic-only fit, not a Retainer fit.",
        "Trade show + dead inbox = textbook signal.",
      ],
    },
    resources: [
      { label: "Brand Strategy (ICP section)", url: "/portal?tab=documents" },
      { label: "Industries page", url: "/industries" },
    ],
    sessions: [
      s("w1d3-s1", "Morning · ICP Drill", 75, "Build a target list filter you can reuse forever.", [
        t("w1d3-s1-1", "List 20 specialty manufacturers in the Midwest with $5–$25M revenue (LinkedIn Sales Nav or Apollo)"),
        t("w1d3-s1-2", "Tag each: Has CRM? Has outbound salesperson? Has trade show presence?"),
        t("w1d3-s1-3", "Rank top 5 most likely to buy and write WHY in one sentence each"),
      ]),
      s("w1d3-s2", "Midday · Disqualify Faster", 45, "Saying no is a sales skill.", [
        t("w1d3-s2-1", "Write 3 polite disqualification lines for pre-revenue startups"),
        t("w1d3-s2-2", "Write 3 polite disqualification lines for $100M+ enterprises"),
        t("w1d3-s2-3", "Memorize: 'We work with specialty manufacturers $5–$25M. Outside that window I'm not the right call.'"),
      ]),
      s("w1d3-s3", "Afternoon · Add Leads", 60, "Turn research into pipeline.", [
        t("w1d3-s3-1", "Add your top 5 ICP-fit leads to the Leads Board", undefined, "/portal?tab=leads"),
        t("w1d3-s3-2", "Run Hunt Mode AI Web Scraper on 1 prospect URL — paste URL, let it build the lead"),
        t("w1d3-s3-3", "Complete Day 3 quiz", undefined, "/portal?tab=training"),
      ]),
    ],
    successMetric: "5 ICP-perfect leads in the board with status notes.",
  },
  {
    week: 1, day: 4, weekTheme: W1_THEME, weekOutcome: W1_OUT,
    theme: "Day 4 · The 7-Leak Map",
    tagline: "Memorize the 7 categories of revenue leak we hunt.",
    lesson: {
      title: "The Leak Audit™ — seven repeatable categories.",
      body: `Every Diagnostic report finds leaks in some subset of these seven:

1. Stalled deals — proposals sent, no follow-up, deals dying in 'sent' stage.
2. Dead MQLs — marketing leads that never got worked.
3. Slow follow-up — form fills with >4-hour first reply (industry benchmark: 5 min).
4. Closed-lost reactivation — 6–18 months old, never re-touched.
5. Missing contact info on real deals — $5K+ deals with no email or phone on the contact record.
6. Owner overload — one rep with 3× the average deal count.
7. High-intent leads stuck outside any workflow — engaged 2+ times in 30 days, no nurture sequence.

You will see these names again in: the audit-engine code, the Diagnostic PDF, every prospect call. They are our diagnostic vocabulary.`,
      keyTakeaways: [
        "Memorize all 7. They map 1:1 to the database functions that detect them.",
        "Every prospect we audit has at least 3 active leaks.",
        "Average exposure per leak in our ICP: $40K–$300K/year.",
      ],
    },
    resources: [
      { label: "Methodology page", url: "/methodology" },
      { label: "Free Leak Audit demo", url: "/leak-audit" },
    ],
    sessions: [
      s("w1d4-s1", "Morning · Memorize the 7", 60, "Cold recall, in order.", [
        t("w1d4-s1-1", "Write all 7 leak types from memory 3x"),
        t("w1d4-s1-2", "For each leak, write the 1-sentence 'CEO-explainer' version"),
        t("w1d4-s1-3", "Quiz a partner or roleplay aloud"),
      ]),
      s("w1d4-s2", "Midday · Estimate Exposure", 60, "Get fluent with the dollar numbers.", [
        t("w1d4-s2-1", "Practice estimating leak exposure: 100 stalled $25K deals = $2.5M open; 15% reactivation = $375K."),
        t("w1d4-s2-2", "Build a 'leak math' cheat card you'll carry into every call"),
      ]),
      s("w1d4-s3", "Afternoon · Live Drill", 60, "Apply the map to a real company.", [
        t("w1d4-s3-1", "Pick a prospect from your Leads Board, run the All-in-One scan on them", undefined, "/portal?tab=tools"),
        t("w1d4-s3-2", "Write a 3-bullet 'suspected leaks' diagnosis from the scan"),
        t("w1d4-s3-3", "Complete Day 4 quiz", undefined, "/portal?tab=training"),
      ]),
    ],
    successMetric: "You can rattle off all 7 leak types + a CEO explanation for each.",
  },
  {
    week: 1, day: 5, weekTheme: W1_THEME, weekOutcome: W1_OUT,
    theme: "Day 5 · Compensation, Splits, and Why You Should Care",
    tagline: "Fixed-dollar splits — know what every deal pays you.",
    lesson: {
      title: "Flagship splits are FIXED dollars. Catalog splits are tiered.",
      body: `Flagship Diagnostic ($18,500): Company $10K · Rep $5K · Partner (Braden) $3K. One sale = $5K to you.
Flagship Retainer ($15,000/month): Company $8K · Rep $4K · Partner $3K. EVERY MONTH the client stays. A 6-month retainer = $24K to the closing rep.

Catalog/smaller offers use a tiered split (50/30/20 → 60/25/15 → 70/20/10) as you hit volume.

Bonuses stack:
• Volume bonus: +$1K at 2 monthly sales, +$2.5K at 3, +$5K at 5.
• Retention bonus: +$1K at 3mo, +$2.5K at 6mo, +$5K at 12mo retainer extension.
• Referral bonus: $500 onboard + $7K first-close + $500/sale override for 12 months.

This is enforced server-side in the payments webhook (flagshipFixedSplit). You will be paid what the system computes.`,
      keyTakeaways: [
        "One Diagnostic + 6 months of Retainer = $29K to you.",
        "Bring another rep in via referral = $500 onboard + $7K when they close + $500/sale for 12 months.",
        "Retention bonuses reward keeping clients alive, not just signing them.",
      ],
    },
    resources: [
      { label: "Incentive Plan (in portal)", url: "/portal?tab=incentive" },
      { label: "Flagship Commission Panel", url: "/portal?tab=incentive" },
    ],
    sessions: [
      s("w1d5-s1", "Morning · Math Drill", 60, "Calculate your commission in your head.", [
        t("w1d5-s1-1", "Solve aloud: 2 Diagnostics + 1 client at 4-month retainer = ? (Answer: $5K+$5K+$16K = $26K)"),
        t("w1d5-s1-2", "Solve: 1 Diagnostic + 12-month retainer = ? (Answer: $5K + $48K + $5K retention bonus = $58K)"),
        t("w1d5-s1-3", "Open the Flagship Commission Panel and inspect your live projections", undefined, "/portal?tab=incentive"),
      ]),
      s("w1d5-s2", "Midday · Referral Networking", 60, "Plant the seed for compounding income.", [
        t("w1d5-s2-1", "List 3 people in your network who could sell this (former colleagues, friends in sales)"),
        t("w1d5-s2-2", "Draft a 4-sentence referral pitch you can send today"),
        t("w1d5-s2-3", "Send at least 1 of those messages"),
      ]),
      s("w1d5-s3", "Afternoon · Week 1 Cap", 90, "Cement Week 1 with proof of work.", [
        t("w1d5-s3-1", "Have 10 ICP-fit leads in the board with notes", undefined, "/portal?tab=leads"),
        t("w1d5-s3-2", "Pass the Week 1 Certification Quiz", undefined, "/portal?tab=training"),
        t("w1d5-s3-3", "Post a Week 1 recap in the Team Board", undefined, "/portal?tab=messages"),
      ]),
    ],
    successMetric: "10 ICP leads + Week 1 quiz passed + commission math second nature.",
  },
];

// ─────────────────────────────────────────────────────────────
// WEEK 2 — TOOLBELT & PORTAL MASTERY
// ─────────────────────────────────────────────────────────────
const W2_THEME = "Toolbelt · The AI Stack That Makes You Dangerous";
const W2_OUT = "End of week: you can prep any prospect call in under 10 minutes using the AI stack.";

const week2: DayPlan6W[] = [
  {
    week: 2, day: 6, weekTheme: W2_THEME, weekOutcome: W2_OUT,
    theme: "Day 6 · Detective Mode (Firecrawl + RocketReach)",
    tagline: "Drop any URL → full dossier in 90 seconds.",
    lesson: {
      title: "Detective Mode is your unfair pre-call edge.",
      body: `Detective Mode chains three intel sources behind the scenes:
1. Our own scan-website function (tech stack, SEO signals, page-level issues).
2. Firecrawl (deep web search + scraped company profile).
3. RocketReach (decision-maker contact info — name, title, email, phone).

You paste a URL or click 'Run Detective' on a saved lead and get back a unified dossier. Use this on every cold prospect before you call.

Reps and admins use the SAME function (detective-prep). It supports both x-admin-token and x-portal-token. You do not need to add a lead first — standalone URL works.`,
      keyTakeaways: [
        "Never make a cold call without running Detective first.",
        "If RocketReach returns no contact, hunt LinkedIn manually. Don't call the front desk.",
        "Save the dossier as a note on the lead so the next rep doesn't redo the work.",
      ],
    },
    resources: [
      { label: "Detective Mode (in portal Tools)", url: "/portal?tab=tools" },
    ],
    sessions: [
      s("w2d6-s1", "Morning · Live Practice", 75, "Run 5 dossiers.", [
        t("w2d6-s1-1", "Run Detective on 5 ICP prospects you haven't researched", undefined, "/portal?tab=tools"),
        t("w2d6-s1-2", "For each, write a 2-line 'what I'd open the call with' note"),
        t("w2d6-s1-3", "Save those notes as lead notes in the board"),
      ]),
      s("w2d6-s2", "Midday · Hunt Mode Paste-URL", 45, "Build leads from scratch.", [
        t("w2d6-s2-1", "In Hunt Mode, paste 3 URLs you found organically — let the scraper create the leads"),
        t("w2d6-s2-2", "Verify contact info was extracted; if not, add manually"),
      ]),
      s("w2d6-s3", "Afternoon · AI Scan vs Detective", 60, "Know when to use which.", [
        t("w2d6-s3-1", "Run the basic Website Scanner on 2 prospects (quick triage)", undefined, "/scan"),
        t("w2d6-s3-2", "Run full Detective on the same 2 (deep dossier)"),
        t("w2d6-s3-3", "Compare outputs in your notes — write when you'd use which"),
      ]),
    ],
    successMetric: "5 dossiers + 3 paste-URL leads + you know the speed/depth tradeoff.",
  },
  {
    week: 2, day: 7, weekTheme: W2_THEME, weekOutcome: W2_OUT,
    theme: "Day 7 · The All-In-One Generator",
    tagline: "Prospect URL in → 6 sales assets out.",
    lesson: {
      title: "The All-In-One is your pre-meeting nuclear option.",
      body: `One URL produces: cold email, follow-up plan, talk track, objection handlers, LinkedIn opener, and a one-page mini-brief. It uses the same AI gateway your Detective dossier hits, then formats for sales use.

Best practice: run Detective FIRST, then All-In-One. The All-In-One reads the existing dossier (if present) and produces sharper output than a cold URL.

Use Easy Mode toggle when you want plain-English versions you can paste straight into an email without editing.`,
      keyTakeaways: [
        "Detective → All-In-One is the order. Not the other way.",
        "Easy Mode = paste-ready. Detective Mode = strategist-ready.",
        "Use the section copy buttons in Easy Mode — don't retype.",
      ],
    },
    resources: [
      { label: "All-In-One Generator", url: "/portal?tab=tools" },
    ],
    sessions: [
      s("w2d7-s1", "Morning · Generate Stack", 90, "Build 3 full asset packs.", [
        t("w2d7-s1-1", "Run All-In-One on 3 prospects (Detective first, then All-In-One)"),
        t("w2d7-s1-2", "Save the email + LinkedIn opener for each into Drafts"),
        t("w2d7-s1-3", "Test the copy-section button on every block in Easy Mode"),
      ]),
      s("w2d7-s2", "Midday · Send for Real", 60, "Convert assets to action.", [
        t("w2d7-s2-1", "Send 5 personalized cold emails using the All-In-One drafts"),
        t("w2d7-s2-2", "Log each as a lead activity"),
      ]),
      s("w2d7-s3", "Afternoon · Image Studio", 45, "Branded prospect graphics.", [
        t("w2d7-s3-1", "Generate 2 branded prospect graphics in Image Studio", undefined, "/portal?tab=tools"),
        t("w2d7-s3-2", "Confirm the 'Aetheris AI Studio' watermark renders bottom-right"),
        t("w2d7-s3-3", "Complete Day 7 quiz", undefined, "/portal?tab=training"),
      ]),
    ],
    successMetric: "5 personalized cold emails sent, sourced from the All-In-One.",
  },
  {
    week: 2, day: 8, weekTheme: W2_THEME, weekOutcome: W2_OUT,
    theme: "Day 8 · Sales Coach + Strategic Question Engine",
    tagline: "Your second brain before every call.",
    lesson: {
      title: "The Coach is not a chatbot. It's a co-pilot trained on Aetheris voice.",
      body: `The Sales Coach knows our positioning, offers, splits, and forbidden phrases. Ask it like you'd ask a senior rep:
• "Draft a 3-touch follow-up for a CFO who ghosted after a proposal."
• "What's the highest-leverage objection handler for 'we already have a marketing person'?"
• "Pitch the Leak Audit in under 60 words."

The Strategic Question Engine is its sister tool — give it a company name + a problem, get a list of forensic questions that surface deeper pain.`,
      keyTakeaways: [
        "Never write a cold email from scratch when the Coach can draft it.",
        "Use the Question Engine to PREPARE for calls, not just react to them.",
        "If the Coach output sounds like influencer fluff, ask it to rewrite 'in the Aetheris forensic operator voice.'",
      ],
    },
    resources: [
      { label: "Sales Coach", url: "/portal?tab=coach" },
      { label: "Strategic Question Engine", url: "/portal?tab=tools" },
    ],
    sessions: [
      s("w2d8-s1", "Morning · Coach Deep Use", 75, "Get 10 production-ready outputs.", [
        t("w2d8-s1-1", "Ask the Coach for 5 cold-email subject lines targeting CFOs"),
        t("w2d8-s1-2", "Ask the Coach for 5 LinkedIn DM openers for COOs"),
        t("w2d8-s1-3", "Ask it to rewrite the WORST one 'in the forensic operator voice'"),
      ]),
      s("w2d8-s2", "Midday · Question Engine", 60, "Pre-call prep mastery.", [
        t("w2d8-s2-1", "For your top 3 leads, run the Question Engine"),
        t("w2d8-s2-2", "Save the 5 sharpest questions per lead as call-prep notes"),
      ]),
      s("w2d8-s3", "Afternoon · Real Outreach", 90, "Action the outputs.", [
        t("w2d8-s3-1", "Send 10 cold emails using Coach drafts"),
        t("w2d8-s3-2", "Send 10 LinkedIn DMs"),
        t("w2d8-s3-3", "Complete Day 8 quiz", undefined, "/portal?tab=training"),
      ]),
    ],
    successMetric: "20 outbound touches today + 3 calls prepped with forensic questions.",
  },
  {
    week: 2, day: 9, weekTheme: W2_THEME, weekOutcome: W2_OUT,
    theme: "Day 9 · Pipeline Hygiene & Forecast Center",
    tagline: "If it's not in the board, it didn't happen.",
    lesson: {
      title: "We forecast off your board. Garbage in = garbage out.",
      body: `Every conversation gets logged, including rejections. Why:
• Closed-lost in month 1 = reactivation gold in month 8.
• Your partner needs to see real pipeline to coach you.
• The Forecast Center calculates your projected commission off these statuses — if you don't update them, your numbers lie to you.

Status hygiene: new → contacted → qualified → diagnostic-pitched → diagnostic-won → retainer-pitched → retainer-won → closed-lost. Move fast, never skip.`,
      keyTakeaways: [
        "Log every conversation, even 'not interested.'",
        "Update statuses same day — never let leads rot in 'new.'",
        "Forecast Center is your honest mirror. Check it weekly.",
      ],
    },
    resources: [
      { label: "Leads Board", url: "/portal?tab=leads" },
      { label: "Forecast Center", url: "/portal?tab=forecast" },
    ],
    sessions: [
      s("w2d9-s1", "Morning · Audit Your Board", 60, "Clean what's already there.", [
        t("w2d9-s1-1", "Open the Leads Board, fix every status that's stale >7 days", undefined, "/portal?tab=leads"),
        t("w2d9-s1-2", "Add a 1-line note to every lead missing context"),
      ]),
      s("w2d9-s2", "Midday · Forecast Read", 45, "Know your number.", [
        t("w2d9-s2-1", "Open Forecast Center, screenshot your weekly projection", undefined, "/portal?tab=forecast"),
        t("w2d9-s2-2", "Write a 1-sentence diagnosis: am I on pace?"),
      ]),
      s("w2d9-s3", "Afternoon · Add Volume", 90, "Push to 25 leads total.", [
        t("w2d9-s3-1", "Add 10 more ICP-fit leads (Hunt Mode + manual)"),
        t("w2d9-s3-2", "Make 15 outbound dials, log every conversation"),
        t("w2d9-s3-3", "Complete Day 9 quiz", undefined, "/portal?tab=training"),
      ]),
    ],
    successMetric: "25 clean leads, every status current.",
  },
  {
    week: 2, day: 10, weekTheme: W2_THEME, weekOutcome: W2_OUT,
    theme: "Day 10 · Week 2 Capstone — Prep a Call in 10 Minutes",
    tagline: "Live demo: URL → ready-to-call in <10 min.",
    lesson: {
      title: "This is the rep skill that beats every CRM consultant in the country.",
      body: `Most reps spend 45 minutes 'researching' before a call. With our stack you spend 10 — and your dossier is better. Time it. Beat it. This becomes your moat.

The flow:
1. Paste URL into Hunt → lead created (60s).
2. Detective Mode → full dossier (90s).
3. All-In-One → email + talk track + objections (3 min).
4. Strategic Questions → 5 forensic questions (2 min).
5. Save all to lead notes, schedule the call (2 min).

Total: 8.5 minutes. You're now ready to outperform any consultant in their own market.`,
      keyTakeaways: [
        "Time yourself today. Beat 10 minutes.",
        "If a step takes you >2 min, that's a skill gap to drill tomorrow.",
        "Repetition turns this into muscle memory.",
      ],
    },
    sessions: [
      s("w2d10-s1", "Morning · Time Trial", 90, "Do it 3 times, fastest wins.", [
        t("w2d10-s1-1", "Run the full flow on prospect #1 — time yourself"),
        t("w2d10-s1-2", "Run it on #2 — beat your time"),
        t("w2d10-s1-3", "Run it on #3 — beat it again"),
        t("w2d10-s1-4", "Post your best time on the Team Board", undefined, "/portal?tab=messages"),
      ]),
      s("w2d10-s2", "Afternoon · Pass Week 2", 60, "Certify.", [
        t("w2d10-s2-1", "Complete Week 2 Certification Quiz", undefined, "/portal?tab=training"),
        t("w2d10-s2-2", "Have 25+ leads and at least 1 booked discovery call"),
        t("w2d10-s2-3", "Post Week 2 recap on Team Board"),
      ]),
    ],
    successMetric: "<10 min call prep + 25 leads + Week 2 quiz passed.",
  },
];

// ─────────────────────────────────────────────────────────────
// WEEK 3 — PROSPECTING & OUTBOUND VOLUME
// ─────────────────────────────────────────────────────────────
const W3_THEME = "Prospecting · Volume + Voice = Pipeline";
const W3_OUT = "End of week: 100+ qualified outbound touches and 3+ booked discovery calls.";

const week3: DayPlan6W[] = [
  {
    week: 3, day: 11, weekTheme: W3_THEME, weekOutcome: W3_OUT,
    theme: "Day 11 · Cold Email That Doesn't Get Deleted",
    tagline: "Subject + first 12 words = the whole game.",
    lesson: {
      title: "Forensic subject lines outperform clever ones.",
      body: `Bad: "Quick question 👋"
Better: "Found a $312K leak on your HubSpot"
Best: "[FirstName] — your trade show leads are dying in 14 days"

The formula: specific dollar amount or specific time window or specific system name. No emojis. No 'just checking in.' No 'circling back.'

Email body: 4 sentences max. Lead with diagnosis, not credentials. End with a question, not an ask.`,
    },
    resources: [
      { label: "Sales Scripts library", url: "/portal?tab=playbook" },
      { label: "Outreach Email Creator tool", url: "/portal?tab=tools" },
    ],
    sessions: [
      s("w3d11-s1", "Morning · Write 20", 90, "Volume = pattern detection.", [
        t("w3d11-s1-1", "Write 20 cold email subject lines using the formula"),
        t("w3d11-s1-2", "Have Sales Coach grade them; rewrite the bottom 10"),
      ]),
      s("w3d11-s2", "Afternoon · Send 20", 90, "Ship.", [
        t("w3d11-s2-1", "Send 20 personalized cold emails today"),
        t("w3d11-s2-2", "Log every send; tag replies as they come in"),
        t("w3d11-s2-3", "Complete Day 11 quiz", undefined, "/portal?tab=training"),
      ]),
    ],
    successMetric: "20 cold emails out, at least 2 replies expected by end of day tomorrow.",
  },
  {
    week: 3, day: 12, weekTheme: W3_THEME, weekOutcome: W3_OUT,
    theme: "Day 12 · LinkedIn Outbound (DMs + Connection Notes)",
    tagline: "Two touches per prospect: connection + warm DM 48h later.",
    lesson: {
      title: "LinkedIn is our second channel. It's not optional.",
      body: `Step 1: Connection request with a 1-sentence note. No pitch. ("Saw the [trade show] post — wanted to connect.")
Step 2: 48 hours after they accept, drop a forensic observation. ("Noticed your team is hiring a 2nd CSM — usually a sign HubSpot is over capacity. Mind if I share what we usually see at that stage?")
Step 3: If they reply, route to a 15-min call.

Use the LinkedIn Setup Guide in the portal to make sure your profile screams 'operator' not 'rep.'`,
    },
    resources: [
      { label: "LinkedIn Setup Guide", url: "/portal?tab=playbook" },
      { label: "LinkedIn Banner Creator", url: "/portal?tab=tools" },
    ],
    sessions: [
      s("w3d12-s1", "Morning · Profile Polish", 60, "Look like an operator.", [
        t("w3d12-s1-1", "Update your LinkedIn headline to operator language"),
        t("w3d12-s1-2", "Generate a branded LinkedIn banner with the Banner Creator"),
        t("w3d12-s1-3", "Update your About section using the Aetheris voice"),
      ]),
      s("w3d12-s2", "Afternoon · 30 Touches", 90, "Send 30 connection requests with notes.", [
        t("w3d12-s2-1", "Identify 30 ICP-fit prospects on LinkedIn"),
        t("w3d12-s2-2", "Send 30 connection notes (1 sentence, no pitch)"),
        t("w3d12-s2-3", "Schedule 48-hour follow-up DMs"),
      ]),
    ],
    successMetric: "30 connections sent + profile fully polished.",
  },
  {
    week: 3, day: 13, weekTheme: W3_THEME, weekOutcome: W3_OUT,
    theme: "Day 13 · The Phone (Yes, Really)",
    tagline: "20 dials, every conversation logged.",
    lesson: {
      title: "Reps who dial outperform reps who don't. Always.",
      body: `Most reps avoid the phone because it's scary. That's exactly why it works — your prospect's other vendors aren't calling. The mid-market CEO who picks up at 4:47 PM on a Wednesday is the one who buys.

Script structure (15 seconds max before they decide to listen):
"Hey [Name] — Joseph at Aetheris. Quick reason for the call: we just finished a Diagnostic for [similar company] and found $[X] in revenue leak from [specific cause]. Worth a 12-minute conversation to see if you're sitting on the same?"

Pause. Let them respond. Don't fill silence.`,
    },
    sessions: [
      s("w3d13-s1", "Morning · Script Drill", 45, "Voice it 10x.", [
        t("w3d13-s1-1", "Record yourself saying the cold call open 10 times, listen back"),
        t("w3d13-s1-2", "Eliminate every filler word ('um', 'so', 'kind of')"),
      ]),
      s("w3d13-s2", "Afternoon · 20 Dials", 120, "Make them.", [
        t("w3d13-s2-1", "Make 20 outbound dials between 8–10 AM and 4–6 PM (prime answer windows)"),
        t("w3d13-s2-2", "Log every conversation as a lead activity"),
        t("w3d13-s2-3", "Voicemail = log + send a follow-up email same day"),
        t("w3d13-s2-4", "Complete Day 13 quiz", undefined, "/portal?tab=training"),
      ]),
    ],
    successMetric: "20 dials, 5+ conversations, 1+ booked call.",
  },
  {
    week: 3, day: 14, weekTheme: W3_THEME, weekOutcome: W3_OUT,
    theme: "Day 14 · Multi-Touch Cadences",
    tagline: "It takes 8–12 touches to convert a cold lead. Plan for it.",
    lesson: {
      title: "Single-touch outreach is amateur hour.",
      body: `Standard Aetheris cadence (3 weeks):
• Day 1: Email + LinkedIn connection
• Day 3: LinkedIn DM
• Day 5: Phone call + voicemail + email referencing voicemail
• Day 8: Forwarded value (a case study or insight, no ask)
• Day 12: Phone call #2
• Day 16: 'Permission to close' email — "Should I stop reaching out or is the timing just off?"

Build this in your CRM/board as recurring tasks. Auto-generate the follow-up plan using the Follow-Up Plan Generator tool.`,
    },
    resources: [
      { label: "Follow-Up Plan Generator", url: "/portal?tab=tools" },
    ],
    sessions: [
      s("w3d14-s1", "Morning · Build Cadences", 75, "Schedule the next 21 days for your top 10.", [
        t("w3d14-s1-1", "Use Follow-Up Plan Generator on your top 10 leads"),
        t("w3d14-s1-2", "Add each cadence step as a dated task in the board"),
      ]),
      s("w3d14-s2", "Afternoon · Execute Day 1 of cadence for 10 new leads", 90, "Layer fresh outreach on top.", [
        t("w3d14-s2-1", "Send 10 more cold emails"),
        t("w3d14-s2-2", "Send 10 more LinkedIn connections"),
        t("w3d14-s2-3", "Complete Day 14 quiz", undefined, "/portal?tab=training"),
      ]),
    ],
    successMetric: "10 leads on multi-touch cadence + 20 fresh touches today.",
  },
  {
    week: 3, day: 15, weekTheme: W3_THEME, weekOutcome: W3_OUT,
    theme: "Day 15 · Week 3 Capstone — Booked Calls",
    tagline: "Goal: 3 discovery calls booked by EOD.",
    lesson: {
      title: "Booked > busy.",
      body: `Activity without booked calls is theatre. The metric that matters this week is calendar invites accepted. If you have 100 touches and 0 booked calls, your messaging is broken — go back to Day 11 and rewrite.`,
    },
    sessions: [
      s("w3d15-s1", "All Day · Convert", 240, "Push every warm reply into a calendar invite.", [
        t("w3d15-s1-1", "Reply to every email + DM in your inbox today"),
        t("w3d15-s1-2", "For every warm reply, send a calendar link in the next message"),
        t("w3d15-s1-3", "Make 15 more dials targeting people you've emailed in last 7 days"),
        t("w3d15-s1-4", "Pass the Week 3 Certification Quiz", undefined, "/portal?tab=training"),
        t("w3d15-s1-5", "Have 3 booked discovery calls on the calendar"),
      ]),
    ],
    successMetric: "3 booked calls + 100 cumulative outbound touches this week.",
  },
];

// ─────────────────────────────────────────────────────────────
// WEEK 4 — DISCOVERY & QUALIFICATION
// ─────────────────────────────────────────────────────────────
const W4_THEME = "Discovery · Diagnose Before You Prescribe";
const W4_OUT = "End of week: you run discovery calls that prospects describe as 'the most useful 30 minutes I've had with a vendor.'";

const week4: DayPlan6W[] = [
  {
    week: 4, day: 16, weekTheme: W4_THEME, weekOutcome: W4_OUT,
    theme: "Day 16 · The Discovery Frame",
    tagline: "We don't pitch on discovery calls. We diagnose.",
    lesson: {
      title: "If you pitch in the first 25 minutes, you've lost the deal.",
      body: `The discovery call is a forensic exam. You're not selling. You're surfacing leaks the prospect can feel.

Structure (30 min):
• 0–2 min: Frame. "I'll spend 25 minutes asking forensic questions about your revenue ops. Last 5 we'll talk about whether a Diagnostic makes sense. Sound fair?"
• 2–25 min: Forensic questioning. Use the 7-leak map.
• 25–28 min: Replay what you heard in dollar terms. "So you've got ~$400K trapped in stalled deals and another $150K in dead MQLs."
• 28–30 min: Soft close. "Worth a Diagnostic to map it formally?"

Selling happens by NOT selling. The prospect convinces themselves.`,
      keyTakeaways: [
        "Ask. Listen. Replay in dollars. Never pitch first.",
        "Silence after a question is a sales tactic. Use it.",
        "The 'soft close' at minute 28 closes more deals than any deck.",
      ],
    },
    resources: [
      { label: "Strategic Question Engine", url: "/portal?tab=tools" },
      { label: "Sales Coach", url: "/portal?tab=coach" },
    ],
    sessions: [
      s("w4d16-s1", "Morning · Build Your Question Bank", 75, "30 forensic questions you can pull from memory.", [
        t("w4d16-s1-1", "Write 5 questions per leak category (35 total). Sales Coach can help."),
        t("w4d16-s1-2", "Save them as a quick-reference doc in your workspace", undefined, "/portal?tab=workspace"),
      ]),
      s("w4d16-s2", "Afternoon · Run 1 Real Discovery", 60, "Live reps.", [
        t("w4d16-s2-1", "Run a real discovery using the structure above"),
        t("w4d16-s2-2", "Debrief with Sales Coach: what would you do differently?"),
        t("w4d16-s2-3", "Complete Day 16 quiz", undefined, "/portal?tab=training"),
      ]),
    ],
    successMetric: "1 discovery run + 35 forensic questions ready to deploy.",
  },
  {
    week: 4, day: 17, weekTheme: W4_THEME, weekOutcome: W4_OUT,
    theme: "Day 17 · Qualification — MEDDPICC Lite",
    tagline: "Metrics, Economic Buyer, Decision Criteria, Decision Process, Pain, Champion, Competition.",
    lesson: {
      title: "Disqualify fast. Saying 'no' protects your pipeline.",
      body: `MEDDPICC Lite for Aetheris:
• Metrics — Can they quantify the leak? If no, Diagnostic is a fit. If they can't even guess, they're not ready.
• Economic Buyer — Are we talking to CEO/CFO/COO? Or a director with no checkbook?
• Decision Criteria — What would make this a "hell yes"?
• Decision Process — Solo or committee? Timeline?
• Pain — Real or vague? "We need better reporting" = vague. "We lost 3 deals last quarter to follow-up" = real.
• Champion — Who in the room would walk it through procurement?
• Competition — Are they evaluating others? (Often yes — usually a marketing agency or a CRM consultant.)

If you can't fill 5 of 7 boxes after discovery, the deal is NOT qualified. Don't write a proposal.`,
    },
    sessions: [
      s("w4d17-s1", "Morning · Score Your Top 5 Deals", 60, "Honest assessment.", [
        t("w4d17-s1-1", "For your top 5 leads, fill out MEDDPICC Lite in notes"),
        t("w4d17-s1-2", "Mark each as Qualified / Needs more disco / Disqualify"),
      ]),
      s("w4d17-s2", "Afternoon · Re-engage the Disqualified", 60, "Don't waste pipeline.", [
        t("w4d17-s2-1", "For 'needs more disco', schedule a second 15-min call"),
        t("w4d17-s2-2", "For 'disqualify', send the polite no-fit message and move to nurture"),
        t("w4d17-s2-3", "Complete Day 17 quiz", undefined, "/portal?tab=training"),
      ]),
    ],
    successMetric: "All top 5 deals scored honestly + cleanup done.",
  },
  {
    week: 4, day: 18, weekTheme: W4_THEME, weekOutcome: W4_OUT,
    theme: "Day 18 · Reading Tech Stack Signals",
    tagline: "Their tech tells you their leak before they do.",
    lesson: {
      title: "Stack archaeology.",
      body: `Signals from our website scanner + Detective Mode:
• HubSpot Free tier on a $15M company = under-invested CRM = stalled deals everywhere.
• Marketo + no Salesforce sync = lead routing leak.
• Calendly on the homepage but no auto-sequencer = slow follow-up.
• No call tracking number = they have no idea what marketing actually works.
• Salesforce + 5+ admin emails = political org, longer sales cycle, bigger check.

Run the scan, read the signals, walk into the call already knowing 3 leaks.`,
    },
    sessions: [
      s("w4d18-s1", "Morning · Stack Read 5 Prospects", 90, "Build the pattern recognition.", [
        t("w4d18-s1-1", "Run Detective on 5 prospects you haven't scanned"),
        t("w4d18-s1-2", "Write 3 'suspected leaks' per prospect based on stack alone"),
        t("w4d18-s1-3", "Validate 1 on a real call this week"),
      ]),
      s("w4d18-s2", "Afternoon · Live", 90, "Convert insight to action.", [
        t("w4d18-s2-1", "Make 10 dials referencing the stack diagnosis in your opener"),
        t("w4d18-s2-2", "Complete Day 18 quiz", undefined, "/portal?tab=training"),
      ]),
    ],
    successMetric: "Stack-read 5 prospects + tested 1 diagnosis live.",
  },
  {
    week: 4, day: 19, weekTheme: W4_THEME, weekOutcome: W4_OUT,
    theme: "Day 19 · Multi-Stakeholder Sales",
    tagline: "Mid-market = 2–4 decision makers. Map them.",
    lesson: {
      title: "If you only talk to one person, you only have half a deal.",
      body: `Typical Diagnostic buying committee:
• CEO — emotional buyer, cares about story.
• CFO — math buyer, cares about ROI proof.
• VP Sales or Head of Revenue — operational buyer, cares about disruption.
• Marketing lead — sometimes blocker, often champion.

Your job: figure out who's in the room, map their concerns, and pre-handle objections for each persona BEFORE the group call.`,
    },
    sessions: [
      s("w4d19-s1", "Morning · Stakeholder Map", 60, "Map your top 3 deals.", [
        t("w4d19-s1-1", "For each, list every named person + their role + their likely concern"),
        t("w4d19-s1-2", "Identify your Champion in each"),
      ]),
      s("w4d19-s2", "Afternoon · Champion Enablement", 75, "Arm them to sell internally.", [
        t("w4d19-s2-1", "Send each Champion a 1-page internal-sell brief (Coach can draft)"),
        t("w4d19-s2-2", "Complete Day 19 quiz", undefined, "/portal?tab=training"),
      ]),
    ],
    successMetric: "Stakeholder map + Champion brief sent on top 3 deals.",
  },
  {
    week: 4, day: 20, weekTheme: W4_THEME, weekOutcome: W4_OUT,
    theme: "Day 20 · Week 4 Capstone — Run 2 Live Discoveries",
    tagline: "Two clean discovery calls + one Diagnostic pitched.",
    sessions: [
      s("w4d20-s1", "All Day · Execute", 240, "Live reps.", [
        t("w4d20-s1-1", "Run 2 discovery calls using the full forensic frame"),
        t("w4d20-s1-2", "End at least 1 with a 'soft close' Diagnostic pitch"),
        t("w4d20-s1-3", "Send the Methodology + Credentials PDF to every prospect"),
        t("w4d20-s1-4", "Pass Week 4 Certification Quiz", undefined, "/portal?tab=training"),
      ]),
    ],
    successMetric: "2 discoveries + 1 Diagnostic pitched + materials sent.",
  },
];

// ─────────────────────────────────────────────────────────────
// WEEK 5 — PITCH, OBJECTIONS, CLOSE
// ─────────────────────────────────────────────────────────────
const W5_THEME = "Close Mechanics · Pitch, Objections, Contracts";
const W5_OUT = "End of week: at least 1 signed Diagnostic OR 3 verbal commits in the pipeline.";

const week5: DayPlan6W[] = [
  {
    week: 5, day: 21, weekTheme: W5_THEME, weekOutcome: W5_OUT,
    theme: "Day 21 · The Diagnostic Pitch (5 Minutes Max)",
    tagline: "Replay the leaks. Anchor the dollars. Make the ask.",
    lesson: {
      title: "Anchor the deliverable, then the price. Never the other way.",
      body: `Pitch structure (5 minutes):
1. "Based on what you shared, you're sitting on at least $X in measurable leak across [3 specific categories]."
2. "Our 21-Day Diagnostic maps it formally — written report, ROI projections, prioritized fix list. Fixed fee, $18,500. No retainer required, no percentage-of-savings, no surprises."
3. "If you decide to fix it with us afterward, the Implementation Retainer is $15K/month with a 3-month minimum. But you can also take the report and execute internally — about half our clients do."
4. "Want me to send the SOW today or do you need to loop someone in first?"

Notice: no slides. No pricing tiers. No "starting from." One price, one deliverable, one ask.`,
    },
    resources: [
      { label: "Methodology PDF", url: "/methodology" },
      { label: "Credentials PDF", url: "/credentials" },
    ],
    sessions: [
      s("w5d21-s1", "Morning · Drill the Pitch", 60, "10x in your voice memo app.", [
        t("w5d21-s1-1", "Record the pitch 10 times, listen back, refine"),
        t("w5d21-s1-2", "Cut every weak word — 'maybe', 'I think', 'sort of'"),
      ]),
      s("w5d21-s2", "Afternoon · Live", 90, "Pitch 2 real prospects.", [
        t("w5d21-s2-1", "Pitch the Diagnostic to 2 qualified prospects today"),
        t("w5d21-s2-2", "Send SOW within 60 minutes of every pitch"),
        t("w5d21-s2-3", "Complete Day 21 quiz", undefined, "/portal?tab=training"),
      ]),
    ],
    successMetric: "2 pitches delivered + 2 SOWs sent same day.",
  },
  {
    week: 5, day: 22, weekTheme: W5_THEME, weekOutcome: W5_OUT,
    theme: "Day 22 · Objection Lab — Price",
    tagline: "$18.5K objections, handled.",
    lesson: {
      title: "When they object to price, they're objecting to PROOF of value.",
      body: `"$18.5K feels steep" → "Compared to what? If we find $400K in leaks, the Diagnostic pays for itself 21 times over. If we find nothing, you get a full refund — that's in the SOW."

"Can you do it for $10K?" → "We tested that price. Clients valued it less and engaged less. The $18.5K isn't arbitrary — it's the floor where the work gets respected. What I CAN do: scope it to a 14-day version at $14K if the team will cap diagnostic interviews at 5 stakeholders."

"We need to think about it." → "Totally fair. What's the specific concern — is it the dollar amount, the timing, or whether the leak is real?"

Never discount on the spot. Always re-scope.`,
    },
    sessions: [
      s("w5d22-s1", "Morning · Roleplay", 75, "Drill until reflexive.", [
        t("w5d22-s1-1", "Roleplay 'too expensive' 5 times with a partner or Sales Coach"),
        t("w5d22-s1-2", "Roleplay 'can you discount' 5 times"),
        t("w5d22-s1-3", "Roleplay 'we need to think' 5 times"),
      ]),
      s("w5d22-s2", "Afternoon · Real Reps", 90, "Use them on calls.", [
        t("w5d22-s2-1", "Make 10 dials, push for price-conversation on at least 2"),
        t("w5d22-s2-2", "Complete Day 22 quiz", undefined, "/portal?tab=training"),
      ]),
    ],
    successMetric: "All 3 price objections handled cold + tested live.",
  },
  {
    week: 5, day: 23, weekTheme: W5_THEME, weekOutcome: W5_OUT,
    theme: "Day 23 · Objection Lab — 'We Already Have…'",
    tagline: "Existing vendor, internal team, in-house attempt — all handled.",
    lesson: {
      title: "Existing solutions are the easiest objection to flip.",
      body: `"We already have a marketing agency." → "Perfect. Agencies run programs. We diagnose the system the programs feed into. The agency probably wants this Diagnostic done — it'll make their work convert better. Want me to loop them in?"

"We have an in-house RevOps person." → "Then you already know how hard it is to audit your own house. We're the outside set of eyes that gives them ammunition for the budget they keep getting denied. Want me to talk to them directly?"

"We tried this internally." → "Cool — what did you find? [listen]. Most internal audits stop at the top three leaks because anything deeper requires forensic tooling. We're a different layer."

Pattern: validate, reframe, route around.`,
    },
    sessions: [
      s("w5d23-s1", "Morning · Drill", 60, "Speak the reframes.", [
        t("w5d23-s1-1", "Roleplay all 3 objections aloud 5x each"),
        t("w5d23-s1-2", "Have Sales Coach grade your responses"),
      ]),
      s("w5d23-s2", "Afternoon · Live", 90, "Push.", [
        t("w5d23-s2-1", "Make 10 dials, surface 'we already have…' on at least 1"),
        t("w5d23-s2-2", "Complete Day 23 quiz", undefined, "/portal?tab=training"),
      ]),
    ],
    successMetric: "All 'we already have' objections reflexive.",
  },
  {
    week: 5, day: 24, weekTheme: W5_THEME, weekOutcome: W5_OUT,
    theme: "Day 24 · Contracts, SOWs, and Stripe Checkout",
    tagline: "Get the signature. Take the payment. Same call when possible.",
    lesson: {
      title: "The faster you can transact, the higher your close rate.",
      body: `Aetheris uses Stripe embedded checkout for fast wins. Flow:
1. Verbal yes on the call.
2. Send SOW (PDF) within 10 min.
3. Send Stripe payment link for the deposit (typically $9,250 of the $18.5K).
4. They pay → kickoff scheduled within 48 hours.

If they want to wire instead, route to ops. If procurement gets involved, send the Methodology + Credentials packet to grease the path. NEVER let a verbal yes sit 5+ days without a payment link in their inbox.`,
    },
    resources: [
      { label: "Stripe checkout (test mode)", url: "/portal?tab=tools" },
    ],
    sessions: [
      s("w5d24-s1", "Morning · Walk the Checkout Flow", 60, "End-to-end test.", [
        t("w5d24-s1-1", "Walk through a test Stripe checkout yourself"),
        t("w5d24-s1-2", "Read the SOW template top to bottom — flag anything you don't understand"),
      ]),
      s("w5d24-s2", "Afternoon · Push Existing Verbals", 90, "Convert.", [
        t("w5d24-s2-1", "For every 'thinking about it' lead, send the SOW + Stripe link today"),
        t("w5d24-s2-2", "Complete Day 24 quiz", undefined, "/portal?tab=training"),
      ]),
    ],
    successMetric: "Every warm verbal has SOW + payment link in their inbox.",
  },
  {
    week: 5, day: 25, weekTheme: W5_THEME, weekOutcome: W5_OUT,
    theme: "Day 25 · Week 5 Capstone — Close Something",
    tagline: "1 signed Diagnostic or 3 verbal commits.",
    sessions: [
      s("w5d25-s1", "All Day · Close", 300, "Close.", [
        t("w5d25-s1-1", "Pitch the Diagnostic on every qualified lead today"),
        t("w5d25-s1-2", "Send SOWs same-call"),
        t("w5d25-s1-3", "Follow up every verbal commit with payment link within 1 hour"),
        t("w5d25-s1-4", "Pass Week 5 Certification Quiz", undefined, "/portal?tab=training"),
      ]),
    ],
    successMetric: "1 signed Diagnostic OR 3 verbal commits with SOWs out.",
  },
];

// ─────────────────────────────────────────────────────────────
// WEEK 6 — SCALE, REFERRALS, CERTIFICATION
// ─────────────────────────────────────────────────────────────
const W6_THEME = "Scale · Referrals, Retention, and Operating at Tempo";
const W6_OUT = "End of week: certified Aetheris Operator with a self-sustaining pipeline and at least 1 referral partner activated.";

const week6: DayPlan6W[] = [
  {
    week: 6, day: 26, weekTheme: W6_THEME, weekOutcome: W6_OUT,
    theme: "Day 26 · The Retainer Conversion",
    tagline: "Diagnostic clients → Retainer clients in 21 days.",
    lesson: {
      title: "The Diagnostic is the salesperson for the Retainer.",
      body: `By Day 18 of the Diagnostic, you'll know exactly which fixes the client needs. Walk into the readout call with the Retainer SOW ready. The pitch writes itself:

"We mapped $X in leak. Categories 1, 3, and 5 can be fixed internally with this roadmap. Categories 2, 4, and 6 need operator-level work and 90 days of hands-on. That's what the Retainer is for. $15K/month, 3-month minimum, $4K of every month goes to you the rep. Want to start next Monday?"

Conversion benchmark: 60% of Diagnostic clients should sign the Retainer. If you're below 40%, your Diagnostic readouts are too generic.`,
    },
    sessions: [
      s("w6d26-s1", "Morning · Build the Readout Template", 60, "One template, reusable.", [
        t("w6d26-s1-1", "Draft a Diagnostic readout deck/doc that includes the Retainer pitch on slide N"),
        t("w6d26-s1-2", "Get Sales Coach to grade it"),
      ]),
      s("w6d26-s2", "Afternoon · If you have a Diagnostic client, prep the readout", 75, "Real reps.", [
        t("w6d26-s2-1", "Build the actual readout for your live client (if any)"),
        t("w6d26-s2-2", "Otherwise build a mock readout from a competitor's public data"),
        t("w6d26-s2-3", "Complete Day 26 quiz", undefined, "/portal?tab=training"),
      ]),
    ],
    successMetric: "Reusable readout template ready + 1 real or mock readout built.",
  },
  {
    week: 6, day: 27, weekTheme: W6_THEME, weekOutcome: W6_OUT,
    theme: "Day 27 · Referrals & The 'Bring-A-Rep' Bonus",
    tagline: "$500 onboard + $7K first close + $500/sale for 12mo. Stack it.",
    lesson: {
      title: "Compounding income comes from your network, not your dials.",
      body: `For every rep you refer who joins Aetheris:
• $500 the day they onboard (sign rep agreement + complete Week 1).
• $7,000 when they close their first Diagnostic.
• $500 override on every sale they make for 12 months.

3 referred reps each closing 2 Diagnostics/month = $3,000/month override income on top of your own commissions. This is how operators build leverage.

The pitch to your network is forensic, not 'side hustle': "I'm building a sales team at a Business Forensics firm. Fixed flat fees, $5K/sale, $4K/month per active client. If you have a sales background and want to operate, not influence, let's talk."`,
    },
    sessions: [
      s("w6d27-s1", "Morning · Identify 5 Targets", 45, "Your future team.", [
        t("w6d27-s1-1", "List 5 people you'd vouch for as Aetheris reps"),
        t("w6d27-s1-2", "Draft a 4-sentence outreach for each"),
      ]),
      s("w6d27-s2", "Afternoon · Send All 5", 60, "Activate.", [
        t("w6d27-s2-1", "Send all 5 outreaches today"),
        t("w6d27-s2-2", "Complete Day 27 quiz", undefined, "/portal?tab=training"),
      ]),
    ],
    successMetric: "5 referral outreaches sent.",
  },
  {
    week: 6, day: 28, weekTheme: W6_THEME, weekOutcome: W6_OUT,
    theme: "Day 28 · Client Retention = Your Monthly Income",
    tagline: "Every month a Retainer client stays = $4K to you. Keep them alive.",
    lesson: {
      title: "Retention is a sales skill, not just a delivery skill.",
      body: `Reps who hand off after the close lose retention. Reps who stay involved earn $4K/month for 12+ months.

Your monthly retention ritual:
• Week 1 of the month: send a 'progress autopsy' email to the client recapping what was fixed.
• Week 2: send 1 forensic observation about something new you noticed in their data.
• Week 3: schedule a 15-min check-in. Always.
• Week 4: send the upcoming month's plan + invoice.

Clients churn for one reason: silence. Don't go silent.`,
    },
    sessions: [
      s("w6d28-s1", "Morning · Build Retention Templates", 60, "Reusable touches.", [
        t("w6d28-s1-1", "Draft the 'progress autopsy' template"),
        t("w6d28-s1-2", "Draft the 'forensic observation' template"),
        t("w6d28-s1-3", "Add monthly recurring tasks to your calendar"),
      ]),
      s("w6d28-s2", "Afternoon · Apply to current clients", 60, "Real touches.", [
        t("w6d28-s2-1", "If you have active retainer clients, send this month's progress autopsy today"),
        t("w6d28-s2-2", "Complete Day 28 quiz", undefined, "/portal?tab=training"),
      ]),
    ],
    successMetric: "Retention ritual scheduled + (if applicable) sent to live clients.",
  },
  {
    week: 6, day: 29, weekTheme: W6_THEME, weekOutcome: W6_OUT,
    theme: "Day 29 · Operating Tempo — The Daily Hustle",
    tagline: "30/15/5/3 — your daily minimum to stay paid.",
    lesson: {
      title: "Operators run on tempo, not motivation.",
      body: `Aetheris daily minimums:
• 30 new touches (email, DM, dial combined).
• 15 follow-ups on existing pipeline.
• 5 lead-board status updates.
• 3 forensic observations posted on LinkedIn or sent to prospects.

That's a 2–3 hour day, every day, that produces predictable pipeline. Reps who hit this monthly close 1–2 Diagnostics consistently. Reps who don't, don't.

The Daily Hustle card in the portal tracks this for you. Use it.`,
    },
    resources: [
      { label: "Daily Hustle card", url: "/portal?tab=home" },
      { label: "Sprint 90 view", url: "/portal?tab=home" },
    ],
    sessions: [
      s("w6d29-s1", "All Day · Hit the Minimums", 240, "Operator tempo.", [
        t("w6d29-s1-1", "30 new outbound touches today"),
        t("w6d29-s1-2", "15 follow-ups"),
        t("w6d29-s1-3", "5 status updates"),
        t("w6d29-s1-4", "3 forensic observations published"),
        t("w6d29-s1-5", "Log everything in the Daily Hustle card", undefined, "/portal?tab=home"),
        t("w6d29-s1-6", "Complete Day 29 quiz", undefined, "/portal?tab=training"),
      ]),
    ],
    successMetric: "All 4 daily minimums hit + tracked.",
  },
  {
    week: 6, day: 30, weekTheme: W6_THEME, weekOutcome: W6_OUT,
    theme: "Day 30 · 6-Week Certification & Operator Graduation",
    tagline: "Pass the Operator certification, post your graduation, claim your first month bonus.",
    lesson: {
      title: "You are now an Aetheris Operator.",
      body: `Certification requirements:
✓ All 6 week quizzes passed.
✓ Discovery + pitch roleplays graded ≥85% by Sales Coach.
✓ 100+ logged outbound touches.
✓ 5+ booked discovery calls.
✓ At least 1 signed Diagnostic OR 3 verbal commits with SOWs out.
✓ 1 referral outreach activated.
✓ Daily Hustle tempo proven for 5 consecutive days.

When you pass, you're permanently in the Operator tier — eligible for volume bonuses, retention overrides, and referral splits. You become someone Aetheris invests in publicly: case studies, LinkedIn co-posts, lead routing priority.

Welcome to the team. Now go bleed leaks dry.`,
    },
    sessions: [
      s("w6d30-s1", "Morning · Final Certification", 120, "Pass the test.", [
        t("w6d30-s1-1", "Complete the 6-Week Operator Certification Quiz", undefined, "/portal?tab=training"),
        t("w6d30-s1-2", "Submit your pipeline proof to your partner for review"),
        t("w6d30-s1-3", "Run a final pitch roleplay with Sales Coach — score ≥85%"),
      ]),
      s("w6d30-s2", "Afternoon · Graduate", 60, "Make it public.", [
        t("w6d30-s2-1", "Post your graduation on the Team Message Board", undefined, "/portal?tab=messages"),
        t("w6d30-s2-2", "Post a LinkedIn announcement using the forensic operator voice"),
        t("w6d30-s2-3", "Plan Week 7+ — your goal is 2 Diagnostics + 1 Retainer in your first 30 days post-grad"),
      ]),
    ],
    successMetric: "Certified Aetheris Operator with full pipeline and a plan for next 30 days.",
  },
];

export const CURRICULUM_6W: DayPlan6W[] = [...week1, ...week2, ...week3, ...week4, ...week5, ...week6];
