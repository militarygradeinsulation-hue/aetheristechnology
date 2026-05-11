import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Building2, Handshake, User, Repeat, Calendar, TrendingUp } from 'lucide-react';
import { fmtUsd } from '@/lib/repProducts';

// Locked 3-way split for the two flagship offers shown on aetheris.technology
const SPLIT = { company: 0.70, rep: 0.15, partner: 0.15 };

interface Flagship {
  name: string;
  blurb: string;
  priceCents: number;
  recurring?: boolean;
  cadence: string;
}

const FLAGSHIPS: Flagship[] = [
  {
    name: 'Forensic Diagnostic (Leak Audit)',
    blurb: 'Operator-led leak audit. The entry offer featured on aetheris.technology — applied toward the 21-Day engagement if they upgrade.',
    priceCents: 250000,
    cadence: 'one-time',
  },
  {
    name: 'Implementation Retainer',
    blurb: '3-month minimum. Diagnostic clients only. We execute the prioritized fixes. Recurring monthly.',
    priceCents: 1500000,
    recurring: true,
    cadence: 'per month',
  },
  {
    name: '21-Day Revenue Diagnostic',
    blurb: 'Fixed-fee forensic audit. CRM-agnostic. Specialty manufacturers $5M–$25M.',
    priceCents: 1850000,
    cadence: 'one-time',
  },
];

const Row: React.FC<{ icon: React.ReactNode; label: string; value: string; accent?: boolean }> = ({ icon, label, value, accent }) => (
  <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
    <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
      {icon}{label}
    </div>
    <div className={`text-base font-bold ${accent ? 'text-amber' : 'text-foreground'}`}>{value}</div>
  </div>
);

export const FlagshipCommissionPanel: React.FC = () => {
  return (
    <Card className="border-amber/40 bg-amber/[0.03]">
      <CardHeader>
        <div className="font-mono text-[10px] uppercase tracking-widest text-amber mb-1">
          What we sell on aetheris.technology
        </div>
        <CardTitle className="flex items-center gap-2 font-display">
          <DollarSign className="w-5 h-5 text-amber" /> Flagship Offers — Your Real Earning Engine
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          These are the two offers featured on the site. Locked 3-way split:{' '}
          <span className="text-foreground font-semibold">Company {SPLIT.company * 100}%</span> ·{' '}
          <span className="text-amber font-semibold">Rep {SPLIT.rep * 100}%</span> ·{' '}
          <span className="text-amber font-semibold">Partner {SPLIT.partner * 100}%</span>{' '}
          on every closed sale, including every recurring monthly invoice for as long as the client stays subscribed.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4">
          {FLAGSHIPS.map((f) => {
            const repCut = Math.round(f.priceCents * SPLIT.rep);
            const partnerCut = Math.round(f.priceCents * SPLIT.partner);
            const companyCut = f.priceCents - repCut - partnerCut;
            return (
              <div key={f.name} className="rounded-lg border border-amber/30 bg-background/40 p-5">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-lg font-bold text-foreground">{f.name}</h3>
                  {f.recurring && (
                    <Badge variant="outline" className="border-amber/40 text-amber font-mono text-[10px]">
                      <Repeat className="w-3 h-3 mr-1" /> RECURRING
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-4">{f.blurb}</p>

                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-bold text-foreground">{fmtUsd(f.priceCents)}</span>
                  <span className="text-xs text-muted-foreground font-mono uppercase">{f.cadence}</span>
                </div>

                <div className="space-y-0">
                  <Row icon={<Building2 className="w-3.5 h-3.5" />} label="Company (70%)" value={fmtUsd(companyCut)} />
                  <Row icon={<User className="w-3.5 h-3.5" />} label="You (Rep · 15%)" value={fmtUsd(repCut)} accent />
                  <Row icon={<Handshake className="w-3.5 h-3.5" />} label="Partner (15%)" value={fmtUsd(partnerCut)} accent />
                </div>

                {f.recurring && (
                  <div className="mt-4 rounded-md border border-amber/30 bg-amber/10 p-3 space-y-1">
                    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-amber">
                      <Calendar className="w-3 h-3" /> Recurring math (per client)
                    </div>
                    <div className="text-sm text-foreground">
                      <span className="text-amber font-bold">{fmtUsd(repCut * 3)}</span> rep over 3-month minimum
                    </div>
                    <div className="text-sm text-foreground">
                      <span className="text-amber font-bold">{fmtUsd(repCut * 12)}</span> rep if client stays a full year
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Combined-deal example */}
        <div className="mt-5 rounded-lg border border-amber/40 bg-amber/10 p-5">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-amber mb-2">
            <TrendingUp className="w-3.5 h-3.5" /> Full-stack close — what one client is worth
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Diagnostic ($18,500 one-time) + Retainer ($15,000/mo × 12 months) = <span className="text-foreground font-semibold">$198,500 in client revenue</span>.
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-md border border-border/50 bg-background/60 p-3">
              <div className="text-[10px] font-mono uppercase text-muted-foreground">Company</div>
              <div className="text-xl font-bold text-foreground">{fmtUsd(Math.round(19850000 * SPLIT.company))}</div>
            </div>
            <div className="rounded-md border border-amber/40 bg-amber/10 p-3">
              <div className="text-[10px] font-mono uppercase text-muted-foreground">You (Rep)</div>
              <div className="text-xl font-bold text-amber">{fmtUsd(Math.round(19850000 * SPLIT.rep))}</div>
            </div>
            <div className="rounded-md border border-amber/40 bg-amber/10 p-3">
              <div className="text-[10px] font-mono uppercase text-muted-foreground">Partner</div>
              <div className="text-xl font-bold text-amber">{fmtUsd(Math.round(19850000 * SPLIT.partner))}</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Close one full-stack manufacturer per quarter and you clear ~{fmtUsd(Math.round(19850000 * SPLIT.rep) * 4)}/yr from flagship offers alone — before the product catalog stacks on top.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
