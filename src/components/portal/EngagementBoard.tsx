// Weekly engagement board for the new portal.
// Tracks two numbers per rep, per week: minutes logged into the portal and
// Golden Report opens. Shows the current week + the previous three (rolling
// month) and preserves history in the DB forever.
//
// Dean Young (code 482917) is the pace-setter. Anyone tracking below him mid-week
// gets a friendly popup nudge pointing at what he does differently.

import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Award, Loader2, ScrollText, Sparkles, X } from 'lucide-react';
import {
  fetchEngagementSummary,
  formatHours,
  type EngagementSummary,
  type EngagementRow,
} from '@/lib/portalEngagement';

const DEAN_CODE = '482917';
const NUDGE_KEY = 'aetheris.engagement.nudge.dismissed';

interface Props {
  myCode: string;
}

interface Totals {
  code: string;
  rep_name: string;
  role: string;
  weekly: Record<string, { seconds: number; golden: number }>;
  totalSeconds: number;
  totalGolden: number;
  currentSeconds: number;
  currentGolden: number;
}

function buildTotals(sum: EngagementSummary): Totals[] {
  const byCode: Record<string, Totals> = {};
  for (const r of sum.reps) {
    byCode[r.code] = {
      code: r.code,
      rep_name: r.rep_name,
      role: r.role,
      weekly: {},
      totalSeconds: 0,
      totalGolden: 0,
      currentSeconds: 0,
      currentGolden: 0,
    };
  }
  const currentWeek = sum.current_week;
  for (const row of sum.rows) {
    const bucket =
      byCode[row.code] ||
      (byCode[row.code] = {
        code: row.code,
        rep_name: row.rep_name || row.code,
        role: 'rep',
        weekly: {},
        totalSeconds: 0,
        totalGolden: 0,
        currentSeconds: 0,
        currentGolden: 0,
      });
    bucket.weekly[row.week_start] = {
      seconds: row.seconds_online,
      golden: row.golden_report_uses,
    };
    bucket.totalSeconds += row.seconds_online;
    bucket.totalGolden += row.golden_report_uses;
    if (row.week_start === currentWeek) {
      bucket.currentSeconds = row.seconds_online;
      bucket.currentGolden = row.golden_report_uses;
    }
  }
  return Object.values(byCode);
}

function fmtWeekLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export const EngagementBoard: React.FC<Props> = ({ myCode }) => {
  const [sum, setSum] = useState<EngagementSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [nudge, setNudge] = useState<null | { reason: string; deanSeconds: number; deanGolden: number }>(null);

  const load = async () => {
    const s = await fetchEngagementSummary();
    if (s) setSum(s);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const i = window.setInterval(load, 90_000);
    return () => window.clearInterval(i);
  }, []);

  const totals = useMemo(() => (sum ? buildTotals(sum) : []), [sum]);
  const me = useMemo(() => totals.find(t => t.code === myCode) || null, [totals, myCode]);
  const dean = useMemo(() => totals.find(t => t.code === DEAN_CODE) || null, [totals]);

  // Sort: current-week seconds desc, then golden desc
  const ranked = useMemo(
    () => [...totals].sort((a, b) => (b.currentSeconds - a.currentSeconds) || (b.currentGolden - a.currentGolden)),
    [totals],
  );

  // Slacker nudge — mid-week check (Wed+), only for the caller (never Dean himself),
  // once per current week unless they reopen it.
  useEffect(() => {
    if (!sum || !me || !dean || me.code === DEAN_CODE) return;
    const dow = new Date().getUTCDay(); // 3 = Wed
    if (dow < 3 && dow !== 0) return; // give Mon/Tue room; Sun (0) = end of week, do nudge
    const dismissedKey = `${NUDGE_KEY}.${sum.current_week}`;
    if (localStorage.getItem(dismissedKey) === '1') return;
    const behindTime = dean.currentSeconds > 900 && me.currentSeconds < dean.currentSeconds * 0.5;
    const noGolden = dean.currentGolden >= 1 && me.currentGolden === 0;
    if (behindTime || noGolden) {
      const reason = behindTime
        ? `You're at ${formatHours(me.currentSeconds)} in the portal this week. Dean is at ${formatHours(dean.currentSeconds)}.`
        : `Dean already pulled ${dean.currentGolden} Golden Report${dean.currentGolden === 1 ? '' : 's'} this week. You have zero.`;
      setNudge({ reason, deanSeconds: dean.currentSeconds, deanGolden: dean.currentGolden });
    }
  }, [sum, me, dean]);

  const dismissNudge = () => {
    if (sum) localStorage.setItem(`${NUDGE_KEY}.${sum.current_week}`, '1');
    setNudge(null);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-amber-400/25 bg-black/40 backdrop-blur-sm p-6 flex items-center gap-3 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
        <span className="font-mono text-xs uppercase tracking-widest">Loading engagement…</span>
      </div>
    );
  }
  if (!sum) {
    return (
      <div className="rounded-xl border border-crimson/30 bg-crimson/5 p-4 text-sm text-crimson">
        Engagement board unavailable.
      </div>
    );
  }

  const weeks = sum.weeks; // newest first (4)

  return (
    <>
      <div className="rounded-xl border border-amber-400/25 bg-black/40 backdrop-blur-sm p-4 md:p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <h2 className="font-mono text-[11px] uppercase tracking-[0.3em] text-amber-400">
              Engagement · Rolling 4-Week Board
            </h2>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
            Week of {fmtWeekLabel(sum.current_week)} · history saved
          </div>
        </div>

        {/* Me vs Dean summary */}
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
          <StatBox label="Your time this week" value={formatHours(me?.currentSeconds || 0)} accent />
          <StatBox label="Your Golden Reports" value={String(me?.currentGolden || 0)} accent />
          <StatBox
            label="Dean · time this week"
            value={formatHours(dean?.currentSeconds || 0)}
            icon={<Award className="w-3 h-3" />}
          />
          <StatBox
            label="Dean · Golden Reports"
            value={String(dean?.currentGolden || 0)}
            icon={<Award className="w-3 h-3" />}
          />
        </div>

        {/* Weekly matrix */}
        <div className="mt-5 pt-4 border-t border-amber-400/15 overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">
                <th className="text-left px-2 py-1.5">Operator</th>
                {weeks.map((w, i) => (
                  <th key={w} className="text-right px-2 py-1.5">
                    {i === 0 ? 'This week' : fmtWeekLabel(w)}
                  </th>
                ))}
                <th className="text-right px-2 py-1.5">4-wk total</th>
                <th className="text-right px-2 py-1.5">Golden</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map(t => {
                const isMe = t.code === myCode;
                const isDean = t.code === DEAN_CODE;
                return (
                  <tr
                    key={t.code}
                    className={`border-t border-amber-400/10 ${
                      isMe ? 'bg-amber-400/10' : isDean ? 'bg-emerald-400/5' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <td className="px-2 py-2">
                      <div className={`truncate ${isMe ? 'text-amber-200 font-medium' : 'text-foreground/90'}`}>
                        {t.rep_name}
                        {isMe && (
                          <span className="ml-2 text-[9px] font-mono uppercase tracking-widest text-amber-400/80">
                            You
                          </span>
                        )}
                        {isDean && (
                          <span className="ml-2 text-[9px] font-mono uppercase tracking-widest text-emerald-300/90">
                            <Award className="w-3 h-3 inline -mt-0.5 mr-0.5" />
                            Pace-setter
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
                        {t.role} · {t.code}
                      </div>
                    </td>
                    {weeks.map(w => {
                      const cell = t.weekly[w];
                      return (
                        <td key={w} className="px-2 py-2 text-right font-mono text-amber-100">
                          {cell ? formatHours(cell.seconds) : '—'}
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 text-right font-mono text-amber-300 font-medium">
                      {formatHours(t.totalSeconds)}
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-amber-300 font-medium">
                      {t.totalGolden}
                    </td>
                  </tr>
                );
              })}
              {ranked.length === 0 && (
                <tr>
                  <td colSpan={weeks.length + 3} className="text-center py-6 text-muted-foreground text-xs">
                    No activity recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">
          Time = seconds inside the portal (tab must be visible). Golden = Golden Report opens. Resets every Monday · full history preserved.
        </p>
      </div>

      {/* Slacker nudge popup */}
      {nudge && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="max-w-lg w-full rounded-2xl border border-amber-400/40 bg-gradient-to-b from-black to-neutral-950 p-6 shadow-2xl relative">
            <button
              onClick={dismissNudge}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-amber-300 font-mono text-[10px] uppercase tracking-[0.3em]">
              <Sparkles className="w-3.5 h-3.5" />
              A nudge from the desk
            </div>
            <h3 className="mt-2 font-serif text-2xl text-amber-100 leading-tight">You're falling behind Dean.</h3>
            <p className="mt-3 text-sm text-foreground/85">{nudge.reason}</p>

            <div className="mt-4 rounded-lg border border-emerald-400/25 bg-emerald-400/5 p-3 text-sm">
              <div className="flex items-center gap-2 text-emerald-300 font-mono text-[10px] uppercase tracking-widest mb-1">
                <Award className="w-3.5 h-3.5" /> How Dean uses the portal
              </div>
              <ul className="list-disc pl-5 space-y-1 text-foreground/85 text-[13px]">
                <li>Signs in first thing and stays parked in the portal while dialing — the timer only counts when the tab is visible.</li>
                <li>Runs at least one Golden Report on a target every day before his first call.</li>
                <li>Uses the Coach tab when he gets stuck instead of guessing.</li>
                <li>Logs touches on every lead so his week never looks empty.</li>
              </ul>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <button
                onClick={() => {
                  dismissNudge();
                  window.dispatchEvent(new CustomEvent('portal-jump-tab', { detail: 'golden' }));
                }}
                className="rounded-md border border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/20 px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-amber-200 flex items-center justify-center gap-2"
              >
                <ScrollText className="w-3.5 h-3.5" /> Run a Golden Report now
              </button>
              <button
                onClick={() => {
                  dismissNudge();
                  window.dispatchEvent(new CustomEvent('portal-jump-tab', { detail: 'coach' }));
                }}
                className="rounded-md border border-amber-400/20 bg-black/50 hover:bg-white/[0.04] px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-foreground/80"
              >
                Ask the Coach what's blocking me
              </button>
            </div>
            <button
              onClick={dismissNudge}
              className="mt-3 w-full text-center text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              Dismiss for this week
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const StatBox: React.FC<{ label: string; value: string; accent?: boolean; icon?: React.ReactNode }> = ({
  label,
  value,
  accent,
  icon,
}) => (
  <div
    className={`rounded-lg border ${
      accent ? 'border-amber-400/40 bg-amber-400/5' : 'border-emerald-400/25 bg-emerald-400/[0.03]'
    } px-3 py-2.5`}
  >
    <div
      className={`flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest ${
        accent ? 'text-amber-300/80' : 'text-emerald-300/80'
      }`}
    >
      {icon}
      {label}
    </div>
    <div className={`mt-0.5 font-serif text-2xl leading-none ${accent ? 'text-amber-100' : 'text-emerald-100'}`}>
      {value}
    </div>
  </div>
);

export default EngagementBoard;
