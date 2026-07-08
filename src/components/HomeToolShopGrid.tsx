import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SHOP_TOOLS, SHOP_PRICES, type ShopTool, type ShopPlan } from "@/lib/tool-shop-catalog";
import { ArrowRight, ShoppingCart, Sparkles, KeyRound, Rocket, Zap, X, Play } from "lucide-react";
import { BuyToolDialog } from "@/components/BuyToolDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

/**
 * Public grid of every Leak Ecosystem tool. Clicking a tile expands a
 * center-screen info dialog with Try + Buy actions. Try preserves a
 * `#tool-catalog` hash so browser Back drops the user right back at this
 * section without extra scrolling.
 */
export function HomeToolShopGrid() {
  const navigate = useNavigate();
  const [buyPlan, setBuyPlan] = useState<ShopPlan | null>(null);
  const [preselected, setPreselected] = useState<string[]>([]);
  const [infoTool, setInfoTool] = useState<ShopTool | null>(null);

  // If we land here with #tool-catalog (e.g. from browser Back after Try),
  // scroll the catalog into view automatically.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#tool-catalog") {
      // wait a frame for layout
      requestAnimationFrame(() => {
        document.getElementById("tool-catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, []);

  const openBuy = (plan: ShopPlan, tool?: ShopTool) => {
    setPreselected(tool ? [tool.id] : []);
    setBuyPlan(plan);
  };

  const handleTry = (tool: ShopTool) => {
    // Stamp the current home entry with #tool-catalog so browser Back returns
    // straight to this section — no scrolling required.
    if (typeof window !== "undefined") {
      const { pathname, search } = window.location;
      window.history.replaceState(window.history.state, "", `${pathname}${search}#tool-catalog`);
    }
    setInfoTool(null);
    navigate(`/try/${encodeURIComponent(tool.id)}`);
  };

  const handleBuyFromInfo = (tool: ShopTool) => {
    setInfoTool(null);
    openBuy("single", tool);
  };

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
              3 free runs on any tool. Then buy the tool, grab a bundle, or license the whole ecosystem — all right here.
            </p>
          </div>
          <div className="flex flex-col sm:items-end gap-1.5">
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-amber/70">
              Bundle & save · instant checkout
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => openBuy("triple")}
                className="inline-flex items-center gap-1.5 rounded-sm border border-amber/50 bg-amber/5 px-2.5 py-1.5 text-[11px] font-mono uppercase tracking-widest text-amber hover:bg-amber/15 transition-colors"
              >
                3 Tools <span className="text-foreground font-bold">${SHOP_PRICES.triple.amount/100}</span>
              </button>
              <button
                type="button"
                onClick={() => openBuy("unlimited")}
                className="inline-flex items-center gap-1.5 rounded-sm border border-crimson/50 bg-crimson/5 px-2.5 py-1.5 text-[11px] font-mono uppercase tracking-widest text-crimson hover:bg-crimson/15 transition-colors"
              >
                All-Access <span className="text-foreground font-bold">${SHOP_PRICES.unlimited.amount/100}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Prominent pricing pillars */}
        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          {/* $40 — Own a tool (click = pick a tool below) */}
          <button
            type="button"
            onClick={() => {
              document.getElementById("tool-catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="group relative overflow-hidden rounded-sm border border-amber/50 bg-gradient-to-br from-amber/10 via-background to-background hover:border-amber transition-colors p-5 text-left"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber/70" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ShoppingCart className="w-3.5 h-3.5 text-amber" />
                  <div className="font-mono text-[9px] uppercase tracking-[0.35em] text-amber/80">
                    § 01 · Single Tool License
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
              <span>Pick a tool below</span>
              <ArrowRight className="w-3 h-3 ml-auto group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

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

        {/* Divider / catalog anchor */}
        <div id="tool-catalog" className="flex items-center gap-3 mb-4 scroll-mt-24">
          <div className="h-px flex-1 bg-amber/20" />
          <div className="font-mono text-[9px] uppercase tracking-[0.35em] text-amber/60">
            The catalog · tap any tool to expand
          </div>
          <div className="h-px flex-1 bg-amber/20" />
        </div>

        {/* Tool tiles — click opens info dialog */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {SHOP_TOOLS.map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => setInfoTool(t)}
              className="group text-left rounded-sm border border-border/60 bg-background/60 p-3 flex items-start gap-3 hover:border-amber/60 hover:bg-amber/[0.03] transition-colors"
              aria-label={`Open details for ${t.name}`}
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
              <div className="shrink-0 self-center font-mono text-[9px] uppercase tracking-widest text-amber/70 group-hover:text-amber flex items-center gap-1">
                Details
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          ))}
        </div>

        <div className="mt-4 text-center">
          <Link to="/tools-shop/redeem" className="text-xs font-mono uppercase tracking-widest text-amber/70 hover:text-amber underline">
            Already have a code? Redeem it →
          </Link>
        </div>
      </div>

      {/* Tool info dialog (expanded center-screen view) */}
      <Dialog open={!!infoTool} onOpenChange={(o) => !o && setInfoTool(null)}>
        <DialogContent className="max-w-lg">
          {infoTool && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-sm bg-amber/10 border border-amber/30 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-amber" />
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.35em] text-amber/80">
                    {infoTool.category}
                  </div>
                </div>
                <DialogTitle className="font-forensic text-2xl">{infoTool.name}</DialogTitle>
                <DialogDescription className="text-sm leading-relaxed pt-1">
                  {infoTool.tagline}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 pt-1">
                <div className="rounded-sm border border-border/60 bg-background/40 p-3 space-y-1.5">
                  <div className="font-mono text-[9px] uppercase tracking-widest text-amber/70">What you get</div>
                  <ul className="text-xs text-foreground/80 space-y-1 list-disc list-inside marker:text-amber/60">
                    <li>3 free sandbox runs — no signup, nothing saved.</li>
                    <li>$40 lifetime license — unlimited runs after that.</li>
                    <li>Persistent memory attached to your account.</li>
                    <li>Same engine the operators run in the field.</li>
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleTry(infoTool)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-sm border border-amber/60 bg-amber/5 hover:bg-amber/15 text-amber px-3 py-2.5 text-xs font-mono uppercase tracking-widest font-bold transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" /> Try free
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBuyFromInfo(infoTool)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-sm bg-amber hover:bg-amber/90 text-background px-3 py-2.5 text-xs font-mono uppercase tracking-widest font-bold transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5" /> Buy $40
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {buyPlan && (
        <BuyToolDialog
          open={!!buyPlan}
          onOpenChange={(o) => !o && setBuyPlan(null)}
          plan={buyPlan}
          preselectedToolIds={preselected}
        />
      )}
    </section>
  );
}
