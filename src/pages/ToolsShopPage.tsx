import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Lock, Zap, Infinity as InfinityIcon, KeyRound } from "lucide-react";
import { SHOP_TOOLS, SHOP_PRICES, type ShopPlan } from "@/lib/tool-shop-catalog";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";

export default function ToolsShopPage() {
  const [plan, setPlan] = useState<ShopPlan>("single");
  const [selected, setSelected] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const maxSelect = plan === "single" ? 1 : plan === "triple" ? 3 : 0;
  const price = SHOP_PRICES[plan];

  const toggle = (id: string) => {
    if (plan === "unlimited") return;
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= maxSelect) return [...prev.slice(1), id];
      return [...prev, id];
    });
  };

  const canBuy = useMemo(() => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
    if (plan === "unlimited") return true;
    if (plan === "single") return selected.length === 1;
    if (plan === "triple") return selected.length >= 1 && selected.length <= 3;
    return false;
  }, [plan, selected, email]);

  const metadata = useMemo(() => ({
    shop: "tools",
    plan,
    tool_ids: JSON.stringify(plan === "unlimited" ? [] : selected),
    product_name: `Leak Tool Shop — ${price.label}`,
  }), [plan, selected, price.label]);

  const beginCheckout = () => {
    if (!canBuy) {
      toast.error("Enter your email and pick your tools first.");
      return;
    }
    setCheckoutOpen(true);
  };

  return (
    <>
      <Helmet>
        <title>Leak Ecosystem Tool Shop — $40 Lifetime Access</title>
        <meta name="description" content="Buy any diagnostic or content tool once for $40. Lifetime access with persistent AI memory. 3 free runs on every tool." />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="text-center mb-10">
            <Badge variant="outline" className="mb-4 border-amber-600/50 text-amber-500">The Leak Ecosystem</Badge>
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-3">
              Own the tool. <span className="text-amber-500">Keep the memory.</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Try any tool free (3 runs). Buy it once for $40 — lifetime access, and the AI remembers your business every time you come back.
            </p>
            <div className="mt-4">
              <Link to="/tools-shop/redeem" className="text-sm underline text-amber-500 inline-flex items-center gap-1">
                <KeyRound className="w-3 h-3" /> Already have a code? Redeem it →
              </Link>
            </div>
          </div>

          {/* Plan picker */}
          <div className="grid md:grid-cols-3 gap-4 mb-10">
            {(Object.keys(SHOP_PRICES) as ShopPlan[]).map(k => {
              const p = SHOP_PRICES[k];
              const active = plan === k;
              return (
                <Card
                  key={k}
                  onClick={() => { setPlan(k); if (k === "unlimited") setSelected([]); }}
                  className={`p-6 cursor-pointer transition border-2 ${active ? "border-amber-500 bg-amber-500/5" : "border-border hover:border-amber-500/40"}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">{p.label}</div>
                      <div className="text-3xl font-bold mt-1">${(p.amount / 100).toFixed(0)}</div>
                    </div>
                    {k === "unlimited" && <InfinityIcon className="w-5 h-5 text-amber-500" />}
                    {k === "triple" && <Zap className="w-5 h-5 text-amber-500" />}
                    {k === "single" && <Lock className="w-5 h-5 text-amber-500" />}
                  </div>
                  <p className="text-sm text-muted-foreground">{p.subtitle}</p>
                  <p className="text-xs text-muted-foreground mt-2">One-time. Lifetime. Memory attached.</p>
                </Card>
              );
            })}
          </div>

          {/* Tool grid */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {plan === "unlimited" ? "Everything included:" : `Pick ${plan === "single" ? "1 tool" : "up to 3 tools"} (${selected.length}/${maxSelect})`}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {SHOP_TOOLS.map(t => {
              const on = plan === "unlimited" || selected.includes(t.id);
              const buyThis = () => {
                if (plan === "unlimited") {
                  document.getElementById("shop-checkout")?.scrollIntoView({ behavior: "smooth" });
                  return;
                }
                setSelected(prev => (prev.includes(t.id) ? prev : (plan === "single" ? [t.id] : [...prev.slice(-2), t.id])));
                setTimeout(() => document.getElementById("shop-checkout")?.scrollIntoView({ behavior: "smooth" }), 60);
              };
              return (
                <Card
                  key={t.id}
                  className={`p-4 transition ${on ? "border-amber-500 bg-amber-500/5" : "hover:border-amber-500/40"}`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    {plan !== "unlimited" && (
                      <Checkbox checked={on} onCheckedChange={() => toggle(t.id)} className="mt-1" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm truncate">{t.name}</h3>
                        <Badge variant="secondary" className="text-[10px] uppercase">{t.category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{t.tagline}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <Link to={t.route}>Try free (3 runs)</Link>
                    </Button>
                    <Button
                      size="sm"
                      onClick={buyThis}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-black"
                    >
                      {plan === "unlimited" ? "Included" : on ? "Selected ✓" : `Buy $${(SHOP_PRICES.single.amount / 100).toFixed(0)}`}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>


          {/* Checkout */}
          <Card id="shop-checkout" className="p-6 max-w-2xl mx-auto border-amber-500/40">
            <h3 className="font-semibold mb-4">Checkout — {price.label} · ${(price.amount / 100).toFixed(0)}</h3>
            <div className="space-y-3 mb-4">
              <div>
                <Label htmlFor="shop-email">Email (where your code will be sent)</Label>
                <Input
                  id="shop-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                />
              </div>
              {plan !== "unlimited" && (
                <div className="text-sm text-muted-foreground">
                  Selected: {selected.length ? selected.map(id => SHOP_TOOLS.find(t => t.id === id)?.name).join(", ") : "none yet"}
                </div>
              )}
            </div>

            {!checkoutOpen && (
              <Button
                onClick={beginCheckout}
                disabled={!canBuy}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black"
              >
                Buy for ${(price.amount / 100).toFixed(0)} — Lifetime
              </Button>
            )}

            {checkoutOpen && (
              <div className="mt-4">
                <StripeEmbeddedCheckout
                  priceId={price.priceId}
                  customerEmail={email}
                  metadata={metadata as Record<string, string>}
                  returnUrl={`${window.location.origin}/tools-shop/return?session_id={CHECKOUT_SESSION_ID}`}
                />
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
