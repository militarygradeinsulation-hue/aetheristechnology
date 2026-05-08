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
    summary: "Who we are, what we sell, and how the commission split works.",
    scriptOutline: `Welcome a brand-new sales rep to Aetheris Technology, a Business Forensics operator based in Indianapolis.
Cover: positioning ("Your business is leaking. You just can't see it from the inside."), our flagship offer (the Forensic Diagnostic at $2,500 flat applied toward engagement), and the locked 70/15/15 commission split (Company 70 / Rep 15 / Partner 15) on every sale including recurring.
Tone: blunt, operator, not corporate. End by telling them the next module covers logging in.`,
    routeHints: { home: "/", leak_audit: "/leak-audit", services: "/services" },
  },
  {
    slug: "logging-in",
    title: "Logging Into the Rep Portal",
    summary: "How to access your portal with your rep code.",
    scriptOutline: `Walk a new rep through accessing the Rep Portal. They go to /portal, enter their assigned rep code, and land on their dashboard.
Cover: where to find their rep code (admin sends it), the difference between rep and partner roles, and the 12-hour session.
Stress that there is no password — the code IS their identity.`,
    routeHints: { portal_login: "/portal", portal_home: "/portal?tab=home" },
  },
  {
    slug: "daily-hustle",
    title: "Daily Hustle & Clocking In",
    summary: "Your daily checklist and the time clock.",
    scriptOutline: `Explain the Daily Hustle Card on the portal home — a list of recommended daily activities (calls, follow-ups, prospecting).
Then explain the Rep Clock Widget: clock in when you start working, clock out when done. Partners see your hourly efficiency, so being honest matters.
Encourage clocking in even for short bursts so the data is real.`,
    routeHints: { portal_home: "/portal?tab=home" },
  },
  {
    slug: "leads-board",
    title: "Working the Leads Board",
    summary: "Adding leads, moving statuses, the game plan.",
    scriptOutline: `Cover the Leads Board: how to add a new lead, status options (new, contacted, qualified, proposal, won, lost), and why discipline matters.
Explain that every lead can generate an AI Lead Game Plan — a step-by-step playbook generated from the lead's website + notes.
Tell reps to add EVERY conversation as a lead, even cold ones, so the company has the pipeline visibility.`,
    routeHints: { portal_leads: "/portal?tab=leads" },
  },
  {
    slug: "sales-coach",
    title: "Using the AI Sales Coach",
    summary: "Live chat with an AI trained on Aetheris messaging.",
    scriptOutline: `Introduce the Sales Coach Chat — an always-on AI trained on Aetheris positioning, the Leak Audit method, objection handlers, and forensic vocabulary.
Use cases: "How do I respond to 'we already have a marketing person?'", "Draft me a follow-up for a CFO who ghosted", "What's the script for the Leak Audit pitch?"
Encourage using it before every important call.`,
    routeHints: { portal_coach: "/portal?tab=coach" },
  },
  {
    slug: "company-calendar",
    title: "Company Calendar & Events",
    summary: "Where to find team events, training sessions, and important dates.",
    scriptOutline: `Explain the Company Calendar tab — month/week/list views of team-wide events: training sessions, sales meetings, deadlines, holidays.
Reps cannot edit it but should check it daily. Admins post all important dates here.`,
    routeHints: { portal_calendar: "/portal?tab=calendar" },
  },
  {
    slug: "forecast",
    title: "Forecast Center",
    summary: "Your personal pipeline forecast.",
    scriptOutline: `Cover the Forecast Center: it auto-rolls your leads-board into projected revenue using the company-wide stage probabilities.
Reps see: this-week, this-month, this-quarter forecast. Encourage updating lead amounts honestly — bloated forecasts kill trust.`,
    routeHints: { portal_forecast: "/portal?tab=forecast", portal_leads: "/portal?tab=leads" },
  },
  {
    slug: "tools-tour",
    title: "The Tools Tab — Your Sales Arsenal",
    summary: "All-In-One generator, Image Studio, Playbooks.",
    scriptOutline: `Tour the Tools tab. Highlight the All-In-One Generator (paste any prospect's URL, get a full content + sales kit), Image Studio (generate branded prospect graphics), Playbook Browser (pre-written scripts and frameworks).
These tools are the unfair advantage — use them BEFORE every prospect call.`,
    routeHints: { portal_tools: "/portal?tab=tools", portal_playbook: "/portal?tab=playbook" },
  },
  {
    slug: "training-quizzes",
    title: "Training Quizzes & The AI Q&A",
    summary: "How to take quizzes and ask the AI questions.",
    scriptOutline: `Explain the existing Training tab: each training has a quiz (multiple choice or open-ended AI-graded). Pass = above the threshold.
Also explain the Q&A — ask any question and get an AI answer plus the option to escalate to admin.
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
    scriptOutline: `Cover the Documents panel — all sales decks, one-pagers, case files, and pricing PDFs in one place.
Then cover the Playbook tab — written scripts, objection handlers, vertical-specific angles. Bookmark these.`,
    routeHints: { portal_documents: "/portal?tab=documents", portal_playbook: "/portal?tab=playbook" },
  },
  {
    slug: "next-steps",
    title: "Your First Week — Action Plan",
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
