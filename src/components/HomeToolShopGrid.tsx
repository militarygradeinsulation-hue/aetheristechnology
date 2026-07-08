import { Link } from "react-router-dom";
import { SHOP_TOOLS, SHOP_PRICES } from "@/lib/tool-shop-catalog";
import { ArrowRight, ShoppingCart, Sparkles } from "lucide-react";

/**
 * Public grid of every Leak Ecosystem tool with per-tool "Try free" and
 * "Buy $40" CTAs. Deep-links into /tools-shop with the tool pre-selected.
 */
export function HomeToolShopGrid() {
  return (
    <section className="mt-8 max-w-5xl mx-auto animate-fade-in">
      <div className="rounded-sm border border-amber/40 bg-card/70 backdrop-blur-sm p-5 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber mb-1">
              The Chaos Ecosystem · $40 lifetime unlocks
            </div>
            <h2 className="font-forensic text-2xl sm:text-3xl font-bold leading-tight">
              Every tool. Try free. Own for $40.
            </h2>
            <p className="text-sm text-foreground/70 mt-1">
              3 free runs on any tool. Buy it once, keep it for life — persistent memory attached to your code.
            </p>
          </div>
          <Link
            to="/tools-shop"
            className="inline-flex items-center gap-1.5 rounded-md border border-amber/50 px-3 py-2 text-xs font-mono uppercase tracking-widest text-amber hover:bg-amber/10 whitespace-nowrap"
          >
            Bundle & save <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SHOP_TOOLS.map((t) => (
            <div
              key={t.id}
              className="rounded-sm border border-border/60 bg-background/60 p-3 flex flex-col gap-2 hover:border-amber/50 transition-colors"
            >
              <div>
                <div className="font-mono text-[9px] uppercase tracking-widest text-amber/80">
                  {t.category}
                </div>
                <div className="font-forensic text-sm font-bold leading-tight">
                  {t.name}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {t.tagline}
                </p>
              </div>
              <div className="mt-auto flex flex-col gap-1.5 pt-1">
                <Link
                  to={`/try/${encodeURIComponent(t.id)}`}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-sm bg-amber text-background px-3 py-2.5 text-xs font-mono uppercase tracking-widest font-bold hover:bg-amber/90 shadow-[0_0_18px_hsl(var(--amber)/0.35)] ring-1 ring-amber/60"
                  title="Sandbox run · no signup · nothing saved"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Try it free — 1 click
                </Link>
                <Link
                  to={`/tools-shop?tool=${encodeURIComponent(t.id)}`}
                  className="w-full inline-flex items-center justify-center gap-1 rounded-sm border border-amber/40 text-amber hover:bg-amber/10 px-2 py-1.5 text-[10px] font-mono uppercase tracking-widest"
                >
                  <ShoppingCart className="w-3 h-3" /> Buy $40 lifetime
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 text-center text-xs text-foreground/60">
          Bundle: <span className="text-amber">3 tools ${(SHOP_PRICES.triple.amount/100)}</span> · All-Access <span className="text-amber">${(SHOP_PRICES.unlimited.amount/100)}</span> lifetime.
        </div>
      </div>
    </section>
  );
}
