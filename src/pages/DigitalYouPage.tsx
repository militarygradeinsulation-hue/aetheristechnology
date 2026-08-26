import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';

const SITE = 'https://aetheris.technology';

type Section = {
  no: string;
  title: string;
  lede?: string;
  body?: string[];
  list?: { label: string; text: string }[];
  bullets?: string[];
  pull?: string;
  flow?: string[];
};

const SECTIONS: Section[] = [
  {
    no: '01',
    title: 'The Problem',
    lede: 'Companies spend most of their energy moving knowledge from one human head into another.',
    body: [
      'A founder hires someone. They explain the company. They explain the customer. They explain the tone. They explain what matters and what never happens here. They explain how decisions get made. Then they review the work. They correct the mistakes. They rewrite the messages. They answer the same questions again.',
      'Eventually the employee understands the role. Then the employee leaves. The knowledge leaves with them. The cycle restarts at zero.',
      'Software does not solve this. CRM remembers contacts. Project tools remember tasks. Email remembers threads. Accounting remembers transactions. Assistants remember fragments of conversation. Almost nothing preserves the reasoning layer that connects all of them.',
    ],
    bullets: [
      'Why choose this customer over that one.',
      'Why a message sounds wrong even when it is technically correct.',
      'Why call this person instead of emailing them.',
      'What makes an opportunity feel untrustworthy.',
      'What information is required before an expensive decision.',
      'What "good enough" actually means here.',
      'When to move fast. When to slow down.',
      'What would never be said to a client.',
    ],
    pull: 'That reasoning layer is not a workflow. It is operational identity.',
  },
  {
    no: '02',
    title: 'The Concept',
    lede: 'Digital You is a personal intelligence operating system. At the center sits the Digital Core.',
    body: [
      'The Digital Core is the persistent model of one person. It learns from instruction, writing samples, email, approved responses, documents, projects, decisions, meeting notes, strategy, corrections, goals, wins, failures, company records, and connected systems.',
      'Traditional automation asks what workflow should fire after a trigger. Digital You asks a different question: what would this person notice, think about, and do next.',
    ],
    pull: 'Do not teach AI a workflow. Teach it you.',
  },
  {
    no: '03',
    title: 'You Become the Operating System',
    body: [
      'Automation logic runs on a fixed chain: trigger, rule, condition, action, delay, branch, action. Digital You runs on identity: situation, context, memory, decision DNA, standards, goal, recommended action.',
      'A founder explains once: when a client gets frustrated, the priority is not a perfectly written email. The priority is finding out whether the relationship itself is in danger. If it is, pick up the phone.',
      'Later a similar situation appears. The system does not run an angry email playbook. It evaluates the situation against the founder\u2019s decision patterns and returns a call with reasoning attached.',
    ],
    list: [
      { label: 'Confidence', text: '92 percent. You would call this customer rather than continue the thread.' },
      { label: 'Relationship risk', text: 'High. Trust signals are degrading across the last three exchanges.' },
      { label: 'History', text: 'Repeat purchaser. Meaningful future value on the account.' },
      { label: 'Precedent', text: 'Prior corrections show you prefer direct voice contact when trust is at risk.' },
    ],
  },
  {
    no: '04',
    title: 'The Digital Core',
    lede: 'The master identity layer. Everything else inherits from it.',
    list: [
      { label: 'Identity', text: 'Who the person is professionally and how they describe the role.' },
      { label: 'Mission', text: 'The outcomes they are trying to create.' },
      { label: 'Principles', text: 'The rules they refuse to compromise.' },
      { label: 'Standards', text: 'What qualifies as acceptable work.' },
      { label: 'Communication', text: 'How they write, speak, explain, persuade, disagree, apologize, negotiate, present.' },
      { label: 'Decision DNA', text: 'How they weigh risk, opportunity, evidence, people, timing, money, uncertainty.' },
      { label: 'Style DNA', text: 'Vocabulary, sentence structure, humor, detail level, directness, formatting, visual preference.' },
      { label: 'Knowledge', text: 'What they have learned about customers, markets, processes, and people.' },
      { label: 'Memory', text: 'Events, decisions, conversations, lessons, promises, outcomes, relationships.' },
      { label: 'Goals', text: 'What they are currently trying to accomplish.' },
      { label: 'Corrections', text: 'Every place the model got the person wrong and what changes because of it.' },
    ],
  },
  {
    no: '05',
    title: 'My Digital Team',
    lede: 'Once the Core exists, specialized versions of the same person can be issued.',
    list: [
      { label: 'Executive You', text: 'Priorities, strategy, risk, investment, organizational issues, company direction.' },
      { label: 'Marketing You', text: 'Brand philosophy, positioning, customer beliefs, content standards, voice.' },
      { label: 'Operations You', text: 'Bottlenecks, handoffs, deadlines, accountability, resource failure.' },
      { label: 'Research You', text: 'Competitors, markets, technologies, documents, open questions.' },
      { label: 'Content You', text: 'Posts, articles, scripts, campaigns, email, messaging in the person\u2019s Style DNA.' },
      { label: 'Customer You', text: 'Support and client communication under the person\u2019s relationship philosophy.' },
    ],
    body: [
      'These are not separate bots. They are specialized extensions of one Core. Role specific knowledge develops without contaminating unrelated territory.',
    ],
    flow: ['You', 'Digital Core', 'Executive · Marketing · Operations · Research · Content · Customer'],
  },
  {
    no: '06',
    title: 'Thought Capture',
    lede: 'The system needs the thinking that produced the work, not only the finished work.',
    bullets: [
      'What makes you immediately distrust a proposal.',
      'When someone disagrees with you, what makes you reconsider.',
      'What causes you to abandon an opportunity.',
      'When speed conflicts with perfection, which one wins.',
      'What you need to know before an expensive decision.',
      'What you would never say to a customer.',
      'Show something that sounds exactly like you.',
      'Show something that sounds nothing like you.',
    ],
    body: ['No programming. Plain answers become structured behavioral intelligence.'],
  },
  {
    no: '07',
    title: 'Decision DNA',
    lede: 'Every decision is captured in eight fields.',
    list: [
      { label: 'Situation', text: 'What happened.' },
      { label: 'Signals', text: 'What the person noticed first.' },
      { label: 'Considerations', text: 'Which factors carried weight.' },
      { label: 'Risks', text: 'What could go wrong.' },
      { label: 'Goal', text: 'Which outcome mattered most.' },
      { label: 'Decision', text: 'What was chosen.' },
      { label: 'Reason', text: 'Why.' },
      { label: 'Outcome', text: 'What happened afterward.' },
    ],
    body: ['Across hundreds of records the patterns surface. The system starts recognizing situations that rhyme with earlier ones. That is when decision support becomes real.'],
  },
  {
    no: '08',
    title: 'Style DNA',
    body: [
      'Most systems imitate surface writing style. Style DNA models word choice, sentence length, tone, humor, directness, formatting, persuasion pattern, explanation depth, storytelling, the phrases used constantly, the phrases avoided completely, and how tone shifts by audience.',
      'The system notices a person keeps rewriting "Thank you for reaching out" into "Appreciate you reaching out." It does not silently mutate itself. It asks.',
    ],
    pull: 'Digital You learned: you prefer conversational gratitude over formal openings. Add this to Communication DNA?',
    body2: true as unknown as never,
  },
  {
    no: '09',
    title: 'Memory Graph',
    lede: 'Memory is not a pile of notes. It is a graph.',
    flow: ['Person', 'Company', 'Opportunity', 'Decision', 'Outcome', 'Lesson'],
    body: [
      'A question like "why do I distrust this strategy" gets answered from similar strategies previously evaluated, what was decided then, and what happened afterward.',
      'Memory stops being recall. It becomes decision context.',
    ],
  },
  {
    no: '10',
    title: 'What Would I Do',
    lede: 'Feed it an email, a proposal, a complaint, a contract, a campaign, a management problem, or a hard call.',
    list: [
      { label: 'Predicted action', text: 'What the system believes the person would do.' },
      { label: 'Confidence', text: 'How strongly the evidence supports it.' },
      { label: 'Reasoning', text: 'Which factors drove the call.' },
      { label: 'Supporting memory', text: 'The prior decisions it leaned on.' },
      { label: 'Suggested action', text: 'What to do next.' },
    ],
    body: ['Two responses close the loop. Do it as me. Or, that is not me. Both make the model sharper.'],
  },
  {
    no: '11',
    title: 'That Is Not Me',
    body: [
      'Corrections are the most valuable data in the architecture. The tone was too formal. The decision was too cautious. It ignored a relationship. It optimized for money when reputation was the real asset. It misread a principle.',
      'Every rejection becomes evidence.',
    ],
    flow: ['Generation', 'Correction', 'Learning', 'Better generation'],
  },
  {
    no: '12',
    title: 'Goal Engine',
    lede: 'State the outcome. Not the steps.',
    body: [
      'Example: increase qualified leads from manufacturers without sounding like a generic AI company.',
      'The Goal Engine decomposes that into research, competitor analysis, segmentation, content, campaign planning, outreach, measurement, follow up, and optimization. Then it assigns the work across the digital roles.',
    ],
  },
  {
    no: '13',
    title: 'Idea Engine',
    lede: 'What would this person notice if they had unlimited time?',
    bullets: [
      'An overlooked opportunity.',
      'A customer pattern forming quietly.',
      'A competitor weakness.',
      'An inconsistent brand message.',
      'An inefficient process.',
      'An unfinished project.',
      'A recurring complaint.',
      'A potential partnership.',
      'A developing risk.',
    ],
    body: ['This is the shift from reactive assistant to proactive intelligence layer.'],
  },
  {
    no: '14',
    title: 'Watchtower',
    body: [
      'With authorized integrations the system observes email, CRM records, analytics, projects, reports, customer activity, marketing performance, financial indicators, calendar, and documents.',
      'It filters everything through one question: would the real person care about this? Most of it stays hidden. Only what deserves human attention surfaces.',
    ],
    pull: 'Stop hunting through systems for problems. The problems come to you.',
  },
  {
    no: '15',
    title: 'Live Work',
    lede: 'Full visibility into what every version of you is doing right now.',
    bullets: [
      'Research You is comparing three competitors.',
      'Marketing You is preparing five campaign concepts.',
      'Operations You flagged two overdue handoffs.',
      'Executive You is reviewing an investment decision.',
      'Content You created four posts awaiting approval.',
      'Customer You drafted three responses.',
    ],
    body: ['You stop managing AI chats. You manage a workforce built from yourself.'],
  },
  {
    no: '16',
    title: 'Autonomy Controls',
    lede: 'Unlimited AI authority is never the default.',
    list: [
      { label: 'Observe', text: 'Watches and learns. Takes no action.' },
      { label: 'Recommend', text: 'Suggests what the person should do.' },
      { label: 'Draft', text: 'Produces work for approval.' },
      { label: 'Execute with approval', text: 'Prepares the action and fires only after authorization.' },
      { label: 'Autonomous', text: 'Performs pre approved categories of work without individual sign off.' },
    ],
    body: [
      'Authority varies by action. Marketing You may analyze campaign performance freely, draft posts freely, require approval to publish, and never approve ad spend above a set ceiling. Executive You may recommend strategy and never sign a contract.',
    ],
  },
  {
    no: '17',
    title: 'Proof and Accountability',
    lede: 'No black box. Every meaningful action leaves evidence.',
    bullets: [
      'Who acted and which role performed the work.',
      'What happened and why.',
      'Which information and memories influenced it.',
      'The confidence level at the time.',
      'Whether a human approved it.',
      'What external action fired.',
      'What outcome followed.',
    ],
    body: ['This is accountability and training data in the same record. It is also the only honest way to measure whether the model is getting more accurate.'],
  },
  {
    no: '18',
    title: 'Identity Confidence',
    lede: 'The system never claims to be the person. It reports how well it knows them.',
    list: [
      { label: 'Communication fidelity', text: '91 percent' },
      { label: 'Decision consistency', text: '82 percent' },
      { label: 'Writing style match', text: '94 percent' },
      { label: 'Memory coverage', text: '68 percent' },
      { label: 'Business context coverage', text: '87 percent' },
    ],
    body: ['Measured confidence beats a system pretending to be someone it has only partially learned.'],
  },
  {
    no: '19',
    title: 'Integration With Aetheris',
    lede: 'The Golden Report finds what is broken. Digital You decides what to do about it.',
    flow: ['Golden Report', 'Company Intelligence', 'Digital You', 'Digital Team', 'Goal Engine', 'Execution', 'Proof', 'Rescan'],
    body: ['The report names revenue leaks, operational gaps, conversion failures, messaging contradictions, and strategic exposure. Digital You applies the owner\u2019s thinking to every finding. Instead of a static report, the company receives an operating system built to act on the diagnosis.'],
  },
  {
    no: '20',
    title: 'Worked Example',
    lede: 'A Golden Report names three problems: weak lead follow up, inconsistent messaging, long sales cycle delays.',
    bullets: [
      'Marketing You rewrites the messaging contradictions into corrected content.',
      'Sales You surfaces stalled opportunities and prepares personalized follow ups.',
      'Operations You isolates the handoff creating the response delay.',
      'Executive You ranks the three by financial exposure.',
    ],
    list: [
      { label: 'Your attention', text: 'One decision requires you.' },
      { label: 'Content produced', text: '14 pieces awaiting approval.' },
      { label: 'Pipeline', text: '23 stalled opportunities identified.' },
      { label: 'Operations', text: 'Recurring lead routing failure located.' },
      { label: 'Time returned', text: '11.4 hours this week.' },
    ],
    pull: 'The owner manages outcomes. Not tasks.',
  },
  {
    no: '21',
    title: 'Voice and Face',
    body: [
      'With explicit authorization the Core can connect to voice synthesis, avatars, video, presentations, phone systems, and interactive training.',
      'A synthetic face that looks like someone is not Digital You. A voice that sounds like someone is not Digital You. Voice and appearance are interfaces. The intelligence underneath is the Core.',
    ],
    pull: 'Digital You is memory plus thinking plus standards plus communication plus goals plus decisions plus context.',
  },
  {
    no: '22',
    title: 'Long Term Memory and Legacy',
    body: [
      'Most professional knowledge disappears. Companies lose it when employees leave. Founders lose it when the business changes hands. Families lose it when a generation passes.',
      'Legacy Mode preserves the stories, the standards, the decisions, and the reasoning that produced a career. The operating knowledge outlives the calendar.',
    ],
  },
];

const DigitalYouPage: React.FC = () => {
  const [contactOpen, setContactOpen] = useState(false);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Digital You: A Personal Intelligence Operating System',
    description:
      'Aetheris white paper on Digital You, a persistent Digital Core that models how one person thinks, decides, communicates, and works, then issues specialized digital roles from it.',
    url: `${SITE}/digital-you`,
    author: { '@type': 'Person', name: 'Joseph Toney' },
    publisher: { '@type': 'Organization', name: 'Aetheris' },
  };

  return (
    <>
      <Helmet>
        <title>Digital You: Personal Intelligence Operating System | Aetheris</title>
        <meta
          name="description"
          content="Aetheris white paper. Digital You builds a persistent Digital Core of how one person thinks, decides, and communicates, then issues specialized digital roles from it."
        />
        <link rel="canonical" href={`${SITE}/digital-you`} />
        <meta property="og:title" content="Digital You: A Personal Intelligence Operating System" />
        <meta property="og:description" content="Do not teach AI a workflow. Teach it you. The Aetheris white paper on the Digital Core." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`${SITE}/digital-you`} />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <Navbar onContactClick={() => setContactOpen(true)} />

      <article className="min-h-screen bg-background text-foreground">
        {/* Cover */}
        <header className="border-b border-border/60">
          <div className="container mx-auto max-w-3xl px-4 py-16 md:py-24">
            <p className="font-case text-[10px] uppercase tracking-[0.28em] text-amber mb-6">
              White Paper · Aetheris Technology · Case File DY 01
            </p>
            <h1 className="font-serif text-5xl md:text-7xl font-semibold leading-[0.95] tracking-tight mb-6">
              Digital <span className="text-crimson italic">You</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              A personal intelligence operating system for scaling how you think, decide, communicate, and work.
            </p>
            <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-px bg-border/60 border border-border/60">
              {[
                ['Author', 'Joseph Toney'],
                ['Discipline', 'Chaos Theory Forensics'],
                ['Status', 'Active'],
                ['Sections', '22'],
              ].map(([k, v]) => (
                <div key={k} className="bg-background p-4">
                  <div className="font-case text-[9px] uppercase tracking-[0.2em] text-muted-foreground">{k}</div>
                  <div className="font-case text-xs mt-1">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* Executive summary */}
        <section className="border-b border-border/60 bg-muted/20">
          <div className="container mx-auto max-w-3xl px-4 py-14 md:py-20">
            <p className="font-case text-[10px] uppercase tracking-[0.24em] text-crimson mb-4">Executive Summary</p>
            <div className="space-y-5 text-base md:text-lg leading-relaxed text-muted-foreground">
              <p>
                Most artificial intelligence is built around tasks. Write this email. Summarize this document. Build this
                workflow. Analyze this spreadsheet. Answer this customer.
              </p>
              <p className="text-foreground">
                Digital You is built around a person. Instead of teaching software what to do over and over, it learns how
                one individual operates: communication style, standards, preferences, decision patterns, knowledge,
                priorities, corrections, and memory. That intelligence becomes a persistent Digital Core.
              </p>
              <p>
                From that Core, specialized versions get issued. Marketing You. Operations You. Research You. Executive You.
                Content You. Customer Success You. Different jobs, one identity, one set of standards, one decision logic,
                one approved memory.
              </p>
              <p>
                The claim is not that software becomes a human consciousness. The claim is narrower and more useful. Digital
                You builds an increasingly accurate operational model of how a person thinks and works, and puts that model
                to work across the company.
              </p>
            </div>
            <blockquote className="mt-10 border-l-2 border-crimson pl-5">
              <p className="font-serif italic text-2xl md:text-3xl leading-snug">
                Do not teach AI a workflow. Teach it you.
              </p>
            </blockquote>
          </div>
        </section>

        {/* Sections */}
        <div className="container mx-auto max-w-3xl px-4 py-14 md:py-20 space-y-16 md:space-y-24">
          {SECTIONS.map((s) => (
            <section key={s.no} id={`s${s.no}`} className="scroll-mt-24">
              <div className="flex items-baseline gap-4 mb-4">
                <span className="font-case text-[11px] text-crimson tracking-[0.2em]">{s.no}</span>
                <h2 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight">{s.title}</h2>
              </div>

              {s.lede && <p className="text-lg md:text-xl leading-relaxed mb-6">{s.lede}</p>}

              {s.body?.map((p, i) => (
                <p key={i} className="text-base leading-relaxed text-muted-foreground mb-4">
                  {p}
                </p>
              ))}

              {s.bullets && (
                <ul className="my-6 space-y-2">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex gap-3 text-base text-muted-foreground">
                      <span className="text-amber mt-1 text-[10px]">■</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}

              {s.list && (
                <dl className="my-6 border border-border/60 divide-y divide-border/60">
                  {s.list.map((row) => (
                    <div key={row.label} className="grid grid-cols-1 sm:grid-cols-[minmax(0,11rem)_1fr] gap-1 sm:gap-4 p-4">
                      <dt className="font-case text-[10px] uppercase tracking-[0.18em] text-amber pt-1">{row.label}</dt>
                      <dd className="text-base text-muted-foreground">{row.text}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {s.flow && (
                <div className="my-6 flex flex-wrap items-center gap-2">
                  {s.flow.map((step, i) => (
                    <React.Fragment key={step}>
                      <span className="font-case text-[10px] uppercase tracking-[0.16em] border border-border/60 px-3 py-2">
                        {step}
                      </span>
                      {i < s.flow!.length - 1 && <span className="text-crimson text-xs">▸</span>}
                    </React.Fragment>
                  ))}
                </div>
              )}

              {s.pull && (
                <blockquote className="mt-8 border-l-2 border-amber pl-5">
                  <p className="font-serif italic text-xl md:text-2xl leading-snug">{s.pull}</p>
                </blockquote>
              )}
            </section>
          ))}
        </div>

        {/* Close */}
        <section className="border-t border-border/60 bg-muted/20">
          <div className="container mx-auto max-w-3xl px-4 py-16 text-center">
            <p className="font-case text-[10px] uppercase tracking-[0.24em] text-crimson mb-4">End of White Paper</p>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold mb-4">
              The most valuable operating knowledge in the company is the person running it.
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              Aetheris finds where the business is leaking. Digital You decides what the owner would do about it.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                to="/methodology"
                className="font-case text-[11px] uppercase tracking-[0.18em] border border-amber text-amber px-6 py-3 hover:bg-amber hover:text-background transition-colors"
              >
                Read the methodology
              </Link>
              <button
                onClick={() => setContactOpen(true)}
                className="font-case text-[11px] uppercase tracking-[0.18em] border border-border px-6 py-3 hover:border-crimson hover:text-crimson transition-colors"
              >
                Talk to the operator
              </button>
            </div>
          </div>
        </section>
      </article>

      <Footer />
      <ContactModal open={contactOpen} onOpenChange={setContactOpen} />
    </>
  );
};

export default DigitalYouPage;
