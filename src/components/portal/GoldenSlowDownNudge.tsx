// Slow-down nudge for reps before running another Golden Report.
// Golden Reports cost real money to generate — most reps already have a
// pile of leads + previously generated reports sitting in the portal.
// This modal fires whenever a rep opens the Golden Report tab and reminds
// them to work what they already have before burning another scan.
//
// Rules:
//  - Dean (482917) is exempt — he's the pace-setter.
//  - Shows on EVERY open of the Golden tab until the rep clicks
//    "I understand — proceed" for that session. After the 2nd scan of the
//    UTC day, it becomes a hard-red warning that requires typing "PROCEED".
//  - Counts stored in localStorage per rep+day.

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, DollarSign, Users, ScrollText, X } from 'lucide-react';

const COUNT_KEY = 'aetheris.golden.count';
const SESSION_ACK_KEY = 'aetheris.golden.ack.session';

function todayUtc() { return new Date().toISOString().slice(0, 10); }

function readCount(code: string): number {
  try {
    const raw = JSON.parse(localStorage.getItem(COUNT_KEY) || '{}');
    return raw?.[code]?.[todayUtc()] || 0;
  } catch { return 0; }
}
export function bumpGoldenCount(code: string) {
  try {
    const raw = JSON.parse(localStorage.getItem(COUNT_KEY) || '{}');
    const day = todayUtc();
    raw[code] = raw[code] || {};
    raw[code][day] = (raw[code][day] || 0) + 1;
    localStorage.setItem(COUNT_KEY, JSON.stringify(raw));
  } catch {}
}

interface Props {
  repCode: string;
  onGoToLeads?: () => void;
}

export const GoldenSlowDownNudge: React.FC<Props> = ({ repCode, onGoToLeads }) => {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const count = useMemo(() => readCount(repCode), [open, repCode]);
  const isExempt = repCode === '482917';
  const isHard = count >= 2;

  useEffect(() => {
    if (isExempt) return;
    try {
      if (sessionStorage.getItem(SESSION_ACK_KEY) === '1') return;
    } catch {}
    setOpen(true);
  }, [isExempt]);

  const dismiss = () => {
    try { sessionStorage.setItem(SESSION_ACK_KEY, '1'); } catch {}
    setOpen(false);
  };
  const proceed = () => {
    if (isHard && typed.trim().toUpperCase() !== 'PROCEED') return;
    dismiss();
  };

  if (!open || isExempt) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className={`max-w-lg w-full rounded-2xl border ${isHard ? 'border-crimson/60' : 'border-amber-400/50'} bg-gradient-to-b from-black to-neutral-950 p-6 shadow-2xl relative`}>
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className={`flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] ${isHard ? 'text-crimson' : 'text-amber-300'}`}>
          {isHard ? <AlertTriangle className="w-3.5 h-3.5" /> : <DollarSign className="w-3.5 h-3.5" />}
          {isHard ? 'Hard Stop · Cost Control' : 'Slow down — read this first'}
        </div>

        <h3 className={`mt-2 font-serif text-2xl leading-tight ${isHard ? 'text-crimson' : 'text-amber-100'}`}>
          {isHard
            ? `You've already run ${count} Golden Reports today.`
            : 'Every Golden Report costs the company real money.'}
        </h3>

        <p className="mt-3 text-sm text-foreground/85">
          Before you run another scan, work the leads and reports you already have. Most reps
          have <span className="text-amber-300">dozens of untouched leads</span> and{' '}
          <span className="text-amber-300">reports already generated</span> sitting in the portal.
          Call them. Book meetings. Close.
        </p>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-start gap-2 rounded-lg border border-amber-400/25 bg-amber-400/5 p-3">
            <Users className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-amber-300/80">Step 1</div>
              <div className="text-foreground/90">Open the <span className="text-amber-300">Leads</span> tab and call the top row.</div>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-amber-400/25 bg-amber-400/5 p-3">
            <ScrollText className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-amber-300/80">Step 2</div>
              <div className="text-foreground/90">Reopen a lead — the Golden Report you already ran on them is attached.</div>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-amber-400/25 bg-amber-400/5 p-3">
            <DollarSign className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-amber-300/80">Step 3</div>
              <div className="text-foreground/90">Only run a NEW scan on a brand-new target you're about to call.</div>
            </div>
          </div>
        </div>

        {isHard && (
          <div className="mt-4 rounded-lg border border-crimson/50 bg-crimson/10 p-3 text-sm">
            <div className="font-mono text-[10px] uppercase tracking-widest text-crimson mb-1">
              Type PROCEED to override
            </div>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="PROCEED"
              className="w-full bg-black/60 border border-crimson/40 rounded px-3 py-2 font-mono text-sm text-crimson placeholder:text-crimson/40 focus:outline-none focus:border-crimson"
            />
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={() => { dismiss(); onGoToLeads?.(); }}
            className="rounded-md border border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/20 px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-amber-200 flex items-center justify-center gap-2"
          >
            <Users className="w-3.5 h-3.5" /> Take me to my leads
          </button>
          <button
            onClick={proceed}
            disabled={isHard && typed.trim().toUpperCase() !== 'PROCEED'}
            className={`rounded-md border px-3 py-2 font-mono text-[11px] uppercase tracking-widest ${
              isHard
                ? 'border-crimson/40 bg-crimson/10 text-crimson/80 hover:bg-crimson/20 disabled:opacity-40 disabled:cursor-not-allowed'
                : 'border-amber-400/20 bg-black/50 hover:bg-white/[0.04] text-foreground/80'
            }`}
          >
            I understand — proceed
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoldenSlowDownNudge;
