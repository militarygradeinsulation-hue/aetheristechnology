import React, { useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Building2, Calendar, CheckCircle2, ExternalLink, HardHat, ShieldCheck, Wrench, XCircle } from 'lucide-react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { combineSchemas, serviceSchema } from '@/lib/schemas';
import { BOOK_MEETING_URL, RUN_AUDIT_URL } from '@/lib/links';
import { FIELD_PROMISE, HOW_IT_WORKS, PERSONA_BY_SLUG, TRADES_HUB_PATH, personaPath } from '@/config/personaListicles';
import { resolvePersonaProof, withPersonaTracking } from '@/lib/personaListicle';

const PersonaListiclePage: React.FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const { search } = useLocation();
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const persona = PERSONA_BY_SLUG[slug];
  const proof = useMemo(() => (persona ? resolvePersonaProof(persona) : []), [persona]);

  if (!persona) return <Navigate to={TRADES_HUB_PATH} replace />;

  const path = personaPath(persona.slug);
  const scanHref = withPersonaTracking(RUN_AUDIT_URL, persona.slug, search);
  const bookHref = withPersonaTracking(BOOK_MEETING_URL, persona.slug, search);

  const PrimaryCta = () => (
    <Link to={scanHref}>
      <Button size="lg" className="w-full bg-amber font-semibold text-background hover:bg-amber/90 sm:w-auto">
        Run the free leak self-scan <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </Link>
  );

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title={persona.metaTitle}
        description={persona.metaDescription}
        path={path}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Trades & contractors', path: TRADES_HUB_PATH },
          { name: persona.trade, path },
        ]}
        faqs={persona.faqs}
        speakable={['h1', '.tldr', 'h2']}
        jsonLd={combineSchemas(
          serviceSchema(persona.headline, persona.metaDescription, {
            serviceType: 'Business leak audit and AI automation',
            areaServed: 'United States',
          }),
        )}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />

        {/* PROMISE */}
        <header className="px-4 pb-12 pt-32">
          <div className="mx-auto max-w-3xl">
            <Link
              to={TRADES_HUB_PATH}
              className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-amber"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All trades
            </Link>
            <br />
            <p className="mb-5 inline-flex items-center rounded-full border border-amber/30 bg-amber/10 px-4 py-1.5 text-sm font-medium text-amber">
              {persona.eyebrow}
            </p>
            <h1 className="mb-6 font-display text-4xl font-bold leading-tight md:text-5xl">{persona.headline}</h1>
            <p className="tldr mb-8 text-xl text-muted-foreground">{persona.subheadline}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <PrimaryCta />
              <a href={bookHref}>
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  <Calendar className="mr-2 h-4 w-4" /> Book a quick call
                </Button>
              </a>
            </div>
          </div>
        </header>

        {/* FIELD vs OFFICE */}
        <section className="px-4 pb-12" aria-label="While you are in the field">
          <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-2">
            <div className="glass rounded-2xl p-6">
              <p className="mb-3 flex items-center gap-2 font-case text-[10px] uppercase tracking-[0.25em] text-amber/80">
                <HardHat className="h-4 w-4" aria-hidden="true" /> Where you are
              </p>
              <p className="text-lg leading-relaxed">{persona.fieldMoment}</p>
            </div>
            <div className="glass rounded-2xl border-l-4 border-amber p-6">
              <p className="mb-3 flex items-center gap-2 font-case text-[10px] uppercase tracking-[0.25em] text-amber/80">
                <Building2 className="h-4 w-4" aria-hidden="true" /> What the office is missing
              </p>
              <p className="text-lg leading-relaxed">{persona.officeMoment}</p>
            </div>
          </div>
        </section>

        {/* PROPERTIES: the numbered listicle */}
        <section className="px-4 py-8" aria-labelledby="reasons-heading">
          <div className="mx-auto max-w-3xl">
            <h2 id="reasons-heading" className="sr-only">
              {persona.reasons.length} office problems costing you work
            </h2>
            <ol className="space-y-6">
              {persona.reasons.map((reason, i) => (
                <li key={reason.title} className="glass rounded-2xl p-6 md:p-8">
                  <div className="flex items-start gap-4">
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber/15 font-display text-lg font-bold text-amber"
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="mb-1 font-case text-[10px] uppercase tracking-[0.25em] text-amber/80">
                        Leak area: {reason.leakArea}
                      </p>
                      <h3 className="mb-3 font-display text-xl font-bold md:text-2xl">{reason.title}</h3>
                      <p className="mb-4 text-muted-foreground">{reason.body}</p>
                      <p className="flex items-start gap-2 text-sm">
                        <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden="true" />
                        <span>
                          <span className="font-semibold">How I fix it: </span>
                          {reason.fix}
                        </span>
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-8 text-center">
              <PrimaryCta />
            </div>
          </div>
        </section>

        {/* POSITIONING */}
        <section className="px-4 py-12">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-4 font-display text-3xl font-bold">{FIELD_PROMISE.headline}</h2>
            <p className="mb-6 text-lg text-muted-foreground">{FIELD_PROMISE.body}</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="glass rounded-2xl p-6">
                <p className="mb-4 font-semibold">What you do not need</p>
                <ul className="space-y-3">
                  {FIELD_PROMISE.notAnother.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-muted-foreground">
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="glass rounded-2xl border border-amber/30 p-6">
                <p className="mb-4 font-semibold text-amber">What I do instead</p>
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden="true" />
                  {persona.instead}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PROOF */}
        {proof.length > 0 && (
          <section className="px-4 py-12" aria-labelledby="proof-heading">
            <div className="mx-auto max-w-3xl">
              <h2 id="proof-heading" className="mb-2 font-display text-3xl font-bold">
                What fixing these problems has done for other businesses
              </h2>
              <p className="mb-6 text-sm text-muted-foreground">
                Independent, published case studies of the same kinds of fixes. Each links to its original source.
                These are not Aetheris client results.
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                {proof.map((c) => (
                  <article key={c.id} className="glass flex flex-col rounded-2xl p-5">
                    <p className="mb-2 font-display text-lg font-bold text-amber">{c.headline}</p>
                    <p className="mb-3 text-sm font-semibold">{c.title}</p>
                    <p className="mb-4 flex-1 text-sm text-muted-foreground">{c.outcome}</p>
                    <a
                      href={c.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-amber hover:underline"
                    >
                      Source: {c.source} <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* PACKAGING */}
        <section className="px-4 py-12">
          <div className="glass mx-auto max-w-3xl rounded-2xl border border-amber/30 p-6 md:p-10">
            <h2 className="mb-2 font-display text-3xl font-bold">How it works</h2>
            <p className="mb-8 text-lg text-muted-foreground">{persona.offerLine}</p>
            <ol className="mb-8 grid gap-4 md:grid-cols-3">
              {HOW_IT_WORKS.map((step, i) => (
                <li key={step.title}>
                  <p className="mb-1 font-case text-[10px] uppercase tracking-[0.25em] text-amber/80">Step {i + 1}</p>
                  <p className="mb-1 font-semibold">{step.title}</p>
                  <p className="text-sm text-muted-foreground">{step.text}</p>
                </li>
              ))}
            </ol>
            <p className="mb-6 flex items-start gap-2 text-sm">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden="true" />
              The self-scan is free and self-serve. You keep what it finds whether or not you work with us.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <PrimaryCta />
              <a href={bookHref}>
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Book a quick call
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 py-12">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-6 font-display text-3xl font-bold">Questions</h2>
            <div className="space-y-4">
              {persona.faqs.map((faq) => (
                <details key={faq.question} className="glass group rounded-2xl p-5">
                  <summary className="cursor-pointer list-none font-semibold">{faq.question}</summary>
                  <p className="mt-3 text-muted-foreground">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <Footer />
      </div>

      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default PersonaListiclePage;
