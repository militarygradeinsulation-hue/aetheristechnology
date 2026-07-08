import { useLocation, Link } from "react-router-dom";
import { SHOP_TOOLS } from "@/lib/tool-shop-catalog";
import { ShoppingCart, X } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Sticky bottom bar shown on any tool page in SHOP_TOOLS. Offers a one-click
 * jump into the Tool Shop with the current tool pre-selected for $40 lifetime.
 */
export function ToolBuyBar() {
  const { pathname } = useLocation();
  const tool = SHOP_TOOLS.find(t => t.route === pathname);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => { setDismissed(false); }, [pathname]);

  if (!tool || dismissed) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 pointer-events-none px-3 pb-3">
      <div className="pointer-events-auto max-w-3xl mx-auto rounded-md border border-amber-500/60 bg-background/95 backdrop-blur shadow-lg p-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-amber-500 font-mono">Leak Ecosystem</div>
          <div className="text-sm font-semibold truncate">Own {tool.name} for life — $40</div>
          <div className="text-xs text-muted-foreground truncate">Unlimited runs + persistent memory attached to your code.</div>
        </div>
        <Link
          to={`/tools-shop?tool=${encodeURIComponent(tool.id)}`}
          className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 hover:bg-amber-600 text-black text-sm font-semibold px-3 py-2 whitespace-nowrap"
        >
          <ShoppingCart className="w-4 h-4" /> Buy $40
        </Link>
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
  );
}
