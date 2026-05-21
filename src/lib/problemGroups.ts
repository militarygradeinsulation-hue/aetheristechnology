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
    problem: "I'm about to hire and I can't afford to get it wrong.",
    symptom: "The last bad hire cost you $40K and three months of sideways energy. You want to know before the offer.",
    tools: [
      { thumbnail: resumeForensicsThumb, title: 'Resume Forensics', solves: 'Turns a resume into a case file: fit score, red flags, and the interview questions that expose them.', path: '/resume-forensics' },
    ],
  },
];
