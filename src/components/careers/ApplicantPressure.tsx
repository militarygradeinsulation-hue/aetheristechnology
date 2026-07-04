import React, { useEffect, useState } from 'react';
import { Users, CheckCircle2, XCircle, Flame } from 'lucide-react';

const STORAGE_KEY = 'aetheris_applicant_count_v2';
const START = 2473;
const TOTAL_SPOTS = 12;
const FILLED_SPOTS = 11; // one left, heavy pressure

// Curated rolling feed — first names + last initial only
const NAMES = [
  'Marcus T.', 'Jordan R.', 'Priya S.', 'Devon K.', 'Alicia M.', 'Ethan W.',
  'Brianna L.', 'Carlos D.', 'Naomi P.', 'Trevor H.', 'Sasha B.', 'Owen G.',
  'Imani J.', 'Kyle V.', 'Reese A.', 'Tomas F.', 'Hadley C.', 'Quincy O.',
];

function loadCount(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return START;
    const { count, ts } = JSON.parse(raw);
    // drift up ~1 every 6-12 minutes since last visit, capped
    const minsSince = (Date.now() - ts) / 60000;
    const drift = Math.min(40, Math.floor(minsSince / 8));
    return Math.max(START, (count || START) + drift);
  } catch {
    return START;
  }
}

function saveCount(count: number) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ count, ts: Date.now() }));
  } catch {}
}

export const ApplicantPressure: React.FC = () => {
  const [count, setCount] = useState<number>(START);
  const [event, setEvent] = useState<{ name: string; passed: boolean } | null>(null);

  useEffect(() => {
    const initial = loadCount();
    setCount(initial);
    saveCount(initial);

    // First event quickly so it doesn't feel empty
    const seed = setTimeout(() => {
      setEvent({
        name: NAMES[Math.floor(Math.random() * NAMES.length)],
        passed: Math.random() < 0.35, // ~35% pass — keeps tension
      });
    }, 1200);

    // New applicant tick: every 35-75s, +1
    const tickInterval = setInterval(() => {
      setCount((c) => {
        const next = c + 1;
        saveCount(next);
        return next;
      });
    }, 45000 + Math.random() * 30000);

    // Pass/fail flashes: every 18-32s
    const eventInterval = setInterval(() => {
      setEvent({
        name: NAMES[Math.floor(Math.random() * NAMES.length)],
        passed: Math.random() < 0.35,
      });
    }, 18000 + Math.random() * 14000);

    return () => {
      clearTimeout(seed);
      clearInterval(tickInterval);
      clearInterval(eventInterval);
    };
  }, []);

  const filledPct = Math.round((FILLED_SPOTS / TOTAL_SPOTS) * 100);
  const spotsLeft = TOTAL_SPOTS - FILLED_SPOTS;

  return (
    <div className="rounded-2xl border border-amber/30 bg-background/40 backdrop-blur p-5 sm:p-6 space-y-5">
      {/* Top row: count + live event */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber/15 border border-amber/30 flex items-center justify-center">
            <Users className="w-5 h-5 text-amber" />
          </div>
          <div>
            <p className="font-mono uppercase text-[10px] tracking-[0.3em] text-amber">Applicants to date</p>
            <p className="font-display text-3xl text-foreground leading-none mt-1 tabular-nums">
              {count.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 min-h-[40px]">
          {event && (
            <div
              key={`${event.name}-${event.passed}-${count}`}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs sm:text-sm animate-in fade-in slide-in-from-right-2 duration-500 ${
                event.passed
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                  : 'border-crimson/40 bg-crimson/10 text-crimson'
              }`}
            >
              {event.passed ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 shrink-0" />
              )}
              <span className="font-mono">
                <span className="font-semibold">{event.name}</span>{' '}
                <span className="opacity-80">just {event.passed ? 'passed' : 'failed'} the test</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Spots bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-mono uppercase tracking-[0.25em] text-[10px] text-amber">
            <Flame className="w-3.5 h-3.5" />
            Open positions · current cycle
          </div>
          <p className="font-mono text-foreground">
            <span className="text-crimson font-semibold">{FILLED_SPOTS}</span>
            <span className="text-muted-foreground"> / {TOTAL_SPOTS} filled</span>
          </p>
        </div>

        <div className="relative h-3 rounded-full bg-background/60 border border-amber/20 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-crimson via-crimson/80 to-amber"
            style={{ width: `${filledPct}%` }}
          />
          {/* Slot ticks */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: TOTAL_SPOTS - 1 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 border-r border-background/60 last:border-r-0"
              />
            ))}
            <div className="flex-1" />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          <span className="text-foreground font-semibold">2,500+ applied. Most were a hard no.</span> Only {spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left this cycle. Once it closes, it closes.
        </p>
      </div>
    </div>
  );
};

export default ApplicantPressure;
