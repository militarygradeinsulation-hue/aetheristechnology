import React, { useEffect, useState } from "react";
import { CheckCircle2, Circle, Clock, Forward, SkipForward, Loader2, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { leadActions, type LeadActionItem } from "@/lib/leadActions";
import { useToast } from "@/hooks/use-toast";

interface Props {
  leadId: string;
  /** Optional: if provided, used in the empty-state header to remind reps what they're working on. */
  leadLabel?: string;
}

/**
 * Per-lead Action Checklist.
 * - First contact = 5 touch steps (scan → find leak → attach playbook → create email → send)
 * - When 'send' is checked, the system auto-creates a 30-day follow-up sequence with dated reminders
 */
export const LeadActionChecklist: React.FC<Props> = ({ leadId, leadLabel }) => {
  const { toast } = useToast();
  const [items, setItems] = useState<LeadActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const load = async () => {
    try {
      const { items } = await leadActions.list(leadId);
      setItems(items || []);
    } catch (e: any) {
      toast({ title: "Failed to load checklist", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setLoading(true); load(); /* eslint-disable-next-line */ }, [leadId]);

  const act = async (id: string, fn: () => Promise<any>, successMsg?: string) => {
    setBusyId(id);
    try {
      await fn();
      await load();
      if (successMsg) toast({ title: successMsg });
    } catch (e: any) {
      toast({ title: "Action failed", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const touch = items.filter(i => i.kind === "touch");
  const followup = items.filter(i => i.kind === "followup");
  const touchDone = touch.filter(i => i.completed_at).length;
  const fuDone = followup.filter(i => i.completed_at || i.skipped_at).length;
  const sendDone = touch.some(i => i.step_key === "send" && i.completed_at);

  const fmtDue = (iso: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    const now = new Date();
    const days = Math.round((d.getTime() - now.getTime()) / 86400000);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (days < 0) return { label: `Overdue · ${label}`, tone: "overdue" as const };
    if (days === 0) return { label: `Today · ${label}`, tone: "today" as const };
    if (days <= 2) return { label: `In ${days}d · ${label}`, tone: "soon" as const };
    return { label: `In ${days}d · ${label}`, tone: "future" as const };
  };

  const Row: React.FC<{ item: LeadActionItem }> = ({ item }) => {
    const done = !!item.completed_at;
    const skipped = !!item.skipped_at;
    const due = fmtDue(item.due_at);
    const isBusy = busyId === item.id;
    return (
      <div className={`rounded-md border p-3 flex items-start gap-3 ${done ? "border-emerald-500/30 bg-emerald-500/5" : skipped ? "border-muted bg-muted/20 opacity-60" : "border-border bg-card/50"}`}>
        <button
          type="button"
          disabled={isBusy || skipped}
          onClick={() => done
            ? act(item.id, () => leadActions.uncheck(item.id))
            : act(item.id, () => leadActions.complete(item.id), item.step_key === "send" ? "Follow-up sequence created" : undefined)
          }
          className="flex-shrink-0 mt-0.5"
          title={done ? "Mark not done" : "Mark done"}
        >
          {isBusy
            ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            : done
              ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              : <Circle className="w-5 h-5 text-muted-foreground hover:text-amber" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`font-semibold text-sm ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {item.title}
            </p>
            {due && !done && !skipped && (
              <span className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${
                due.tone === "overdue" ? "bg-crimson/20 text-crimson border border-crimson/40"
                : due.tone === "today" ? "bg-amber/20 text-amber border border-amber/40"
                : due.tone === "soon" ? "bg-amber/10 text-amber/80 border border-amber/20"
                : "bg-muted text-muted-foreground"
              }`}>
                <Clock className="w-2.5 h-2.5 inline mr-1" />{due.label}
              </span>
            )}
            {skipped && <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Skipped</span>}
          </div>
          {item.description && (
            <p className="text-xs text-muted-foreground leading-snug mt-1">{item.description}</p>
          )}
          {done && item.completed_by && (
            <p className="text-[10px] font-mono uppercase tracking-wider text-emerald-400/80 mt-1">
              Done by {item.completed_by} · {new Date(item.completed_at!).toLocaleString()}
            </p>
          )}
        </div>
        {!done && !skipped && (
          <div className="flex flex-col gap-1 flex-shrink-0">
            {item.kind === "followup" && (
              <Button size="sm" variant="ghost" disabled={isBusy} onClick={() => act(item.id, () => leadActions.snooze(item.id, 2))} title="Snooze 2 days" className="h-6 px-2 text-[10px]">
                <Forward className="w-3 h-3 mr-1" />+2d
              </Button>
            )}
            <Button size="sm" variant="ghost" disabled={isBusy} onClick={() => act(item.id, () => leadActions.skip(item.id))} title="Skip" className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground">
              <SkipForward className="w-3 h-3 mr-1" />Skip
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-amber/30 bg-gradient-to-br from-amber/5 to-background overflow-hidden">
      <button type="button" onClick={() => setCollapsed(c => !c)} className="w-full flex items-center justify-between gap-3 p-3 hover:bg-amber/5">
        <div className="flex items-center gap-2 min-w-0">
          {collapsed ? <ChevronRight className="w-4 h-4 text-amber" /> : <ChevronDown className="w-4 h-4 text-amber" />}
          <div className="text-left min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber">
              Lead Action Checklist
            </div>
            <div className="font-semibold text-sm text-foreground truncate">
              {touchDone}/{touch.length} touch · {fuDone}/{followup.length} follow-ups
              {leadLabel ? <span className="text-muted-foreground font-normal"> · {leadLabel}</span> : null}
            </div>
          </div>
        </div>
        {!sendDone && touch.length > 0 && (
          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-amber/20 text-amber border border-amber/40">
            <AlertCircle className="w-3 h-3 inline mr-1" />Send email to unlock follow-ups
          </span>
        )}
      </button>

      {!collapsed && (
        <div className="px-3 pb-3 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-amber" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-amber/80">First Contact</div>
                {touch.map(it => <Row key={it.id} item={it} />)}
              </div>

              {followup.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-amber/80">Follow-up Sequence</div>
                  {followup.map(it => <Row key={it.id} item={it} />)}
                </div>
              )}

              {!sendDone && (
                <p className="text-xs text-muted-foreground italic border-t border-border/50 pt-3">
                  The 30-day follow-up sequence appears automatically the moment you check off <strong>"Send it"</strong>.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default LeadActionChecklist;
