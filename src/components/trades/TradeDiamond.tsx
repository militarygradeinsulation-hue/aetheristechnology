import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, CheckCircle2, ExternalLink, ShieldCheck, Star, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TRADE_ALTERNATIVES, TRADE_GUARANTEE, TRADE_TIERS, type TradeTier } from '@/config/tradePricing';
import { MEDIA_MENTIONS, PROOF_STATS, reviewsForTrade } from '@/config/tradeProof';
import type { RealCase } from '@/data/realCaseStudies';
import { withPersonaTracking } from '@/lib/personaListicle';

/** PROOF (quick hit): renders only when real reviews, stats, or media exist. */
export const ProofStrip: React.FC<{ slug: string }> = ({ slug }) => {
  const [review] = reviewsForTrade(slug, 1);
  if (!review && PROOF_STATS.length === 0 && MEDIA_MENTIONS.length === 0) return null;
  return (
    <section className="px-4 pb-10" aria-label="What owners say">
      <div className="glass mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl p-5 md:flex-row md:items-center md:justify-between">
        {review && (
          <figure className="min-w-0">
            <div className="mb-1 flex gap-0.5 text-amber" aria-label="5 out of 5 stars">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" aria-hidden="true" />
              ))}
            </div>
            <blockquote className="text-sm">"{review.quote}"</blockquote>
            <figcaption className="mt-1 text-xs text-muted-foreground">
              {review.name}, {review.company} · {review.city}
            </figcaption>
          </figure>
        )}
        {PROOF_STATS.length > 0 && (
          <dl className="flex shrink-0 gap-6">
            {PROOF_STATS.map((s) => (
              <div key={s.label}>
                <dt className="sr-only">{s.label}</dt>
                <dd className="font-display text-2xl font-bold text-amber">{s.value}</dd>
                <dd className="text-xs text-muted-foreground">{s.label}</dd>
              </div>
            ))}
          </dl>
        )}
        {MEDIA_MENTIONS.length > 0 && (
          <p className="text-xs text-muted-foreground">
            As seen in{' '}
            {MEDIA_MENTIONS.map((m, i) => (
              <React.Fragment key={m.url}>
                {i > 0 && ', '}
                <a href={m.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-amber">
                  {m.outlet}
                </a>
              </React.Fragment>
            ))}
          </p>
        )}
      </div>
    </section>
  );
};

/** POSITIONING: what the alternatives cost and where they fall short. */
export const AlternativesTable: React.FC<{ instead: string }> = ({ instead }) => (
  <div className="grid gap-4 md:grid-cols-2">
    <div className="glass rounded-2xl p-6">
      <p className="mb-4 font-semibold">The usual options</p>
      <ul className="space-y-4">
        {TRADE_ALTERNATIVES.map((a) => (
          <li key={a.option} className="flex items-start gap-2">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
            <span>
              <span className="font-semibold">{a.option}</span>{' '}
              <span className="text-xs text-muted-foreground">({a.cost})</span>
              <span className="block text-sm text-muted-foreground">{a.problem}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
    <div className="glass rounded-2xl border border-amber/30 p-6">
      <p className="mb-4 font-semibold text-amber">What I do instead</p>
      <p className="mb-4 flex items-start gap-2">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden="true" />
        {instead}
      </p>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {[
          'Finding the problems is free',
          'Fixes go into the tools you already use',
          'Everything is done remotely. No site visits.',
          'Fixed prices, agreed before work starts',
        ].map((item) => (
          <li key={item} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  </div>
);

/** PROOF (full): real reviews when present, then sourced published results. */
export const ProofSection: React.FC<{ slug: string; cases: RealCase[] }> = ({ slug, cases }) => {
  const reviews = reviewsForTrade(slug);
  if (reviews.length === 0 && cases.length === 0) return null;
  return (
    <section className="px-4 py-12" aria-labelledby="proof-heading">
      <div className="mx-auto max-w-3xl">
        <h2 id="proof-heading" className="mb-6 font-display text-3xl font-bold">
          Proof it works
        </h2>
        {reviews.length > 0 && (
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            {reviews.map((r) => (
              <figure key={`${r.name}-${r.company}`} className="glass flex flex-col rounded-2xl p-5">
                {r.result && <p className="mb-2 font-display text-lg font-bold text-amber">{r.result}</p>}
                <blockquote className="mb-3 flex-1 text-sm">"{r.quote}"</blockquote>
                <figcaption className="text-xs text-muted-foreground">
                  {r.name}, {r.company} · {r.trade}, {r.city}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
        {cases.length > 0 && (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              Published results from the same kinds of fixes. Each links to its original source. These are not Aetheris
              client results.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              {cases.map((c) => (
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
          </>
        )}
      </div>
    </section>
  );
};

const CADENCE_NOTE: Record<TradeTier['cadence'], string> = { free: '', 'one-time': 'one-time', hourly: 'per hour', monthly: '' };

/** PACKAGING: the full price ladder plus risk reversal. */
export const PricingLadder: React.FC<{ slug: string; search: string }> = ({ slug, search }) => (
  <section id="pricing" className="scroll-mt-24 px-4 py-12" aria-labelledby="pricing-heading">
    <div className="mx-auto max-w-6xl">
      <h2 id="pricing-heading" className="mb-2 text-center font-display text-3xl font-bold">
        Finding the problems is free. Fixing them is simple.
      </h2>
      <p className="mx-auto mb-8 max-w-2xl text-center text-muted-foreground">
        Everything is done remotely. Pick what you need, when you need it. No site visits, no long contracts.
      </p>
      <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {TRADE_TIERS.map((t) => {
          const href = withPersonaTracking(t.cta.href, slug, search);
          const isInternal = href.startsWith('/') && !href.startsWith('/book');
          const button = (
            <Button
              className={`w-full ${t.highlight || t.cadence === 'free' ? 'bg-amber text-background hover:bg-amber/90' : ''}`}
              variant={t.highlight || t.cadence === 'free' ? 'default' : 'outline'}
            >
              {t.cta.label} <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
            </Button>
          );
          return (
            <li
              key={t.id}
              className={`glass flex flex-col rounded-2xl p-5 ${t.highlight ? 'border border-amber/60' : ''}`}
            >
              <p className="mb-1 font-case text-[10px] uppercase tracking-[0.25em] text-amber/80">{t.stage}</p>
              <p className="mb-1 font-display text-lg font-bold">{t.name}</p>
              <p className="mb-2">
                <span className="font-display text-2xl font-bold text-amber">{t.price}</span>{' '}
                <span className="text-xs text-muted-foreground">{CADENCE_NOTE[t.cadence]}</span>
              </p>
              <p className="mb-4 text-sm text-muted-foreground">{t.forWho}</p>
              <ul className="mb-5 flex-1 space-y-2 text-sm">
                {t.includes.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              {isInternal ? <Link to={href}>{button}</Link> : <a href={href}>{button}</a>}
            </li>
          );
        })}
      </ol>
      <div className="glass mx-auto mt-6 max-w-3xl rounded-2xl p-5">
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          {TRADE_GUARANTEE.map((g) => (
            <li key={g} className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden="true" />
              {g}
            </li>
          ))}
        </ul>
      </div>
    </div>
  </section>
);
