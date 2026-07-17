import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import {
  SHOP_PRICES,
  SHOP_TOOLS,
  findTool,
  formatToolPrice,
  sellableShopTools,
  type ShopPlan,
} from "@/lib/tool-shop-catalog";

interface BuyToolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: ShopPlan;
  preselectedToolIds?: string[];
}

/**
 * Universal buy-flow modal.
 *  - `single`: buys one specific client-facing tool at its own priceId/amount.
 *  - `unlimited` / `triple`: buys the Evidence Kit bundle ($2,500, all
 *    client-facing tools). Legacy plan keys map to the same Stripe price.
 */
export function BuyToolDialog({ open, onOpenChange, plan, preselectedToolIds = [] }: BuyToolDialogProps) {
  // Filter preselected ids to sellable tools only — never let an internal
  // tool land in the buy flow via a stale link.
  const cleanPreselect = preselectedToolIds.filter(id => {
    const t = findTool(id);
    return !!t && !t.internalOnly && t.priceCents != null;
  });
  const [selected, setSelected] = useState<string[]>(cleanPreselect);

  useEffect(() => {
    if (open) setSelected(cleanPreselect);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cleanPreselect.join(",")]);

  const isBundle = plan !== "single";
  const tool = plan === "single" ? findTool(selected[0]) : undefined;

  // Resolve priceId + display amount from the selected tool (single) or
  // the Evidence Kit bundle price (bundle plans).
  const resolved = useMemo(() => {
    if (isBundle) {
      return {
        priceId: SHOP_PRICES.unlimited.priceId,
        amountCents: SHOP_PRICES.unlimited.amount,
        label: SHOP_PRICES.unlimited.label,
      };
    }
    if (tool && tool.priceId && tool.priceCents != null) {
      return { priceId: tool.priceId, amountCents: tool.priceCents, label: tool.name };
    }
    return null;
  }, [isBundle, tool]);

  const ready = isBundle || (plan === "single" && !!resolved);

  const title = useMemo(() => {
    if (isBundle) return `Evidence Kit — ${formatPrice(SHOP_PRICES.unlimited.amount)}`;
    if (tool) return `Buy ${tool.name} — ${formatToolPrice(tool)}`;
    return "Pick a tool";
  }, [isBundle, tool]);

  const description = isBundle
    ? "Every client-facing diagnostic + the AI Readiness Checklist. Lifetime access with persistent memory. One payment, keep it forever. 7-day money back."
    : "Own it for life. Unlimited runs. Persistent memory tied to your account. 7-day money back if it doesn't earn its keep.";

  const metadata = {
    shop: "tools",
    plan,
    tool_ids: JSON.stringify(isBundle
      ? sellableShopTools().map(t => t.id)
      : selected),
    product_name: isBundle
      ? "Aetheris Evidence Kit — All Client-Facing Tools"
      : (tool ? `Aetheris Tool — ${tool.name}` : "Aetheris Tool"),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-forensic">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {plan === "single" && !tool && (
          <div className="space-y-2">
            <div className="font-mono text-[10px] uppercase tracking-widest text-amber">
              Pick a tool
            </div>
            <div className="grid sm:grid-cols-2 gap-1.5 max-h-72 overflow-y-auto pr-1">
              {sellableShopTools().map(t => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setSelected([t.id])}
                  className="text-left rounded-sm border border-border/60 hover:border-amber/60 p-2 transition-colors"
                >
                  <div className="text-xs font-semibold truncate">{t.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{t.tagline}</div>
                  <div className="text-[10px] font-mono text-amber mt-0.5">{formatToolPrice(t)}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {ready && resolved ? (
          <StripeEmbeddedCheckout
            priceId={resolved.priceId}
            returnUrl={`${window.location.origin}/tools-shop/return?session_id={CHECKOUT_SESSION_ID}`}
            metadata={metadata}
          />
        ) : (
          plan === "single" && !tool && (
            <div className="text-sm text-muted-foreground p-4 text-center">
              Select a tool to continue.
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toLocaleString()}`;
}
