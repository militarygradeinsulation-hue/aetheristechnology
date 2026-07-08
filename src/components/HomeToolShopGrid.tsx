import { Link } from "react-router-dom";
import { SHOP_TOOLS, SHOP_PRICES } from "@/lib/tool-shop-catalog";
import { ArrowRight, ShoppingCart, Sparkles, KeyRound, Rocket } from "lucide-react";

/**
 * Public grid of every Leak Ecosystem tool.
 * - Prominent two-tier pricing banner: $40 per tool · $100 operator license.
 * - Per-tile CTAs minimized to a single "Try it free" primary + subtle $40 link.
 */
export function HomeToolShopGrid() {
  return (
    <section className="mt-8 max-w-5xl mx-auto animate-fade-in">
      <div className="rounded-sm border border-amber/40 bg-card/70 backdrop-blur-sm p-5 sm:p-7">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber mb-1">
              The Chaos Ecosystem · Two ways in
            </div>
            <h2 className="font-forensic text-2xl sm:text-3xl font-bold leading-tight">
              Try every tool free. Own one, or resell them all.
            </h2>
            <p className="text-sm text-foreground/70 mt-1">
              3 free runs on any tool. Then choose: buy the tool, or license the whole ecosystem.
            </p>
          </div>
          <Link
            to="/tools-shop"
            className="inline-flex items-center gap-1.5 rounded-md border border-amber/50 px-3 py-2 text-xs font-mono uppercase tracking-widest text-amber hover:bg-amber/10 whitespace-nowrap"
          >
            Bundle & save <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Prominent pricing pillars */}
        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          {/* $40 — Own a tool */}
          <Link
            to="/tools-shop"
            className="group relative overflow-hidden rounded-sm border border-amber/50 bg-gradient-to-br from-amber/10 via-background to-background hover:border-amber transition-colors p-5"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber/70" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ShoppingCart className="w-3.5 h-3.5 text-amber" />
                  <div className="font-mono text-[9px] uppercase tracking-[0.35em] text-amber/80">
                    § 01 · Application License
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <div className="font-forensic text-4xl font-bold text-amber leading-none">$40</div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-widest font-mono">one-time · per tool</div>
                </div>
                <p className="text-xs text-foreground/80 mt-3 leading-snug">
                  Own any single tool for life. Unlimited runs. Persistent memory tied to your account.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-amber/20 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-amber">
              <span>Buy a tool</span>
              <ArrowRight className="w-3 h-3 ml-auto group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* $100 — Operator license */}
          <Link
            to="/careers/license"
            className="group relative overflow-hidden rounded-sm border border-crimson/50 bg-gradient-to-br from-crimson/10 via-background to-background hover:border-crimson transition-colors p-5"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-crimson/70" />
            <div className="absolute top-3 right-3 font-mono text-[9px] text-crimson border border-crimson/50 px-1.5 py-0.5 uppercase tracking-widest">
              Resell
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <KeyRound className="w-3.5 h-3.5 text-crimson" />
                <div className="font-mono text-[9px] uppercase tracking-[0.35em] text-crimson/90">
                  § 02 · Operator License
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <div className="font-forensic text-4xl font-bold text-foreground leading-none">$100</div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-widest font-mono">one-time · full ecosystem</div>
              </div>
              <p className="text-xs text-foreground/80 mt-3 leading-snug">
                Sell every tool under your own rep code. Commissions on every sale. Instant activation.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-crimson/20 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-crimson">
              <Rocket className="w-3 h-3" />
              <span>Become an operator</span>
              <ArrowRight className="w-3 h-3 ml-auto group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-amber/20" />
          <div className="font-mono text-[9px] uppercase tracking-[0.35em] text-amber/60">
            The catalog · try any tool free
          </div>
          <div className="h-px flex-1 bg-amber/20" />
        </div>

        {/* Minimized tool tiles */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {SHOP_TOOLS.map((t) => (
            <Link
              key={t.id}
              to={`/try/${encodeURIComponent(t.id)}`}
              className="group rounded-sm border border-border/60 bg-background/60 p-3 flex items-start gap-3 hover:border-amber/60 hover:bg-amber/[0.03] transition-colors"
              title="Sandbox run · no signup · nothing saved"
            >
              <div className="w-8 h-8 rounded-sm bg-amber/10 border border-amber/30 flex items-center justify-center shrink-0 group-hover:bg-amber/20 transition-colors">
                <Sparkles className="w-3.5 h-3.5 text-amber" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="font-mono text-[8px] uppercase tracking-widest text-amber/70">
                    {t.category}
                  </div>
                </div>
                <div className="font-forensic text-sm font-bold leading-tight truncate">
                  {t.name}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                  {t.tagline}
                </p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <div className="font-mono text-[9px] uppercase tracking-widest text-amber group-hover:translate-x-0.5 transition-transform">
                  Try →
                </div>
                <div className="font-mono text-[8px] text-muted-foreground/70">
                  $40
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-5 text-center text-xs text-foreground/60">
          Bundle: <span className="text-amber">3 tools ${(SHOP_PRICES.triple.amount/100)}</span> · All-Access <span className="text-amber">${(SHOP_PRICES.unlimited.amount/100)}</span> lifetime.
        </div>
      </div>
    </section>
  );
}
