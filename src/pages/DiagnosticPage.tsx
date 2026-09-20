import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar } from 'lucide-react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { BOOK_MEETING_URL } from '@/lib/links';
import {
  CORE_PROMISE,
  HERO_SUPPORT,
  CTA,
  ENGAGEMENT_STAGES,
  ENGAGEMENT_STAGES_HEADLINE,
  ENGAGEMENT_STAGES_INTRO,
  FOUNDER_TRUST,
  EXPECTATION_NOTE,
} from '@/lib/engagementModel';

const WE_INVESTIGATE: string[] = [
  'Lead-to-contact, deal-stage progression, and touch-frequency in your CRM',
  'Your website, sales funnel, and follow-up sequence for where prospects fall out',
  'Brand and messaging contradictions that quietly cost trust and pricing power',
  'Content and search visibility decay, and where competitors are pulling ahead',
  'Operational bottlenecks and hand-off gaps between marketing, sales, and delivery',
];

const DiagnosticPage: React.FC = () => {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <div className="relative min-h-screen text-foreground overflow-x-hidden">
      <SEOHead
        title="How the Relationship Begins | Aetheris"
        description="Aetheris investigates where specialty manufacturers $5M-$25M are losing revenue, then helps fix it. Meet, investigate, fix, recover, earn the partnership."
        path="/diagnostic"
        keywords="revenue diagnostic, manufacturing CRM audit, sales operations diagnostic, revenue leak investigation"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'How the Relationship Begins', path: '/diagnostic' }]}
      />
      <Background />

      {/* subtle ambient wash — matches home */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.06] mix-blend-overlay z-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, hsl(var(--amber)) 0%, transparent 40%), radial-gradient(circle at 80% 70%, hsl(var(--crimson, 0 60% 45%)) 0%, transparent 45%)",
        }}
      />

      <div className="relative z-10">
        <Navbar onContactClick={() => setContactOpen(true)} />

        <main className="px-4 pt-24 pb-12">
          <div className="max-w-4xl mx-auto">
            {/* HERO — matches home Chaos Theory Forensics rhythm */}
            <section className="text-center animate-fade-in">
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="h-px w-8 bg-amber/50" />
                <span className="text-[9px] tracking-[0.35em] font-mono text-amber/80 uppercase">
                  Case File · Specialty Manufacturers · $5M–$25M
                </span>
                <span className="h-px w-8 bg-amber/50" />
              </div>
              <h1 className="font-forensic text-3xl sm:text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight">
                {CORE_PROMISE}
              </h1>
              <p className="mt-4 text-base sm:text-lg text-foreground/85 max-w-2xl mx-auto">
                {HERO_SUPPORT}
              </p>
              <p className="mt-3 font-case text-[11px] uppercase tracking-[0.28em] text-amber/80">
                No plan to pick. No cart to fill. Just a relationship earned through results.
              </p>

              {/* video */}
              <div className="mt-6 max-w-3xl mx-auto">
                <div className="shimmer-gold-border rounded-sm">
                  <div className="relative w-full rounded-sm overflow-hidden" style={{ paddingTop: '56.25%' }}>
                    <iframe
                      src="https://player.vimeo.com/video/1191299864?badge=0&autopause=0&player_id=0&app_id=58479"
                      loading="lazy"
                      allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                      allowFullScreen
                      title="How the Relationship Begins"
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ENGAGEMENT STAGES */}
            <section
              className="mt-8 animate-fade-in"
              style={{ animationDelay: '120ms', animationFillMode: 'both' }}
              aria-label="How the Aetheris relationship begins"
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="h-px w-8 bg-amber/50" />
                <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-amber/90">
                  {ENGAGEMENT_STAGES_HEADLINE}
                </span>
                <span className="h-px w-8 bg-amber/50" />
              </div>
              <p className="text-center text-sm text-foreground/70 max-w-2xl mx-auto mb-6">
                {ENGAGEMENT_STAGES_INTRO}
              </p>

              <div className="grid md:grid-cols-5 gap-3">
                {ENGAGEMENT_STAGES.map((stage) => (
                  <div
                    key={stage.n}
                    className="relative rounded-sm border border-amber/25 bg-card/60 p-5 flex flex-col"
                  >
                    <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber/80">{stage.n}</div>
                    <div className="mt-1 font-forensic text-lg font-bold leading-tight">{stage.title}</div>
                    <p className="mt-2 text-xs text-foreground/80 leading-relaxed">{stage.line}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* WHAT WE INVESTIGATE */}
            <section
              className="mt-8 animate-fade-in"
              style={{ animationDelay: '160ms', animationFillMode: 'both' }}
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-crimson mb-2 text-center">
                Why we're not another AI company
              </div>
              <h2 className="font-forensic text-2xl md:text-3xl font-bold leading-tight text-center mb-5">
                Every other AI shop sells you tools.<br />We use ours <span className="text-crimson italic">on you</span>.
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-sm border border-amber/40 bg-card/60 backdrop-blur-sm p-5">
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber mb-3">What we investigate</div>
                  <ul className="space-y-2 text-sm text-foreground/90 leading-relaxed">
                    {WE_INVESTIGATE.map((item) => (
                      <li key={item}>— {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-sm border border-crimson/40 bg-card/60 backdrop-blur-sm p-5">
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-crimson mb-3">What it isn't</div>
                  <ul className="space-y-2 text-sm text-foreground/80 leading-relaxed">
                    <li>— A software login or a self-serve dashboard you're left to figure out</li>
                    <li>— Brand strategy, product pricing, or shop-floor operations work</li>
                    <li>— A cart of tiers to pick from or a percentage-of-savings arrangement</li>
                    <li>— A guarantee of free implementation or guaranteed recovery</li>
                  </ul>
                </div>
              </div>
              <p className="mt-3 text-xs text-foreground/60 italic text-center">
                AI is the microscope. The operator holds it. That's the difference.
              </p>
            </section>

            {/* THE MATH — evidence of losses, not a price justification */}
            <section
              className="mt-8 animate-fade-in"
              style={{ animationDelay: '200ms', animationFillMode: 'both' }}
            >
              <div className="relative rounded-sm border-2 border-crimson/50 bg-crimson/[0.04] p-5 sm:p-6 shadow-[0_20px_60px_-30px_hsl(var(--crimson,0_60%_45%)/0.6)]">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-crimson mb-2">The objection we hear every time</div>
                <blockquote className="font-forensic text-2xl md:text-3xl font-bold text-crimson leading-tight">
                  "We don't have time for another audit."
                </blockquote>
                <p className="mt-1 text-xs text-foreground/60 italic">Said by every operator before they saw the number attached to doing nothing.</p>

                <p className="mt-5 text-sm text-foreground/85 leading-relaxed text-center">
                  Average $5M–$25M manufacturer leaks <span className="text-crimson font-bold">$400K–$1.4M/yr</span> through stalled pipeline, broken follow-up, and CRM rot.{' '}
                  <span className="text-amber font-semibold">Finding it starts with a conversation, not a purchase.</span>
                </p>
              </div>
            </section>

            {/* FOUNDER TRUST */}
            <section
              className="mt-8 animate-fade-in"
              style={{ animationDelay: '240ms', animationFillMode: 'both' }}
            >
              <div className="rounded-sm border border-amber/30 bg-card/70 backdrop-blur-sm p-6">
                <p className="font-forensic text-base sm:text-lg text-foreground/90 leading-relaxed italic">
                  "{FOUNDER_TRUST.quote}"
                </p>
                <p className="mt-4 text-sm text-foreground/70 leading-relaxed">{FOUNDER_TRUST.short}</p>
                <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-amber/90">{FOUNDER_TRUST.punch}</p>
                <p className="mt-2 text-xs text-foreground/50">— {FOUNDER_TRUST.attribution}</p>
              </div>
            </section>

            {/* EXPECTATION NOTE */}
            <section
              className="mt-8 animate-fade-in"
              style={{ animationDelay: '260ms', animationFillMode: 'both' }}
            >
              <div className="rounded-sm border border-amber/30 bg-card/70 backdrop-blur-sm p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber mb-1">Before we talk</div>
                <p className="mt-2 text-sm text-foreground/75 leading-relaxed">{EXPECTATION_NOTE}</p>
              </div>
            </section>

            {/* CLOSING CTA — echoes home rhythm */}
            <section
              className="mt-10 text-center animate-fade-in"
              style={{ animationDelay: '300ms', animationFillMode: 'both' }}
            >
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="h-px w-8 bg-amber/50" />
                <span className="text-[9px] tracking-[0.35em] font-mono text-amber/80 uppercase">Open a case</span>
                <span className="h-px w-8 bg-amber/50" />
              </div>
              <h2 className="font-forensic text-2xl sm:text-3xl md:text-4xl font-bold leading-[1.05] tracking-tight">
                Real findings. <span className="text-amber italic">No sugar.</span>
              </h2>
              <p className="mt-3 text-sm text-foreground/70 max-w-xl mx-auto">
                Fifteen minutes on the phone. We tell you honestly whether there's a real case for working together. If there isn't, we say so.
              </p>
              <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
                <a href={BOOK_MEETING_URL} target="_blank" rel="noopener noreferrer">
                  <Button size="default" className="h-11 px-6 text-sm bg-amber text-background hover:bg-amber/90 font-bold font-mono uppercase tracking-wider">
                    <Calendar className="w-4 h-4 mr-2" />
                    {CTA.session}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </a>
                <Link to="/business-diagnostic">
                  <Button size="default" variant="outline" className="h-11 px-6 text-sm border-white/20 bg-white/[0.06] hover:border-amber/50 hover:bg-amber/10 text-foreground font-mono uppercase tracking-wider">
                    {CTA.primary}
                  </Button>
                </Link>
              </div>
            </section>
          </div>
        </main>

        <Footer />
      </div>

      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
};

export default DiagnosticPage;
