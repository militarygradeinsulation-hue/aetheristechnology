// Aetheris Universe analytics — which tools are opened + launched most.
// Reads from `site_events` (event_type IN 'universe_tool_open','universe_tool_launch').
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RefreshCw, TrendingUp } from 'lucide-react';

type Row = {
  event_type: string;
  event_data: any;
  created_at: string;
  session_id: string | null;
};

type Agg = {
  tool_id: string;
  tool_name: string;
  opens: number;
  launches: number;
  uniqueSessions: number;
  lastAt: string;
};

const RANGES = [
  { label: '24h', hours: 24 },
  { label: '7d', hours: 24 * 7 },
  { label: '30d', hours: 24 * 30 },
];

export const AdminUniverseAnalyticsPanel: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(RANGES[1]);

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - range.hours * 3600_000).toISOString();
    const { data } = await supabase
      .from('site_events')
      .select('event_type,event_data,created_at,session_id')
      .in('event_type', ['universe_tool_open', 'universe_tool_launch'])
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5000);
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [range.label]);

  const { aggs, totalOpens, totalLaunches, uniqueVisitors } = useMemo(() => {
    const byTool = new Map<string, Agg>();
    const sessions = new Set<string>();
    let opens = 0, launches = 0;
    for (const r of rows) {
      const id = String(r.event_data?.tool_id || 'unknown');
      const name = String(r.event_data?.tool_name || id);
      if (r.session_id) sessions.add(r.session_id);
      const a = byTool.get(id) || { tool_id: id, tool_name: name, opens: 0, launches: 0, uniqueSessions: 0, lastAt: r.created_at };
      a.tool_name = name || a.tool_name;
      if (r.event_type === 'universe_tool_launch') { a.launches++; launches++; } else { a.opens++; opens++; }
      if (r.created_at > a.lastAt) a.lastAt = r.created_at;
      byTool.set(id, a);
    }
    // unique sessions per tool
    const perToolSessions = new Map<string, Set<string>>();
    for (const r of rows) {
      const id = String(r.event_data?.tool_id || 'unknown');
      if (!r.session_id) continue;
      if (!perToolSessions.has(id)) perToolSessions.set(id, new Set());
      perToolSessions.get(id)!.add(r.session_id);
    }
    for (const [id, s] of perToolSessions) {
      const a = byTool.get(id);
      if (a) a.uniqueSessions = s.size;
    }
    const arr = [...byTool.values()].sort((a, b) => (b.opens + b.launches * 3) - (a.opens + a.launches * 3));
    return { aggs: arr, totalOpens: opens, totalLaunches: launches, uniqueVisitors: sessions.size };
  }, [rows]);

  const maxScore = Math.max(1, ...aggs.map(a => a.opens + a.launches));

  return (
    <div className="border border-amber/30 rounded-md bg-black/40 p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber" />
          <h3 className="font-forensic text-lg md:text-xl font-bold">Aetheris Universe · tool popularity</h3>
        </div>
        <div className="flex items-center gap-2">
          {RANGES.map(r => (
            <button key={r.label} onClick={() => setRange(r)}
              className={`font-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm border ${range.label === r.label ? 'bg-amber text-black border-amber' : 'border-amber/30 text-amber/80 hover:bg-amber/10'}`}>
              {r.label}
            </button>
          ))}
          <button onClick={load} className="text-amber/70 hover:text-amber p-1" aria-label="Refresh">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Stat label="Opens" value={totalOpens} />
        <Stat label="Launches" value={totalLaunches} />
        <Stat label="Unique visitors" value={uniqueVisitors} />
      </div>

      {loading && aggs.length === 0 ? (
        <div className="text-sm text-foreground/60 py-8 text-center">Loading…</div>
      ) : aggs.length === 0 ? (
        <div className="text-sm text-foreground/60 py-8 text-center">No tool activity yet in this range.</div>
      ) : (
        <div className="space-y-2">
          {aggs.map(a => {
            const score = a.opens + a.launches;
            const pct = Math.round((score / maxScore) * 100);
            return (
              <div key={a.tool_id} className="border border-amber/20 rounded-sm bg-black/40 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{a.tool_name}</div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-foreground/50 truncate">{a.tool_id}</div>
                  </div>
                  <div className="text-right text-xs font-mono whitespace-nowrap">
                    <span className="text-amber font-bold">{a.opens}</span>
                    <span className="text-foreground/50"> opens · </span>
                    <span className="text-emerald-400 font-bold">{a.launches}</span>
                    <span className="text-foreground/50"> launches · </span>
                    <span className="text-foreground/70">{a.uniqueSessions} sess</span>
                  </div>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-amber/10 overflow-hidden">
                  <div className="h-full bg-amber" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="border border-amber/20 rounded-sm bg-black/40 p-3">
    <div className="text-[10px] font-mono uppercase tracking-widest text-foreground/60">{label}</div>
    <div className="text-2xl font-bold text-amber">{value.toLocaleString()}</div>
  </div>
);

export default AdminUniverseAnalyticsPanel;
