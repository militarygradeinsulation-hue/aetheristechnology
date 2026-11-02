// Trade & contractor listicle landing pages ("/for/:slug", hub at "/trades").
//
// Core idea: the owner is in the field all day and has no time to make sure
// the office side (calls, estimates, scheduling, invoicing, reviews, the
// website) is working. Aetheris finds what is broken and fixes it fast, so they
// do not have to worry about the office stuff.
//
// Each trade page is built around the five parts of the conversion diamond:
//
//   Promise     -> headline / subheadline in that trade's words
//   Properties  -> the numbered office leaks and what gets built to fix them
//   Positioning -> "you run the jobs, I handle the office problems"
//   Proof       -> REAL_CASES ids (independent, published, source-linked)
//   Packaging   -> the offer, the steps, and the risk reversal
//
// Guardrails:
// - Proof only references sourced entries in src/data/realCaseStudies.ts.
//   Never add invented testimonials, review counts, or client results here.
// - CTAs point to the free self-scan and the booking page. These pages must
//   never trigger a Golden Report or forensic scan (see AGENTS.md).
// - Each trade carries matching ad variants so ad -> page message match is
//   kept in one place and can be exported for the ad account.

export type LeakArea =
  | 'Missed calls'
  | 'Speed to lead'
  | 'Estimates & quoting'
  | 'Follow-up'
  | 'Scheduling & dispatch'
  | 'Invoicing & cash flow'
  | 'Reviews & reputation'
  | 'Repeat business'
  | 'Website'
  | 'Office systems'
  | 'Marketing tracking'
  | 'Hiring & crews';

export interface PersonaReason {
  /** Short, scannable reason title written in the trade's words. */
  title: string;
  /** Two sentences describing the leak as the owner experiences it. */
  body: string;
  /** Which part of the office it lives in. */
  leakArea: LeakArea;
  /** What gets built to close it. */
  fix: string;
}

export interface PersonaAd {
  /** Angle name for the ad set, e.g. "In the field" or "Office". */
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
  /** Trade name for cards and breadcrumbs ("HVAC"). */
  trade: string;
  /** Who this page is for, short form ("HVAC contractors"). */
  persona: string;
  /** One line on the trades hub card. */
  cardLine: string;
  metaTitle: string;
  metaDescription: string;
  // Promise
  eyebrow: string;
  headline: string;
  subheadline: string;
  /** Where the owner is while the office leaks, in their trade's terms. */
  fieldMoment: string;
  /** What is going wrong back at the office at that same moment. */
  officeMoment: string;
  // Properties
  reasons: PersonaReason[];
  // Positioning
  instead: string;
  // Proof
  proofCaseIds: number[];
  // Packaging
  offerLine: string;
  faqs: PersonaFAQ[];
  // Ads that route to this page
  ads: PersonaAd[];
}

/** Shared positioning shown on every trade page and the hub. */
export const FIELD_PROMISE = {
  headline: "I know how busy you are in the field. You don't have time to make sure everything else is working.",
  body: "That's my job. I find what's broken in the office side of your business, fast: missed calls, estimates nobody followed up on, invoices that went out late, reviews nobody asked for. Then I fix it, so you can stay on the job and stop worrying about the office stuff.",
  notAnother: [
    'Software you have to learn at 9pm after a full day on the job',
    'A marketing agency that sends you more leads to drop',
    'A consultant who hands you a report and leaves you to fix it',
  ],
};

/** Shared three-step offer shown on every trade page and the hub. */
export const HOW_IT_WORKS = [
  {
    title: 'Run the free scan from your truck',
    text: 'Enter your website. In a few minutes it flags the problems customers can see from the outside.',
  },
  {
    title: 'One short call, between jobs',
    text: 'I look at your calls, estimates, scheduling, and billing, and tell you plainly what is broken.',
  },
  {
    title: 'I fix it. You keep working.',
    text: 'I build the fixes into the tools you already use and show you what changed. No new software to learn.',
  },
];

export const PERSONA_LISTICLES: PersonaListicle[] = [
  {
    slug: 'hvac',
    trade: 'HVAC',
    persona: 'HVAC contractors',
    cardLine: 'No-cool calls going to voicemail while every tech is booked.',
    metaTitle: '7 Office Problems Costing HVAC Contractors Jobs While You Are in the Field',
    metaDescription:
      'HVAC owners: you are on calls all day. Find the missed calls, unsold replacement quotes, and lapsed maintenance plans leaking revenue back at the office, and get them fixed fast.',
    eyebrow: 'For HVAC contractors',
    headline: '7 things going wrong at your HVAC office while you are on a service call',
    subheadline: 'You are in an attic or on a rooftop unit. The office is losing jobs you already paid to get.',
    fieldMoment: "It's 96 degrees, you're in an attic with a dead condenser, and your phone is buzzing in your pocket.",
    officeMoment: 'Back at the office, that call goes to voicemail, a replacement quote from last week is still sitting, and nobody has called the maintenance plan customers due this month.',
    reasons: [
      {
        title: 'No-cool calls hit voicemail on the busiest days',
        body: 'On the hottest days every tech is booked and the phone never stops. Homeowners with no AC call the next company if nobody picks up.',
        leakArea: 'Missed calls',
        fix: 'Missed-call text-back and an after-hours answering assistant that books the visit for you.',
      },
      {
        title: 'Replacement quotes sit with no follow-up',
        body: 'A system replacement is a big decision, and most homeowners do not say yes on the spot. Without follow-up, those quotes go to whoever calls back.',
        leakArea: 'Estimates & quoting',
        fix: 'Automatic quote follow-up by text and email until the customer says yes or no.',
      },
      {
        title: 'Maintenance plans lapse quietly',
        body: 'Tune-up customers are your steadiest revenue. When nobody reminds them, renewals fall off and so do the repair calls that come with them.',
        leakArea: 'Repeat business',
        fix: 'Seasonal tune-up reminders and renewal messages that run on their own.',
      },
      {
        title: 'Dispatch lives on a whiteboard or in one person\'s head',
        body: 'When the dispatcher is out, nobody knows who is where or which call is next. Techs drive across town twice.',
        leakArea: 'Scheduling & dispatch',
        fix: 'One schedule every tech and the office can see, with automatic confirmations to customers.',
      },
      {
        title: 'Invoices go out days after the job',
        body: 'Paperwork waits until you get back to the truck, then the office, then the weekend. Cash flow waits too.',
        leakArea: 'Invoicing & cash flow',
        fix: 'Invoices sent from the job site when the work is marked done, with automatic payment reminders.',
      },
      {
        title: 'Happy customers are never asked for a review',
        body: 'You fixed their AC on the worst day of summer. That is the moment to ask, and it passes.',
        leakArea: 'Reviews & reputation',
        fix: 'A review request sent automatically after every completed call.',
      },
      {
        title: 'You do not know which ads book jobs',
        body: 'Without tracking from call to closed job, you keep paying for whatever feels busy instead of what pays.',
        leakArea: 'Marketing tracking',
        fix: 'Call and lead tracking tied to booked revenue, in a simple weekly summary.',
      },
    ],
    instead:
      'I find where your office is dropping calls, quotes, and renewals, and I build the systems that catch them, so you can stay on the service call.',
    proofCaseIds: [45, 26, 40],
    offerLine: 'Start with a free leak self-scan of your website and lead flow. It takes a few minutes and you do not need to get on a call.',
    faqs: [
      {
        question: 'Do I have to change my field service software?',
        answer: 'Usually not. Most fixes connect to what you already use. I only recommend a change when the tool itself is the problem.',
      },
      {
        question: 'How much of my time does this take?',
        answer: 'Very little. A short call that fits between jobs, then I do the work and show you what changed.',
      },
    ],
    ads: [
      {
        angle: 'In the field',
        hook: "You're in an attic. Who's answering your phone?",
        primaryText:
          "I know how busy you are in the field. While you're on a call, the office is missing no-cool calls, sitting on replacement quotes, and letting maintenance plans lapse. I find those problems fast and fix them, so you don't have to worry about the office stuff.",
        headline: '7 things going wrong at your HVAC office',
        cta: 'Learn More',
      },
      {
        angle: 'Office',
        hook: 'That replacement quote from last week? Nobody followed up.',
        primaryText:
          'HVAC owners lose big jobs after the quote, not before it. Run a free leak scan and see where your office is dropping work while you are in the field.',
        headline: 'Stop losing jobs after the quote',
        cta: 'Get Offer',
      },
    ],
  },
  {
    slug: 'plumbing',
    trade: 'Plumbing',
    persona: 'Plumbing contractors',
    cardLine: 'Emergency calls lost while you are under a sink.',
    metaTitle: '7 Office Problems Costing Plumbers Jobs While You Are on a Call',
    metaDescription:
      'Plumbing owners: you are under a sink or in a crawlspace all day. Find the missed emergency calls, slow estimates, and late invoices leaking money back at the office.',
    eyebrow: 'For plumbing contractors',
    headline: '7 things your plumbing office is missing while you are under a sink',
    subheadline: 'Emergency calls do not wait. If nobody answers, the homeowner calls the next plumber on Google.',
    fieldMoment: "You're in a crawlspace with your hands full and water on the floor.",
    officeMoment: 'Meanwhile a burst-pipe call goes to voicemail, a water-heater estimate sits unanswered, and three invoices from last week still have not gone out.',
    reasons: [
      {
        title: 'Emergency calls go to voicemail',
        body: 'Burst pipes and backed-up drains are urgent. A homeowner who reaches voicemail is already dialing the next number.',
        leakArea: 'Missed calls',
        fix: 'Instant text-back on missed calls and an answering assistant that captures the job and books it.',
      },
      {
        title: 'Bigger estimates never get a second call',
        body: 'Water heaters, repipes, and sewer lines are not same-day decisions. Without follow-up, those jobs go to someone else.',
        leakArea: 'Estimates & quoting',
        fix: 'Estimate follow-up that runs automatically until you get an answer.',
      },
      {
        title: 'Customers do not know when you are coming',
        body: 'Vague arrival windows lead to cancellations and angry calls to the office.',
        leakArea: 'Scheduling & dispatch',
        fix: 'Automatic appointment confirmations and on-my-way texts.',
      },
      {
        title: 'Paperwork piles up in the truck',
        body: 'Job notes, parts, and invoices wait until the end of the day or the end of the week.',
        leakArea: 'Invoicing & cash flow',
        fix: 'Invoicing and payment from the job site, with reminders that chase unpaid bills for you.',
      },
      {
        title: 'One-time customers never hear from you again',
        body: 'Drain cleanings, water heater flushes, and inspections are easy repeat work. Most shops never ask.',
        leakArea: 'Repeat business',
        fix: 'Simple reminder campaigns for routine maintenance and annual checks.',
      },
      {
        title: 'Your website does not show you are available now',
        body: 'People with a leak want to know you can come today. A slow site with a contact form loses them.',
        leakArea: 'Website',
        fix: 'A fast mobile page with tap-to-call, service area, and same-day request up front.',
      },
      {
        title: 'Reviews are not being asked for',
        body: 'Plumbing is chosen on trust. Every job without a review request is proof you never collected.',
        leakArea: 'Reviews & reputation',
        fix: 'Automatic review requests after every completed job.',
      },
    ],
    instead:
      'I find the calls, estimates, and invoices slipping through your office and set up the systems that handle them, so you can stay focused on the job in front of you.',
    proofCaseIds: [45, 48, 26],
    offerLine: 'Run the free leak self-scan on your website and lead flow. A few minutes, no call required.',
    faqs: [
      {
        question: 'Will this work if I am a one-truck shop?',
        answer: 'Yes. Owner-operators usually feel the office problems the most, because there is nobody else to catch them.',
      },
      {
        question: 'Do I have to learn new software?',
        answer: 'No. I set it up and connect it to what you already use. You just see more booked jobs and fewer loose ends.',
      },
    ],
    ads: [
      {
        angle: 'In the field',
        hook: "You're under a sink. Your phone is ringing.",
        primaryText:
          "I know how busy you are in the field. While you're on a job, emergency calls go to voicemail and estimates sit. I find those office problems fast and fix them, so you don't have to worry about them.",
        headline: '7 things your plumbing office is missing',
        cta: 'Learn More',
      },
      {
        angle: 'Office',
        hook: 'Every missed emergency call is a job for the next plumber.',
        primaryText:
          'Run a free leak scan and see where your office is losing calls, estimates, and invoices while you are in the field.',
        headline: 'Find what your office is missing',
        cta: 'Get Offer',
      },
    ],
  },
  {
    slug: 'electrical',
    trade: 'Electrical',
    persona: 'Electrical contractors',
    cardLine: 'Bids and panel quotes going cold while you are on site.',
    metaTitle: '7 Office Problems Costing Electrical Contractors Work While You Are on Site',
    metaDescription:
      'Electrical contractors: you are on site all day. Find the slow bids, missed calls, and late invoices leaking money back at the office, and get them fixed fast.',
    eyebrow: 'For electrical contractors',
    headline: '7 things slipping through your electrical office while you are on site',
    subheadline: 'You are pulling wire or swapping a panel. The office is letting bids and callbacks go cold.',
    fieldMoment: "You're on a ladder with a panel open and no free hand for your phone.",
    officeMoment: 'Back at the office, a panel-upgrade lead waits a day for a reply, a builder is still waiting on your bid, and change orders from last month have not been billed.',
    reasons: [
      {
        title: 'New leads wait until you are off the ladder',
        body: 'Homeowners and builders contact several electricians. The first one to answer usually gets the work.',
        leakArea: 'Speed to lead',
        fix: 'Instant replies and lead capture that book the walkthrough without you stopping work.',
      },
      {
        title: 'Bids take too long to send',
        body: 'Writing a bid at night from scratch means bids go out late, or not at all.',
        leakArea: 'Estimates & quoting',
        fix: 'Bid and quote templates with your pricing built in, ready to send from your phone.',
      },
      {
        title: 'Sent bids never get a follow-up',
        body: 'Builders and homeowners get busy. A bid with no follow-up is a bid you probably lost.',
        leakArea: 'Follow-up',
        fix: 'Automatic follow-up on every open bid until it is won or closed out.',
      },
      {
        title: 'Change orders do not get billed',
        body: 'Extra work done on site gets agreed verbally and forgotten by the time the invoice goes out.',
        leakArea: 'Invoicing & cash flow',
        fix: 'Change orders captured on site and added to the invoice automatically.',
      },
      {
        title: 'Permits and inspections are tracked on paper',
        body: 'Missed inspection dates hold up jobs and final payments.',
        leakArea: 'Office systems',
        fix: 'Permit and inspection tracking with reminders before each date.',
      },
      {
        title: 'Past customers forget you did their work',
        body: 'EV chargers, generators, and upgrades are natural next jobs for people who already trust you.',
        leakArea: 'Repeat business',
        fix: 'Simple check-in campaigns that offer the next upgrade at the right time.',
      },
      {
        title: 'Your website looks like nobody updates it',
        body: 'Builders and homeowners check you out online before they call. An outdated site costs you the call.',
        leakArea: 'Website',
        fix: 'A clean, fast site that shows your work, licensing, and an easy way to request a bid.',
      },
    ],
    instead:
      'I find where bids, callbacks, and billing fall through in your office and build the systems that catch them, so you can keep working while it gets handled.',
    proofCaseIds: [23, 19, 40],
    offerLine: 'Start with the free leak self-scan of your website and lead flow. No call required.',
    faqs: [
      {
        question: 'I mostly work for builders. Does this still apply?',
        answer: 'Yes. Bid speed, follow-up, change orders, and billing are usually the biggest leaks for builder work.',
      },
      {
        question: 'How quickly can things get fixed?',
        answer: 'The scan shows problems in minutes. Simple fixes like missed-call text-back can be running quickly; bigger systems are scoped with you first.',
      },
    ],
    ads: [
      {
        angle: 'In the field',
        hook: "You're on a ladder. Who's following up on your bids?",
        primaryText:
          "I know how busy you are on site. While you work, leads wait, bids go cold, and change orders go unbilled. I find those office problems fast and fix them, so you don't have to worry about them.",
        headline: '7 things slipping through your office',
        cta: 'Learn More',
      },
      {
        angle: 'Office',
        hook: 'How many bids did you send last month with no follow-up?',
        primaryText:
          'Run a free leak scan and see where your office is losing bids, calls, and billing while you are on site.',
        headline: 'Stop losing bids to silence',
        cta: 'Get Offer',
      },
    ],
  },
  {
    slug: 'roofing',
    trade: 'Roofing',
    persona: 'Roofing contractors',
    cardLine: 'Inspection leads and storm calls going cold while crews are on roofs.',
    metaTitle: '7 Office Problems Costing Roofers Jobs While You Are on a Roof',
    metaDescription:
      'Roofing owners: you are on roofs and running crews all day. Find the slow inspection replies, unsigned estimates, and missed storm calls leaking jobs back at the office.',
    eyebrow: 'For roofing contractors',
    headline: '7 ways your roofing office loses jobs while you are up on a roof',
    subheadline: 'Storm season is when you are busiest and when the office drops the most leads.',
    fieldMoment: "You're up on a roof checking hail damage and your phone has six missed calls.",
    officeMoment: 'Back at the office, inspection requests sit for a day, signed estimates wait on insurance paperwork, and last week\'s quotes have not been followed up.',
    reasons: [
      {
        title: 'Inspection requests wait too long for a reply',
        body: 'After a storm, homeowners call several roofers. The ones who answer first get on the roof first.',
        leakArea: 'Speed to lead',
        fix: 'Instant replies and online inspection booking that fill your schedule without you stopping work.',
      },
      {
        title: 'Estimates go out and nobody follows up',
        body: 'Roof replacements are expensive decisions. Homeowners need a nudge, and most roofers never send one.',
        leakArea: 'Estimates & quoting',
        fix: 'Estimate follow-up by text and email that runs until the homeowner decides.',
      },
      {
        title: 'Insurance paperwork stalls signed jobs',
        body: 'Claims, photos, and adjuster details live in emails and camera rolls, and jobs wait while someone hunts for them.',
        leakArea: 'Office systems',
        fix: 'One job file for photos, claim details, and documents, with reminders on what is missing.',
      },
      {
        title: 'Crew schedules change and nobody hears about it',
        body: 'Weather moves jobs. When customers and crews are not told, you get no-shows and angry calls.',
        leakArea: 'Scheduling & dispatch',
        fix: 'Automatic schedule updates to crews and customers when a job moves.',
      },
      {
        title: 'Final payments drag after the job is done',
        body: 'The roof is finished, but the final invoice and the insurance check take weeks to chase.',
        leakArea: 'Invoicing & cash flow',
        fix: 'Invoices sent on completion with automatic reminders until paid.',
      },
      {
        title: 'Neighbors never see your work',
        body: 'Every finished roof is an opportunity on that street. Most roofers never follow up with the neighbors or ask for referrals.',
        leakArea: 'Repeat business',
        fix: 'Review and referral requests after every completed roof.',
      },
      {
        title: 'Your site does not prove you are legit',
        body: 'After storms, homeowners worry about storm chasers. A weak website makes you look like one.',
        leakArea: 'Website',
        fix: 'A site that shows local projects, licensing, warranty, and real reviews up front.',
      },
    ],
    instead:
      'I find where inspection leads, estimates, and payments get stuck in your office, and I build the systems that move them, so you can stay on the roof.',
    proofCaseIds: [26, 46, 18],
    offerLine: 'Run the free leak self-scan on your website and lead flow. A few minutes, no call required.',
    faqs: [
      {
        question: 'Will this help during storm season when we are slammed?',
        answer: 'That is when it helps most. Automated replies and booking keep leads from piling up when everyone is on a roof.',
      },
      {
        question: 'Do you work with my CRM?',
        answer: 'In most cases, yes. I connect to the tools you already use before suggesting anything new.',
      },
    ],
    ads: [
      {
        angle: 'In the field',
        hook: "You're on a roof. Six missed calls.",
        primaryText:
          "I know how busy you are in the field. While crews are on roofs, inspection requests wait, estimates sit, and payments drag. I find those office problems fast and fix them, so you don't have to worry about them.",
        headline: '7 ways your office loses roofing jobs',
        cta: 'Learn More',
      },
      {
        angle: 'Storm season',
        hook: 'Storm season is when your office drops the most leads.',
        primaryText:
          'Run a free leak scan and see where inspection requests and estimates are getting lost while you are on roofs.',
        headline: 'Catch every storm lead',
        cta: 'Get Offer',
      },
    ],
  },
  {
    slug: 'remodeling',
    trade: 'Remodeling',
    persona: 'Remodelers and general contractors',
    cardLine: 'Big proposals and change orders lost between the jobsite and the office.',
    metaTitle: '7 Office Problems Costing Remodelers and GCs While You Are on the Jobsite',
    metaDescription:
      'Remodelers and general contractors: you are running jobsites all day. Find the slow proposals, unbilled change orders, and lost leads leaking money back at the office.',
    eyebrow: 'For remodelers & general contractors',
    headline: '7 things your remodeling office drops while you are running the jobsite',
    subheadline: 'You are managing subs and solving problems on site. Proposals, follow-up, and billing are falling behind.',
    fieldMoment: "You're on a jobsite sorting out a sub who didn't show and an inspector who did.",
    officeMoment: 'Back at the office, a kitchen lead from Tuesday still has no reply, a proposal is half-written, and the last change order never made it onto an invoice.',
    reasons: [
      {
        title: 'New leads wait days for a first reply',
        body: 'Homeowners planning a remodel contact several contractors. Slow replies tell them you are too busy for them.',
        leakArea: 'Speed to lead',
        fix: 'An instant first reply and a short intake form that qualifies the project before you call.',
      },
      {
        title: 'Proposals take a week of evenings',
        body: 'Every proposal starts from an old document and a lot of retyping. Late proposals lose to faster contractors.',
        leakArea: 'Estimates & quoting',
        fix: 'Proposal templates with your scopes and pricing built in.',
      },
      {
        title: 'Change orders are agreed on site and forgotten',
        body: 'Extra work gets a handshake and never shows up on the bill.',
        leakArea: 'Invoicing & cash flow',
        fix: 'Change orders signed on a phone and added to the next invoice automatically.',
      },
      {
        title: 'Clients call you for every update',
        body: 'When homeowners do not know what is happening, they call you on the jobsite.',
        leakArea: 'Office systems',
        fix: 'Automatic weekly project updates so clients stay informed without calling you.',
      },
      {
        title: 'Sub and material schedules live in texts',
        body: 'When the schedule is spread across text threads, things get missed and jobs slip.',
        leakArea: 'Scheduling & dispatch',
        fix: 'One shared schedule for subs, deliveries, and inspections with reminders.',
      },
      {
        title: 'Finished projects are never shown off',
        body: 'Your best marketing is the work you just finished. Most remodelers never get photos or reviews online.',
        leakArea: 'Reviews & reputation',
        fix: 'An end-of-project routine that collects photos, a review, and a referral.',
      },
      {
        title: 'You cannot tell which leads are worth a site visit',
        body: 'Driving out to price a project that was never real wastes your best hours.',
        leakArea: 'Speed to lead',
        fix: 'Lead screening for budget, timeline, and scope before you schedule a visit.',
      },
    ],
    instead:
      'I find where proposals, change orders, and client communication break down in your office, and I set up the systems that handle them, so you can run the jobsite.',
    proofCaseIds: [23, 46, 13],
    offerLine: 'Start with the free leak self-scan of your website and lead flow. No call required.',
    faqs: [
      {
        question: 'We use project management software already. Is this different?',
        answer: 'Yes. I look at whether the software and the office around it are actually catching leads, proposals, and billing, and fix what is not.',
      },
      {
        question: 'How involved do I need to be?',
        answer: 'One short call to walk through what the scan finds. After that I build and you review.',
      },
    ],
    ads: [
      {
        angle: 'In the field',
        hook: "You're running a jobsite. Who's writing the next proposal?",
        primaryText:
          "I know how busy you are in the field. While you manage subs and inspections, leads wait, proposals stall, and change orders go unbilled. I find those office problems fast and fix them, so you don't have to worry about them.",
        headline: '7 things your office drops',
        cta: 'Learn More',
      },
      {
        angle: 'Change orders',
        hook: 'How many change orders never made it onto an invoice?',
        primaryText:
          'Run a free leak scan and see where your office is losing leads, proposals, and billing while you are on the jobsite.',
        headline: 'Stop leaving money on the jobsite',
        cta: 'Get Offer',
      },
    ],
  },
  {
    slug: 'landscaping',
    trade: 'Landscaping',
    persona: 'Landscaping and lawn care companies',
    cardLine: 'Spring quotes and renewals falling behind while crews are out.',
    metaTitle: '7 Office Problems Costing Landscapers While Crews Are in the Field',
    metaDescription:
      'Landscaping and lawn care owners: you are out with crews all day. Find the missed quote requests, lapsed renewals, and late invoices leaking money back at the office.',
    eyebrow: 'For landscaping & lawn care companies',
    headline: '7 things your landscaping office misses while you are out with the crews',
    subheadline: 'Spring is your busiest season and your office\'s worst. Quotes, renewals, and billing pile up.',
    fieldMoment: "You're on a mower or running an install crew from sunrise to dark.",
    officeMoment: 'Back at the office, quote requests stack up, last year\'s customers have not been asked to renew, and recurring invoices are going out late.',
    reasons: [
      {
        title: 'Spring quote requests pile up',
        body: 'Everyone calls at once in spring. The landscaper who quotes first usually gets the season.',
        leakArea: 'Speed to lead',
        fix: 'Instant replies and online quote requests that collect property details for you.',
      },
      {
        title: 'Last year\'s customers are not asked to renew',
        body: 'Recurring customers are your best revenue. When nobody reaches out, they drift to whoever knocks first.',
        leakArea: 'Repeat business',
        fix: 'Automatic renewal campaigns before each season starts.',
      },
      {
        title: 'Recurring billing is done by hand',
        body: 'Weekly and monthly invoices take hours to send and are easy to miss.',
        leakArea: 'Invoicing & cash flow',
        fix: 'Automated recurring invoices and card-on-file payments.',
      },
      {
        title: 'Rain days scramble the whole schedule',
        body: 'Weather pushes routes, and customers do not hear about it until they wonder where you are.',
        leakArea: 'Scheduling & dispatch',
        fix: 'Automatic schedule-change texts to customers and crews.',
      },
      {
        title: 'Upsells never get offered',
        body: 'Aeration, mulch, cleanups, and lighting are easy add-ons for customers you already serve.',
        leakArea: 'Repeat business',
        fix: 'Seasonal add-on offers sent to current customers at the right time.',
      },
      {
        title: 'Install estimates go cold',
        body: 'Patios, plantings, and hardscape are bigger decisions. Without follow-up, those estimates fade.',
        leakArea: 'Estimates & quoting',
        fix: 'Estimate follow-up that runs on its own.',
      },
      {
        title: 'Hiring is a constant scramble',
        body: 'Finding seasonal crew members takes time you do not have in the busy season.',
        leakArea: 'Hiring & crews',
        fix: 'A simple hiring page and applicant flow that screens candidates for you.',
      },
    ],
    instead:
      'I find where quotes, renewals, and billing are falling behind in your office, and I build the systems that keep them moving, so you can stay with your crews.',
    proofCaseIds: [26, 40, 25],
    offerLine: 'Run the free leak self-scan on your website and lead flow. A few minutes, no call required.',
    faqs: [
      {
        question: 'Can this help with recurring maintenance customers?',
        answer: 'Yes. Renewals, recurring billing, and seasonal add-ons are usually the fastest wins for landscapers.',
      },
      {
        question: 'Is this only for big companies?',
        answer: 'No. Smaller crews often benefit most because the owner is doing both the field work and the office work.',
      },
    ],
    ads: [
      {
        angle: 'In the field',
        hook: "You're out with the crews. The quote requests are piling up.",
        primaryText:
          "I know how busy you are in the field. While crews are out, quote requests wait, renewals slip, and invoices go out late. I find those office problems fast and fix them, so you don't have to worry about them.",
        headline: '7 things your office misses',
        cta: 'Learn More',
      },
      {
        angle: 'Renewals',
        hook: 'Did last year\'s customers get asked to renew?',
        primaryText:
          'Run a free leak scan and see where your office is losing quotes, renewals, and billing while you are in the field.',
        headline: 'Keep every recurring customer',
        cta: 'Get Offer',
      },
    ],
  },
  {
    slug: 'painting',
    trade: 'Painting',
    persona: 'Painting contractors',
    cardLine: 'Estimates and color consults slipping while you are on a ladder.',
    metaTitle: '7 Office Problems Costing Painting Contractors While You Are on the Job',
    metaDescription:
      'Painting contractors: you are on ladders and job sites all day. Find the slow estimates, missed follow-ups, and lost referrals leaking money back at the office.',
    eyebrow: 'For painting contractors',
    headline: '7 things your painting office lets slip while you are on a ladder',
    subheadline: 'You have paint on your hands and a crew to run. Estimates and follow-ups wait until tonight.',
    fieldMoment: "You're cutting in a ceiling and can't touch your phone.",
    officeMoment: 'Back at the office, estimate requests wait, sent quotes get no follow-up, and finished customers are never asked for a review.',
    reasons: [
      {
        title: 'Estimate requests wait until the end of the day',
        body: 'Homeowners usually get three quotes. The first painter to reply sets the bar.',
        leakArea: 'Speed to lead',
        fix: 'Instant replies and online estimate booking with photo upload.',
      },
      {
        title: 'Estimates are written at night',
        body: 'Measuring and pricing by hand means quotes go out late, and late quotes lose.',
        leakArea: 'Estimates & quoting',
        fix: 'Estimate templates with your rates built in, ready to send from your phone.',
      },
      {
        title: 'Sent quotes never get a second touch',
        body: 'A quote without follow-up is usually a quote someone else wins.',
        leakArea: 'Follow-up',
        fix: 'Automatic quote follow-up until the customer decides.',
      },
      {
        title: 'Deposits and final payments are chased by hand',
        body: 'Collecting deposits and final payments takes calls and texts you do not have time for.',
        leakArea: 'Invoicing & cash flow',
        fix: 'Online deposits and automatic final invoices with reminders.',
      },
      {
        title: 'Finished jobs never become reviews or referrals',
        body: 'A freshly painted house is your best ad. Most painters never ask the owner to share it.',
        leakArea: 'Reviews & reputation',
        fix: 'Review and referral requests sent automatically after every job.',
      },
      {
        title: 'Your best work is not on your website',
        body: 'Homeowners want to see your work before they call. A thin gallery loses them.',
        leakArea: 'Website',
        fix: 'A simple, fast site that shows before-and-after projects and makes requesting an estimate easy.',
      },
      {
        title: 'Past customers forget about you',
        body: 'Exteriors need repainting and rooms get redone. Customers who are not reminded call someone new.',
        leakArea: 'Repeat business',
        fix: 'Check-in messages to past customers at natural repaint times.',
      },
    ],
    instead:
      'I find where estimates, follow-up, and payments fall behind in your office, and I set up the systems that handle them, so you can keep painting.',
    proofCaseIds: [18, 26, 13],
    offerLine: 'Start with the free leak self-scan of your website and lead flow. No call required.',
    faqs: [
      {
        question: 'I do not have office staff. Does this still make sense?',
        answer: 'Yes. When you are the office, automating replies, follow-up, and billing gives you your evenings back.',
      },
      {
        question: 'Will customers know messages are automated?',
        answer: 'Messages are written in your voice and stop as soon as the customer replies or books.',
      },
    ],
    ads: [
      {
        angle: 'In the field',
        hook: "You're on a ladder. Your estimates are waiting.",
        primaryText:
          "I know how busy you are on the job. While you paint, estimate requests wait, quotes go unanswered, and reviews never get asked for. I find those office problems fast and fix them, so you don't have to worry about them.",
        headline: '7 things your office lets slip',
        cta: 'Learn More',
      },
      {
        angle: 'Evenings',
        hook: 'Still writing estimates at 10pm?',
        primaryText:
          'Run a free leak scan and see where your office is losing estimates, follow-ups, and reviews while you are on the job.',
        headline: 'Get your evenings back',
        cta: 'Get Offer',
      },
    ],
  },
  {
    slug: 'concrete',
    trade: 'Concrete',
    persona: 'Concrete and paving contractors',
    cardLine: 'Bids and pour schedules falling apart between the site and the office.',
    metaTitle: '7 Office Problems Costing Concrete and Paving Contractors',
    metaDescription:
      'Concrete and paving contractors: you are on pours and job sites all day. Find the slow bids, schedule chaos, and late billing leaking money back at the office.',
    eyebrow: 'For concrete & paving contractors',
    headline: '7 things your concrete office gets wrong while you are on a pour',
    subheadline: 'When the truck is on site, nothing else matters. That is exactly when the office drops the ball.',
    fieldMoment: "The truck is on site, the clock is running, and you're finishing a slab.",
    officeMoment: 'Back at the office, a driveway lead goes unanswered, a commercial bid is late, and weather has moved three pours that customers have not heard about.',
    reasons: [
      {
        title: 'Leads wait while you are on a pour',
        body: 'You cannot stop to answer the phone. By the time you call back, the customer has another bid.',
        leakArea: 'Missed calls',
        fix: 'Missed-call text-back and online bid requests with photos and measurements.',
      },
      {
        title: 'Bids go out late',
        body: 'Measuring, pricing, and writing bids at night means slow turnaround on the work you want most.',
        leakArea: 'Estimates & quoting',
        fix: 'Bid templates with your pricing logic, ready to send quickly.',
      },
      {
        title: 'Weather reschedules turn into phone tag',
        body: 'Rain moves pours, and every customer needs a call. Nobody has time to make them all.',
        leakArea: 'Scheduling & dispatch',
        fix: 'Automatic reschedule messages to customers and crews.',
      },
      {
        title: 'Final invoices lag behind the work',
        body: 'The job is done but the invoice waits on paperwork, and you wait on the money.',
        leakArea: 'Invoicing & cash flow',
        fix: 'Invoices sent on completion with automatic payment reminders.',
      },
      {
        title: 'Bids are never followed up',
        body: 'Many bids are not lost. They are just forgotten by both sides.',
        leakArea: 'Follow-up',
        fix: 'Automatic follow-up on every open bid.',
      },
      {
        title: 'Your finished work is invisible online',
        body: 'Driveways, patios, and lots are great proof. Without photos and reviews online, nobody sees them.',
        leakArea: 'Reviews & reputation',
        fix: 'A routine that collects job photos and reviews after every finished project.',
      },
      {
        title: 'You do not know which work pays best',
        body: 'Without tracking jobs from lead to final payment, it is hard to see which work to chase.',
        leakArea: 'Marketing tracking',
        fix: 'Simple job and lead tracking that shows where your profit comes from.',
      },
    ],
    instead:
      'I find where leads, bids, and billing fall through in your office and build the systems that handle them, so you can stay focused on the pour.',
    proofCaseIds: [19, 40, 24],
    offerLine: 'Run the free leak self-scan on your website and lead flow. A few minutes, no call required.',
    faqs: [
      {
        question: 'We do residential and commercial. Can this handle both?',
        answer: 'Yes. Residential leads usually need speed and follow-up; commercial bids need tracking and billing. I set up both.',
      },
      {
        question: 'How fast can you find the problems?',
        answer: 'The self-scan flags visible problems in a few minutes. A short call covers the rest of the office.',
      },
    ],
    ads: [
      {
        angle: 'In the field',
        hook: "The truck is on site. Who's answering your leads?",
        primaryText:
          "I know how busy you are in the field. While you're on a pour, leads wait, bids go late, and invoices lag. I find those office problems fast and fix them, so you don't have to worry about them.",
        headline: '7 things your office gets wrong',
        cta: 'Learn More',
      },
      {
        angle: 'Bids',
        hook: 'How many bids did nobody follow up on?',
        primaryText:
          'Run a free leak scan and see where your office is losing leads, bids, and billing while you are on site.',
        headline: 'Win the bids you already sent',
        cta: 'Get Offer',
      },
    ],
  },
  {
    slug: 'owner-operator',
    trade: 'Owner-operators',
    persona: 'Owner-operators who are still on the tools',
    cardLine: 'You are the tech, the salesperson, and the office. Something has to give.',
    metaTitle: '7 Office Jobs Owner-Operators Should Stop Doing Themselves',
    metaDescription:
      'Still on the tools and running the office at night? Find the office work leaking time and money from your trade business, and get it handled so you can focus on the work.',
    eyebrow: 'For owner-operators still on the tools',
    headline: '7 office jobs you should not be doing at 9pm after a day in the field',
    subheadline: 'You are the tech, the estimator, and the office. The office part is where money is leaking.',
    fieldMoment: "You're working all day, then doing estimates, invoices, and callbacks from the kitchen table at night.",
    officeMoment: 'Every day, calls go unanswered while you work, estimates go out late, and invoices wait for the weekend.',
    reasons: [
      {
        title: 'Calling back every lead yourself',
        body: 'You cannot answer while you work, and leads do not wait until evening.',
        leakArea: 'Missed calls',
        fix: 'Missed-call text-back and an answering assistant that books jobs for you.',
      },
      {
        title: 'Writing every estimate from scratch',
        body: 'Each estimate eats an hour you do not have.',
        leakArea: 'Estimates & quoting',
        fix: 'Estimate templates you can send from your phone in minutes.',
      },
      {
        title: 'Remembering who needs a follow-up',
        body: 'If it depends on your memory, it gets missed when you are busy, which is always.',
        leakArea: 'Follow-up',
        fix: 'Automatic follow-up on every estimate and lead.',
      },
      {
        title: 'Sending invoices on the weekend',
        body: 'Late invoices mean late payments and a weekend that is not really off.',
        leakArea: 'Invoicing & cash flow',
        fix: 'Invoices sent from the job when the work is done, with automatic reminders.',
      },
      {
        title: 'Scheduling by text message',
        body: 'Back-and-forth texts to find a time eat your day in small pieces.',
        leakArea: 'Scheduling & dispatch',
        fix: 'Online booking tied to your real calendar, with automatic confirmations.',
      },
      {
        title: 'Asking for reviews (or forgetting to)',
        body: 'Reviews win you work, but asking feels awkward and is easy to skip.',
        leakArea: 'Reviews & reputation',
        fix: 'A review request sent automatically after every job.',
      },
      {
        title: 'Keeping track of everything in your head',
        body: 'Customer details, job notes, and money owed live in your phone, your truck, and your memory.',
        leakArea: 'Office systems',
        fix: 'One simple system that holds every customer, job, and payment.',
      },
    ],
    instead:
      'I take the office work off your plate: I find what is leaking, set up the systems that handle it, and keep them running, so you can do the work you are actually good at.',
    proofCaseIds: [45, 40, 47],
    offerLine: 'Start with the free leak self-scan. It takes a few minutes and you can do it from the truck.',
    faqs: [
      {
        question: 'I cannot afford an office manager. Is this cheaper?',
        answer: 'Automation handles a lot of what an office manager would do, without a full-time salary. The scan shows where it would help first.',
      },
      {
        question: 'Do I have to set anything up myself?',
        answer: 'No. I set it up, connect it to what you use, and show you how it works.',
      },
    ],
    ads: [
      {
        angle: 'In the field',
        hook: 'Doing estimates at the kitchen table again tonight?',
        primaryText:
          "I know how busy you are in the field. You shouldn't also have to run the office at night. I find what's broken in the office side of your business fast and fix it, so you don't have to worry about it.",
        headline: '7 office jobs to stop doing yourself',
        cta: 'Learn More',
      },
      {
        angle: 'Office',
        hook: "You're the tech, the estimator, and the office.",
        primaryText:
          'Run a free leak scan from your truck and see which office work is costing you the most.',
        headline: 'Stop running the office at night',
        cta: 'Get Offer',
      },
    ],
  },
  {
    slug: 'growing-crews',
    trade: 'Growing crews',
    persona: 'Trade businesses growing past a few crews',
    cardLine: 'More crews, more jobs, and an office that cannot keep up.',
    metaTitle: '7 Signs Your Office Cannot Keep Up With Your Crews',
    metaDescription:
      'Growing from one crew to several? Find where scheduling, billing, and lead handling are breaking down as you grow, and get the office systems fixed fast.',
    eyebrow: 'For trade businesses running multiple crews',
    headline: '7 signs your office cannot keep up with your crews anymore',
    subheadline: 'The work is growing. The office is still running the way it did when it was just you.',
    fieldMoment: "You're driving between job sites, checking on crews, and putting out fires.",
    officeMoment: 'Back at the office, schedules collide, invoices fall behind, and nobody can tell you which crew or job is actually making money.',
    reasons: [
      {
        title: 'Schedules collide every week',
        body: 'Double-booked crews and missed appointments mean wasted labor and upset customers.',
        leakArea: 'Scheduling & dispatch',
        fix: 'One shared schedule for every crew with automatic customer confirmations.',
      },
      {
        title: 'Leads still go through you',
        body: 'Every new job still needs your call, so leads wait when you are on site.',
        leakArea: 'Speed to lead',
        fix: 'Lead intake and routing that books jobs without you in the middle.',
      },
      {
        title: 'Billing is weeks behind',
        body: 'More jobs mean more invoices, and the office cannot keep up, so cash gets tight while you are busy.',
        leakArea: 'Invoicing & cash flow',
        fix: 'Automatic invoicing on job completion and payment reminders.',
      },
      {
        title: 'You cannot see which crews make money',
        body: 'Without job costing, you do not know which crews, job types, or customers are profitable.',
        leakArea: 'Office systems',
        fix: 'A simple dashboard of jobs, labor, and revenue by crew.',
      },
      {
        title: 'Hiring takes forever',
        body: 'You need more people, and finding and screening them eats your time.',
        leakArea: 'Hiring & crews',
        fix: 'A hiring page and automated applicant screening.',
      },
      {
        title: 'Quality and reviews vary by crew',
        body: 'Some crews get great reviews and some get none. Customers notice the difference.',
        leakArea: 'Reviews & reputation',
        fix: 'Automatic review requests per job so you can see each crew\'s results.',
      },
      {
        title: 'The office manager is the only one who knows how things work',
        body: 'When one person holds the whole system in their head, a sick day stops the business.',
        leakArea: 'Office systems',
        fix: 'Documented, automated office processes anyone can follow.',
      },
    ],
    instead:
      'I find where your office is breaking under the extra work and build the systems that let it scale with your crews, so you can focus on growing instead of firefighting.',
    proofCaseIds: [19, 24, 40],
    offerLine: 'Start with the free leak self-scan, then we walk through your office on a short call.',
    faqs: [
      {
        question: 'Should I just hire another office person?',
        answer: 'Sometimes. But automating scheduling, billing, and follow-up first means the next hire does higher-value work instead of data entry.',
      },
      {
        question: 'Will my crews need to learn something new?',
        answer: 'Usually just how to mark a job done from their phone. The rest runs in the background.',
      },
    ],
    ads: [
      {
        angle: 'In the field',
        hook: 'More crews. Same office. Something is breaking.',
        primaryText:
          "I know how busy you are running crews in the field. When the office can't keep up, schedules collide and billing falls behind. I find those problems fast and fix them, so you don't have to worry about the office stuff.",
        headline: '7 signs your office is behind',
        cta: 'Learn More',
      },
      {
        angle: 'Growth',
        hook: 'Do you know which crew is making you money?',
        primaryText:
          'Run a free leak scan and see where your office is breaking down as you grow.',
        headline: 'Build an office that keeps up',
        cta: 'Get Offer',
      },
    ],
  },
];

export const PERSONA_BY_SLUG: Record<string, PersonaListicle> = Object.fromEntries(
  PERSONA_LISTICLES.map((p) => [p.slug, p]),
);

export const personaPath = (slug: string) => `/for/${slug}`;

export const TRADES_HUB_PATH = '/trades';
