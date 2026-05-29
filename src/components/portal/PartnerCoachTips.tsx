import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Lightbulb, Clock, Target, MousePointerClick, Sparkles } from "lucide-react";
import { getPartnerGuidance } from "@/lib/partnerGuidance";

interface Props {
  tabId: string;
}

/**
 * Coach tips strip rendered at the top of Braden's partner tabs.
 * Plain-English: WHAT this screen is for, WHY it matters, WHEN to act, HOW to do it.
 * Collapsible per-tab, remembered in localStorage so it doesn't get in his way once learned.
 */
export const PartnerCoachTips: React.FC<Props> = ({ tabId }) => {
  const block = getPartnerGuidance(tabId);
  const storageKey = `partner-coach-collapsed-${tabId}`;
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try { setCollapsed(localStorage.getItem(storageKey) === "1"); } catch {}
  }, [storageKey]);

  if (!block) return null;

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(storageKey, next ? "1" : "0"); } catch {}
  };

  return (
    <div className="mb-6 rounded-xl border border-amber/30 bg-gradient-to-br from-amber/10 via-amber/5 to-background overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-amber/5 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-amber/20 border border-amber/40 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-4 h-4 text-amber" />
          </div>
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber">
              COO Coach · for Braden
            </div>
            <div className="font-display text-base font-semibold text-foreground truncate">
              {block.headline}
            </div>
          </div>
        </div>
        {collapsed ? <ChevronRight className="w-4 h-4 text-amber flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-amber flex-shrink-0" />}
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-4">
          <p className="text-sm text-foreground/85 leading-relaxed border-l-2 border-amber/40 pl-3">
            {block.intro}
          </p>

          <div className="grid gap-3">
            {block.steps.map((step, i) => (
              <div
                key={i}
                className="rounded-lg border border-border/60 bg-card/50 p-3 sm:p-4 space-y-2.5"
              >
                <div className="font-display text-sm font-semibold text-foreground flex items-start gap-2">
                  <span className="text-amber">{step.title}</span>
                </div>

                <div className="grid sm:grid-cols-3 gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-amber/80">
                      <Target className="w-3 h-3" /> Why
                    </div>
                    <p className="text-foreground/85 leading-snug">{step.why}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-amber/80">
                      <Clock className="w-3 h-3" /> When
                    </div>
                    <p className="text-foreground/85 leading-snug">{step.when}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-amber/80">
                      <MousePointerClick className="w-3 h-3" /> How
                    </div>
                    <p className="text-foreground/85 leading-snug">{step.how}</p>
                  </div>
                </div>

                {step.pro && (
                  <div className="flex items-start gap-2 pt-2 border-t border-amber/20">
                    <Sparkles className="w-3.5 h-3.5 text-amber flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber/90 italic leading-snug">{step.pro}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerCoachTips;
