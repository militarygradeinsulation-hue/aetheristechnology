// Persona listicle landing pages ("/for/:slug").
//
// One template, many buyer personas. Each entry is built around the five parts
// of the conversion diamond so every page answers the same questions in that
// persona's own language:
//
//   Promise     -> headline / subheadline (what's in it for me)
//   Properties  -> the numbered reasons: where the leak is and what we build
//   Positioning -> why Aetheris is not another agency or software vendor
//   Proof       -> REAL_CASES ids (independent, published, source-linked)
//   Packaging   -> the offer, the steps, and the risk reversal
//
// Guardrails:
// - Proof only references sourced entries in src/data/realCaseStudies.ts.
//   Never add invented testimonials, review counts, or client results here.
// - CTAs point to the free self-scan and the booking page. These pages must
//   never trigger a Golden Report or forensic scan (see AGENTS.md).
// - Each persona carries matching ad variants so ad -> page message match is
//   kept in one place and can be exported for the ad account.

export type LeakArea =
  | 'Speed to lead'
  | 'Follow-up'
  | 'Website conversion'
  | 'Systems & CRM'
  | 'Customer retention'
  | 'Customer experience'
  | 'Brand & trust'
  | 'Marketing attribution'
  | 'Marketing'
  | 'Message alignment'
  | 'Messaging'
  | 'Lead quality'
  | 'Sales process'
  | 'Operations'
  | 'Strategy'
  | 'Search visibility'
  | 'Whole-business audit';

export interface PersonaReason {
  /** Short, scannable reason title written in the persona's words. */
  title: string;
  /** Two or three sentences describing the leak as they experience it. */
  body: string;
  /** Which part of the Aetheris audit finds it. */
  leakArea: LeakArea;
  /** What Aetheris builds to close it. */
  fix: string;
}

export interface PersonaAd {
  /** Angle name for the ad set, e.g. "Problem" or "Curiosity". */
  angle: string;
  /** First line / scroll stopper. */
  hook: string;
  /** Primary text body. */
  primaryText: string;
  /** Ad headline under the creative. */
  headline: string;
  /** Platform CTA button label. */
  cta: 'Learn More' | 'Get Offer' | 'Book Now' | 'Sign Up';
}

export interface PersonaFAQ {
  question: string;
  answer: string;
}

export interface PersonaListicle {
  slug: string;
  /** Who this page is for, short form ("Home service owners"). */
  persona: string;
  /** The one-line motivation the whole page is built around. */
  motivation: string;
  metaTitle: string;
  metaDescription: string;
  // Promise
  eyebrow: string;
  headline: string;
  subheadline: string;
  painHook: string;
  // Properties
  reasons: PersonaReason[];
  // Positioning
  notAnother: string[];
  instead: string;
  // Proof
  proofCaseIds: number[];
  // Packaging
  offerLine: string;
  faqs: PersonaFAQ[];
  // Ads that route to this page
  ads: PersonaAd[];
}

export const PERSONA_LISTICLES: PersonaListicle[] = [
  {
    slug: 'home-services',
    persona: 'Home service owners',
    motivation: 'Jobs are being lost between the first call and the signed estimate.',
    metaTitle: '7 Places Home Service Businesses Lose Jobs Before the Estimate',
    metaDescription:
      'HVAC, roofing, plumbing, and remodeling owners: find the missed calls, slow quotes, and dead estimates costing you booked jobs, then fix them with automation.',
    eyebrow: 'For HVAC, roofing, plumbing & remodeling owners',
    headline: '7 places your home service business is losing jobs before anyone sends a quote',
    subheadline:
      "You don't have a lead problem. You have a leak between the phone ringing and the estimate getting signed.",
    painHook:
      "The crew is busy, the phone keeps ringing, and somehow revenue is flat. That usually means jobs are slipping out after the call comes in: voicemails nobody returns, estimates nobody follows up on, and past customers nobody calls back.",
    reasons: [
      {
        title: 'After-hours calls go to voicemail and never come back',
        body: "Homeowners with a leak or a dead AC unit call the next company on the list. If the call isn't answered or returned in minutes, the job is usually gone.",
        leakArea: 'Speed to lead',
        fix: 'Missed-call text-back and an after-hours intake assistant that books the visit.',
      },
      {
        title: 'Estimates go out and then nothing happens',
        body: 'Most unsigned estimates are not a no. They are a homeowner who got busy. Without a follow-up sequence, the quote just sits there.',
        leakArea: 'Follow-up',
        fix: 'Automatic estimate follow-up by text and email until the customer says yes or no.',
      },
      {
        title: 'Your website looks fine but does not book anything',
        body: 'A phone number in the header and a contact form is not a booking path. Mobile visitors leave when the next step is not obvious.',
        leakArea: 'Website conversion',
        fix: 'A mobile-first request flow with instant confirmation and clear service-area answers.',
      },
      {
        title: 'Leads live in texts, notebooks, and three inboxes',
        body: 'When the office manager is out, nobody knows who called, what they needed, or who is supposed to call back.',
        leakArea: 'Systems & CRM',
        fix: 'One pipeline that captures every call, form, and text with an owner and a next step.',
      },
      {
        title: 'Past customers never hear from you again',
        body: 'Maintenance plans, seasonal tune-ups, and referrals come from people who already trust you. Most shops never ask.',
        leakArea: 'Customer retention',
        fix: 'Seasonal reminder and review-request campaigns that run on their own.',
      },
      {
        title: 'Reviews are great, but nobody sees them where they decide',
        body: 'Five stars on Google do nothing if the quote page, the follow-up email, and the website never show them.',
        leakArea: 'Brand & trust',
        fix: 'Review proof placed at every decision point, from the first page to the signed estimate.',
      },
      {
        title: 'You are guessing which marketing actually books jobs',
        body: 'Without tracking from source to signed job, you keep paying for the channels that feel busy instead of the ones that pay.',
        leakArea: 'Marketing attribution',
        fix: 'Source tracking from first call to closed job so spend follows real revenue.',
      },
    ],
    notAnother: [
      'Another lead-gen vendor selling you more leads to drop',
      'A website redesign that looks nice and books nothing new',
      'Software you have to learn, set up, and babysit yourself',
    ],
    instead:
      'Aetheris finds where booked jobs are leaking out of the business you already have, then builds the follow-up, intake, and tracking systems that plug it.',
    proofCaseIds: [26, 45, 18],
    offerLine: 'Start with a free leak self-scan of your site and lead flow. No call required.',
    faqs: [
      {
        question: 'Do I need to replace my field service software?',
        answer:
          'Usually not. Most fixes connect to the tools you already use. We only recommend a replacement when the current tool is the leak.',
      },
      {
        question: 'Will automated texts annoy my customers?',
        answer:
          'Follow-up is written in your voice, timed around the job, and stops as soon as the customer replies or books.',
      },
    ],
    ads: [
      {
        angle: 'Problem',
        hook: 'Your phone is ringing. So why is revenue flat?',
        primaryText:
          'Most home service businesses do not have a lead problem. They lose jobs after the call: missed callbacks, estimates nobody follows up on, past customers nobody calls. Here are the 7 places it usually happens.',
        headline: '7 places home service jobs leak out',
        cta: 'Learn More',
      },
      {
        angle: 'Estimate follow-up',
        hook: 'That unsigned estimate is probably not a no.',
        primaryText:
          'Homeowners get busy. Without follow-up, good quotes just sit there. See where your business is leaking booked jobs, then let us build the system that closes them.',
        headline: 'Stop losing jobs after the quote',
        cta: 'Get Offer',
      },
    ],
  },
  {
    slug: 'ad-spend-no-sales',
    persona: 'Owners paying for ads that do not turn into sales',
    motivation: 'The ads are producing leads, but the leads are not producing revenue.',
    metaTitle: '7 Reasons Your Ads Make Leads but Not Sales',
    metaDescription:
      'Paying for ads that bring leads but not revenue? Find where leads go cold between the click and the close, then fix the follow-up, routing, and tracking.',
    eyebrow: 'For owners spending real money on ads',
    headline: '7 reasons your ads bring in leads but not sales',
    subheadline: 'The leak is rarely the ad. It is everything that happens after the form is submitted.',
    painHook:
      "The agency report says cost per lead looks great. The bank account disagrees. Somewhere between the click and the close, leads are going cold, and nobody is accountable for that gap.",
    reasons: [
      {
        title: 'Nobody calls the lead back for hours',
        body: 'Leads cool fast. A lead that waits until tomorrow has often already talked to someone else.',
        leakArea: 'Speed to lead',
        fix: 'Instant lead alerts, auto-routing, and a first response that goes out in seconds.',
      },
      {
        title: 'The landing page promises something the sales call does not',
        body: 'When the ad says one thing and the conversation says another, trust drops and the lead stops answering.',
        leakArea: 'Message alignment',
        fix: 'Ads, landing pages, and sales scripts rebuilt around the same promise.',
      },
      {
        title: 'One follow-up attempt, then silence',
        body: 'Most teams try once or twice. Most buyers need more touches than that before they are ready to talk.',
        leakArea: 'Follow-up',
        fix: 'A multi-touch nurture sequence across text, email, and calls that runs without reminders.',
      },
      {
        title: 'You optimize for cheap leads instead of paying customers',
        body: 'If the ad platform never learns which leads closed, it keeps finding more of the wrong people.',
        leakArea: 'Marketing attribution',
        fix: 'Closed-deal data sent back to the ad platforms so they target buyers, not form fillers.',
      },
      {
        title: 'Junk and duplicate leads waste sales time',
        body: 'Fake numbers, repeat submissions, and tire kickers eat the hours your team should spend on real buyers.',
        leakArea: 'Lead quality',
        fix: 'Lead validation and scoring before anything reaches a salesperson.',
      },
      {
        title: 'Every visitor gets the same generic page',
        body: 'A first-time visitor, a price shopper, and a ready buyer all need different next steps. One page cannot serve all three.',
        leakArea: 'Website conversion',
        fix: 'Persona-matched landing pages so each audience lands on a page written for them.',
      },
      {
        title: 'Nobody owns the number between lead and revenue',
        body: 'Marketing owns leads. Sales owns deals. The handoff in between is where money disappears.',
        leakArea: 'Sales process',
        fix: 'One shared pipeline view with clear handoff rules and weekly leak reporting.',
      },
    ],
    notAnother: [
      'Another agency promising cheaper leads',
      'A dashboard full of vanity metrics',
      'More budget poured into a funnel that already leaks',
    ],
    instead:
      'Aetheris audits the whole path from ad click to closed deal, shows where the money is leaking, and builds the follow-up and tracking systems that turn the leads you already pay for into revenue.',
    proofCaseIds: [7, 11, 2],
    offerLine: 'Run the free leak self-scan and see where your funnel drops leads before you spend another dollar.',
    faqs: [
      {
        question: 'Will you replace my ad agency?',
        answer:
          'Not necessarily. We usually work around the agency, fixing what happens after the lead arrives, which is where most of the loss is.',
      },
      {
        question: 'What if my leads really are bad?',
        answer:
          'Then the audit will show it, and we fix the targeting signal by feeding closed-deal data back to the ad platforms.',
      },
    ],
    ads: [
      {
        angle: 'Problem',
        hook: 'Great cost per lead. Terrible revenue.',
        primaryText:
          'If your ads bring in leads but not sales, the problem is usually not the ad. It is the follow-up, the handoff, and the tracking after the click. Here are the 7 places it breaks.',
        headline: 'Why your ads make leads, not sales',
        cta: 'Learn More',
      },
      {
        angle: 'Speed',
        hook: 'How long does your team take to call a new lead back?',
        primaryText:
          'Leads cool fast. Find out where your funnel is quietly dropping the leads you already paid for with a free leak self-scan.',
        headline: 'Stop paying for leads you lose',
        cta: 'Get Offer',
      },
    ],
  },
  {
    slug: 'founder-led-sales',
    persona: 'Founders who still close every deal',
    motivation: 'Growth stops whenever the founder is busy, sick, or on vacation.',
    metaTitle: '7 Signs Your Business Still Depends on You to Close Every Deal',
    metaDescription:
      'If revenue stops when you stop selling, the business has a system gap. Find where founder-led sales is capping growth and build a process the team can run.',
    eyebrow: 'For founders and owners who are still the best salesperson',
    headline: '7 signs your sales process is really just you',
    subheadline: 'If revenue drops when you take a week off, the business does not have a sales system yet. It has a founder.',
    painHook:
      'You close better than anyone on the team, so every important deal ends up on your desk. That worked to get here. It is also the reason growth stalls every time your calendar fills up.',
    reasons: [
      {
        title: 'The pitch lives in your head',
        body: 'What you say, which objections you hear, and how you answer them have never been written down, so nobody else can repeat it.',
        leakArea: 'Sales process',
        fix: 'Your best calls turned into scripts, objection guides, and talk tracks the team can use.',
      },
      {
        title: 'Leads wait until you have time',
        body: 'When you are the bottleneck, good prospects wait days for a reply and quietly buy from someone faster.',
        leakArea: 'Speed to lead',
        fix: 'Automated first response and qualification so only ready buyers reach your calendar.',
      },
      {
        title: 'The pipeline is a feeling, not a report',
        body: 'You know roughly what is closing this month, but only because you are in every conversation.',
        leakArea: 'Systems & CRM',
        fix: 'A pipeline that shows stage, value, and next step for every deal without asking you.',
      },
      {
        title: 'Proposals start from scratch every time',
        body: 'Rewriting the same proposal for each deal costs hours and creates inconsistent pricing.',
        leakArea: 'Operations',
        fix: 'Proposal and quote templates with pricing logic built in.',
      },
      {
        title: 'Follow-up depends on you remembering',
        body: 'Deals that need a nudge in two weeks only get one if you happen to think of it.',
        leakArea: 'Follow-up',
        fix: 'Follow-up tasks and sequences triggered by deal stage, not by memory.',
      },
      {
        title: 'New hires take months to sell anything',
        body: 'Without a playbook, every new salesperson learns by trial and error on real prospects.',
        leakArea: 'Sales process',
        fix: 'An onboarding playbook and AI practice partner trained on how you actually sell.',
      },
      {
        title: 'You cannot see which deals are worth your time',
        body: 'Without scoring, a small deal and a strategic one get the same attention from you.',
        leakArea: 'Lead quality',
        fix: 'Lead scoring that routes the right deals to you and the rest to the team.',
      },
    ],
    notAnother: [
      'A generic sales training course',
      'A CRM your team will stop updating in a month',
      'A hire you are expected to train from nothing',
    ],
    instead:
      'Aetheris captures how you sell, finds where deals stall when you are not there, and builds the process, tools, and automation that let the team close without you in every call.',
    proofCaseIds: [19, 21, 24],
    offerLine: 'Start with the free leak self-scan, then map your sales process with us on a strategy call.',
    faqs: [
      {
        question: 'Do I need a sales team already?',
        answer:
          'No. Many founders start by automating qualification and follow-up first, so the first hire walks into a working system.',
      },
      {
        question: 'How do you capture how I sell?',
        answer:
          'We review real calls, emails, and proposals, then turn the patterns into scripts and playbooks you approve.',
      },
    ],
    ads: [
      {
        angle: 'Problem',
        hook: 'Does revenue stop when you take a week off?',
        primaryText:
          'If you are still the one closing every deal, the business has a founder, not a sales system. Here are 7 signs, and what to build instead.',
        headline: '7 signs your sales process is just you',
        cta: 'Learn More',
      },
      {
        angle: 'Freedom',
        hook: 'You should not have to be on every sales call.',
        primaryText:
          'We turn how you sell into a process your team can run, with automated follow-up, scoring, and playbooks. Start with a free leak self-scan.',
        headline: 'Build a sales system that runs without you',
        cta: 'Get Offer',
      },
    ],
  },
  {
    slug: 'burned-by-agencies',
    persona: 'Owners who have been burned by marketing agencies',
    motivation: 'They paid for marketing before and could not tell what it did.',
    metaTitle: '7 Reasons Your Last Marketing Agency Did Not Work',
    metaDescription:
      'Tried agencies and got reports instead of revenue? Learn why marketing alone rarely fixes growth, and how a full-business leak audit finds the real problem.',
    eyebrow: 'For owners who have tried an agency already',
    headline: '7 reasons your last marketing agency did not move the needle',
    subheadline: 'It probably was not just a bad agency. Marketing cannot fix a leak that is somewhere else in the business.',
    painHook:
      'You paid the retainer, read the monthly reports, and still could not say what it did for revenue. That is frustrating, and it is common. Most agencies are only allowed to look at one part of the problem.',
    reasons: [
      {
        title: 'They only looked at the marketing',
        body: 'If leads are lost in follow-up, sales, or operations, better ads just send more people into the same leak.',
        leakArea: 'Whole-business audit',
        fix: 'A forensic review of marketing, sales, follow-up, and operations before anything is built.',
      },
      {
        title: 'Reports measured activity, not revenue',
        body: 'Impressions, clicks, and posts are easy to report. Booked revenue is what you actually needed.',
        leakArea: 'Marketing attribution',
        fix: 'Tracking that ties every channel to closed revenue, reported in plain numbers.',
      },
      {
        title: 'The strategy was a template',
        body: 'The same playbook gets sold to every client. Your market, offer, and buyers deserved their own plan.',
        leakArea: 'Strategy',
        fix: 'A plan built from what the audit finds in your business, not a package tier.',
      },
      {
        title: 'Nobody fixed what happened after the lead',
        body: 'The agency handed off leads and walked away. Response time, follow-up, and close rate stayed exactly the same.',
        leakArea: 'Follow-up',
        fix: 'Follow-up and handoff automation so leads are worked, not just delivered.',
      },
      {
        title: 'Your brand said different things in different places',
        body: 'The website, the ads, and the sales team each told a slightly different story, and buyers noticed.',
        leakArea: 'Brand & trust',
        fix: 'One clear message carried across site, ads, emails, and sales conversations.',
      },
      {
        title: 'You were locked into a retainer, not a result',
        body: 'Monthly fees continued whether or not anything improved.',
        leakArea: 'Strategy',
        fix: 'Scoped builds tied to specific leaks, with what will change spelled out up front.',
      },
      {
        title: 'You never owned the systems they built',
        body: 'When the contract ended, the accounts, data, and automations left with them.',
        leakArea: 'Systems & CRM',
        fix: 'Systems built in your accounts, documented, and yours to keep.',
      },
    ],
    notAnother: [
      'Another retainer for posts and monthly reports',
      'A marketing-only fix for a whole-business problem',
      'Systems you lose access to when the contract ends',
    ],
    instead:
      'Aetheris starts by finding where the business is actually losing time, leads, and revenue, across marketing and everything after it, then builds the specific fixes. You see the findings before you buy anything.',
    proofCaseIds: [27, 28, 18],
    offerLine: 'See the findings first. Run the free leak self-scan before you commit to anything.',
    faqs: [
      {
        question: 'How is this different from an agency?',
        answer:
          'An agency usually sells marketing. Aetheris audits the whole business first, then builds fixes wherever the leak actually is, which is often not marketing.',
      },
      {
        question: 'Do I have to sign a long contract?',
        answer:
          'No. You can start with the free self-scan and decide from there based on what it finds.',
      },
    ],
    ads: [
      {
        angle: 'Empathy',
        hook: 'Paid an agency and still cannot tell what it did?',
        primaryText:
          'It usually is not just a bad agency. Marketing cannot fix leaks in follow-up, sales, or operations. Here are 7 reasons the last one did not work.',
        headline: 'Why your last agency did not work',
        cta: 'Learn More',
      },
      {
        angle: 'Findings first',
        hook: 'See what is broken before you pay anyone to fix it.',
        primaryText:
          'Run a free leak self-scan of your site and lead flow. You keep the findings either way.',
        headline: 'Findings first. Then decide.',
        cta: 'Get Offer',
      },
    ],
  },
  {
    slug: 'drowning-in-admin',
    persona: 'Owners buried in manual admin work',
    motivation: 'The team spends its best hours on copy-paste work instead of customers.',
    metaTitle: '7 Admin Tasks Quietly Costing Your Business Hours Every Week',
    metaDescription:
      'Double entry, manual invoicing, chasing paperwork: find the admin work draining your team and replace it with automation that runs in the background.',
    eyebrow: 'For businesses where the work is good but the admin is endless',
    headline: '7 admin jobs your team should never do by hand again',
    subheadline: 'Every hour spent copying data between systems is an hour not spent on customers or growth.',
    painHook:
      'Your people are good. They are just spending a large part of every week retyping, chasing, and checking things a system could do. It does not show up as a line item, but it shows up as overtime, mistakes, and slow growth.',
    reasons: [
      {
        title: 'The same data gets typed into three systems',
        body: 'Customer details go into the CRM, then the invoicing tool, then a spreadsheet. Every copy is a chance for an error.',
        leakArea: 'Operations',
        fix: 'Integrations that enter data once and sync it everywhere it is needed.',
      },
      {
        title: 'Invoices go out late or not at all',
        body: 'When billing waits on someone finding time, cash flow waits too.',
        leakArea: 'Operations',
        fix: 'Invoices created and sent automatically when the work is marked complete.',
      },
      {
        title: 'Someone chases paperwork every single day',
        body: 'Signed forms, documents, and approvals get requested again and again by hand.',
        leakArea: 'Customer experience',
        fix: 'Automated document requests and reminders that stop when the file arrives.',
      },
      {
        title: 'Onboarding new customers is a checklist on someone\'s desk',
        body: 'When onboarding depends on one person, customers wait and steps get missed.',
        leakArea: 'Customer experience',
        fix: 'An onboarding flow that sends the right steps to the customer and the team on its own.',
      },
      {
        title: 'Reports are built by hand every week',
        body: 'Someone pulls numbers from several tools and pastes them into a spreadsheet so leadership can see what happened.',
        leakArea: 'Systems & CRM',
        fix: 'A live dashboard fed directly from the systems you already use.',
      },
      {
        title: 'Scheduling takes a dozen messages',
        body: 'Back-and-forth emails to find a time waste both your team\'s time and the customer\'s patience.',
        leakArea: 'Operations',
        fix: 'Self-serve booking connected to real calendars and service rules.',
      },
      {
        title: 'Common questions get answered from scratch every time',
        body: 'The same customer questions eat inbox and phone time all day.',
        leakArea: 'Customer experience',
        fix: 'An AI assistant trained on your answers that handles routine questions and escalates the rest.',
      },
    ],
    notAnother: [
      'A new all-in-one platform you have to migrate everything into',
      'A consultant who documents the problem and leaves',
      'Automation that breaks the first time something changes',
    ],
    instead:
      'Aetheris maps where your team\'s hours are going, finds the repeat work worth automating, and builds the integrations and assistants that take it off their plate, using the tools you already have wherever possible.',
    proofCaseIds: [40, 47, 23],
    offerLine: 'Start with the free leak self-scan, then we map the hours on a strategy call.',
    faqs: [
      {
        question: 'Will we have to change all our software?',
        answer:
          'Rarely. Most automation connects the tools you already use. We only recommend a change when a tool is the bottleneck.',
      },
      {
        question: 'Will automation replace my staff?',
        answer:
          'The goal is to give your people their time back for customers and higher-value work, not to remove them.',
      },
    ],
    ads: [
      {
        angle: 'Problem',
        hook: 'How many hours does your team spend retyping data?',
        primaryText:
          'Double entry, manual invoices, chasing paperwork. Here are 7 admin jobs your team should never do by hand again, and what replaces them.',
        headline: '7 admin jobs to automate now',
        cta: 'Learn More',
      },
      {
        angle: 'Time back',
        hook: 'Your best people are stuck doing copy-paste work.',
        primaryText:
          'We find the repeat work draining your team and build automation that runs in the background. Start with a free leak self-scan.',
        headline: 'Give your team their week back',
        cta: 'Get Offer',
      },
    ],
  },
  {
    slug: 'multi-location',
    persona: 'Multi-location owners',
    motivation: 'Every location runs a little differently, and the owner cannot see why one outperforms another.',
    metaTitle: '7 Reasons Your Locations Perform Differently and How to Fix It',
    metaDescription:
      'Running multiple locations? Find the process, follow-up, and reporting gaps that make one location thrive and another stall, then standardize what works.',
    eyebrow: 'For owners running two or more locations',
    headline: '7 reasons one of your locations outperforms the others',
    subheadline: 'It is usually not the market. It is the process, and right now every location has its own.',
    painHook:
      'Same brand, same services, very different results. Without one system across locations, you cannot see where the gap comes from, so the best location\'s habits never spread to the rest.',
    reasons: [
      {
        title: 'Each location handles leads its own way',
        body: 'One answers fast and follows up. Another lets calls go to voicemail. Customers feel the difference.',
        leakArea: 'Speed to lead',
        fix: 'One intake and routing standard across every location, measured weekly.',
      },
      {
        title: 'You cannot compare locations side by side',
        body: 'Every manager reports differently, so you are comparing spreadsheets instead of performance.',
        leakArea: 'Systems & CRM',
        fix: 'A single dashboard showing leads, response time, and revenue per location.',
      },
      {
        title: 'Local pages are thin or missing',
        body: 'Customers searching near each location find a generic page or a competitor.',
        leakArea: 'Website conversion',
        fix: 'Location pages with local proof, services, and booking for each site.',
      },
      {
        title: 'The brand drifts from one location to the next',
        body: 'Different signage, messaging, and offers make the business feel like separate companies.',
        leakArea: 'Brand & trust',
        fix: 'Shared brand and message standards, with templates each location can use.',
      },
      {
        title: 'Best practices stay trapped at one site',
        body: 'Your top manager has habits that work. Nobody has written them down for the others.',
        leakArea: 'Sales process',
        fix: 'Playbooks built from your best location and rolled out to the rest.',
      },
      {
        title: 'Reviews and reputation vary by location',
        body: 'One location has strong reviews, another barely asks. Local search rewards the difference.',
        leakArea: 'Customer retention',
        fix: 'Automated review requests for every location after every completed job.',
      },
      {
        title: 'Data does not match between systems',
        body: 'Each location\'s numbers come from different tools, so totals rarely agree.',
        leakArea: 'Operations',
        fix: 'Integrated systems so every location reports from the same source.',
      },
    ],
    notAnother: [
      'A franchise-style rulebook nobody follows',
      'One more tool each manager uses differently',
      'Corporate reporting that arrives a month late',
    ],
    instead:
      'Aetheris audits every location against the same standard, shows exactly where each one leaks, and builds the shared systems that make your best location the default.',
    proofCaseIds: [6, 16, 24],
    offerLine: 'Run the free leak self-scan on your main site, then compare locations with us on a strategy call.',
    faqs: [
      {
        question: 'Do all locations need the same software?',
        answer:
          'Not always. We can connect different tools into one reporting view first, then standardize where it pays off.',
      },
      {
        question: 'How many locations do I need for this to make sense?',
        answer: 'Two is enough. The gap between locations is often the clearest leak in the business.',
      },
    ],
    ads: [
      {
        angle: 'Problem',
        hook: 'Same brand. Very different results.',
        primaryText:
          'If one location outperforms the rest, it is usually process, not market. Here are 7 reasons locations drift apart, and how to make your best one the standard.',
        headline: 'Why one location wins and others stall',
        cta: 'Learn More',
      },
      {
        angle: 'Visibility',
        hook: 'Can you compare your locations side by side right now?',
        primaryText:
          'We build one view of leads, response time, and revenue across every location. Start with a free leak self-scan.',
        headline: 'See every location in one place',
        cta: 'Get Offer',
      },
    ],
  },
  {
    slug: 'great-reputation-weak-website',
    persona: 'Businesses with a great reputation and a weak website',
    motivation: 'Referrals are strong, but the website loses the people who check it before calling.',
    metaTitle: '7 Ways Your Website Undersells a Business Customers Already Love',
    metaDescription:
      'Great reputation, weak website? Find where your site loses referrals and searchers who check you out before calling, then fix it so it converts.',
    eyebrow: 'For businesses that win on reputation',
    headline: '7 ways your website is underselling a business people already love',
    subheadline: 'Referrals check your website before they call. Right now it may be talking them out of it.',
    painHook:
      'Customers recommend you. Then the person they told looks you up, lands on a dated or confusing site, and calls someone else. The reputation did its job. The website did not.',
    reasons: [
      {
        title: 'Your best proof is nowhere on the site',
        body: 'Reviews, results, and the reasons customers stay with you are scattered or missing.',
        leakArea: 'Brand & trust',
        fix: 'Proof placed on every key page, pulled from real reviews and outcomes.',
      },
      {
        title: 'It is slow or broken on phones',
        body: 'Most people check you out on a phone. A slow or awkward mobile experience costs you the call.',
        leakArea: 'Website conversion',
        fix: 'A fast, mobile-first rebuild of the pages that matter most.',
      },
      {
        title: 'Visitors cannot tell what to do next',
        body: 'Without one clear next step, people leave to think about it and do not come back.',
        leakArea: 'Website conversion',
        fix: 'Clear calls to action and a simple request or booking path on every page.',
      },
      {
        title: 'The site describes services, not results',
        body: 'Lists of what you do are not as persuasive as what changes for the customer.',
        leakArea: 'Messaging',
        fix: 'Copy rewritten around customer outcomes, in the words your customers use.',
      },
      {
        title: 'Search engines and AI assistants cannot find you',
        body: 'If your site is not structured for search and AI answers, competitors get recommended instead.',
        leakArea: 'Search visibility',
        fix: 'Structured content and technical fixes for search and AI answer engines.',
      },
      {
        title: 'Form submissions go into a black hole',
        body: 'A form that emails one inbox, with no confirmation and no follow-up, loses warm leads.',
        leakArea: 'Follow-up',
        fix: 'Instant confirmation, routing to the right person, and automatic follow-up.',
      },
      {
        title: 'The brand online does not match the business in person',
        body: 'Customers who know you are surprised by the site. New visitors only see the site.',
        leakArea: 'Brand & trust',
        fix: 'A brand refresh that makes the site look like the business your customers describe.',
      },
    ],
    notAnother: [
      'A pretty redesign that converts the same as before',
      'A template site that looks like your competitors',
      'A site launch with no follow-up system behind it',
    ],
    instead:
      'Aetheris audits how your website, brand, and follow-up perform against your real reputation, then rebuilds the parts that lose people, so the site sells as well as your customers do.',
    proofCaseIds: [13, 18, 17],
    offerLine: 'Run the free leak self-scan on your website and see exactly where visitors drop off.',
    faqs: [
      {
        question: 'Do I need a whole new website?',
        answer:
          'Not always. Sometimes the biggest gains come from fixing a few key pages, the mobile experience, and the follow-up behind the form.',
      },
      {
        question: 'Can you use our existing reviews?',
        answer: 'Yes. We use your real reviews and outcomes and never invent testimonials.',
      },
    ],
    ads: [
      {
        angle: 'Problem',
        hook: 'Your customers love you. Your website does not show it.',
        primaryText:
          'Referrals look you up before they call. Here are 7 ways your website might be talking them out of it, and how to fix each one.',
        headline: '7 ways your site undersells you',
        cta: 'Learn More',
      },
      {
        angle: 'Scan',
        hook: 'Find out where your website loses people.',
        primaryText:
          'Run a free leak self-scan of your site and see where visitors drop off before they ever call.',
        headline: 'Free website leak scan',
        cta: 'Get Offer',
      },
    ],
  },
  {
    slug: 'ai-curious-owner',
    persona: 'Owners who want to use AI but do not know where to start',
    motivation: 'They know AI matters but do not want to waste money on the wrong tools.',
    metaTitle: '7 Places AI Can Actually Save Your Business Time and Money',
    metaDescription:
      'Know you should be using AI but not sure where? Find the practical places AI and automation pay off in your business, starting with the leaks that cost the most.',
    eyebrow: 'For owners who know AI matters but want a practical start',
    headline: '7 places AI can actually pay off in your business this quarter',
    subheadline: 'Skip the hype. Start where your business is already losing time, leads, or money.',
    painHook:
      'Everyone says you should be using AI. Nobody tells you where it will actually help your business instead of becoming one more subscription. The right place to start is wherever you are already leaking.',
    reasons: [
      {
        title: 'Answering leads instantly, day and night',
        body: 'An AI assistant can respond, answer common questions, and book appointments while your team is busy or asleep.',
        leakArea: 'Speed to lead',
        fix: 'An AI intake assistant trained on your services, pricing rules, and calendar.',
      },
      {
        title: 'Following up so nobody falls through the cracks',
        body: 'AI can draft and send personal follow-up based on what each lead asked about.',
        leakArea: 'Follow-up',
        fix: 'AI-written follow-up sequences you approve once and then run on their own.',
      },
      {
        title: 'Handling routine customer questions',
        body: 'Order status, hours, policies, and how-to questions can be answered without tying up staff.',
        leakArea: 'Customer experience',
        fix: 'A support assistant that answers routine questions and hands off the rest.',
      },
      {
        title: 'Writing marketing in your voice',
        body: 'AI trained on your brand can turn one idea into posts, emails, and pages without sounding generic.',
        leakArea: 'Marketing',
        fix: 'A brand-voice content system that drafts in your style for your review.',
      },
      {
        title: 'Cleaning and enriching your customer data',
        body: 'AI can find duplicates, fill gaps, and flag stale records so your list is actually usable.',
        leakArea: 'Systems & CRM',
        fix: 'Automated data hygiene and enrichment for your CRM.',
      },
      {
        title: 'Summarizing calls and meetings',
        body: 'Notes, action items, and CRM updates can be captured automatically instead of typed afterward.',
        leakArea: 'Operations',
        fix: 'Call and meeting summaries that update records and create tasks.',
      },
      {
        title: 'Spotting which leads and customers need attention',
        body: 'AI scoring can show which leads are ready to buy and which customers are at risk of leaving.',
        leakArea: 'Lead quality',
        fix: 'Lead and churn scoring built on your own history.',
      },
    ],
    notAnother: [
      'A chatbot bolted onto your site with no strategy behind it',
      'A stack of AI subscriptions nobody uses',
      'A one-size-fits-all AI course',
    ],
    instead:
      'Aetheris finds where your business is leaking first, then builds custom AI and automation aimed at those exact leaks, so every tool has a job and a measurable result.',
    proofCaseIds: [30, 45, 46],
    offerLine: 'Run the free leak self-scan and see where AI would pay off first in your business.',
    faqs: [
      {
        question: 'Do I need technical staff to use this?',
        answer: 'No. We build, connect, and document the systems so your team only uses the results.',
      },
      {
        question: 'Is our data safe with AI tools?',
        answer:
          'We choose tools and setups based on your data sensitivity and keep systems inside accounts you control.',
      },
    ],
    ads: [
      {
        angle: 'Curiosity',
        hook: 'Where should your business actually use AI?',
        primaryText:
          'Skip the hype. Here are 7 practical places AI pays off in a real business, starting wherever you are already losing time or leads.',
        headline: '7 places AI actually pays off',
        cta: 'Learn More',
      },
      {
        angle: 'Practical start',
        hook: 'Do not buy another AI tool until you read this.',
        primaryText:
          'The right first AI project fixes a leak you already have. Run a free leak self-scan to find yours.',
        headline: 'Find your first AI win',
        cta: 'Get Offer',
      },
    ],
  },
  {
    slug: 'messy-crm',
    persona: 'Teams with a CRM nobody trusts',
    motivation: 'The CRM is full of duplicates and stale data, so the team works around it.',
    metaTitle: '7 Signs Your CRM Is Costing You Deals',
    metaDescription:
      'Duplicates, stale contacts, and missing follow-ups? Find out how a messy CRM leaks revenue and how to turn it into a system your team trusts.',
    eyebrow: 'For teams whose CRM is more mess than help',
    headline: '7 signs your CRM is costing you deals instead of closing them',
    subheadline: 'If your team keeps its own spreadsheets, the CRM is not the system of record. It is a graveyard.',
    painHook:
      'You paid for the CRM. The team still keeps side spreadsheets, nobody trusts the reports, and leads get contacted twice or not at all. Bad data quietly breaks every system built on top of it.',
    reasons: [
      {
        title: 'The same contact exists three times',
        body: 'Duplicates mean the same person gets called twice, or nobody calls because someone else was supposed to.',
        leakArea: 'Systems & CRM',
        fix: 'Deduplication and rules that stop new duplicates at the door.',
      },
      {
        title: 'Half the contacts are out of date',
        body: 'People change jobs, numbers, and emails. Stale records waste outreach and hurt email deliverability.',
        leakArea: 'Lead quality',
        fix: 'Ongoing validation and enrichment that keeps records current.',
      },
      {
        title: 'Deals have no next step',
        body: 'Without a next action and a date, deals drift until someone notices they went cold.',
        leakArea: 'Follow-up',
        fix: 'Required next steps and automatic tasks for every open deal.',
      },
      {
        title: 'Nobody trusts the reports',
        body: 'When the data is wrong, forecasts are wrong, and leadership goes back to asking people.',
        leakArea: 'Systems & CRM',
        fix: 'Clean pipeline stages and dashboards built on data the team trusts.',
      },
      {
        title: 'Leads are not routed to the right person',
        body: 'Without routing rules, leads sit unassigned or land with the wrong rep.',
        leakArea: 'Speed to lead',
        fix: 'Automatic lead routing by territory, service, or availability.',
      },
      {
        title: 'Marketing and sales see different numbers',
        body: 'Separate tools and definitions mean every meeting starts with arguing about the data.',
        leakArea: 'Marketing attribution',
        fix: 'Shared definitions and synced data between marketing and sales tools.',
      },
      {
        title: 'Updating the CRM feels like extra work',
        body: 'If logging activity takes time, people skip it, and the data gets worse.',
        leakArea: 'Operations',
        fix: 'Automatic activity capture from email, calls, and meetings.',
      },
    ],
    notAnother: [
      'A migration to a shiny new CRM with the same bad data',
      'A one-time cleanup that is messy again in six months',
      'More fields nobody fills in',
    ],
    instead:
      'Aetheris audits your CRM and the processes feeding it, cleans what is there, and builds the rules and automation that keep it clean, so the team finally works from one trusted system.',
    proofCaseIds: [1, 4, 3],
    offerLine: 'Start with the free leak self-scan, then we review your CRM on a strategy call.',
    faqs: [
      {
        question: 'Do we need to switch CRMs?',
        answer:
          'Usually not. Most CRM problems are data and process problems. We fix those first and only recommend a switch if the tool truly cannot do the job.',
      },
      {
        question: 'Will the cleanup lose any of our data?',
        answer: 'No. We back up before changes and merge records instead of deleting history.',
      },
    ],
    ads: [
      {
        angle: 'Problem',
        hook: 'Does your team keep side spreadsheets instead of using the CRM?',
        primaryText:
          'That usually means nobody trusts the data. Here are 7 signs your CRM is costing you deals, and how to fix it without starting over.',
        headline: '7 signs your CRM is costing deals',
        cta: 'Learn More',
      },
      {
        angle: 'Clean data',
        hook: 'Bad data breaks every system built on top of it.',
        primaryText:
          'We clean your CRM and build the rules that keep it clean. Start with a free leak self-scan.',
        headline: 'Turn your CRM into a trusted system',
        cta: 'Get Offer',
      },
    ],
  },
  {
    slug: 'professional-services',
    persona: 'Professional service firms',
    motivation: 'Intake, proposals, and onboarding are slow, so good clients sign elsewhere.',
    metaTitle: '7 Places Professional Service Firms Lose Clients Before Engagement',
    metaDescription:
      'Law, accounting, consulting, and agency firms: find where slow intake, proposals, and onboarding lose good clients, then automate the path to engagement.',
    eyebrow: 'For law, accounting, consulting & advisory firms',
    headline: '7 places your firm loses good clients before the engagement letter',
    subheadline: 'The work is excellent. The path from first inquiry to signed engagement is where clients slip away.',
    painHook:
      'Prospective clients reach out when they have a problem right now. If intake is slow, the proposal takes a week, and onboarding is a pile of forms, many of them sign with the firm that made it easy.',
    reasons: [
      {
        title: 'Inquiries wait for a partner to review them',
        body: 'When every inquiry needs a senior person before anyone replies, response times stretch into days.',
        leakArea: 'Speed to lead',
        fix: 'Structured intake that qualifies and responds right away, then routes to the right person.',
      },
      {
        title: 'Conflict checks and qualification are manual',
        body: 'Staff gather the same information by email over several rounds.',
        leakArea: 'Operations',
        fix: 'Smart intake forms that collect what you need the first time.',
      },
      {
        title: 'Proposals take too long to send',
        body: 'Each engagement letter or proposal starts from an old document and a lot of editing.',
        leakArea: 'Sales process',
        fix: 'Proposal templates with scope and fee logic built in.',
      },
      {
        title: 'Prospects go quiet after the consultation',
        body: 'Without structured follow-up, interested prospects drift away while deciding.',
        leakArea: 'Follow-up',
        fix: 'Post-consultation follow-up that answers common concerns and makes signing easy.',
      },
      {
        title: 'Onboarding is a pile of forms and emails',
        body: 'New clients chase documents and signatures before work can start.',
        leakArea: 'Customer experience',
        fix: 'A guided onboarding portal with e-signature and document collection.',
      },
      {
        title: 'Your expertise is invisible online',
        body: 'Clients look for proof you have solved their exact problem. Most firm websites say little about that.',
        leakArea: 'Brand & trust',
        fix: 'Practice-area pages and content that show specific expertise and outcomes.',
      },
      {
        title: 'Past clients are not asked for referrals',
        body: 'Satisfied clients are the best source of new work, and most firms rarely ask.',
        leakArea: 'Customer retention',
        fix: 'Automated check-ins and referral requests at natural points in the relationship.',
      },
    ],
    notAnother: [
      'Generic practice-management software',
      'A marketing campaign aimed at the wrong clients',
      'More billable hours spent on admin',
    ],
    instead:
      'Aetheris maps how clients move from first inquiry to signed engagement, finds where they drop off, and builds the intake, proposal, and onboarding systems that make your firm the easy choice.',
    proofCaseIds: [23, 46, 26],
    offerLine: 'Run the free leak self-scan on your firm\'s website and intake path.',
    faqs: [
      {
        question: 'Can this work with our practice-management system?',
        answer: 'In most cases, yes. We connect to the systems you already use for matters, billing, and documents.',
      },
      {
        question: 'Is client information handled carefully?',
        answer:
          'Yes. We design intake and automation around your confidentiality obligations and keep data in systems you control.',
      },
    ],
    ads: [
      {
        angle: 'Problem',
        hook: 'Great work. Slow intake. Lost clients.',
        primaryText:
          'Prospective clients sign with the firm that makes it easy. Here are 7 places professional service firms lose good clients before the engagement letter.',
        headline: 'Where firms lose clients before engagement',
        cta: 'Learn More',
      },
      {
        angle: 'Speed',
        hook: 'How long does your firm take to reply to a new inquiry?',
        primaryText:
          'We automate intake, proposals, and onboarding so good clients sign faster. Start with a free leak self-scan.',
        headline: 'Win clients faster',
        cta: 'Get Offer',
      },
    ],
  },
];

export const PERSONA_BY_SLUG: Record<string, PersonaListicle> = Object.fromEntries(
  PERSONA_LISTICLES.map((p) => [p.slug, p]),
);

export const personaPath = (slug: string) => `/for/${slug}`;
