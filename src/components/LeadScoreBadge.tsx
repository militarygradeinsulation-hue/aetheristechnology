import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LeadScoreBreakdown } from './LeadScoreBreakdown';
import { tierFromScore, type ScoreStage, STAGE_META, type ScorePart, explainScore } from '@/lib/leadScoring';
import { cn } from '@/lib/utils';

interface Props {
  score: number | null | undefined;
  stage?: ScoreStage | null;
  parts?: ScorePart[];
  reason?: string;
  compact?: boolean;
  className?: string;
}

export function LeadScoreBadge({ score, stage = 'triage', parts, reason, compact, className }: Props) {
  const tier = tierFromScore(score ?? undefined);
  const stageMeta = stage ? STAGE_META[stage] : null;
  const display = score == null ? '?' : Math.round(score);
  const line = parts?.length ? explainScore(parts) : reason || tier.action;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-2 rounded-md border px-2 py-1 text-left transition-colors hover:bg-card/60',
            tier.bg,
            className,
          )}
          aria-label={`Lead score ${display}. ${tier.label}. Click for breakdown.`}
        >
          <span className={cn('font-mono font-bold tabular-nums', compact ? 'text-base' : 'text-xl', tier.tone)}>
            {display}
          </span>
          {!compact && (
            <span className="flex flex-col leading-tight">
              <span className={cn('text-[10px] font-mono uppercase tracking-wider', tier.tone)}>{tier.label}</span>
              {stageMeta && (
                <span className={cn('text-[9px] font-mono uppercase tracking-wider opacity-70', stageMeta.tone)}>
                  {stageMeta.label}
                </span>
              )}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <div className="border-b border-border px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className={cn('font-mono text-lg font-bold', tier.tone)}>{display} / 100</span>
            <span className={cn('text-[10px] font-mono uppercase tracking-wider', tier.tone)}>{tier.label}</span>
          </div>
          {stageMeta && (
            <div className={cn('mt-1 text-[10px] font-mono uppercase tracking-wider', stageMeta.tone)} title={stageMeta.hint}>
              {stageMeta.label} · {stageMeta.hint}
            </div>
          )}
          <p className="mt-1 text-xs text-foreground/80">{line}</p>
          <p className="mt-1 text-[11px] text-muted-foreground italic">{tier.action}</p>
        </div>
        <LeadScoreBreakdown parts={parts} score={score} />
      </PopoverContent>
    </Popover>
  );
}
