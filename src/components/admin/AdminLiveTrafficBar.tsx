import React, { useEffect, useState } from 'react';
import { Activity, Eye, MousePointerClick, Search as SearchIcon, Users, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

import { getAdminToken } from '@/lib/adminAuth';

type TopItem = { key: string; count: number };
type LiveTraffic = {
  window_hours: number;
  active_now: number;
  active_last_hour: number;
  sessions_window: number;
  page_views: number;
  clicks: number;
  searches: number;
  top_pages: TopItem[];
  top_clicks: TopItem[];
  top_searches: TopItem[];
  top_referrers: TopItem[];
  generated_at: string;
};

const URL_ = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-live-traffic?hours=24`;

export const AdminLiveTrafficBar: React.FC = () => {
  const [data, setData] = useState<LiveTraffic | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const token = getAdminToken();
      if (!token) { setErr('Admin session expired.'); return; }
      const res = await fetch(URL_, {
        headers: {
          'x-admin-token': token,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });
      if (!res.ok) throw new Error(`(${res.status})`);
      const j = await res.json();
      setData(j); setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const i = setInterval(load, 15000);
    return () => clearInterval(i);
  }, []);

  const Stat = ({ icon: Icon, label, value, sub }: { icon: any; label: string; value: React.ReactNode; sub?: string }) => (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-amber/20 bg-card/60 min-w-[140px]">
      <Icon className="w-4 h-4 text-amber" />
      <div className="leading-tight">
        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</div>
        <div className="text-xl font-bold text-foreground font-display">{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );

  const TopList = ({ title, items, emptyHint }: { title: string; items: TopItem[]; emptyHint: string }) => (
    <div className="rounded-lg border border-border/60 bg-card/40 p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-amber mb-2">{title}</div>
      {items.length === 0 ? (
        <div className="text-xs text-muted-foreground italic">{emptyHint}</div>
      ) : (
        <ul className="space-y-1">
          {items.slice(0, 5).map((it) => (
            <li key={it.key} className="flex items-center justify-between gap-3 text-xs">
              <span className="truncate text-foreground/90" title={it.key}>{it.key}</span>
              <span className="font-mono text-amber tabular-nums">{it.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <section className="rounded-xl border border-amber/30 bg-background/60 backdrop-blur p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber">Live Site Traffic · Last 24h</span>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <span className="text-[10px] text-muted-foreground font-mono">
              updated {new Date(data.generated_at).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground"
            title="Refresh"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {err && <div className="text-xs text-destructive mb-2">{err}</div>}

      <div className="flex flex-wrap gap-2 mb-3">
        <Stat icon={Activity} label="Active Now" value={data?.active_now ?? '—'} sub="last 5 min" />
        <Stat icon={Users} label="Visitors (24h)" value={data?.sessions_window ?? '—'} sub={`${data?.active_last_hour ?? 0} in last hour`} />
        <Stat icon={Eye} label="Page Views" value={data?.page_views ?? '—'} />
        <Stat icon={MousePointerClick} label="Clicks" value={data?.clicks ?? '—'} />
        <Stat icon={SearchIcon} label="Searches / Scans" value={data?.searches ?? '—'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <TopList title="Top Pages" items={data?.top_pages ?? []} emptyHint="No page views yet." />
        <TopList title="Top Clicks" items={data?.top_clicks ?? []} emptyHint="No tracked clicks yet." />
        <TopList title="Top Searches" items={data?.top_searches ?? []} emptyHint="No searches or scans yet." />
      </div>

      <div className="mt-2 text-[10px] text-muted-foreground font-mono">
        Tip: ask the Operator Assistant "what are people clicking on?" or "show me live traffic".
      </div>
    </section>
  );
};
