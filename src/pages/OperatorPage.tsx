import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Wrench, Search, Hammer, ShieldCheck, Calendar, Phone, ChevronDown } from 'lucide-react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { BOOK_MEETING_URL } from '@/lib/links';

const OPERATOR_WIELDS: { name: string; usedFor: string }[] = [
  {
    name: 'Full Website Report',
    usedFor: 'Operator runs a deep crawl of your site for SEO, speed, conversion, and trust leaks. You get a written list of every reason a lead landed and left — and what it cost.',
  },
  {
    name: 'Brand Contradiction Finder',
    usedFor: 'Operator audits every public surface (site, socials, email, sales decks) for the places your promise contradicts your delivery. Contradictions kill close rates. We name them.',
  },
  {
    name: 'Friction Vocabulary Audit',
    usedFor: 'Operator reads your copy the way a skeptical buyer reads it. Flags the exact words, claims, and CTAs that make a ready buyer hesitate. Then rewrites them.',
  },
  {
    name: 'Sales Script Pack',
    usedFor: 'Operator builds custom discovery, objection, and close scripts in your voice for your top 3 deal types. Used live by your reps inside 7 days.',
  },
  {
    name: 'Follow-Up System Plan',
    usedFor: 'Operator designs the multi-touch cadence (email + SMS + call windows) that catches the 60–70% of leads dying in week two. Built once, runs forever.',
  },
  {
    name: 'Strategic Question Engine',
    usedFor: 'Operator surfaces the questions your team has stopped asking — about pricing, hiring, churn, capacity. The ones that turn 3am spirals into Monday plans.',
  },
  {
    name: '30-Day Content Calendar',
    usedFor: 'Operator plans every post, email, and lead magnet for the next 30 days, mapped to the leaks they plug. No more posting to feed the algorithm.',
  },
  {
    name: 'Social Content Pack',
    usedFor: 'Operator drafts 30+ pieces of social content (LinkedIn, IG, email) in your voice, derived from your real wins, losses, and field notes.',
  },
  {
    name: 'Digital Snapshot',
    usedFor: 'Operator captures your full digital footprint at a single moment — site, reviews, search position, ad spend, social — and benchmarks it. We re-run it post-engagement to prove lift.',
  },
  {
    name: 'Strategy Blueprint',
    usedFor: 'Operator hands you a 15–30 page written plan: the three leaks worth fixing first, the dollars attached, the systems to rebuild, the order to do it in.',
  },
  {
    name: 'Lead-Nurture Automation',
    usedFor: 'Operator wires up the CRM workflows, triggers, and AI agents that nurture leads while you sleep. Built in your stack or ours.',
  },
  {
    name: 'Premium Tech Suite (CRM, automation, AI agents)',
    usedFor: 'The proprietary stack the operator wields on your behalf — CRM build, automation engine, AI sales agents, reporting. You never log in. The operator runs it.',
  },
];

const PHASES = [
  {
    range: 'Days 1–7',
    icon: Search,
    title: 'Forensic discovery',
    body: 'Operator embeds, pulls every signal — website, CRM, sales follow-up, content, ops. You answer questions. You do not run software. The operator does.',
  },
  {
    range: 'Days 8–21',
    icon: Hammer,
    title: 'Leak triage + system rebuild',
    body: 'Every leak gets named, sized in dollars, and ranked. The operator rebuilds the systems causing the top three — scripts, follow-up cadences, content engines, automations — using your stack or ours.',
  },
  {
    range: 'Days 22–60',
    icon: ShieldCheck,
    title: 'Re-measure + hand-off',
    body: 'We re-run the diagnostics on the fixed systems. Recovered revenue gets attributed. You get a written 15–30 page report and a 60-minute readout. If we keep going, the fee credits 1:1 toward the Implementation Retainer.',
  },
];

const OperatorPage: React.FC = () => {
  const [contactOpen, setContactOpen] = useState(false);
  const [openTool, setOpenTool] = useState<string | null>(null);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Meet Your Business Forensics Operator | Aetheris"
        description="We don't sell tools. We pair you with an operator who sits down with you, finds every revenue leak, and rebuilds the systems causing them. Indianapolis-based, US-wide."
        path="/operator"
        keywords="business forensics operator, fractional operator, revenue leak audit, embedded operator, Indianapolis"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Operator', path: '/operator' }]}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setContactOpen(true)} />
        <main className="pt-28 pb-20">

          {/* Hero */}
          <section className="px-4 max-w-5xl mx-auto text-center mb-16">
            <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-3">
              The operator is the product
            </div>
            <h1 className="font-forensic text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.05]">
              You don't need more tools. <br className="hidden md:block" />
              You need an <span className="text-amber italic">operator</span> running them.
            </h1>
            <p className="text-base md:text-xl text-foreground/85 mt-6 max-w-3xl mx-auto leading-relaxed">
              We pair you with a Business Forensics Operator who sits down with you, finds every leak
              in your business, and crafts the solutions so you don't have to. The stack we wield would
              take you 18 months and six hires to assemble. You skip all of it.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
              <a
                href={BOOK_MEETING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-amber text-background font-bold px-6 py-3 rounded-sm hover:-translate-y-0.5 transition-transform"
              >
                <Calendar className="w-4 h-4" /> Book a 15-min fit call
              </a>
              <button
                type="button"
                onClick={() => setContactOpen(true)}
                className="inline-flex items-center gap-2 border border-amber/50 text-amber font-bold px-6 py-3 rounded-sm hover:bg-amber/10 transition-colors"
              >
                <Phone className="w-4 h-4" /> Talk to the operator
              </button>
            </div>
          </section>

          {/* What an operator actually is */}
          <section className="px-4 max-w-4xl mx-auto mb-16">
            <div className="forensic-tile rounded-sm border border-amber/30 p-7 md:p-10">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
                Definition · Read this slowly
              </div>
              <h2 className="font-forensic text-2xl md:text-4xl font-bold text-foreground leading-tight mb-4">
                A Business Forensics Operator is <span className="text-amber italic">not</span> a consultant.
              </h2>
              <div className="space-y-3 text-foreground/85 text-[15px] leading-relaxed">
                <p>
                  A consultant hands you a deck. An agency hands you an invoice and a Slack channel full of
                  juniors. A SaaS hands you a login and walks away.
                </p>
                <p>
                  An operator sits in the chair next to yours, opens your CRM with you, watches your sales
                  team take a call, reads your last 90 days of follow-up email, and tells you — in plain
                  English — exactly where the money is bleeding out of the building.
                </p>
                <p>
                  Then they <span className="text-amber font-semibold">fix it themselves</span>, using a
                  stack of 12+ proprietary tools they've built specifically for finding and plugging revenue
                  leaks. You don't learn the tools. You don't pay per seat. You don't run anything. That's
                  the entire promise.
                </p>
                <p className="border-l-2 border-crimson/60 pl-3 font-forensic text-base md:text-lg text-foreground">
                  Diagnosis first. Solution second. <span className="text-crimson">Results always.</span>
                </p>
              </div>
            </div>
          </section>

          {/* The 12 tools the operator wields */}
          <section className="px-4 max-w-5xl mx-auto mb-16">
            <div className="text-center mb-8">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
                What the operator brings to the chair
              </div>
              <h2 className="font-forensic text-3xl md:text-5xl font-bold text-foreground leading-tight">
                Twelve tools. <span className="text-amber italic">One person wielding all of them.</span>
              </h2>
              <p className="text-sm text-muted-foreground mt-3 max-w-2xl mx-auto">
                None of these are sold individually. They were built to be run as a sequence by someone who
                knows what they're looking for. That someone is your operator.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {OPERATOR_WIELDS.map((t) => {
                const isOpen = openTool === t.name;
                return (
                  <button
                    type="button"
                    key={t.name}
                    onClick={() => setOpenTool(isOpen ? null : t.name)}
                    aria-expanded={isOpen}
                    className={`text-left forensic-tile rounded-sm border px-4 py-3 transition-all ${isOpen ? 'border-amber/60 bg-amber/[0.04]' : 'border-border/60 hover:border-amber/40'}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <Wrench className="w-4 h-4 text-amber shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground/90 flex-1">{t.name}</span>
                      <ChevronDown className={`w-4 h-4 text-amber shrink-0 mt-0.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                    {isOpen && (
                      <div className="mt-3 pt-3 border-t border-amber/20">
                        <div className="font-case text-[9px] uppercase tracking-widest text-amber mb-1.5">
                          What the operator uses it for
                        </div>
                        <p className="text-[13px] text-foreground/80 leading-relaxed">{t.usedFor}</p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Engagement timeline */}
          <section className="px-4 max-w-5xl mx-auto mb-16">
            <div className="text-center mb-8">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
                What an engagement looks like
              </div>
              <h2 className="font-forensic text-3xl md:text-5xl font-bold text-foreground leading-tight">
                Three weeks. <span className="text-amber italic">Then we re-measure.</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {PHASES.map((p) => {
                const Icon = p.icon;
                return (
                  <div key={p.title} className="forensic-tile rounded-sm border border-amber/30 p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-9 h-9 rounded-sm bg-amber/10 border border-amber/30 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-amber" />
                      </div>
                      <div className="font-case text-[10px] uppercase tracking-widest text-amber">
                        {p.range}
                      </div>
                    </div>
                    <h3 className="font-forensic text-xl font-bold text-foreground mb-2">{p.title}</h3>
                    <p className="text-sm text-foreground/80 leading-relaxed">{p.body}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Why you can't buy the tools alone */}
          <section className="px-4 max-w-4xl mx-auto mb-16">
            <div className="forensic-tile rounded-sm border-l-4 border-crimson/60 border-y border-r border-border/60 p-7 md:p-9 bg-crimson/[0.03]">
              <div className="font-case text-[10px] uppercase tracking-widest text-crimson mb-2">
                Hard rule
              </div>
              <h2 className="font-forensic text-2xl md:text-3xl font-bold text-foreground mb-3">
                You cannot buy the tools alone. Ever.
              </h2>
              <p className="text-foreground/85 leading-relaxed">
                We get the request weekly. The answer is no. A scan you don't know how to read is worse
                than no scan. A script you can't deliver in your own voice underperforms the one you have.
                A follow-up plan without someone enforcing the cadence dies in week two. Every leak we've
                ever found started as a tool nobody was operating.
              </p>
            </div>
          </section>

          {/* Bundles teaser */}
          <section className="px-4 max-w-3xl mx-auto text-center">
            <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
              Pick a door
            </div>
            <h2 className="font-forensic text-3xl md:text-4xl font-bold text-foreground mb-3">
              Three operator-led bundles. <span className="text-amber italic">$2,500 to $10,000.</span>
            </h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-2xl mx-auto">
              Signal Pack to find the leak. Revenue Pack to fix the sales engine. Operator Suite for three
              embedded weeks. Above all three sit the flagships — the $18,500 Diagnostic and the $15K/mo
              Retainer.
            </p>
            <Link
              to="/catalog"
              className="inline-flex items-center gap-2 bg-amber text-background font-bold px-6 py-3 rounded-sm hover:-translate-y-0.5 transition-transform"
            >
              See the bundles <ArrowRight className="w-4 h-4" />
            </Link>
          </section>

        </main>
        <Footer />
      </div>
      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
};

export default OperatorPage;
