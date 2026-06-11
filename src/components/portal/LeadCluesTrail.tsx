import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Footprints, Compass, ArrowRight, Sparkles, RefreshCw, History, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { leadClues, type ClueEvent, type NextMove } from '@/lib/leadClues';
import type { RepLead, LeadStatus } from '@/lib/portalLeads';
import { useToast } from '@/hooks/use-toast';

interface Props {
  lead: RepLead;
  refreshSignal?: number;        // bump to refetch trail
  onAdvanceStatus?: (s: LeadStatus) => Promise<void> | void;
  onJumpToTool?: (toolKey: string) => void;
}

const KIND_ICON: Record<string, string> = {
  scan: '🔎', rocketreach: '🎯', detective: '🕵️',
  status_change: '🚦', touch: '✋', note: '📝',
  outreach: '✉️', meeting: '📅', tool_open: '🛠️', manual: '•',
};

export const LeadCluesTrail: React.FC<Props> = ({
  lead, refreshSignal = 0, onAdvanceStatus, onJumpToTool,
}) => {
  const { toast } = useToast();
  const [trail, setTrail] = useState<ClueEvent[]>([]);
  const [next, setNext] = useState<NextMove | null>(null);
  const [loading, setLoading] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    if (!lead?.id) return;
    setLoading(true);
    try {
      const [{ trail: t }, { next: n }] = await Promise.all([
        leadClues.list(lead.id, 50),
        leadClues.next(lead.id, lead.status, {
          business_name: lead.business_name, industry: lead.industry, website: lead.website,
        }),
      ]);
      setTrail(t || []);
      setNext(n || null);
    } catch (e) {
      // silent — keep panel useful even if backend errors
    } finally { setLoading(false); }
  }, [lead?.id, lead?.status, lead?.business_name, lead?.industry, lead?.website]);

  useEffect(() => { load(); }, [load, refreshSignal]);

  const advance = async () => {
    if (!next) return;
    setAdvancing(true);
    try {
      if (next.targetStatus && next.targetStatus !== lead.status && onAdvanceStatus) {
        await onAdvanceStatus(next.targetStatus as LeadStatus);
        await leadClues.log(lead.id, {
          kind: 'status_change',
          label: `Advanced via clue trail → ${next.targetStatus}`,
          tool_key: next.tool,
          stage_from: lead.status,
          stage_to: next.targetStatus,
          tip: next.tip,
        });
      } else {
        await leadClues.log(lead.id, {
          kind: 'tool_open',
          label: `Followed clue → ${next.toolLabel}`,
          tool_key: next.tool,
          tip: next.tip,
        });
      }
      onJumpToTool?.(next.tool);
      toast({ title: 'Clue followed', description: next.toolLabel });
      await load();
    } catch (e) {
      toast({ title: 'Could not advance', variant: 'destructive' });
    } finally { setAdvancing(false); }
  };

  const visible = showAll ? trail : trail.slice(0, 6);

  return (
    <div className="rounded-lg border border-amber/40 bg-gradient-to-br from-amber/10 via-background to-background p-3 space-y-3 relative">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-mono uppercase tracking-wider text-amber flex items-center gap-1">
          <Footprints className="w-3 h-3" /> Clue Trail
        </p>
        <button
          onClick={load}
          className="text-[10px] font-mono text-muted-foreground hover:text-amber flex items-center gap-1"
          disabled={loading}
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Refresh
        </button>
      </div>

      {/* NEXT MOVE — the clue */}
      {next && (
        <div className="rounded-md border border-amber/60 bg-amber/10 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-amber" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber">Next Move</span>
            <span className="text-[10px] font-mono text-muted-foreground ml-auto">
              {lead.status} → {next.targetStatus ?? lead.status}
            </span>
          </div>
          <div className="text-sm font-semibold text-foreground">{next.toolLabel}</div>
          <div className="text-xs text-muted-foreground italic flex items-start gap-1">
            <Sparkles className="w-3 h-3 mt-0.5 text-amber shrink-0" />
            <span>{next.tip}</span>
          </div>
          <Button
            size="sm"
            onClick={advance}
            disabled={advancing}
            className="w-full bg-amber text-background hover:bg-amber/90 h-8"
          >
            {advancing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <ArrowRight className="w-3 h-3 mr-1" />}
            {next.cta}
          </Button>
        </div>
      )}

      {/* TRAIL */}
      <div className="space-y-1">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <History className="w-3 h-3" /> Trail ({trail.length})
        </div>
        {trail.length === 0 && !loading && (
          <div className="text-xs text-muted-foreground italic px-1 py-2">
            No steps logged yet. Every move you make on this lead lands here.
          </div>
        )}
        <ol className="relative border-l border-amber/30 pl-3 space-y-1.5 ml-1">
          {visible.map((c, i) => (
            <li key={c.id} className="relative">
              <span className="absolute -left-[15px] top-1 w-2 h-2 rounded-full bg-amber/70 ring-2 ring-background" />
              <div className="flex items-start gap-1.5 text-xs">
                <span className="text-sm leading-none">{KIND_ICON[c.kind] || '•'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-foreground truncate">{c.label}</div>
                  <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                    {c.rep_name && <span>{c.rep_name}</span>}
                    <span>·</span>
                    <span>{new Date(c.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    {c.stage_from && c.stage_to && (
                      <><span>·</span><span className="text-amber">{c.stage_from} → {c.stage_to}</span></>
                    )}
                  </div>
                  {c.tip && i === 0 && (
                    <div className="text-[10px] text-muted-foreground italic mt-0.5">{c.tip}</div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
        {trail.length > 6 && (
          <button
            onClick={() => setShowAll(v => !v)}
            className="text-[10px] font-mono text-amber hover:underline ml-1"
          >
            {showAll ? 'Show less' : `Show all ${trail.length}`}
          </button>
        )}
      </div>

      <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        <MapPin className="w-2.5 h-2.5" /> Persistent — visible to admins for coaching
      </div>
    </div>
  );
};
