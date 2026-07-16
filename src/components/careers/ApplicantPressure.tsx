import React, { useEffect, useRef, useState } from 'react';
import { Users, CheckCircle2, XCircle, Flame, BadgeCheck } from 'lucide-react';

const STORAGE_KEY = 'aetheris_applicant_count_v3';
const ATTEMPTS_KEY = 'aetheris_applicant_attempts_v1';
const START = 2473;
// Slow organic growth: ~4-8 new applicants per day
const APPLICANTS_PER_DAY_MIN = 4;
const APPLICANTS_PER_DAY_MAX = 8;

// Curated rolling feed — first names + last initial only
const NAMES = [
  'Marcus T.', 'Jordan R.', 'Priya S.', 'Devon K.', 'Alicia M.', 'Ethan W.',
  'Brianna L.', 'Carlos D.', 'Naomi P.', 'Trevor H.', 'Sasha B.', 'Owen G.',
  'Imani J.', 'Kyle V.', 'Reese A.', 'Tomas F.', 'Hadley C.', 'Quincy O.',
  'Mason B.', 'Rae D.', 'Luca N.', 'Nia K.', 'Simone P.', 'Aiden H.',
];

type EventKind = 'passed' | 'failed' | 'licensed';
type LiveEvent = { name: string; kind: EventKind; attempt: number };

function loadCount(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return START;
    const { count, ts } = JSON.parse(raw);
    // Drift slowly upward based on real elapsed days
    const daysSince = (Date.now() - ts) / (1000 * 60 * 60 * 24);
    const perDay = APPLICANTS_PER_DAY_MIN + Math.random() * (APPLICANTS_PER_DAY_MAX - APPLICANTS_PER_DAY_MIN);
    const drift = Math.floor(daysSince * perDay);
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

function loadAttempts(): Record<string, number> {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAttempts(map: Record<string, number>) {
  try {
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(map));
  } catch {}
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Rolling shuffled queue — never repeats a name until every other name has
 * come up. Once exhausted, we cycle again and bump their attempt count.
 */
function useNameQueue() {
  const queueRef = useRef<string[]>([]);
  const attemptsRef = useRef<Record<string, number>>(loadAttempts());

  const reshuffle = () => {
    const arr = [...NAMES];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    queueRef.current = arr;
  };

  const next = (): { name: string; attempt: number } => {
    if (queueRef.current.length === 0) reshuffle();
    const name = queueRef.current.pop()!;
    const prior = attemptsRef.current[name] || 0;
    const attempt = prior + 1;
    attemptsRef.current[name] = attempt;
    saveAttempts(attemptsRef.current);
    return { name, attempt };
  };

  return { next };
}

export const ApplicantPressure: React.FC = () => {
  const [count, setCount] = useState<number>(START);
  const [event, setEvent] = useState<LiveEvent | null>(null);
  // Live pressure meter — moves up on pass/licensed, down on fail. 0-100.
  const [pressure, setPressure] = useState<number>(72);
  const { next } = useNameQueue();

  useEffect(() => {
    const initial = loadCount();
    setCount(initial);
    saveCount(initial);

    // Seed first event quickly so the panel doesn't sit empty
    const seed = setTimeout(() => {
      const kind: EventKind = Math.random() < 0.25 ? 'licensed' : Math.random() < 0.4 ? 'passed' : 'failed';
      const { name, attempt } = next();
      setEvent({ name, kind, attempt });
      setPressure((p) => clamp(p + (kind === 'failed' ? -6 : kind === 'passed' ? 5 : 9)));
    }, 1200);

    // New applicant tick: slow — every 4-8 hours (aligns with 4-8/day cadence)
    // We simulate visible ticks during a session: bump every 6-14 minutes so
    // returning visitors see a small increment. Long-term drift is handled by
    // loadCount() based on real elapsed time.
    const tickInterval = setInterval(() => {
      setCount((c) => {
        const next = c + 1;
        saveCount(next);
        return next;
      });
    }, 6 * 60 * 1000 + Math.random() * 8 * 60 * 1000);

    // Pass/fail/licensed flashes: every 20-40s
    const eventInterval = setInterval(() => {
      // Weighted mix: 45% fail, 35% pass, 20% licensed
      const r = Math.random();
      const kind: EventKind = r < 0.45 ? 'failed' : r < 0.8 ? 'passed' : 'licensed';
      const { name, attempt } = next();
      setEvent({ name, kind, attempt });
      setPressure((p) => clamp(p + (kind === 'failed' ? -5 - Math.random() * 4 : kind === 'passed' ? 4 + Math.random() * 4 : 7 + Math.random() * 5)));
    }, 20000 + Math.random() * 20000);

    return () => {
      clearTimeout(seed);
      clearInterval(tickInterval);
      clearInterval(eventInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const eventStyle = (() => {
    if (!event) return '';
    if (event.kind === 'passed') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
    if (event.kind === 'licensed') return 'border-amber/50 bg-amber/10 text-amber';
    return 'border-crimson/40 bg-crimson/10 text-crimson';
  })();

  const eventLabel = (() => {
    if (!event) return '';
    const attemptSuffix = event.attempt > 1 ? ` on their ${ordinal(event.attempt)} attempt` : '';
    if (event.kind === 'passed') return `just passed the test${attemptSuffix}`;
    if (event.kind === 'licensed') return `became a Licensed Connector${attemptSuffix}`;
    return `failed the test${attemptSuffix}`;
  })();

  const EventIcon = event?.kind === 'passed'
    ? CheckCircle2
    : event?.kind === 'licensed'
    ? BadgeCheck
    : XCircle;

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
              key={`${event.name}-${event.kind}-${event.attempt}-${count}`}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs sm:text-sm animate-in fade-in slide-in-from-right-2 duration-500 ${eventStyle}`}
            >
              <EventIcon className="w-4 h-4 shrink-0" />
              <span className="font-mono">
                <span className="font-semibold">{event.name}</span>{' '}
                <span className="opacity-80">{eventLabel}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Live pressure meter — no fixed number of slots */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-mono uppercase tracking-[0.25em] text-[10px] text-amber">
            <Flame className="w-3.5 h-3.5" />
            Open positions · live pressure
          </div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {pressure > 82 ? 'CRITICAL' : pressure > 55 ? 'HIGH' : pressure > 30 ? 'MODERATE' : 'OPEN'}
          </p>
        </div>

        <div className="relative h-3 rounded-full bg-background/60 border border-amber/20 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-crimson via-crimson/80 to-amber transition-[width] duration-1000 ease-out"
            style={{ width: `${pressure}%` }}
          />
          {/* Live pulse dot at the tip */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-amber shadow-[0_0_10px_hsl(var(--amber))] animate-pulse transition-[left] duration-1000 ease-out"
            style={{ left: `calc(${pressure}% - 4px)` }}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          <span className="text-foreground font-semibold">Every pass, fail, and license moves the line.</span>{' '}
          When pressure hits critical, the cycle closes to new applicants.
        </p>
      </div>
    </div>
  );
};

function clamp(n: number, min = 8, max = 96) {
  return Math.max(min, Math.min(max, n));
}

export default ApplicantPressure;
