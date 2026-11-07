import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Building2, HardHat, Tag } from 'lucide-react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { RUN_AUDIT_URL } from '@/lib/links';
import { FIELD_PROMISE, HOW_IT_WORKS, PERSONA_LISTICLES, TRADES_HUB_PATH, personaPath } from '@/config/personaListicles';
import { withPersonaTracking } from '@/lib/personaListicle';
import { PricingLadder } from '@/components/trades/TradeDiamond';

const OFFICE_PROBLEMS = [
  'Calls going to voicemail while you are on a job',
  'Estimates and bids nobody followed up on',
  'Invoices going out days or weeks late',
  'Schedules living in texts and on whiteboards',
  'Happy customers never asked for a review',
  'Ads you cannot tell are booking any work',
];

const TradesHubPage: React.FC = () => {
  const { search } = useLocation();
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const scanHref = withPersonaTracking(RUN_AUDIT_URL, 'trades', search);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Office Help for Trades and Contractors"
        description="You are in the field all day. Aetheris finds what is broken in the office side of your trade business, missed calls, slow estimates, late invoices, and fixes it fast."
        path={TRADES_HUB_PATH}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Trades & contractors', path: TRADES_HUB_PATH },
        ]}
        speakable={['h1', '.tldr', 'h2']}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />

        <header className="px-4 pb-12 pt-32">
          <div className="mx-auto max-w-3xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber/30 bg-amber/10 px-4 py-1.5 text-sm font-medium text-amber">
              <HardHat className="h-4 w-4" aria-hidden="true" /> For trades & contractors
            </p>
            <h1 className="mb-6 font-display text-4xl font-bold leading-tight md:text-5xl">{FIELD_PROMISE.headline}</h1>
            <p className="tldr mb-8 text-xl text-muted-foreground">
              I find the problems in your office fast and fix them, so you can stay on the job and stop worrying about
              the office stuff.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to={scanHref}>
                <Button size="lg" className="w-full bg-amber font-semibold text-background hover:bg-amber/90 sm:w-auto">
                  Run the free leak self-scan <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#pricing">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  <Tag className="mr-2 h-4 w-4" /> See pricing
                </Button>
              </a>
            </div>
          </div>
        </header>

        <section className="px-4 pb-12">
          <div className="glass mx-auto max-w-3xl rounded-2xl border-l-4 border-amber p-6 md:p-8">
            <p className="mb-4 flex items-center gap-2 font-semibold">
              <Building2 className="h-5 w-5 text-amber" aria-hidden="true" /> While you are in the field, the office is
              usually dealing with:
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {OFFICE_PROBLEMS.map((item) => (
                <li key={item} className="flex items-start gap-2 text-muted-foreground">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="px-4 py-8" aria-labelledby="trades-heading">
          <div className="mx-auto max-w-5xl">
            <h2 id="trades-heading" className="mb-2 text-center font-display text-3xl font-bold">
              Pick your trade
            </h2>
            <p className="mb-8 text-center text-muted-foreground">See the 7 office problems that cost your trade the most work.</p>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PERSONA_LISTICLES.map((p) => (
                <li key={p.slug}>
                  <Link
                    to={`${personaPath(p.slug)}${search}`}
                    className="glass group flex h-full flex-col rounded-2xl p-6 transition hover:border-amber/50"
                  >
                    <span className="mb-2 font-display text-xl font-bold group-hover:text-amber">{p.trade}</span>
                    <span className="mb-4 flex-1 text-sm text-muted-foreground">{p.cardLine}</span>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber">
                      See the 7 problems <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="px-4 pt-12">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-6 font-display text-3xl font-bold">Fast, and it does not take you off the job</h2>
            <ol className="grid gap-4 md:grid-cols-3">
              {HOW_IT_WORKS.map((step, i) => (
                <li key={step.title} className="glass rounded-2xl p-5">
                  <p className="mb-1 font-case text-[10px] uppercase tracking-[0.25em] text-amber/80">Step {i + 1}</p>
                  <p className="mb-1 font-semibold">{step.title}</p>
                  <p className="text-sm text-muted-foreground">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <PricingLadder slug="trades" search={search} />

        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default TradesHubPage;
