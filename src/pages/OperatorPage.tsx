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
    body: 'We re-run the diagnostics on the fixed systems. Recovered revenue gets attributed. You get a written 15–30 page report and a 60-minute readout. If we keep going, the fee credits 1:1 toward the Active Case.',
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

          {/* Hero — simplified */}
          <section className="px-4 max-w-5xl mx-auto mb-20">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-3 mb-6">
                <div className="h-px w-8 bg-amber" />
                <span className="font-case text-[10px] uppercase tracking-[0.3em] text-amber">
                  Business Forensics Operator
                </span>
              </div>
              <h1 className="font-forensic text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.05]">
                Most growth-stage businesses are bleeding{" "}
                <span className="text-crimson italic">time</span>,{" "}
                <span className="text-crimson italic">leads</span>, and{" "}
                <span className="text-crimson italic">revenue</span> without knowing where.
              </h1>
              <p className="text-base md:text-lg text-muted-foreground mt-6 leading-relaxed">
                I help established businesses uncover what is actually broken beneath the surface.
                Not just your marketing.{" "}
                <span className="text-amber font-semibold">Your entire business.</span> Lead flow,
                website performance, trust signals, sales process, follow-up, internal systems,
                customer experience, operational gaps.
              </p>
              <p className="text-base md:text-lg text-muted-foreground mt-4 leading-relaxed">
                I run True Cost Forensics on your business. I show you exactly what is broken and what
                it is costing you. Then we build the systems to fix it.
              </p>
              <div className="mt-6 rounded-sm border-l-2 border-amber/60 bg-amber/5 px-5 py-4">
                <p className="text-foreground/90 text-[15px] leading-relaxed italic">
                  “I am not an agency pitching you activity. I am an operator who finds the leak and
                  closes it. No hidden timelines. No retainers. No cliché solutions. Just honest work.”
                </p>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Marine Corps veteran · MS Marketing, Liberty University, 4.0 GPA · Doctorate in Digital
                Forensics · Based in Noblesville, Indiana
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-8">
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
                  className="inline-flex items-center gap-2 text-amber font-case text-xs uppercase tracking-[0.2em] hover:gap-4 transition-all"
                >
                  <Phone className="w-3.5 h-3.5" /> Or talk to the operator
                </button>
              </div>
            </div>
          </section>

          {/* What an operator actually is — crimson left-rule */}
          <section className="px-4 max-w-3xl mx-auto mb-20">
            <div className="border-l-2 border-crimson/70 pl-6 py-2">
              <div className="font-case text-[10px] uppercase tracking-[0.3em] text-amber mb-3">
                Definition
              </div>
              <h2 className="font-forensic text-2xl md:text-3xl font-bold text-foreground italic mb-4">
                An operator is <span className="text-amber not-italic">not</span> an agency.
              </h2>
              <div className="space-y-3 text-muted-foreground text-[15px] leading-relaxed">
                <p>
                  A consultant hands you a deck. An agency pitches you activity. I sit in the chair
                  next to yours, open your CRM with you, and tell you in plain English exactly where
                  the money is bleeding out.
                </p>
                <p>
                  Then I <span className="text-amber font-semibold">fix it myself</span>, using AI,
                  automation, strategy, and digital systems built specifically for closing leaks. You
                  don't learn the tools. You don't run anything. You get the leak found and sealed.
                </p>
              </div>
            </div>
          </section>

          {/* The 12 tools the operator wields */}
          <section className="px-4 max-w-5xl mx-auto mb-20">
            <div className="max-w-2xl mb-10">
              <div className="inline-flex items-center gap-3 mb-6">
                <div className="h-px w-8 bg-amber" />
                <span className="font-case text-[10px] uppercase tracking-[0.3em] text-amber">
                  What the operator wields
                </span>
              </div>
              <h2 className="font-forensic text-3xl md:text-5xl font-bold text-foreground leading-tight">
                Twelve tools. <span className="text-amber italic">One person running all of them.</span>
              </h2>
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
                    className={`text-left rounded-sm border px-4 py-3 transition-all ${isOpen ? 'border-amber/60 bg-amber/[0.04]' : 'border-border/60 hover:border-amber/40'}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <Wrench className="w-4 h-4 text-amber shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground/90 flex-1">{t.name}</span>
                      <ChevronDown className={`w-4 h-4 text-amber shrink-0 mt-0.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                    {isOpen && (
                      <div className="mt-3 pt-3 border-t border-amber/20">
                        <p className="text-[13px] text-muted-foreground leading-relaxed">{t.usedFor}</p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Engagement timeline */}
          <section className="px-4 max-w-5xl mx-auto mb-20">
            <div className="max-w-2xl mb-10">
              <div className="inline-flex items-center gap-3 mb-6">
                <div className="h-px w-8 bg-amber" />
                <span className="font-case text-[10px] uppercase tracking-[0.3em] text-amber">
                  What an engagement looks like
                </span>
              </div>
              <h2 className="font-forensic text-3xl md:text-5xl font-bold text-foreground leading-tight">
                Three weeks. <span className="text-amber italic">Then we re-measure.</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {PHASES.map((p) => {
                const Icon = p.icon;
                return (
                  <div key={p.title} className="rounded-sm border border-border/60 p-6 hover:border-amber/40 transition-colors">
                    <div className="flex items-center gap-2 mb-4">
                      <Icon className="w-4 h-4 text-amber" />
                      <div className="font-case text-[10px] uppercase tracking-[0.2em] text-amber">
                        {p.range}
                      </div>
                    </div>
                    <h3 className="font-forensic text-xl font-bold text-foreground mb-2">{p.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Bundles teaser — slim */}
          <section className="px-4 max-w-3xl mx-auto text-center pt-8 border-t border-border/40">
            <Link
              to="/catalog"
              className="inline-flex items-center gap-2 text-amber font-case text-xs uppercase tracking-[0.2em] hover:gap-4 transition-all"
            >
              See the operator-led bundles <ArrowRight className="w-4 h-4" />
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
