import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RUBRIC, tierFromScore, LEAD_TIERS, type ScorePart } from '@/lib/leadScoring';
import { cn } from '@/lib/utils';

interface Props {
  parts?: ScorePart[];
  score: number | null | undefined;
}

function Bar({ earned, weight }: { earned: number; weight: number }) {
  const pct = weight ? Math.max(0, Math.min(100, (earned / weight) * 100)) : 0;
  const tone = pct >= 70 ? 'bg-emerald-500' : pct >= 35 ? 'bg-amber' : 'bg-destructive/70';
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn('h-full transition-all', tone)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function LeadScoreBreakdown({ parts, score }: Props) {
  const tier = tierFromScore(score ?? undefined);
  const total = parts?.reduce((a, p) => a + p.earned, 0) ?? 0;
  const maxTotal = parts?.reduce((a, p) => a + p.weight, 0) ?? 100;

  return (
    <div className="max-h-[400px] overflow-y-auto">
      {parts?.length ? (
        <div className="divide-y divide-border">
          {parts.map((p) => {
            const what = RUBRIC.find(r => r.key === p.key)?.what;
            return (
              <div key={p.key} className="px-3 py-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium">{p.label}</span>
                  <span className="font-mono tabular-nums text-muted-foreground">{p.earned} / {p.weight}</span>
                </div>
                <div className="mt-1"><Bar earned={p.earned} weight={p.weight} /></div>
                {what && <p className="mt-1 text-[10px] text-muted-foreground">{what}</p>}
              </div>
            );
          })}
          <div className="flex items-center justify-between px-3 py-2 text-xs">
            <span className="font-mono uppercase tracking-wider text-muted-foreground">TOTAL</span>
            <span className={cn('font-mono font-bold tabular-nums', tier.tone)}>{total} / {maxTotal}</span>
          </div>
        </div>
      ) : (
        <div className="px-3 py-4 text-xs text-muted-foreground">
          No component breakdown stored for this lead yet. Run a scan or enrich it to see the math.
        </div>
      )}
      <div className="border-t border-border px-3 py-2">
        <RubricInfoButton />
      </div>
    </div>
  );
}

function RubricInfoButton() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="text-[11px] font-mono uppercase tracking-wider text-amber hover:underline">
          Why this score? · See full rubric
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>How leads are scored</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Every lead has <strong>one number 0–100</strong>. The number is deterministic math — same inputs always produce the same score. AI only reports observable signals; the rubric below converts those signals into points.
          </p>

          <div>
            <h4 className="font-mono uppercase tracking-wider text-xs text-amber mb-2">Tiers</h4>
            <div className="space-y-1 text-xs">
              {LEAD_TIERS.map(t => (
                <div key={t.id} className="flex items-baseline gap-2">
                  <span className={cn('font-mono w-16', t.tone)}>{t.minScore}+</span>
                  <span className="font-semibold">{t.label}</span>
                  <span className="text-muted-foreground">— {t.action}</span>
                </div>
              ))}
              <div className="flex items-baseline gap-2">
                <span className="font-mono w-16 text-muted-foreground">?</span>
                <span className="font-semibold">INSUFFICIENT EVIDENCE</span>
                <span className="text-muted-foreground">— too little signal to score; treat as manual review.</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-mono uppercase tracking-wider text-xs text-amber mb-2">Stage 1 — Triage (always present)</h4>
            <p className="text-xs text-muted-foreground mb-2">Built from the lead row at capture. Answers "should we work this lead at all?"</p>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-border">
                {RUBRIC.filter(r => r.stage === 'triage').map(r => (
                  <tr key={r.key}>
                    <td className="py-1 pr-2 font-medium">{r.label}</td>
                    <td className="py-1 pr-2 font-mono text-muted-foreground tabular-nums">{r.weight}</td>
                    <td className="py-1 text-muted-foreground">{r.what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="font-mono uppercase tracking-wider text-xs text-amber mb-2">Stage 2 — Audit (after website scan)</h4>
            <p className="text-xs text-muted-foreground mb-2">Built after the AI inspects the actual site. Answers "how leaky is this business and how big is the opportunity?"</p>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-border">
                {RUBRIC.filter(r => r.stage === 'audit').map(r => (
                  <tr key={r.key}>
                    <td className="py-1 pr-2 font-medium">{r.label}</td>
                    <td className="py-1 pr-2 font-mono text-muted-foreground tabular-nums">{r.weight}</td>
                    <td className="py-1 text-muted-foreground">{r.what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground italic">
            Safety rails: if the scraper got &lt;500 chars or AI returned no signals → score = <code>?</code>. If fewer than 4 gaps were found AND no contact info → score capped at 35. Better than faking a 50.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
