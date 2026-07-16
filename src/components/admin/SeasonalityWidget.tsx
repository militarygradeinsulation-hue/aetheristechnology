import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, Calendar, TrendingUp, Snowflake } from 'lucide-react';
import {
  hotIndustriesForMonth, MONTH_NAMES, RATING_LABEL, RATING_COLOR,
  type IndustrySeasonality, ratingForMonth, pitchForRating,
} from '@/lib/industrySeasonality';

interface SeasonalityWidgetProps {
  /** Optional click handler — e.g. set scrape industry chip. */
  onPickIndustry?: (ind: IndustrySeasonality) => void;
  /** Override the current month for testing or "what about December?" views. */
  month?: number;
}

export const SeasonalityWidget: React.FC<SeasonalityWidgetProps> = ({ onPickIndustry, month }) => {
  const now = month ?? (new Date().getMonth() + 1);
  const { peak, ramp, slow } = useMemo(() => hotIndustriesForMonth(now), [now]);

  const Card1 = ({ ind, kind }: { ind: IndustrySeasonality; kind: 'peak' | 'ramp' | 'slow' }) => {
    const rating = ratingForMonth(ind, now);
    return (
      <button
        type="button"
        onClick={() => onPickIndustry?.(ind)}
        className={`text-left rounded-lg border p-3 transition hover:bg-amber/10 hover:border-amber/60 ${RATING_COLOR[rating]}`}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-display text-sm font-semibold text-foreground truncate">{ind.label}</span>
          <span className="font-mono text-[9px] uppercase tracking-widest whitespace-nowrap">{RATING_LABEL[rating]}</span>
        </div>
        <div className="text-[11px] text-muted-foreground space-y-0.5">
          <div><span className="font-mono uppercase text-[9px] mr-1">tkt</span>{ind.avgTicket}</div>
          <div><span className="font-mono uppercase text-[9px] mr-1">rev</span>{ind.avgAnnualRevenue}</div>
        </div>
        <p className="text-[11px] text-foreground/85 mt-2 italic leading-snug">"{pitchForRating(ind, rating)}"</p>
        {onPickIndustry && (
          <p className="text-[10px] font-mono uppercase text-amber mt-2">→ Use as scrape target</p>
        )}
      </button>
    );
  };

  return (
    <Card className="border-amber/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <Calendar className="w-5 h-5 text-amber" />
          Seasonal Intel — {MONTH_NAMES[now - 1]}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Industries ranked by spend cycle this month. Peak-season targets bleed cash they cannot
          stop to fix. Slow-season targets have time, anxiety, and budget to reinvest. Click any
          card to load it as a scrape target.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {peak.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2 text-amber">
              <Flame className="w-4 h-4" />
              <span className="font-mono text-[11px] uppercase tracking-widest">Peak — attack the leak NOW</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {peak.map(ind => <Card1 key={ind.slug} ind={ind} kind="peak" />)}
            </div>
          </section>
        )}
        {ramp.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2 text-amber/80">
              <TrendingUp className="w-4 h-4" />
              <span className="font-mono text-[11px] uppercase tracking-widest">Ramp-up — get in before the rush</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {ramp.map(ind => <Card1 key={ind.slug} ind={ind} kind="ramp" />)}
            </div>
          </section>
        )}
        {slow.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2 text-red-400">
              <Snowflake className="w-4 h-4" />
              <span className="font-mono text-[11px] uppercase tracking-widest">Slow — they have time, cash, and pain</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {slow.map(ind => <Card1 key={ind.slug} ind={ind} kind="slow" />)}
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  );
};

export default SeasonalityWidget;
