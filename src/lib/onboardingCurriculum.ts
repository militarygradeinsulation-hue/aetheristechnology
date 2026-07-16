// Hardcoded onboarding curriculum. Each module = a generated narrated slide deck.
// scriptOutline is fed to the AI; it returns 4-6 slides with bullets + narration.
// routeHints maps short labels (the AI picks one per slide) to actual app routes the
// player will embed as a live screenshot while that slide is narrating.

export interface OnboardingModuleDef {
  slug: string;
  title: string;
  summary: string;
  scriptOutline: string;
  /** Map of {label -> route}. AI assigns one label per slide; player uses the route. */
  routeHints?: Record<string, string>;
}

// Routes available across all modules. The AI may pick from any module's hints
// plus this global set when assigning a route per slide.
export const GLOBAL_ROUTE_HINTS: Record<string, string> = {
  home: "/",
  leak_audit: "/leak-audit",
  services: "/services",
  portal_login: "/portal",
  portal_home: "/portal?tab=home",
  portal_leads: "/portal?tab=leads",
  portal_calendar: "/portal?tab=calendar",
  portal_forecast: "/portal?tab=forecast",
  portal_tools: "/portal?tab=tools",
  portal_coach: "/portal?tab=coach",
  portal_training: "/portal?tab=training",
  portal_documents: "/portal?tab=documents",
  portal_playbook: "/portal?tab=playbook",
  portal_messages: "/portal?tab=messages",
  portal_workspace: "/portal?tab=workspace",
};

export const ONBOARDING_CURRICULUM: OnboardingModuleDef[] = [
  {
    slug: "welcome",
    title: "Welcome to Aetheris",
    summary: "Who we are, what we sell, and how the commission math actually works.",
    scriptOutline: `Welcome a brand-new sales rep to Aetheris Technology, a Chaos Theory Forensics operator based in Indianapolis.
Cover the positioning in one line: "Your business is leaking. You just can't see it from the inside." We do not sell tools. We sell the operator who wields the tools.
The public site offers exactly five things, in this order:
  1) Signal Pack — $2,500 one-time, operator-led bundle (~6 hrs).
  2) Revenue Pack — $5,000 one-time bundle (~14 hrs).
  3) Operator Suite — $10,000 one-time bundle (~30 hrs, credits 1:1 toward Active Case).
  4) FLAGSHIP: 21-Day Revenue Diagnostic — $18,500 fixed fee, fit call required.
  5) FLAGSHIP: Active Case — $15,000/mo, 3-month minimum, Diagnostic clients only.
Commission has two models. Bundles use the tiered split — all three bundles are Tier 3 (70/20/10), so the rep keeps 20% (Signal $500, Revenue $1,000, Operator Suite $2,000). Flagships use FIXED dollars — $5,000 to the rep on every Diagnostic close, $4,000/mo to the rep EVERY MONTH the Active Case client stays subscribed. Partner gets $3,000 on Diagnostic and $3,000/mo on Active Case. Company keeps the rest.
Tone: blunt, operator, not corporate. Tell them the next module covers logging in and the one after that breaks down the operator pitch.`,
    routeHints: { home: "/", leak_audit: "/leak-audit", services: "/services" },
  },
  {
    slug: "operator-pitch",
    title: "The Operator Pitch (sell the operator, not the tools)",
    summary: "What changed: we don't sell tools anymore. We sell the operator who wields them.",
    scriptOutline: `Drill into the most important shift in the business: we KILLED à la carte tool sales on the public site. The new pitch is operator-first.
Reps must internalize this line: "We don't sell tools. We sell the operator. The tools are how. The operator is what you're paying for."
Walk through the three sealed bundles and why they only work together:
  - Signal Pack: website + brand contradiction + friction audit. Run apart, each is a PDF. Run together by an operator, you get one Leak Findings memo naming the dollar bleed.
  - Revenue Pack: scripts + follow-up + question engine + content calendar built as one engine, so a lead today closes in 90 days.
  - Operator Suite: 3 weeks of an embedded operator running the full stack — credits 1:1 toward the Active Case.
The flagships sit above the bundles: Diagnostic ($18,500) and Active Case ($15k/mo) require a 15-minute fit call first. Reps should pitch the Diagnostic when the prospect already knows something is broken and is exhausted from looking for the fix.
Hard rule for outbound: never lead with "we have a tool that does X". Always lead with "an operator will sit down with you, find every leak, and rebuild the system causing it." End: send them to the bundles page or book them on the fit call.`,
    routeHints: { home: "/", services: "/services", portal_tools: "/portal?tab=tools" },
  },
  {
    slug: "logging-in",
    title: "Logging Into the Rep Portal",
    summary: "How to access your portal with your rep code.",
    scriptOutline: `Walk a new rep through accessing the Rep Portal. They go to /portal, enter their assigned rep code, and land on their dashboard.
Cover: where to find their rep code (admin sends it), the difference between rep and partner roles, and the 12-hour session.
Stress that there is no password, the code IS their identity.`,
    routeHints: { portal_login: "/portal", portal_home: "/portal?tab=home" },
  },
  {
    slug: "daily-hustle",
    title: "Daily Hustle & Clocking In",
    summary: "Your daily checklist and the time clock.",
    scriptOutline: `Explain the Daily Hustle Card on the portal home, a list of recommended daily activities (calls, follow-ups, prospecting).
Then explain the Rep Clock Widget: clock in when you start working, clock out when done. Partners see your hourly efficiency, so being honest matters.
Encourage clocking in even for short bursts so the data is real.`,
    routeHints: { portal_home: "/portal?tab=home" },
  },
  {
    slug: "leads-board",
    title: "Working the Leads Board",
    summary: "Adding leads, moving statuses, the game plan.",
    scriptOutline: `Cover the Leads Board: how to add a new lead, status options (new, contacted, qualified, proposal, won, lost), and why discipline matters.
Explain that every lead can generate an AI Lead Game Plan, a step-by-step playbook generated from the lead's website + notes.
Tell reps to add EVERY conversation as a lead, even cold ones, so the company has the pipeline visibility.`,
    routeHints: { portal_leads: "/portal?tab=leads" },
  },
  {
    slug: "sales-coach",
    title: "Using the AI Sales Coach",
    summary: "Live chat with an AI trained on Aetheris messaging.",
    scriptOutline: `Introduce the Sales Coach Chat, an always-on AI trained on Aetheris positioning, the Leak Audit method, objection handlers, and forensic vocabulary.
Use cases: "How do I respond to 'we already have a marketing person?'", "Draft me a follow-up for a CFO who ghosted", "What's the script for the Leak Audit pitch?"
Encourage using it before every important call.`,
    routeHints: { portal_coach: "/portal?tab=coach" },
  },
  {
    slug: "company-calendar",
    title: "Company Calendar & Events",
    summary: "Where to find team events, training sessions, and important dates.",
    scriptOutline: `Explain the Company Calendar tab, month/week/list views of team-wide events: training sessions, sales meetings, deadlines, holidays.
Reps cannot edit it but should check it daily. Admins post all important dates here.`,
    routeHints: { portal_calendar: "/portal?tab=calendar" },
  },
  {
    slug: "forecast",
    title: "Forecast Center",
    summary: "Your personal pipeline forecast.",
    scriptOutline: `Cover the Forecast Center: it auto-rolls your leads-board into projected revenue using the company-wide stage probabilities.
Reps see: this-week, this-month, this-quarter forecast. Encourage updating lead amounts honestly, bloated forecasts kill trust.`,
    routeHints: { portal_forecast: "/portal?tab=forecast", portal_leads: "/portal?tab=leads" },
  },
  {
    slug: "tools-tour",
    title: "The Tools Tab, Your Sales Arsenal",
    summary: "All-In-One generator, Image Studio, Playbooks.",
    scriptOutline: `Tour the Tools tab. Highlight the All-In-One Generator (paste any prospect's URL, get a full content + sales kit), Image Studio (generate branded prospect graphics), Playbook Browser (pre-written scripts and frameworks).
These tools are the unfair advantage, use them BEFORE every prospect call.`,
    routeHints: { portal_tools: "/portal?tab=tools", portal_playbook: "/portal?tab=playbook" },
  },
  {
    slug: "training-quizzes",
    title: "Training Quizzes & The AI Q&A",
    summary: "How to take quizzes and ask the AI questions.",
    scriptOutline: `Explain the existing Training tab: each training has a quiz (multiple choice or open-ended AI-graded). Pass = above the threshold.
Also explain the Q&A, ask any question and get an AI answer plus the option to escalate to admin.
Recommend completing all required trainings in the first week.`,
    routeHints: { portal_training: "/portal?tab=training" },
  },
  {
    slug: "team-messages",
    title: "Team Message Board",
    summary: "How the team communicates.",
    scriptOutline: `Explain the Team Message Board: post wins, ask the team a question, share a competitor intel drop. Admins post company-wide updates here.
Etiquette: keep it focused on sales/clients, no off-topic chatter, tag people by name.`,
    routeHints: { portal_messages: "/portal?tab=messages" },
  },
  {
    slug: "documents-playbook",
    title: "Documents & Playbook Reference",
    summary: "Where to find sales collateral.",
    scriptOutline: `Cover the Documents panel, all sales decks, one-pagers, case files, and pricing PDFs in one place.
Then cover the Playbook tab, written scripts, objection handlers, vertical-specific angles. Bookmark these.`,
    routeHints: { portal_documents: "/portal?tab=documents", portal_playbook: "/portal?tab=playbook" },
  },
  {
    slug: "next-steps",
    title: "Your First Week, Action Plan",
    summary: "What to do in the next 7 days.",
    scriptOutline: `Close out the curriculum with a 7-day action plan:
Day 1: Clock in, complete Welcome + Login modules, add 5 leads.
Day 2-3: Watch remaining onboarding videos, take all training quizzes.
Day 4-5: Run the All-In-One on 10 prospects, generate AI Game Plans, make 20 calls.
Day 6-7: Post your first wins/losses to the Team Board, ask the AI Coach 5 real questions.
End motivational: "You've got the same tools as everyone here. Use them."`,
    routeHints: { portal_home: "/portal?tab=home", portal_leads: "/portal?tab=leads", portal_training: "/portal?tab=training" },
  },
];
