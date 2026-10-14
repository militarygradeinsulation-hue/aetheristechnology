import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ArrowRight, ShieldCheck } from "lucide-react";
import {
  AUDIT_OPTIONS,
  type AuditOption, type AuditRecommendation,
} from "../../supabase/functions/_shared/company-audit-offers";

type Props = {
  options?: AuditOption[];
  recommendations?: AuditRecommendation[];
  company?: string;
  repeated?: boolean;
};
const money = (n: number) => "$" + (n / 100).toLocaleString("en-US", { maximumFractionDigits: 0 });

/**
 * Editable request-for-scope selection. No payment, no hidden checkout, and
 * no false summing of monthly and one-time line items.
 */
export function AuditCustomQuote({
  options = AUDIT_OPTIONS, recommendations = [], company, repeated,
}: Props) {
  const [selected, setSelected] = useState<string[]>(() => recommendations.map(r => r.id));
  const recommended = useMemo(() => new Map(recommendations.map(r => [r.id, r])), [recommendations]);
  const listedOptions = useMemo(() => {
    const allowed = new Set(options.map(x => x.id));
    return AUDIT_OPTIONS.filter(x => allowed.has(x.id)).map(x => options.find(o => o.id === x.id)!);
  }, [options]);
  // Price each item from the frozen server-provided snapshot when available.
  const cart = useMemo(() => {
    const ids = new Set(selected);
    const items = listedOptions.filter(option => ids.has(option.id));
    return {
      items,
      oneTimeCents: items.filter(x => x.cadence === "one_time").reduce((a, x) => a + x.priceCents, 0),
      monthlyCents: items.filter(x => x.cadence === "monthly").reduce((a, x) => a + x.priceCents, 0),
    };
  }, [selected, listedOptions]);
  const toggle = (id: string) => setSelected(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const mailBody = [
    "Company: " + (company || "To be confirmed"),
    "Requested individual solutions:",
    ...cart.items.map(x => "- " + x.name + ": " + money(x.priceCents) + (x.cadence === "monthly" ? "/month" : " one-time")),
    "",
    "One-time estimate: " + money(cart.oneTimeCents),
    "Monthly estimate: " + money(cart.monthlyCents) + "/month",
    "Please confirm the scope, feasibility, and a formal written quote.",
  ].join("\n");
  const discussHref = "mailto:Aetheris.technology@outlook.com?subject=" +
    encodeURIComponent("Aetheris custom scope " + (company || "")) +
    "&body=" + encodeURIComponent(mailBody);

  return (
    <section className="rounded-xl border border-amber/35 bg-card/60 p-5 sm:p-8" aria-label="Build your custom Aetheris solution">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-case text-[10px] uppercase tracking-[0.25em] text-amber">// Build only what you need</p>
        {recommendations.length > 0 && (
          <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-amber" />
            {repeated ? "Previous company baseline reused" : "Based on your first company assessment"}
          </p>
        )}
      </div>
      <h3 className="mt-3 font-forensic text-2xl font-bold sm:text-3xl">
        Individual solutions. <span className="text-amber">Your combination.</span>
      </h3>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        {recommendations.length
          ? "We highlighted the options that correspond to the gaps reported in this company's first assessment. You can add or remove anything."
          : "Choose the individual services you want. Take the free company Leak Check to see an automatically prioritized selection."}
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {listedOptions.map(option => {
          const checked = selected.includes(option.id);
          const suggestion = recommended.get(option.id);
          return (
            <label key={option.id} className={`flex cursor-pointer gap-3 rounded-lg border p-4 transition-all ${
              checked ? "border-amber/65 bg-amber/10" : "border-border/60 bg-background/30 hover:border-amber/35"
            }`}>
              <input type="checkbox" checked={checked} onChange={() => toggle(option.id)}
                className="mt-1 h-4 w-4 shrink-0 accent-amber" aria-label={`Select ${option.name}`} />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-start justify-between gap-2">
                  <span className="font-semibold leading-snug text-foreground">{option.name}</span>
                  <span className="font-mono text-sm font-bold text-amber">
                    {money(option.priceCents)}{option.cadence === "monthly" ? "/mo" : ""}
                  </span>
                </span>
                {suggestion && <span className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber">
                  <Check className="h-3 w-3" /> Suggested · {suggestion.score}% gap signal
                </span>}
                <span className="mt-2 block text-xs leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">Fix:</span> {option.fix}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      <div className="mt-7 rounded-lg border border-amber/25 bg-background/50 p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber">Your custom estimate</p>
        <div className="mt-4 flex flex-wrap gap-x-12 gap-y-4">
          <div><p className="text-xs text-muted-foreground">One-time services</p><p className="font-forensic text-3xl font-bold">{money(cart.oneTimeCents)}</p></div>
          <div><p className="text-xs text-muted-foreground">Monthly services</p><p className="font-forensic text-3xl font-bold">{money(cart.monthlyCents)}<span className="text-sm text-muted-foreground">/mo</span></p></div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          One-time and monthly fees are separate. Estimates reflect listed individual prices, not a signed quote;
          applicability and scope must be confirmed before any work or payment.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <a href={discussHref}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full px-6 text-xs font-bold uppercase tracking-wider ${
              cart.items.length ? "bg-amber text-background" : "pointer-events-none bg-secondary text-muted-foreground"
            }`}
            aria-disabled={cart.items.length === 0}>
            Request a tailored scope <ArrowRight className="h-4 w-4" />
          </a>
          {cart.items.length > 0 && (
            <Link to="/book" className="inline-flex min-h-11 items-center text-sm font-semibold text-amber underline underline-offset-4">
              Or schedule a scope discussion
            </Link>
          )}
          {recommendations.length === 0 && <Link className="text-sm text-amber underline" to="/leak-audit/self-scan">Take the free company audit</Link>}
        </div>
      </div>
    </section>
  );
}
