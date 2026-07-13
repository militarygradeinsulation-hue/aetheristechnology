// Rep leaderboard — shows the caller's 7-day activity up top, then a ranked
// board of every active rep so people can see where they stand.
// Data comes from the `portal-leaderboard` edge function, which verifies the
// portal token and aggregates rep_activity + rep_leads + outbound emails.

import React, { useEffect, useMemo, useState } from 'react';
import {
  Trophy, Loader2, Users, Mail, MousePointerClick,
  ClipboardCheck, LogIn, Upload, Crown,
} from 'lucide-react';
import { getPortalToken } from '@/lib/portalAuth';

interface Row {
  code: string;
  rep_name: string;
  role: string;
  logins: number;
  lead_claims: number;
  lead_touches: number;
  lead_uploads: number;
  emails_sent: number;
  leads_owned: number;
  score: number;
}

interface Data {
  me: string;
  window_days: number;
  rows: Row[];
}

const FUNCTIONS_BASE =
  (import.meta as any).env?.VITE_SUPABASE_URL
    ? `${(import.meta as any).env.VITE_SUPABASE_URL}/functions/v1`
    : `https://${(import.meta as any).env?.VITE_SUPABASE_PROJECT_ID}.functions.supabase.co`;

const Stat: React.FC<{ icon: any; label: string; value: number; accent?: boolean }> = ({
  icon: Icon, label, value, accent,
}) => (
  <div className={`rounded-lg border ${accent ? 'border-amber-400/40 bg-amber-400/5' : 'border-amber-400/15 bg-black/30'} px-3 py-2.5`}>
    <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-amber-300/80">
      <Icon className="w-3 h-3" /> {label}
    </div>
    <div className="mt-0.5 font-serif text-2xl leading-none text-amber-100">{value}</div>
  </div>
);

export const RepLeaderboard: React.FC<{ myCode: string }> = ({ myCode }) => {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const token = getPortalToken();
        if (!token) throw new Error('Session expired');
        const res = await fetch(`${FUNCTIONS_BASE}/portal-leaderboard`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-portal-token': token },
          body: '{}',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as Data;
        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 60000); // refresh every minute
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const me = useMemo(() => data?.rows.find(r => r.code === myCode) || null, [data, myCode]);
  const myRank = useMemo(() => {
    if (!data || !me) return null;
    return data.rows.findIndex(r => r.code === myCode) + 1;
  }, [data, me, myCode]);

  if (loading) {
    return (
      <div className="rounded-xl border border-amber-400/25 bg-black/40 backdrop-blur-sm p-6 flex items-center gap-3 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
        <span className="font-mono text-xs uppercase tracking-widest">Loading leaderboard…</span>
      </div>
    );
  }
  if (err || !data) {
    return (
      <div className="rounded-xl border border-crimson/30 bg-crimson/5 p-4 text-sm text-crimson">
        Leaderboard unavailable: {err || 'unknown error'}
      </div>
    );
  }

  const top = data.rows.slice(0, 10);

  return (
    <div className="rounded-xl border border-amber-400/25 bg-black/40 backdrop-blur-sm p-4 md:p-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h2 className="font-mono text-[11px] uppercase tracking-[0.3em] text-amber-400">
            Your Activity · Last {data.window_days} Days
          </h2>
        </div>
        {myRank && (
          <div className="font-mono text-[10px] uppercase tracking-widest text-amber-300/80">
            Rank <span className="text-amber-200 font-serif text-base ml-1">#{myRank}</span>
            <span className="text-muted-foreground/70"> of {data.rows.length}</span>
          </div>
        )}
      </div>

      {/* My stats */}
      <div className="mt-3 grid grid-cols-2 md:grid-cols-6 gap-2">
        <Stat icon={MousePointerClick} label="Touches" value={me?.lead_touches || 0} accent />
        <Stat icon={Mail} label="Emails" value={me?.emails_sent || 0} accent />
        <Stat icon={ClipboardCheck} label="Claims" value={me?.lead_claims || 0} />
        <Stat icon={Upload} label="Uploads" value={me?.lead_uploads || 0} />
        <Stat icon={LogIn} label="Logins" value={me?.logins || 0} />
        <Stat icon={Users} label="Leads Owned" value={me?.leads_owned || 0} />
      </div>

      {/* Leaderboard */}
      <div className="mt-5 pt-4 border-t border-amber-400/15">
        <div className="flex items-center gap-2 mb-3">
          <Crown className="w-3.5 h-3.5 text-amber-400" />
          <h3 className="font-mono text-[11px] uppercase tracking-[0.3em] text-amber-400">
            Team Leaderboard
          </h3>
        </div>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">
                <th className="text-left px-2 py-1.5 w-10">#</th>
                <th className="text-left px-2 py-1.5">Operator</th>
                <th className="text-right px-2 py-1.5">Touches</th>
                <th className="text-right px-2 py-1.5">Emails</th>
                <th className="text-right px-2 py-1.5 hidden md:table-cell">Claims</th>
                <th className="text-right px-2 py-1.5 hidden md:table-cell">Uploads</th>
                <th className="text-right px-2 py-1.5 hidden sm:table-cell">Logins</th>
                <th className="text-right px-2 py-1.5">Score</th>
              </tr>
            </thead>
            <tbody>
              {top.map((r, i) => {
                const isMe = r.code === myCode;
                const rank = i + 1;
                const medal = rank === 1 ? 'text-amber-300' : rank === 2 ? 'text-amber-200/80' : rank === 3 ? 'text-amber-100/70' : 'text-muted-foreground';
                return (
                  <tr
                    key={r.code}
                    className={`border-t border-amber-400/10 ${isMe ? 'bg-amber-400/10' : 'hover:bg-white/[0.02]'}`}
                  >
                    <td className={`px-2 py-2 font-serif text-base ${medal}`}>
                      {rank <= 3 ? <Trophy className="w-3.5 h-3.5 inline mr-1" /> : null}{rank}
                    </td>
                    <td className="px-2 py-2">
                      <div className={`truncate ${isMe ? 'text-amber-200 font-medium' : 'text-foreground/90'}`}>
                        {r.rep_name}
                        {isMe && <span className="ml-2 text-[9px] font-mono uppercase tracking-widest text-amber-400/80">You</span>}
                      </div>
                      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
                        {r.role} · {r.code}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-amber-100">{r.lead_touches}</td>
                    <td className="px-2 py-2 text-right font-mono text-amber-100">{r.emails_sent}</td>
                    <td className="px-2 py-2 text-right font-mono text-muted-foreground hidden md:table-cell">{r.lead_claims}</td>
                    <td className="px-2 py-2 text-right font-mono text-muted-foreground hidden md:table-cell">{r.lead_uploads}</td>
                    <td className="px-2 py-2 text-right font-mono text-muted-foreground hidden sm:table-cell">{r.logins}</td>
                    <td className="px-2 py-2 text-right font-mono text-amber-300 font-medium">{r.score}</td>
                  </tr>
                );
              })}
              {top.length === 0 && (
                <tr><td colSpan={8} className="text-center py-6 text-muted-foreground text-xs">No activity yet — be first on the board.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">
          Score = touches×4 + emails×3 + claims×2 + uploads×2 + logins · updates every minute
        </p>
      </div>
    </div>
  );
};
