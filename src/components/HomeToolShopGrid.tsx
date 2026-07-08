import { useState } from "react";
import { Link } from "react-router-dom";
import { SHOP_TOOLS, SHOP_PRICES, type ShopTool } from "@/lib/tool-shop-catalog";
import { ArrowRight, ShoppingCart, Sparkles, KeyRound, Rocket, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";

/**
 * Public grid of every Leak Ecosystem tool.
 * Clicking a tile opens instant $40 checkout in a modal (no navigation).
 * Small "Try free" secondary link preserves sandbox access.
 */
export function HomeToolShopGrid() {
  const [buyTool, setBuyTool] = useState<ShopTool | null>(null);

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
          <div className="flex flex-col sm:items-end gap-1.5">
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-amber/70">
              Bundle & save · active
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Link
                to="/tools-shop"
                className="inline-flex items-center gap-1.5 rounded-sm border border-amber/50 bg-amber/5 px-2.5 py-1.5 text-[11px] font-mono uppercase tracking-widest text-amber hover:bg-amber/15 transition-colors"
              >
                3 Tools <span className="text-foreground font-bold">${SHOP_PRICES.triple.amount/100}</span>
              </Link>
              <Link
                to="/tools-shop"
                className="inline-flex items-center gap-1.5 rounded-sm border border-crimson/50 bg-crimson/5 px-2.5 py-1.5 text-[11px] font-mono uppercase tracking-widest text-crimson hover:bg-crimson/15 transition-colors"
              >
                All-Access <span className="text-foreground font-bold">${SHOP_PRICES.unlimited.amount/100}</span>
              </Link>
            </div>
          </div>
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
              <div className="flex items-baseline gap-2 mt-2 flex-wrap">
                <div className="font-forensic text-4xl font-bold text-foreground leading-none">$100</div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-widest font-mono">one-time · full ecosystem</div>
              </div>
              <div className="mt-1.5 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-amber/90">
                <span className="text-amber font-bold">+ $40</span>
                <span className="text-muted-foreground">application fee</span>
              </div>
              <p className="text-xs text-foreground/80 mt-3 leading-snug">
                Sell every tool under your own rep code. Commissions on every sale. $40 application confirms you're a fit, $100 license activates you.
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
            The catalog · click any tool to buy · $40 instant
          </div>
          <div className="h-px flex-1 bg-amber/20" />
        </div>

        {/* Tool tiles — click = instant checkout */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {SHOP_TOOLS.map((t) => (
            <div
              key={t.id}
              className="group rounded-sm border border-border/60 bg-background/60 p-3 flex items-start gap-3 hover:border-amber/60 hover:bg-amber/[0.03] transition-colors"
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
                <div className="mt-1.5 flex items-center gap-2">
                  <Link
                    to={`/try/${encodeURIComponent(t.id)}`}
                    className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/70 hover:text-amber transition-colors"
                  >
                    Try free →
                  </Link>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBuyTool(t)}
                className="shrink-0 inline-flex flex-col items-center justify-center gap-0.5 rounded-sm border border-amber/60 bg-amber/10 hover:bg-amber hover:text-background transition-colors px-2.5 py-1.5 self-center"
                aria-label={`Buy ${t.name} for $40`}
              >
                <div className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-amber group-hover:text-inherit">
                  <Zap className="w-3 h-3" />
                  Buy
                </div>
                <div className="font-forensic text-sm font-bold text-amber group-hover:text-inherit leading-none">
                  $40
                </div>
              </button>
            </div>
          ))}
        </div>

      </div>

      {/* Instant checkout modal */}
      <Dialog open={!!buyTool} onOpenChange={(o) => !o && setBuyTool(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-forensic">
              {buyTool ? `Buy ${buyTool.name} — $40` : "Buy tool"}
            </DialogTitle>
            <DialogDescription>
              Lifetime access. Unlimited runs. Persistent memory tied to your account.
            </DialogDescription>
          </DialogHeader>
          {buyTool && (
            <StripeEmbeddedCheckout
              priceId={SHOP_PRICES.single.priceId}
              returnUrl={`${window.location.origin}/tools-shop?checkout=success&session_id={CHECKOUT_SESSION_ID}`}
              metadata={{
                shop: "tools",
                plan: "single",
                tool_ids: JSON.stringify([buyTool.id]),
                tool_id: buyTool.id,
                product_name: `Leak Tool — ${buyTool.name}`,
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
