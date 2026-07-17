import { useLocation } from "react-router-dom";
import { SHOP_TOOLS, formatToolPrice } from "@/lib/tool-shop-catalog";
import { CalendarClock, ShoppingCart, X } from "lucide-react";
import { useEffect, useState } from "react";
import { BuyToolDialog } from "@/components/BuyToolDialog";
import { BOOK_MEETING_URL } from "@/lib/links";

/**
 * Sticky bottom bar shown on public tool pages. Every visitor gets 3 free
 * runs; after that they either buy the tool at its listed price, or book a
 * session. Hidden entirely on operator-only tools and on Golden Report
 * (which is only ever included in the $18,500 Full Leak Investigation).
 */
export function ToolBuyBar() {
  const { pathname } = useLocation();
  const tool = SHOP_TOOLS.find(t => t.route === pathname);
  const [dismissed, setDismissed] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);

  useEffect(() => { setDismissed(false); }, [pathname]);

  if (!tool || dismissed) return null;
  if (tool.internalOnly || tool.priceCents == null) return null;

  const priceLabel = formatToolPrice(tool);

  return (
    <>
      <div className="fixed bottom-0 inset-x-0 z-40 pointer-events-none px-3 pb-3">
        <div className="pointer-events-auto max-w-3xl mx-auto rounded-md border border-amber-500/60 bg-background/95 backdrop-blur shadow-lg p-3 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-amber-500 font-mono">Leak Ecosystem · 3 free tries</div>
            <div className="text-sm font-semibold truncate">{tool.name} — free to view, buy or book to keep running</div>
            <div className="text-xs text-muted-foreground truncate">Own it for {priceLabel} lifetime, or book an appointment and we'll run it with you.</div>
          </div>
          <a
            href={BOOK_MEETING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/60 text-amber-500 hover:bg-amber-500/10 text-sm font-semibold px-3 py-2 whitespace-nowrap"
          >
            <CalendarClock className="w-4 h-4" /> Book
          </a>
          <button
            type="button"
            onClick={() => setBuyOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 hover:bg-amber-600 text-black text-sm font-semibold px-3 py-2 whitespace-nowrap"
          >
            <ShoppingCart className="w-4 h-4" /> Buy {priceLabel}
          </button>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setDismissed(true)}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <BuyToolDialog
        open={buyOpen}
        onOpenChange={setBuyOpen}
        plan="single"
        preselectedToolIds={[tool.id]}
      />
    </>
  );
}
