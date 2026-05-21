import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Moon, Phone, FileWarning, Repeat, Search, AlertTriangle, Check } from 'lucide-react';
import { RevealOnScroll } from '@/components/RevealOnScroll';
import { Button } from '@/components/ui/button';

const signals = [
  { Icon: Moon, text: "You wake up at 3am running the same revenue math in your head." },
  { Icon: Phone, text: "Your phone doesn't stop. None of the calls are actually moving the business forward." },
  { Icon: FileWarning, text: "You can feel money leaking somewhere, you just can't point at the hole." },
  { Icon: Repeat, text: "You've tried coaches, agencies, AI gurus, courses. Nothing actually changed the numbers." },
  { Icon: Search, text: "You've stared at the CRM, the P&L, the pipeline. From the inside, it all looks 'fine.'" },
  { Icon: AlertTriangle, text: "You're the bottleneck. Nothing important closes without you, and you're cooked." },
];

type Verdict = { label: string; tone: string; copy: string; cta: string };

function verdictFor(n: number): Verdict {
  if (n === 0) return {
    label: 'No leak signal yet',
    tone: 'text-muted-foreground',
    copy: "Tap the ones that sound like your week. We'll grade the bleed in real time.",
    cta: 'Run the free Leak Audit anyway',
  };
  if (n === 1) return {
    label: 'One pressure point flagged',
    tone: 'text-amber',
    copy: "One is a warning light. Two is a leak. Run the Audit before it compounds.",
    cta: 'Run the free Leak Audit',
  };
  if (n <= 3) return {
    label: `${n} of 6 · Active leak suspected`,
    tone: 'text-amber',
    copy: "You're past 'maybe.' The Leak Audit will name the hole and put a dollar on it.",
    cta: 'Start the Leak Audit now',
  };
  return {
    label: `${n} of 6 · Critical · Compounding loss`,
    tone: 'text-crimson',
    copy: "This isn't a coaching problem. It's a forensic one. Run the Audit, then book the operator.",
    cta: 'Run the Audit, then book me',
  };
}

export const ThisIsForYou: React.FC = () => {
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const toggle = (i: number) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };
  const count = picked.size;
  const verdict = verdictFor(count);
  const pct = Math.round((count / signals.length) * 100);

  return (
    <section className="px-4 py-14">
      <div className="max-w-5xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-10">
            <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
              Self-check · 30 seconds
            </div>
            <h2 className="font-forensic text-3xl md:text-5xl font-bold text-foreground leading-[1.1]">
              Tap every one that sounds like
              <span className="text-amber"> your week.</span>
            </h2>
            <p className="text-base md:text-lg text-muted-foreground mt-4 max-w-3xl mx-auto">
              No email, no scoring screen, no funnel. The tally below grades how bad the bleed is in real time.
            </p>
          </div>
        </RevealOnScroll>

        <RevealOnScroll>
          <div className="forensic-tile rounded-sm border border-amber/40 p-6 md:p-8">
            <div className="flex items-center justify-between mb-5 gap-4">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber">
                Pressure points · tap to flag
              </div>
              <div className={`font-case text-[10px] uppercase tracking-widest ${verdict.tone}`}>
                {count} / 6 flagged
              </div>
            </div>

            {/* Live tally bar */}
            <div className="h-1.5 w-full rounded-full bg-background/60 overflow-hidden mb-6 border border-amber/15">
              <div
                className={`h-full transition-all duration-500 ${count >= 4 ? 'bg-crimson' : 'bg-amber'}`}
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {signals.map((s, i) => {
                const active = picked.has(i);
                return (
                  <button
                    key={s.text}
                    type="button"
                    onClick={() => toggle(i)}
                    aria-pressed={active}
                    className={`group text-left flex items-start gap-3 rounded-sm border p-4 transition-all ${
                      active
                        ? 'border-amber bg-amber/10 shadow-[0_0_24px_-8px_hsl(var(--amber-glow)/0.45)]'
                        : 'border-border/60 bg-background/40 hover:border-amber/50 hover:bg-amber/[0.04]'
                    }`}
                  >
                    <div
                      className={`shrink-0 w-9 h-9 rounded-sm flex items-center justify-center transition-all ${
                        active
                          ? 'bg-amber text-primary-foreground border border-amber'
                          : 'bg-amber/10 border border-amber/40 text-amber'
                      }`}
                    >
                      {active ? <Check className="w-4 h-4" /> : <s.Icon className="w-4 h-4" />}
                    </div>
                    <p className={`text-sm md:text-[15px] leading-relaxed ${active ? 'text-foreground' : 'text-foreground/85'}`}>
                      {s.text}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-7 pt-6 border-t border-amber/15 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="min-w-0">
                <div className={`font-case text-[10px] uppercase tracking-widest mb-1 ${verdict.tone}`}>
                  {verdict.label}
                </div>
                <p className="font-forensic text-lg md:text-xl text-foreground/90 italic leading-snug">
                  {verdict.copy}
                </p>
              </div>
              <Link to="/leak-audit" className="shrink-0">
                <Button size="lg" className={`font-bold ${count >= 4 ? 'bg-crimson hover:bg-crimson/90 text-white' : 'bg-amber hover:bg-amber/90 text-primary-foreground'}`}>
                  {verdict.cta} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
};
