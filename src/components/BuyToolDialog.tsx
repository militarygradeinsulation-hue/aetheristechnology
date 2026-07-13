import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { SHOP_PRICES, SHOP_TOOLS, type ShopPlan } from "@/lib/tool-shop-catalog";

interface BuyToolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: ShopPlan;
  preselectedToolIds?: string[];
}

/**
 * Universal buy-flow modal. Handles single-tool, 3-tool bundle, and All-Access
 * purchases inline (no page navigation). For the "triple" plan, users pick 3
 * tools inside the dialog before checkout mounts.
 */
export function BuyToolDialog({ open, onOpenChange, plan, preselectedToolIds = [] }: BuyToolDialogProps) {
  const price = SHOP_PRICES[plan];
  const [selected, setSelected] = useState<string[]>(preselectedToolIds);

  useEffect(() => {
    if (open) setSelected(preselectedToolIds);
  }, [open, preselectedToolIds.join(",")]);

  const maxSelect = plan === "single" ? 1 : plan === "triple" ? 3 : 0;
  const needsPicker = plan === "triple";
  const ready = plan === "unlimited"
    || (plan === "single" && selected.length === 1)
    || (plan === "triple" && selected.length === 3);

  const toggle = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (maxSelect && prev.length >= maxSelect) return [...prev.slice(1), id];
      return [...prev, id];
    });
  };

  const title = useMemo(() => {
    if (plan === "single") {
      const t = SHOP_TOOLS.find(x => x.id === selected[0]);
      return t ? `Buy ${t.name} — $${price.amount / 100}` : `Pick 1 tool — $${price.amount / 100}`;
    }
    if (plan === "triple") return `Pick 3 tools — $${price.amount / 100}`;
    return `All-Access — $${price.amount / 100}`;
  }, [plan, selected, price.amount]);

  const description = plan === "unlimited"
    ? "Every tool. Every future release. Full Team access. Lifetime access with persistent memory. Replaces $2k/mo in agency retainers — one-time payment, keep it forever. 7-day money back."
    : "Own it for life. Unlimited runs. Persistent memory tied to your account. Replaces a $200/mo SaaS subscription — 7-day money back if it doesn't earn its keep.";

  const metadata = {
    shop: "tools",
    plan,
    tool_ids: JSON.stringify(plan === "unlimited" ? [] : selected),
    product_name: `Leak Tool Shop — ${price.label}`,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-forensic">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {needsPicker && (
          <div className="space-y-2">
            <div className="font-mono text-[10px] uppercase tracking-widest text-amber">
              Pick 3 tools ({selected.length}/3)
            </div>
            <div className="grid sm:grid-cols-2 gap-1.5 max-h-72 overflow-y-auto pr-1">
              {SHOP_TOOLS.map(t => {
                const on = selected.includes(t.id);
                return (
                  <label
                    key={t.id}
                    className={`flex items-start gap-2 rounded-sm border p-2 cursor-pointer transition-colors ${on ? "border-amber bg-amber/10" : "border-border/60 hover:border-amber/50"}`}
                  >
                    <Checkbox checked={on} onCheckedChange={() => toggle(t.id)} className="mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">{t.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{t.tagline}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {ready ? (
          <StripeEmbeddedCheckout
            priceId={price.priceId}
            returnUrl={`${window.location.origin}/tools-shop/return?session_id={CHECKOUT_SESSION_ID}`}
            metadata={metadata}
          />
        ) : (
          !needsPicker && (
            <div className="text-sm text-muted-foreground p-4 text-center">
              Select a tool to continue.
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
