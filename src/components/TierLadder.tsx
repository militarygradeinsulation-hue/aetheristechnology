import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarClock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AETHERIS_TIERS, type AetherisTier } from "@/lib/aetherisTiers";
import { BOOK_MEETING_URL } from "@/lib/links";

/**
 * The public Aetheris ladder: Free -> Signal -> Revenue -> Operator Suite ->
 * 21-Day Diagnostic -> Active Case Retainer. Single source of truth lives in
 * `src/lib/aetherisTiers.ts`. Instruments are never priced individually.
 */
export const TierLadder: React.FC<{ compact?: boolean; id?: string }> = ({ compact = false, id }) => (
  <section id={id} className="mb-16">
    <div className="mb-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber mb-2">
        Diagnose → Arm → Operate → Investigate → Sustain
      </div>
      <h2 className="font-forensic text-3xl md:text-4xl font-bold leading-tight">
        The instruments are not the product. <span className="text-amber italic">The method is.</span>
      </h2>
      {!compact && (
        <p className="text-sm md:text-base text-muted-foreground mt-3 max-w-2xl leading-relaxed">
          These are stages of a working relationship, not plans on a shelf. Each stage includes
          everything below it, and we only move up when the last stage earned it. Scope and terms
          are agreed together, in a conversation.
        </p>
      )}
    </div>

    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {AETHERIS_TIERS.map((t, i) => (
        <TierCard key={t.id} tier={t} step={i} compact={compact} />
      ))}
    </div>
  </section>
);

export const TierCard: React.FC<{ tier: AetherisTier; step: number; compact?: boolean }> = ({
  tier: t,
  step,
  compact,
}) => {
  const crimson = t.id === "diagnostic" || t.id === "active";
  return (
    <div
      className={`forensic-tile relative rounded-sm border p-5 flex flex-col ${
        crimson ? "border-crimson/45" : "border-amber/30"
      }`}
    >
      {t.flagship && (
        <div className="absolute -top-2 right-3 font-mono text-[9px] tracking-widest uppercase bg-crimson text-background px-1.5 py-0.5">
          Flagship
        </div>
      )}
      <div className="flex items-center gap-2 mb-1">
        <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
          0{step + 1}
        </span>
        <span
          className={`font-mono text-[9px] uppercase tracking-[0.25em] ${
            crimson ? "text-crimson" : "text-amber"
          }`}
        >
          {t.verb}
        </span>
      </div>

      <h3 className="font-forensic text-xl font-bold leading-tight">{t.name}</h3>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-2 mb-3">
        {t.timeline}
      </div>

      <p className="text-sm text-foreground/80 leading-relaxed mb-3">{t.headline}</p>

      {t.inherits && (
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber mb-2">
          {t.inherits} +
        </div>
      )}

      <ul className="space-y-1.5 mb-4">
        {(compact ? t.adds.slice(0, 4) : t.adds).map(a => (
          <li key={a} className="text-[13px] text-foreground/80 flex gap-2 leading-snug">
            <span className={crimson ? "text-crimson" : "text-amber"}>·</span>
            {a}
          </li>
        ))}
      </ul>

      {t.excludes && !compact && (
        <div className="mb-3 border-t border-border/60 pt-2">
          <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground mb-1">
            Where this stops
          </div>
          <ul className="space-y-1">
            {t.excludes.map(x => (
              <li key={x} className="text-[12px] text-muted-foreground flex gap-2 leading-snug">
                <span className="text-muted-foreground/60">·</span>
                {x}
              </li>
            ))}
          </ul>
        </div>
      )}

      {t.credit && (
        <div
          className={`font-mono text-[10px] uppercase tracking-[0.18em] mb-3 ${
            crimson ? "text-crimson" : "text-amber"
          }`}
        >
          {t.credit}
        </div>
      )}

      {!compact && (
        <div className="mb-4 space-y-2">
          <p className="text-xs text-muted-foreground italic">For you if: {t.useCase}</p>
          <div className="border-l-2 border-amber/60 pl-3">
            <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-amber mb-0.5">
              You leave with
            </div>
            <p className="text-[13px] text-foreground/90 leading-snug">{t.outcome}</p>
          </div>
        </div>
      )}

      <div className="mt-auto">
        {t.id === "free" || t.checkout ? (
          <Button asChild className="w-full bg-amber text-background hover:bg-amber/90 font-semibold">
            <Link to={t.ctaHref}>
              {t.ctaLabel} <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        ) : t.qualificationOnly ? (
          <Button
            asChild
            variant="outline"
            className="w-full border-crimson/50 text-crimson hover:bg-crimson/10 font-semibold"
          >
            <a href={BOOK_MEETING_URL} target="_blank" rel="noopener noreferrer">
              <Lock className="w-3.5 h-3.5 mr-1.5" /> {t.ctaLabel}
            </a>
          </Button>
        ) : (
          <Button
            asChild
            variant={crimson ? "outline" : "default"}
            className={
              crimson
                ? "w-full border-crimson/50 text-crimson hover:bg-crimson/10 font-semibold"
                : "w-full bg-amber text-background hover:bg-amber/90 font-semibold"
            }
          >
            <a href={BOOK_MEETING_URL} target="_blank" rel="noopener noreferrer">
              <CalendarClock className="w-3.5 h-3.5 mr-1.5" /> {t.ctaLabel}
            </a>
          </Button>
        )}
      </div>
    </div>
  );
};

export default TierLadder;
