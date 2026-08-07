import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, CalendarClock } from "lucide-react";
import { findTool, type ShopPlan } from "@/lib/tool-shop-catalog";
import { AETHERIS_TIERS, tier, tierForTool, tierBadgeForTool } from "@/lib/aetherisTiers";
import { BOOK_MEETING_URL } from "@/lib/links";

interface BuyToolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** @deprecated retail plans no longer exist; kept for call-site compatibility */
  plan?: ShopPlan;
  preselectedToolIds?: string[];
}

/**
 * Tier dialog. Instruments are no longer sold individually — this explains
 * which Aetheris tier includes the instrument and routes to an operator
 * conversation or the public tier ladder.
 */
export function BuyToolDialog({ open, onOpenChange, preselectedToolIds = [] }: BuyToolDialogProps) {
  const tools = preselectedToolIds.map(findTool).filter(Boolean) as NonNullable<ReturnType<typeof findTool>>[];

  const requiredTier = useMemo(() => {
    if (!tools.length) return tier("signal");
    const ranked = tools
      .map(t => tierForTool(t.id))
      .map(id => AETHERIS_TIERS.findIndex(x => x.id === id));
    return AETHERIS_TIERS[Math.max(...ranked)];
  }, [tools.map(t => t.id).join(",")]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-forensic text-2xl">
            {requiredTier.name} — {requiredTier.priceLabel}
          </DialogTitle>
          <DialogDescription>
            {tools.length === 1
              ? `${tools[0].name} is not sold separately. ${tierBadgeForTool(tools[0].id)}.`
              : "Instruments are not sold separately. They are included inside Aetheris tiers."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-foreground/85 leading-relaxed">{requiredTier.headline}</p>
          {requiredTier.inherits && (
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber">
              {requiredTier.inherits} +
            </div>
          )}
          <ul className="space-y-1.5">
            {requiredTier.adds.slice(0, 6).map(a => (
              <li key={a} className="text-sm text-foreground/80 flex gap-2">
                <span className="text-amber">·</span> {a}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button asChild className="bg-amber text-background hover:bg-amber/90 font-semibold">
            <a href={BOOK_MEETING_URL} target="_blank" rel="noopener noreferrer">
              <CalendarClock className="w-4 h-4 mr-1.5" /> Talk to an operator
            </a>
          </Button>
          <Button asChild variant="outline" className="border-amber/50 text-amber hover:bg-amber/10">
            <Link to="/leak-audit" onClick={() => onOpenChange(false)}>
              See the full ladder <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
