import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUp, ArrowDown, Check } from "lucide-react";
import { AETHERIS_TIERS } from "@/lib/aetherisTiers";
import { compareTierPrices, individualServiceIdsAtTier, individualServicesAtTier, TIMELINE_SERVICE_STEPS } from "@/lib/pricingTimelineServices";
import { quoteAuditSelection } from "../../supabase/functions/_shared/company-audit-offers";
import { AuditCustomQuote } from "@/components/AuditCustomQuote";
import { BOOK_MEETING_URL } from "@/lib/links";

const dollars = (cents: number) =>
  "$" + (cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 });
const usd = (cents: number) => cents === 0 ? "Free" : dollars(cents);

const cadenceLabel = (cadence: string) => cadence === "monthly"
  ? "/month" : cadence === "one-time" ? "one-time" : "no charge";

/** A single selectable timeline, driven by the same data as TierLadder. */
export function PricingTimeline() {
  const [index, setIndex] = useState(0);
  const [priorIndex, setPriorIndex] = useState<number | null>(null);
  const [serviceSelection, setServiceSelection] = useState<string[]>([]);
  const selected = AETHERIS_TIERS[index];
  const last = AETHERIS_TIERS.length - 1;
  const prior = priorIndex === null ? null : AETHERIS_TIERS[priorIndex];
  const comparison = prior ? compareTierPrices(prior.id, selected.id) : null;
  const visibleServices = individualServicesAtTier(selected.id);
  const individualEstimate = quoteAuditSelection(serviceSelection);
  const newAtTier = new Set(TIMELINE_SERVICE_STEPS[selected.id]);

  const setLevel = (next: number) => {
    const target = Math.min(last, Math.max(0, Math.round(next)));
    if (target === index) return;
    setPriorIndex(index);
    // One source of truth for the summary and the selected individual services.
    // As the dot moves back, higher-level choices disappear and are subtracted.
    setServiceSelection(individualServiceIdsAtTier(AETHERIS_TIERS[target].id));
    setIndex(target);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <p className="font-case text-[10px] uppercase tracking-[0.3em] text-amber">// Aetheris investment levels</p>
      <h2 className="mt-3 font-forensic text-3xl font-bold sm:text-4xl">
        Follow the price line. <span className="text-amber">Choose your depth.</span>
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        Move the amber dot left or right, use the up and down arrows, or tap a greyed-out
        level. The package price, relevant individual services and their separate totals
        update immediately. Moving backward removes the higher-level choices.
      </p>
      <div className="mt-5 inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full border border-amber/30 bg-amber/[0.06] px-4 py-2 text-xs text-foreground/90">
        <span className="font-semibold text-amber">First meeting complimentary.</span>
        <span className="text-muted-foreground">Additional consulting is $100/hour unless included in a scoped engagement.</span>
      </div>

      <div className="mt-8 rounded-xl border border-amber/25 bg-card/50 p-4 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-xs text-foreground" aria-live="polite">
            {String(index + 1).padStart(2, "0")} / {String(AETHERIS_TIERS.length).padStart(2, "0")}
            <span className="ml-3 font-semibold text-amber">{selected.name}</span>
          </p>
          <div className="flex gap-2">
            <button type="button" disabled={index === 0} onClick={() => setLevel(index - 1)}
              aria-label="Move down one pricing level"
              className="rounded-full border border-border p-2 text-amber disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-amber">
              <ArrowDown className="h-5 w-5" />
            </button>
            <button type="button" disabled={index === last} onClick={() => setLevel(index + 1)}
              aria-label="Move up one pricing level"
              className="rounded-full border border-border p-2 text-amber disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-amber">
              <ArrowUp className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="relative mt-7 h-12">
          <div className="absolute inset-x-2 top-1/2 h-[2px] bg-border" aria-hidden="true" />
          <div className="absolute inset-x-2 top-1/2 h-[2px] origin-left bg-amber transition-transform"
            aria-hidden="true" style={{ transform: `scaleX(${index / last})` }} />
          <div className="pointer-events-none absolute inset-x-2 top-1/2 flex -translate-y-1/2 justify-between" aria-hidden="true">
            {AETHERIS_TIERS.map((t, i) => (
              <span key={t.id} className={i === index
                ? "h-5 w-5 rounded-full border-2 border-amber bg-amber shadow-[0_0_18px_rgba(244,161,37,0.7)]"
                : "h-3 w-3 rounded-full border-2 border-muted-foreground/50 bg-secondary"} />
            ))}
          </div>
          <input type="range" min={0} max={last} step={1} value={index}
            onChange={(e) => setLevel(Number(e.currentTarget.value))}
            aria-label="Select a pricing level"
            aria-valuetext={`${selected.name}: ${usd(selected.amountCents)} ${cadenceLabel(selected.cadence)}`}
            className="absolute inset-0 z-10 h-full w-full cursor-ew-resize opacity-0" />
        </div>

        <div className="mt-2 overflow-x-auto pb-2" aria-label="All available Aetheris pricing levels">
          <div className="grid min-w-[770px] grid-cols-7 gap-2">
            {AETHERIS_TIERS.map((t, i) => (
              <button key={t.id} type="button" onClick={() => setLevel(i)}
                aria-pressed={index === i}
                className={`min-h-24 rounded-lg border px-2 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber ${
                  index === i
                    ? "border-amber bg-amber/10 text-foreground"
                    : "border-border/60 bg-background/40 text-muted-foreground opacity-40 grayscale hover:opacity-80"
                }`}>
                <span className="block font-mono text-[10px]">{String(i + 1).padStart(2, "0")}</span>
                <span className="mt-2 block text-[11px] font-semibold leading-tight">{t.name}</span>
                <span className="mt-2 block text-xs font-bold">{usd(t.amountCents)}{t.cadence === "monthly" ? "/mo" : ""}</span>
              </button>
            ))}
          </div>
        </div>
        <p className="mt-1 text-xs text-muted-foreground sm:hidden">Swipe sideways to view all seven stages.</p>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4 border-t border-border/50 pt-4" aria-live="polite" aria-atomic="true">
          <div>
            <p className="font-case text-[10px] uppercase tracking-widest text-muted-foreground">Current tier price</p>
            <p className="mt-1 font-forensic text-2xl font-bold text-amber">
              {usd(selected.amountCents)}{selected.cadence === "monthly" ? "/mo" : selected.cadence === "one-time" ? " one-time" : ""}
            </p>
          </div>
          <div className="max-w-sm text-sm text-muted-foreground">
            {prior && comparison?.comparable ? (
              <p>
                <span className="font-semibold text-foreground">Last move:</span>{" "}
                {comparison.differenceCents === 0
                  ? "No package price change."
                  : `${comparison.differenceCents > 0 ? "+" : "−"}${usd(Math.abs(comparison.differenceCents))}${selected.cadence === "monthly" ? "/mo" : " one-time"}`}
              </p>
            ) : prior ? (
              <p>
                <span className="font-semibold text-foreground">Billing type changed:</span>{" "}
                {usd(prior.amountCents)} {cadenceLabel(prior.cadence)} → {usd(selected.amountCents)} {cadenceLabel(selected.cadence)}.
                Monthly and one-time prices are not directly subtracted.
              </p>
            ) : (
              <p>Slide the dot to see exactly how pricing and service choices change at each level.</p>
            )}
            <p className="mt-2 text-xs">
              {serviceSelection.length} of {visibleServices.length} individual service choices selected ·
              estimate {dollars(individualEstimate.oneTimeCents)} one-time and{" "}
              {dollars(individualEstimate.monthlyCents)}/mo, separately.
            </p>
          </div>
        </div>
        <div className="mt-5 border-t border-border/50 pt-4" aria-label="Services linked to current price level">
          <p className="font-case text-[10px] uppercase tracking-widest text-amber">
            Relevant individual services at this level
          </p>
          {visibleServices.length ? (
            <div className="mt-3 flex flex-wrap gap-2" aria-live="polite">
              {visibleServices.map(service => (
                <span key={service.id} className={`rounded-full border px-3 py-1.5 text-xs ${newAtTier.has(service.id)
                  ? "border-amber/50 bg-amber/10 text-amber"
                  : "border-border/70 text-muted-foreground"}`}>
                  {service.name} · {dollars(service.priceCents)}{service.cadence === "monthly" ? "/mo" : ""}
                  {serviceSelection.includes(service.id) ? " ✓" : " · unselected"}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Free self-check; individual paid services appear at the next price level.</p>
          )}
          <a href="#individual-pricing" className="mt-4 inline-flex text-sm font-semibold text-amber underline underline-offset-4">
            Adjust the individual service choices below
          </a>
        </div>
      </div>

      <div className="mt-5 grid gap-8 rounded-xl border border-amber/30 bg-card/60 p-6 sm:p-8 lg:grid-cols-2">
        <div className="flex flex-col">
          <p className="font-mono text-xs uppercase tracking-widest text-amber">
            {selected.verb} · {selected.timeline}
          </p>
          <h3 className="mt-3 font-forensic text-3xl font-bold">{selected.name}</h3>
          <div className="mt-5 flex flex-wrap items-baseline gap-3">
            <span className="font-forensic text-5xl font-bold text-amber" aria-live="polite">{usd(selected.amountCents)}</span>
            <span className="text-sm text-muted-foreground">{cadenceLabel(selected.cadence)}</span>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-foreground/90">{selected.headline}</p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Best for:</strong> {selected.useCase}
          </p>
          {selected.qualificationOnly && <p className="mt-4 text-xs text-amber">Available to completed Diagnostic clients only.</p>}
          <Link to={selected.id === "free" ? "/leak-audit/self-scan" : selected.id === "intelligence" ? selected.ctaHref : BOOK_MEETING_URL}
            className="mt-7 inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-amber px-6 py-3 text-xs font-bold uppercase tracking-widest text-background hover:bg-amber/90">
            {selected.id === "free" ? "Take the free Leak Check" : selected.id === "intelligence" ? "Explore Intelligence" : "Discuss this level"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div>
          <p className="font-case text-xs uppercase tracking-widest text-amber">What you receive</p>
          {selected.inherits && <p className="mt-3 border-l-2 border-amber pl-3 text-sm">{selected.inherits}</p>}
          <ul className="mt-5 space-y-3">
            {selected.adds.map(item => (
              <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-foreground/85">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 border-t border-border/60 pt-5">
            <p className="font-case text-xs uppercase tracking-widest text-amber">The outcome</p>
            <p className="mt-2 text-sm leading-relaxed">{selected.outcome}</p>
          </div>
          {selected.excludes && <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Not included</p>
            <ul className="mt-3 space-y-2">
              {selected.excludes.map(item => <li key={item} className="text-xs leading-relaxed text-muted-foreground">· {item}</li>)}
            </ul>
          </div>}
          {selected.credit && <p className="mt-4 text-xs font-semibold text-amber">{selected.credit}</p>}
        </div>
      </div>
      <div className="mt-10 scroll-mt-28" id="individual-pricing">
        <AuditCustomQuote
          timelineTierId={selected.id}
          selectedIds={serviceSelection}
          onSelectedIdsChange={setServiceSelection}
        />
      </div>
      <p className="mt-5 max-w-4xl text-xs leading-relaxed text-muted-foreground">
        The tier price is independent of the standalone service comparison below it.
        Selecting individual services builds an alternative scope request, not charges added
        to an already-scoped tier. One-time and monthly amounts remain separate. Exact scope,
        eligibility, payment and any recovery-based terms are agreed in writing; outcomes are not guaranteed.
      </p>
    </div>
  );
}
export default PricingTimeline;
