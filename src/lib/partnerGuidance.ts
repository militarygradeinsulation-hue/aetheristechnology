// COO / Partner (Braden) coach tips — plain-English guidance that appears
// at the top of his portal tabs so he always knows WHAT a screen is for,
// WHY it matters, WHEN to act, and HOW to do the next step.

export type GuidanceStep = {
  title: string;
  why: string;       // Why this step matters
  when: string;      // Timing / trigger
  how: string;       // How to do it (click path / action)
  pro?: string;      // Optional pro tip
};

export type GuidanceBlock = {
  headline: string;
  intro: string;
  steps: GuidanceStep[];
};

// Keyed by PortalPage Tab id
export const PARTNER_GUIDANCE: Record<string, GuidanceBlock> = {
  careers: {
    headline: "Applicant Pipeline — How to run it",
    intro:
      "This is where every new rep candidate lands after they pass the assessment. Your job here is to triage: who is real, who is fast, who is worth your hour.",
    steps: [
      {
        title: "1. Read the score & answers first",
        why: "Score tells you brainpower; the written answers tell you voice. We hire voice over GPA — a 78% with hungry answers beats a 95% with corporate jargon.",
        when: "Within 24 hours of the applicant appearing. Speed signals seriousness on both sides.",
        how: "Click the applicant row → review score, then expand 'Answers' and read every short-answer field.",
        pro: "If they used the word 'leak', 'leverage', or quoted a number — flag them. They're already speaking our language.",
      },
      {
        title: "2. Move qualified applicants to Interviews",
        why: "Moving them creates a shared record with Joseph and starts the clue trail. Anything left in Applicants is invisible to the rest of the system.",
        when: "Immediately after deciding 'yes, worth a call'. Don't sit on it overnight — momentum dies fast.",
        how: "On the applicant row click 'Move to Interviews'. They show up in the Interviews tab automatically.",
        pro: "If you're a maybe, move them anyway and mark the interview as 'screening'. Better to talk for 10 min than to ghost a future closer.",
      },
      {
        title: "3. Never delete — always archive with a reason",
        why: "Rejections become training data. Joseph reviews them weekly to tune the assessment questions.",
        when: "When you're a hard no.",
        how: "Click 'Archive' and pick a reason from the dropdown (tone, experience, fit, etc.).",
      },
    ],
  },

  interviews: {
    headline: "Interviews — Schedule, run, decide",
    intro:
      "Every applicant you moved over lives here. This tab is the single source of truth for who is being talked to, when, and what happened.",
    steps: [
      {
        title: "1. Schedule within 48 hours of moving them",
        why: "The applicant's excitement decays by ~30% per day. By day 3 your reply rate is half. Speed is the cheapest closing tactic we have.",
        when: "Same day you move them from Applicants. Don't 'get to it tomorrow'.",
        how: "Open the interview card → set Date/Time → paste a Google Meet or Zoom link in 'Meeting link' → Save.",
        pro: "Always offer two specific slots in your invite email, not 'when works?'. Decisions made for them = faster yeses.",
      },
      {
        title: "2. Pick the right interviewer",
        why: "'Braden' = you screen alone (fast, vibe check). 'Both' = you + Joseph, used for finalists. 'Admin' = Joseph runs it. Mis-tagging this confuses the calendar sync.",
        when: "At scheduling time. Default to 'Braden' for screens, 'Both' for final round.",
        how: "Use the Interviewer dropdown on the card.",
      },
      {
        title: "3. Run the call from the Interview Briefing tab",
        why: "Briefing has the 30-second opener, scorecard, and the 5 must-ask questions. Reps you hire after using the briefing close 2x more often than reps hired off vibes.",
        when: "Open Interview Briefing tab in a second window BEFORE you click the meeting link.",
        how: "Portal → Interview Briefing → keep it open during the call.",
      },
      {
        title: "4. Mark the outcome the moment the call ends",
        why: "If you wait, you forget the gut feeling. The gut feeling is 80% of the signal.",
        when: "Within 5 minutes of hanging up.",
        how: "On the interview card click Passed / Rejected / Schedule follow-up. Add a 1-line note.",
        pro: "'Passed' auto-creates an onboarding task for Joseph. You don't need to ping him.",
      },
    ],
  },

  leads: {
    headline: "Leads Board — Your forensic case files",
    intro:
      "Every prospect is a case. The board is your war room. Active Lead context flows from here into every tool — pick one before you open the workbench.",
    steps: [
      {
        title: "1. Expand a lead to make it 'Active'",
        why: "When a lead is active, the workbench tools auto-fill their URL, business, and industry. No more retyping. Every action also writes to that lead's clue trail.",
        when: "Before you open ANY tool. If no lead is active, the tools are guessing.",
        how: "Click a lead row → it expands → an 'Active Lead' pill appears in the floating Workbench header.",
      },
      {
        title: "2. Read the Clues Trail before you touch them",
        why: "Shows every scan, email, tool run, and note from the whole team. Cold-calling someone Joseph already emailed twice is how you lose deals.",
        when: "Always before first contact, and every time you re-open the lead.",
        how: "Click the floating 🔍 icon next to the lead — full forever history.",
      },
      {
        title: "3. Run the All-in-One scan first contact",
        why: "It runs every diagnostic in 60 seconds and writes the findings to the clue trail. You walk into the call already armed.",
        when: "Before you send the first email or pick up the phone.",
        how: "Open Workbench → Diagnostics → All-in-One → it auto-fills from the active lead.",
      },
    ],
  },

  tools: {
    headline: "Sales Tools — Why each one exists",
    intro:
      "Tools are grouped by what they DO for the deal: Outreach (open it), Diagnostics (qualify it), Content (warm it up). Use them in that order on cold leads.",
    steps: [
      {
        title: "Cold lead workflow",
        why: "Scan → Script → Send → Follow-Up Plan. Doing them out of order means you pitch before you have ammo.",
        when: "Every brand new prospect.",
        how: "1) Website Scanner → 2) Sales Script Generator (paste the scan summary in) → 3) Send → 4) Follow-Up Plan for the cadence.",
        pro: "Quote the top dollar-leak from the scan in your subject line. Devastating open rates.",
      },
      {
        title: "Warm lead workflow",
        why: "They already replied. Now you need to deepen, not pitch. Discovery questions > more pitching.",
        when: "After any positive reply.",
        how: "1) Strategic Question Engine → 2) Business Diagnostic Quiz (send as 'free $2,500 preview') → 3) Book the call.",
      },
      {
        title: "Stalled lead workflow",
        why: "Dead deals come back with a new angle, not a 'just checking in'. The post analyst and contradiction finder give you that angle.",
        when: "When a lead has gone silent 7+ days.",
        how: "1) Business Post Analyst on their latest LinkedIn post → 2) Brand Contradiction Finder → 3) Send the contradiction as the subject line.",
      },
    ],
  },

  forecast: {
    headline: "Forecast Center — Where you spend Monday morning",
    intro:
      "This is your COO dashboard. You're not just looking at money — you're looking at where the team is leaking momentum.",
    steps: [
      {
        title: "1. Check stalled deals first, not totals",
        why: "Totals are vanity. Stalled deals are reality. A rep with $0 closed and 8 active deals is healthy; a rep with $5k closed and 0 active is about to ghost.",
        when: "Every Monday before standup.",
        how: "Filter by 'Stalled > 7 days' → call those reps before you call the leads.",
      },
      {
        title: "2. Use the AI tip on each rep card",
        why: "AI surfaces the one move that will most likely unstick them this week. Beats your gut about 60% of the time.",
        when: "Anytime a rep card shows the amber 💡 icon.",
        how: "Click the icon → read the tip → forward it to the rep in Team Chat.",
      },
    ],
  },

  company: {
    headline: "Company Portal — Your COO command center",
    intro:
      "Manage Reps, Partner Time, and full company forecast in one place. This is the only tab where you can actually CHANGE who is on the team.",
    steps: [
      {
        title: "Adjust commission tiers carefully",
        why: "Tier changes apply to FUTURE invoices, not past. But reps see it instantly and assume otherwise. Always announce in Team Chat the same day.",
        when: "Only after a documented performance review.",
        how: "Manage Reps → click rep → adjust tier → save → post in Team Chat.",
      },
      {
        title: "Log partner time honestly",
        why: "Your $/hour efficiency is the single number Joseph uses to justify your equity allocation. Pad it and you hurt yourself.",
        when: "End of every working day. Don't batch a week.",
        how: "Partner Time panel → Clock In / Out, or add a manual entry with a note.",
      },
    ],
  },

  coach: {
    headline: "AI Sales Coach — Your 24/7 sparring partner",
    intro:
      "Treat this like a junior strategist. It knows our playbook, our tone, and our methodology. Use it before any call you're nervous about.",
    steps: [
      {
        title: "Use it for objection prep, not generic advice",
        why: "It's been fed our LinkedIn voice playbook and forensic methodology. Generic prompts get generic answers.",
        when: "30 min before any call where you expect pushback.",
        how: "Paste: 'I'm calling [name] at [company]. They objected to [X] last time. Give me 3 forensic responses in our voice.'",
      },
    ],
  },

  briefing: {
    headline: "Interview Briefing — Open this DURING the interview",
    intro:
      "Not study material. Live cockpit. Keep it open in a second window the whole call.",
    steps: [
      {
        title: "1. Read the 30-second opener verbatim the first 5 interviews",
        why: "It frames Aetheris as operators, not consultants. If you wing the open, the candidate frames us wrong for the rest of the call.",
        when: "First 5 interviews. After that you'll have it memorized.",
        how: "Top section of the briefing tab.",
      },
      {
        title: "2. Use the scorecard live, not after",
        why: "Memory is liar. Scoring after the call inflates good candidates and shrinks bad ones.",
        when: "Score each section the moment that section ends in the call.",
        how: "Scorecard at the bottom → 1-5 sliders.",
      },
    ],
  },
};

export function getPartnerGuidance(tabId: string): GuidanceBlock | null {
  return PARTNER_GUIDANCE[tabId] || null;
}
