import React from 'react';
import { Link } from 'react-router-dom';
import {
  ZERO_BURDEN_COMPARISON,
  ZERO_BURDEN_HEADLINE,
  ZERO_BURDEN_PRIMARY,
  ZERO_BURDEN_QUALIFIER,
  ZERO_BURDEN_SUPPORTING,
  ZERO_OUTCOMES,
} from '@/lib/zeroBurden';

type Props = {
  /** Optional secondary action, usually the page contact modal. */
  onContactClick?: () => void;
  ctaHref?: string;
  ctaLabel?: string;
};

export const ZeroBurdenSection: React.FC<Props> = ({
  onContactClick,
  ctaHref = '/leak-audit',
  ctaLabel = 'Start the Leak Audit',
}) => {
  return (
    <section
      id="zero-burden"
      aria-labelledby="zero-burden-heading"
      className="border-t border-border/60 bg-background scroll-mt-24"
    >
      <div className="container mx-auto max-w-5xl px-4 py-16 md:py-24">
        <p className="font-case text-[10px] uppercase tracking-[0.24em] text-crimson mb-4">
          Zero Burden Technology
        </p>
        <h2
          id="zero-burden-heading"
          className="font-forensic text-3xl md:text-5xl font-semibold tracking-tight max-w-[22ch]"
        >
          {ZERO_BURDEN_HEADLINE}
        </h2>
        <p className="text-lg md:text-xl leading-relaxed mt-6 max-w-3xl">{ZERO_BURDEN_PRIMARY}</p>
        <p className="font-case text-[12px] uppercase tracking-[0.16em] text-amber mt-4">
          {ZERO_BURDEN_SUPPORTING}
        </p>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ZERO_OUTCOMES.map((o) => (
            <li
              key={o.id}
              className="border border-border/60 bg-card/40 p-5 hover:border-amber/50 transition-colors"
            >
              <h3 className="font-case text-[11px] uppercase tracking-[0.14em] text-amber">{o.label}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">{o.text}</p>
            </li>
          ))}
        </ul>

        {/* Comparison surface */}
        <div className="mt-12 border border-border/60">
          <div className="grid grid-cols-2 border-b border-border/60">
            <div className="p-4 font-case text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Typical technology
            </div>
            <div className="p-4 font-case text-[10px] uppercase tracking-[0.18em] text-amber border-l border-border/60">
              Aetheris
            </div>
          </div>
          {ZERO_BURDEN_COMPARISON.map((row) => (
            <div key={row.typical} className="grid grid-cols-2 border-b border-border/60 last:border-b-0">
              <div className="p-4 text-sm text-muted-foreground">{row.typical}</div>
              <div className="p-4 text-sm text-foreground border-l border-border/60">{row.aetheris}</div>
            </div>
          ))}
        </div>

        {/* Honest qualification */}
        <div className="mt-8 border-l-2 border-crimson pl-5">
          <p className="text-sm leading-relaxed text-muted-foreground">{ZERO_BURDEN_QUALIFIER}</p>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            to={ctaHref}
            className="font-case text-[11px] uppercase tracking-[0.18em] border border-amber text-amber px-6 py-3 hover:bg-amber hover:text-background transition-colors"
          >
            {ctaLabel}
          </Link>
          {onContactClick && (
            <button
              type="button"
              onClick={onContactClick}
              className="font-case text-[11px] uppercase tracking-[0.18em] border border-border px-6 py-3 hover:border-crimson hover:text-crimson transition-colors"
            >
              Talk to the operator
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default ZeroBurdenSection;
