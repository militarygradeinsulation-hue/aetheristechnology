// New-Rep 14-Day Blueprint.
// Day-by-day plan reps see when they log into the portal for the first time.
// Day 1 = the day their code was first used to log in (first_login_at on rep_codes).

export interface BlueprintTask {
  id: string;
  label: string;
  detail?: string;
  /** Optional deep-link route (?tab=...) inside the portal. */
  link?: string;
}

export interface BlueprintDay {
  day: number;            // 1..14
  title: string;
  focus: string;          // one-line theme
  tasks: BlueprintTask[];
}

export const NEW_REP_BLUEPRINT: BlueprintDay[] = [
  {
    day: 1,
    title: "Day 1 — Set up the operator",
    focus: "Get your portal, identity, and pay rails ready before you sell anything.",
    tasks: [
      { id: "d1-read-playbook", label: "Read the Rep-Operator Playbook end-to-end", link: "/portal?tab=documents" },
      { id: "d1-tour-tabs", label: "Click every tab in your portal at least once" },
      { id: "d1-set-email", label: "Confirm your portal email + payout channel works", link: "/portal?tab=overview" },
      { id: "d1-clock-in", label: "Practice clock-in / clock-out once on the Time Clock" },
    ],
  },
  {
    day: 2,
    title: "Day 2 — Memorize the offer",
    focus: "If you can't explain the Diagnostic in 60 seconds, you can't sell it.",
    tasks: [
      { id: "d2-pricing", label: "Read the Catalog + flagship pricing twice", link: "/portal?tab=catalog" },
      { id: "d2-commission", label: "Read the Commission Calculator math", link: "/portal?tab=commissions" },
      { id: "d2-record-pitch", label: "Record yourself pitching the Diagnostic in 60 seconds" },
    ],
  },
  {
    day: 3,
    title: "Day 3 — Sharpen the voice",
    focus: "Forensic operator tone. No fluff, no influencer.",
    tasks: [
      { id: "d3-voice", label: "Read the LinkedIn Voice Playbook", link: "/portal?tab=documents" },
      { id: "d3-coach-1", label: "Run one mock pitch with the AI Sales Coach", link: "/portal?tab=coach" },
      { id: "d3-fix-pitch", label: "Re-record your 60-second pitch with the corrections" },
    ],
  },
  {
    day: 4,
    title: "Day 4 — Pipe the leads in",
    focus: "Start filling the funnel.",
    tasks: [
      { id: "d4-linkedin", label: "Complete the LinkedIn setup checklist", link: "/portal?tab=linkedin" },
      { id: "d4-connect-25", label: "Send 25 targeted LinkedIn connection requests" },
      { id: "d4-cta-link", label: "Post your /leak-audit link to your profile bio" },
    ],
  },
  {
    day: 5,
    title: "Day 5 — Run your first scan",
    focus: "Use the tool on a real prospect before you ever call them.",
    tasks: [
      { id: "d5-scan-1", label: "Run a free website leak scan on a real prospect", link: "/scan" },
      { id: "d5-leads", label: "Log that prospect into your Leads board with notes", link: "/portal?tab=leads" },
      { id: "d5-followup", label: "Generate a follow-up plan and send the opener", link: "/follow-up-plan" },
    ],
  },
  {
    day: 6,
    title: "Day 6 — First five outreach touches",
    focus: "Pick five leaks. Send five operator-style messages.",
    tasks: [
      { id: "d6-scan-5", label: "Run scans on 5 prospects" },
      { id: "d6-touch-5", label: "Send 5 personalized outreach messages (forensic tone, no pitch)" },
      { id: "d6-track", label: "Log each touch in the Leads board" },
    ],
  },
  {
    day: 7,
    title: "Day 7 — Review week 1",
    focus: "Read what worked. Cut what didn't.",
    tasks: [
      { id: "d7-review", label: "Re-read every reply you got. Look for what struck a nerve" },
      { id: "d7-coach-review", label: "Bring 2 replies to the AI Sales Coach for breakdown", link: "/portal?tab=coach" },
      { id: "d7-rest", label: "Take a real rest block. Operators don't grind themselves dull" },
    ],
  },
  {
    day: 8,
    title: "Day 8 — Book the first call",
    focus: "Move someone from chat to calendar.",
    tasks: [
      { id: "d8-book", label: "Get 1 prospect to accept a 15-minute call this week" },
      { id: "d8-prep", label: "Build a leak case file for that prospect before the call" },
      { id: "d8-calendar", label: "Block prep time on your calendar", link: "/portal?tab=calendar" },
    ],
  },
  {
    day: 9,
    title: "Day 9 — Run the call",
    focus: "Talk leaks. Don't talk yourself.",
    tasks: [
      { id: "d9-run-call", label: "Run the discovery call using the operator script" },
      { id: "d9-recap", label: "Send a same-day written recap with the 3 worst leaks" },
      { id: "d9-quote", label: "If the leak is big enough, quote the Diagnostic" },
    ],
  },
  {
    day: 10,
    title: "Day 10 — Stack outreach",
    focus: "Volume + accuracy.",
    tasks: [
      { id: "d10-scan-10", label: "Run 10 more scans" },
      { id: "d10-touch-10", label: "Send 10 outreach messages, no two the same" },
      { id: "d10-followup", label: "Follow up on every week-1 lead that went quiet" },
    ],
  },
  {
    day: 11,
    title: "Day 11 — Use the tools on yourself",
    focus: "If you can't run them on you, you can't run them for a client.",
    tasks: [
      { id: "d11-brand", label: "Run the Brand Contradictions tool on your own LinkedIn", link: "/brand-contradictions" },
      { id: "d11-friction", label: "Run the Friction Audit on your booking link", link: "/friction-audit" },
      { id: "d11-fix", label: "Fix the top 2 problems you found in yourself" },
    ],
  },
  {
    day: 12,
    title: "Day 12 — Close attempt #1",
    focus: "Ask for the money. Cleanly.",
    tasks: [
      { id: "d12-ask", label: "Ask 1 qualified prospect to start the Diagnostic this week" },
      { id: "d12-objection", label: "Log every objection word-for-word in your notes" },
      { id: "d12-coach-obj", label: "Run those objections through the AI Sales Coach", link: "/portal?tab=coach" },
    ],
  },
  {
    day: 13,
    title: "Day 13 — Build the rhythm",
    focus: "Lock in a daily cadence you can run every week.",
    tasks: [
      { id: "d13-cadence", label: "Pick your daily numbers: scans / touches / follow-ups" },
      { id: "d13-block", label: "Block those numbers into your calendar as recurring", link: "/portal?tab=calendar" },
      { id: "d13-share", label: "Post the cadence in Team Chat and ask for accountability", link: "/portal?tab=team" },
    ],
  },
  {
    day: 14,
    title: "Day 14 — Graduate",
    focus: "Two-week review. Then run the engine without the blueprint.",
    tasks: [
      { id: "d14-numbers", label: "Tally your 14-day numbers: scans, touches, calls, quotes" },
      { id: "d14-wins", label: "Pick the one move that produced the most response. Double it" },
      { id: "d14-checkin", label: "Send Joseph a 5-line check-in: wins, losses, next 14 days" },
    ],
  },
];

export function blueprintDayForRep(firstLoginIso: string | null | undefined, nowMs = Date.now()): number {
  if (!firstLoginIso) return 1;
  const start = new Date(firstLoginIso).getTime();
  if (!Number.isFinite(start)) return 1;
  const dayMs = 24 * 60 * 60 * 1000;
  // Calendar-style day counting, Day 1 = first login day.
  const startMid = new Date(start);
  startMid.setHours(0, 0, 0, 0);
  const now = new Date(nowMs);
  now.setHours(0, 0, 0, 0);
  const diff = Math.floor((now.getTime() - startMid.getTime()) / dayMs);
  return Math.max(1, diff + 1);
}

export function totalBlueprintDays(): number {
  return NEW_REP_BLUEPRINT.length;
}
