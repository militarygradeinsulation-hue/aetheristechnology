import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { BuyToolDialog } from "@/components/BuyToolDialog";
import { SHOP_TOOLS, SHOP_PRICES } from "@/lib/tool-shop-catalog";
import { BOOK_MEETING_URL } from "@/lib/links";
import { Sparkles, ShoppingCart, CalendarClock, X, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface Pick { id: string; reason: string }
interface Recommendation { url: string; summary: string; picks: Pick[] }

const STORAGE_KEY = "aetheris.easyModeRecs.v1";

function loadStored(): Recommendation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function EasyModeRecommender() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [rec, setRec] = useState<Recommendation | null>(() => loadStored());
  const [dismissedTools, setDismissedTools] = useState<Set<string>>(new Set());
  const [offerDismissed, setOfferDismissed] = useState(false);
  const [fomoOpen, setFomoOpen] = useState(false);
  const [fomoContext, setFomoContext] = useState<{ kind: "tool" | "offer"; toolId?: string } | null>(null);
  const [buyOpen, setBuyOpen] = useState(false);
  const [buyIds, setBuyIds] = useState<string[]>([]);
  const [buyPlan, setBuyPlan] = useState<"single" | "triple" | "unlimited">("triple");

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setDismissedTools(new Set());
    setOfferDismissed(false);
    try {
      const { data, error } = await supabase.functions.invoke("recommend-tools", { body: { url: url.trim() } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const next: Recommendation = { url: data.url, summary: data.summary, picks: data.picks || [] };
      if (!next.picks.length) throw new Error("No picks returned");
      setRec(next);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not analyze that URL");
    } finally {
      setLoading(false);
    }
  };

  const openBuyAll = () => {
    if (!rec) return;
    const ids = rec.picks.filter(p => !dismissedTools.has(p.id)).map(p => p.id);
    if (ids.length === 0) return;
    setBuyIds(ids);
    setBuyPlan(ids.length >= 2 ? "triple" : "single");
    setBuyOpen(true);
  };

  const openBuyOne = (id: string) => {
    setBuyIds([id]);
    setBuyPlan("single");
    setBuyOpen(true);
  };

  const requestDismissTool = (id: string) => {
    setFomoContext({ kind: "tool", toolId: id });
    setFomoOpen(true);
  };
  const requestDismissOffer = () => {
    setFomoContext({ kind: "offer" });
    setFomoOpen(true);
  };
  const confirmDismiss = () => {
    if (!fomoContext) return setFomoOpen(false);
    if (fomoContext.kind === "tool" && fomoContext.toolId) {
      setDismissedTools(prev => new Set(prev).add(fomoContext.toolId!));
    } else if (fomoContext.kind === "offer") {
      setOfferDismissed(true);
    }
    setFomoOpen(false);
  };

  const reset = () => {
    setRec(null);
    setUrl("");
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  const visiblePicks = rec?.picks.filter(p => !dismissedTools.has(p.id)) || [];
  const activeCount = visiblePicks.length;
  const bundlePrice = activeCount >= 3 ? SHOP_PRICES.triple.amount : SHOP_PRICES.single.amount * activeCount;
  const listPrice = SHOP_PRICES.single.amount * activeCount;
  const savings = Math.max(0, listPrice - bundlePrice);

  return (
    <section className="mb-10 relative rounded-sm border border-amber/50 bg-gradient-to-br from-amber/10 via-background/60 to-background p-6 md:p-8 overflow-hidden">
      <div className="absolute -top-16 -right-16 w-64 h-64 bg-amber/10 blur-3xl rounded-full pointer-events-none" />
      <div className="relative">
        <div className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-amber mb-3 px-2 py-0.5 rounded-full border border-amber/40 bg-amber/10">
          <Wand2 className="w-3 h-3" /> Easy Mode
        </div>
        <h2 className="font-forensic text-2xl md:text-4xl font-bold leading-tight mb-2">
          Confused on what you need?
        </h2>
        <p className="text-sm md:text-base text-muted-foreground mb-5 max-w-2xl">
          Paste your URL and let's see what tools could remove your workload. We'll pick the top 3 for your business — with a bundle discount if you grab them now, or book a call to walk through the findings.
        </p>

        {!rec && (
          <form onSubmit={run} className="flex flex-col sm:flex-row gap-2 max-w-2xl">
            <Input
              type="text"
              placeholder="yourbusiness.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              disabled={loading}
              className="flex-1 bg-background/70 border-amber/30 focus:border-amber"
            />
            <Button type="submit" disabled={loading || !url.trim()} className="bg-amber text-background hover:bg-amber/90 font-semibold whitespace-nowrap">
              {loading ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Reading site…</> : <><Sparkles className="w-4 h-4 mr-1.5" /> Show my top 3</>}
            </Button>
          </form>
        )}

        {rec && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-widest text-amber/70 mb-1">// forensic read · {rec.url}</div>
                {rec.summary && <p className="text-sm text-foreground/90 max-w-3xl">{rec.summary}</p>}
              </div>
              <button onClick={reset} className="text-xs font-mono text-muted-foreground hover:text-amber underline underline-offset-2">
                Try a different URL
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              {visiblePicks.map((p, i) => {
                const tool = SHOP_TOOLS.find(t => t.id === p.id);
                if (!tool) return null;
                return (
                  <div key={p.id} className="relative rounded-sm border border-amber/40 bg-background/70 p-4 flex flex-col">
                    <button
                      onClick={() => requestDismissTool(p.id)}
                      className="absolute top-2 right-2 text-muted-foreground hover:text-crimson p-1"
                      aria-label="Dismiss recommendation"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-amber/70 mb-1">Pick #{i + 1}</div>
                    <h3 className="font-forensic text-base font-bold mb-1.5 pr-6">{tool.name}</h3>
                    <p className="text-xs text-foreground/80 mb-3 flex-1">{p.reason}</p>
                    <div className="flex gap-1.5 mt-auto">
                      <Button asChild size="sm" variant="outline" className="flex-1 border-amber/40 text-amber hover:bg-amber/10 text-xs h-8">
                        <Link to={`/try/${tool.id}`}><Sparkles className="w-3 h-3 mr-1" /> Try free</Link>
                      </Button>
                      <Button size="sm" onClick={() => openBuyOne(tool.id)} className="flex-1 bg-amber text-background hover:bg-amber/90 text-xs h-8 font-semibold">
                        <ShoppingCart className="w-3 h-3 mr-1" /> Own
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {!offerDismissed && activeCount > 0 && (
              <div className="relative rounded-sm border border-amber/60 bg-amber/10 p-4 flex flex-col md:flex-row items-start md:items-center gap-3">
                <button
                  onClick={requestDismissOffer}
                  className="absolute top-2 right-2 text-muted-foreground hover:text-crimson p-1"
                  aria-label="Dismiss offer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="flex-1 pr-6">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-amber mb-1">// bundle offer · today only</div>
                  <div className="font-forensic text-lg font-bold">
                    Grab all {activeCount} now for <span className="text-amber">${(bundlePrice / 100).toFixed(0)}</span>
                    {savings > 0 && (
                      <span className="ml-2 text-xs font-mono text-crimson line-through">${(listPrice / 100).toFixed(0)}</span>
                    )}
                    {savings > 0 && (
                      <span className="ml-1 text-xs font-mono text-amber">save ${(savings / 100).toFixed(0)}</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">Lifetime access. Or book a free call and we'll walk you through the findings.</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button asChild size="sm" variant="outline" className="border-amber/50 text-amber hover:bg-amber/20">
                    <a href={BOOK_MEETING_URL} target="_blank" rel="noopener noreferrer">
                      <CalendarClock className="w-3.5 h-3.5 mr-1.5" /> Book call
                    </a>
                  </Button>
                  <Button size="sm" onClick={openBuyAll} className="bg-amber text-background hover:bg-amber/90 font-semibold">
                    <ShoppingCart className="w-3.5 h-3.5 mr-1.5" /> Buy bundle
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <BuyToolDialog open={buyOpen} onOpenChange={setBuyOpen} plan={buyPlan} preselectedToolIds={buyIds} />

      <Dialog open={fomoOpen} onOpenChange={setFomoOpen}>
        <DialogContent className="border-crimson/60">
          <DialogHeader>
            <DialogTitle className="font-forensic text-2xl">
              {fomoContext?.kind === "offer"
                ? "Are you sure you want to walk away from the fix?"
                : "Are you sure you don't want to fix that leak?"}
            </DialogTitle>
            <DialogDescription className="text-foreground/80 pt-2">
              {fomoContext?.kind === "offer"
                ? "This bundle is stitched together for your exact site. If it's the price, book a free call. If it's not the right offer — tell us what you were hoping to see. We probably have it."
                : "We picked this tool because your site is bleeding somewhere it can plug. Is there something else you were wanting that you don't see? We probably have it — just ask."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row">
            <Button variant="outline" onClick={() => setFomoOpen(false)} className="border-amber/40 text-amber hover:bg-amber/10">
              Keep looking
            </Button>
            <Button asChild variant="outline" className="border-amber/40">
              <a href={BOOK_MEETING_URL} target="_blank" rel="noopener noreferrer">
                <CalendarClock className="w-3.5 h-3.5 mr-1.5" /> Book a call instead
              </a>
            </Button>
            <Button onClick={confirmDismiss} variant="ghost" className="text-muted-foreground hover:text-crimson">
              Dismiss anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
