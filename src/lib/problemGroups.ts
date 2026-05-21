import blogThumb from '@/assets/blog-thumb.jpg';
import playbooksThumb from '@/assets/playbooks-thumb.jpg';
import diagnosticThumb from '@/assets/diagnostic-thumb.jpg';
import scannerThumb from '@/assets/scanner-thumb.jpg';
import contentGenThumb from '@/assets/content-generator-thumb.jpg';
import salesScriptsThumb from '@/assets/sales-scripts-thumb.jpg';
import contentCalendarThumb from '@/assets/content-calendar-thumb.jpg';
import followUpThumb from '@/assets/follow-up-plan-thumb.jpg';
import strategicQuestionsThumb from '@/assets/strategic-questions-thumb.jpg';
import brandContradictionsThumb from '@/assets/brand-contradictions-thumb.jpg';
import frictionAuditThumb from '@/assets/friction-audit-thumb.jpg';
import resumeForensicsThumb from '@/assets/resume-forensics-thumb.jpg';

export interface Tool {
  thumbnail: string;
  title: string;
  solves: string;
  path: string;
}

export interface ProblemGroup {
  problem: string;
  symptom: string;
  tools: Tool[];
}

export const problemGroups: ProblemGroup[] = [
  {
    problem: "I don't know where the business is actually leaking money.",
    symptom: "Revenue feels stuck. The numbers look fine on paper but cash is tight and you can't point at why.",
    tools: [
      { thumbnail: diagnosticThumb, title: 'Business Diagnostic', solves: 'Scores 20 operational pressure points so you can see, in writing, what your gut already knows.', path: '/business-diagnostic' },
      { thumbnail: scannerThumb, title: 'Website Scanner', solves: 'Finds the SEO, speed, and conversion leaks killing your inbound before leads ever call.', path: '/scan' },
      { thumbnail: strategicQuestionsThumb, title: 'Strategic Question Engine', solves: "Surfaces the blind spots your team won't name and you've stopped asking.", path: '/strategic-questions' },
    ],
  },
  {
    problem: "My brand is saying one thing and signaling another.",
    symptom: "You've spent money on the site and the content, but prospects still treat you like a vendor — not a peer.",
    tools: [
      { thumbnail: brandContradictionsThumb, title: 'Brand Contradiction Finder', solves: 'Shows where your brand promises authority but your copy quietly says the opposite.', path: '/brand-contradictions' },
      { thumbnail: frictionAuditThumb, title: 'Friction Vocabulary Audit', solves: 'Pinpoints the exact words on your site that are leaking trust and pricing power.', path: '/friction-audit' },
    ],
  },
  {
    problem: "Leads come in, then go cold. Sales is a guessing game.",
    symptom: "Your team can't tell you why deals stall. Follow-up is whoever remembers. Pipeline is a feeling, not a number.",
    tools: [
      { thumbnail: salesScriptsThumb, title: 'Sales Script Generator', solves: 'Gives reps real opening lines, objection handlers, and follow-ups built for your offer.', path: '/sales-scripts' },
      { thumbnail: followUpThumb, title: 'Follow-Up System Plan', solves: "A 14-day multi-channel cadence so no lead dies in someone's inbox again.", path: '/follow-up-plan' },
    ],
  },
  {
    problem: "I'm tired of staring at a blank page trying to post something.",
    symptom: "You know visibility matters. You also know you'll never write a content calendar at 11pm on a Sunday.",
    tools: [
      { thumbnail: contentGenThumb, title: 'Social Content Generator', solves: 'Scans your site and produces 25 ready-to-post pieces in your voice.', path: '/content-generator' },
      { thumbnail: contentCalendarThumb, title: '30-Day Content Calendar', solves: 'Daily post ideas, hooks, and topics built around your industry — no blank page.', path: '/content-calendar' },
      { thumbnail: blogThumb, title: 'Free Blog Articles', solves: 'Operator-written field notes on AI, ops, and growth — steal what works.', path: '/blog' },
      { thumbnail: playbooksThumb, title: 'Free Playbooks', solves: 'Step-by-step guides you can hand a team member and run today.', path: '/resources' },
    ],
  },
  {
    problem: "I keep paying experts and walking away worse off than I started.",
    symptom: "Every consultant sells you a deck. Nobody puts a dollar number on anything, and nobody touches the work.",
    tools: [
      { thumbnail: diagnosticThumb, title: 'Forensic Diagnostic ($2,500)', solves: 'Flat fee. Operator-led. A written leak ledger with a dollar amount on every wound — credit applies to any engagement.', path: '/leak-audit' },
      { thumbnail: strategicQuestionsThumb, title: 'Strategic Question Engine', solves: "Asks the questions a real operator would, before you write another check to a 'strategist.'", path: '/strategic-questions' },
    ],
  },
  {
    problem: "I'm the bottleneck. Nothing moves unless I touch it.",
    symptom: "You wanted a business. You built a job that pays worse and never clocks out. Vacations are a lie.",
    tools: [
      { thumbnail: diagnosticThumb, title: 'Business Diagnostic', solves: 'Names every decision still routed through you — and the ones you can hand off Monday.', path: '/business-diagnostic' },
      { thumbnail: followUpThumb, title: 'Follow-Up System Plan', solves: 'Takes sales follow-up off your plate with a cadence the team runs without you.', path: '/follow-up-plan' },
      { thumbnail: playbooksThumb, title: 'Free Playbooks', solves: 'SOPs you can hand a team member today so the work stops waiting on you.', path: '/resources' },
    ],
  },
  {
    problem: "My tech stack is a junk drawer of subscriptions doing nothing.",
    symptom: "You're paying for tools nobody opens. Your CRM is half-built. Reports take a person, not a system.",
    tools: [
      { thumbnail: scannerThumb, title: 'Website Scanner', solves: 'Audits the public-facing tech stack — speed, SEO, broken signals — in 30 seconds.', path: '/scan' },
      { thumbnail: diagnosticThumb, title: 'Business Diagnostic', solves: 'Maps your tooling spend against actual usage and flags what to kill.', path: '/business-diagnostic' },
    ],
  },
  {
    problem: "I haven't taken a real weekend in two years and I'm running out of gas.",
    symptom: "The work isn't the problem anymore — the carrying it is. You can't remember the last Saturday you didn't check email.",
    tools: [
      { thumbnail: diagnosticThumb, title: 'Forensic Diagnostic ($2,500)', solves: 'Hand the audit to an operator. Get a written ledger back. Stop being the smartest person in your own room.', path: '/leak-audit' },
      { thumbnail: frictionAuditThumb, title: 'Friction Vocabulary Audit', solves: 'Strips the words on your site that quietly invite tire-kickers into your inbox.', path: '/friction-audit' },
    ],
  },
];

