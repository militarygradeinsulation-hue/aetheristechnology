import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign, Building2, Handshake, User, Repeat, Calendar, TrendingUp,
  Trophy, Gift, Users as UsersIcon,
} from 'lucide-react';
import { fmtUsd } from '@/lib/repProducts';

// Fixed-dollar split for the flagships (matches payments-webhook flagshipFixedSplit()).
// Bundles use the tiered % model (T3: 70/20/10) and are shown as their derived dollar
// amounts so reps see a single $-figure per offer regardless of model.
// All amounts are in cents.
interface FixedSplit { company: number; rep: number; partner: number; }

interface Flagship {
  key: string;
  name: string;
  blurb: string;
  priceCents: number;
  recurring?: boolean;
  cadence: string;
  included: string[];
  split: FixedSplit;
  /** Visual badge — flagship (sales-led) vs bundle (operator-led pairings). */
  band: 'flagship' | 'bundle';
}

const FLAGSHIPS: Flagship[] = [
  // ── OPERATOR-LED BUNDLES (public, sealed pairings, Tier 3 split) ──
  {
    key: 'signal',
    name: 'Signal Pack',
    band: 'bundle',
    blurb: 'Entry bundle. ~6 hrs of operator time. Website + brand + friction read with one Leak Findings memo.',
    priceCents: 250_000,
    cadence: 'one-time',
    included: [
      'Full Website Report + Brand Contradiction Finder + Friction Vocabulary Audit',
      'Operator-written Leak Findings memo',
      '30-minute walkthrough call',
    ],
    // T3 70/20/10: $1,750 / $500 / $250
    split: { company: 175_000, rep: 50_000, partner: 25_000 },
  },
  {
    key: 'revenue',
    name: 'Revenue Pack',
    band: 'bundle',
    blurb: 'Core bundle. ~14 hrs of operator time. Sales scripts + follow-up + question engine + content calendar built as one engine.',
    priceCents: 500_000,
    cadence: 'one-time',
    included: [
      'Everything in Signal Pack',
      'Sales Script Pack + Follow-Up System Plan',
      'Strategic Question Engine + 30-Day Content Calendar',
      'Two 45-minute working sessions',
    ],
    // T3 70/20/10: $3,500 / $1,000 / $500
    split: { company: 350_000, rep: 100_000, partner: 50_000 },
  },
  {
    key: 'operator-suite',
    name: 'Operator Suite',
    band: 'bundle',
    blurb: 'Embedded — 3 weeks of an operator. ~30 hrs. Full stack against the real business. Credits 1:1 toward Active Case.',
    priceCents: 1_000_000,
    cadence: 'one-time',
    included: [
      'Everything in Revenue Pack',
      'Strategy Blueprint + Social Content Pack + Digital Snapshot',
      'Lead-Nurture Automation + Premium Tech Suite access',
      'Weekly calls + async ops channel',
      '$10,000 credits 1:1 toward Active Case',
    ],
    // T3 70/20/10: $7,000 / $2,000 / $1,000
    split: { company: 700_000, rep: 200_000, partner: 100_000 },
  },
  // ── SALES-LED FLAGSHIPS (fixed-dollar splits) ──
  {
    key: 'diagnostic',
    name: '21-Day Revenue Diagnostic',
    band: 'flagship',
    blurb: 'Fixed-fee forensic audit. CRM-agnostic. Fit call required.',
    priceCents: 1_850_000,
    cadence: 'one-time',
    included: [
      '12-month CRM snapshot and lead-flow review',
      'Lead-to-contact, follow-up, and deal-stage leak analysis',
      '15–30 page written findings report with prioritized fixes',
      'ROI projections, source-data appendix, and 60-minute readout',
    ],
    // Fixed: $10,500 / $5,000 / $3,000  (sum = $18,500)
    split: { company: 1_050_000, rep: 500_000, partner: 300_000 },
  },
  {
    key: 'activeCase',
    name: 'Active Case',
    band: 'flagship',
    blurb: '3-month minimum. Diagnostic clients only. Recurring monthly. Rep & partner get paid EVERY month the client stays.',
    priceCents: 1_500_000,
    recurring: true,
    cadence: 'per month',
    included: [
      'Execution of the highest-value leaks found in the Diagnostic',
      'CRM, follow-up, sales process, reporting, automation fixes',
      'Operator-led weekly priorities and implementation oversight',
      'Monthly progress math tied to retained revenue and pipeline',
    ],
    // Fixed: $8,000 / $4,000 / $3,000
    split: { company: 800_000, rep: 400_000, partner: 300_000 },
  },
];

interface BonusTier { threshold: string; amountCents: number; }
interface Bonus {
  key: string;
  name: string;
  icon: React.ElementType;
  description: string;
  tiers: BonusTier[];
  unit: string;
}

const BONUSES: Bonus[] = [
  {
    key: 'volume',
    name: 'Volume Bonus',
    icon: Trophy,
    description: 'Stack monthly flagship sales, extra cash on top of every commission.',
    unit: 'monthly flagship sales',
    tiers: [
      { threshold: '2 sales / mo', amountCents: 100_000 },
      { threshold: '3 sales / mo', amountCents: 250_000 },
      { threshold: '5 sales / mo', amountCents: 500_000 },
    ],
  },
  {
    key: 'retention',
    name: 'Retention Bonus',
    icon: Repeat,
    description: 'Earn more when active case clients stay subscribed, your residual pays twice.',
    unit: 'months client extends',
    tiers: [
      { threshold: '3-month extension', amountCents: 100_000 },
      { threshold: '6-month extension', amountCents: 250_000 },
      { threshold: '12-month extension', amountCents: 500_000 },
    ],
  },
  {
    key: 'referral',
    name: 'Referral Bonus',
    icon: UsersIcon,
    description: 'Bring in another rep. $500 when they onboard, $7k on their first close, plus a $500/sale override for 12 months.',
    unit: 'per recruited rep',
    tiers: [
      { threshold: 'Onboard bonus', amountCents: 50_000 },
      { threshold: 'Their first close', amountCents: 700_000 },
      { threshold: 'Per sale (12 mo override)', amountCents: 50_000 },
    ],
  },
];

export type CommissionAudience = 'rep' | 'partner' | 'admin';

interface Props { audience?: CommissionAudience; }

const Row: React.FC<{ icon: React.ReactNode; label: string; value: string; accent?: boolean }> = ({
  icon, label, value, accent,
}) => (
  <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
    <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
      {icon}{label}
    </div>
    <div className={`text-base font-bold ${accent ? 'text-amber' : 'text-foreground'}`}>{value}</div>
  </div>
);

export const FlagshipCommissionPanel: React.FC<Props> = ({ audience = 'rep' }) => {
  const showFullSplit = audience !== 'rep';
  const [months, setMonths] = React.useState(12);

  return (
    <div className="space-y-5">
      <Card className="border-amber/40 bg-amber/[0.03]">
        <CardHeader>
          <div className="font-mono text-[10px] uppercase tracking-widest text-amber mb-1">
            What we sell on aetheris.technology
          </div>
          <CardTitle className="flex items-center gap-2 font-display">
            <DollarSign className="w-5 h-5 text-amber" /> Flagship Offers, Your Real Earning Engine
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Fixed-dollar payouts on every closed sale.{' '}
            <span className="text-foreground font-semibold">Recurring offers pay every single month the client stays subscribed.</span>{' '}
            No tiers to chase, no clawbacks once work is delivered.
          </p>
        </CardHeader>
        <CardContent>
          {/* Months projection slider, applies to recurring math + combined-deal example */}
          <div className="mb-5 rounded-lg border border-amber/30 bg-background/40 p-4">
            <label className="text-[10px] text-muted-foreground block mb-2 font-mono uppercase tracking-wider">
              Project recurring revenue over: <span className="text-amber font-bold">{months} {months === 1 ? 'month' : 'months'}</span>
            </label>
            <input
              type="range" min={1} max={36} step={1}
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="w-full accent-amber"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1 font-mono">
              <span>1 mo</span><span>12 mo</span><span>24 mo</span><span>36 mo</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FLAGSHIPS.map((f) => (
              <div key={f.key} className="rounded-lg border border-amber/30 bg-background/40 p-5">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-lg font-bold text-foreground">{f.name}</h3>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className={`font-mono text-[10px] ${f.band === 'flagship' ? 'border-amber/60 text-amber' : 'border-border text-muted-foreground'}`}>
                      {f.band === 'flagship' ? 'FLAGSHIP · sales-led' : 'BUNDLE · operator-led'}
                    </Badge>
                    {f.recurring && (
                      <Badge variant="outline" className="border-amber/40 text-amber font-mono text-[10px]">
                        <Repeat className="w-3 h-3 mr-1" /> RECURRING
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-4">{f.blurb}</p>

                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-bold text-foreground">{fmtUsd(f.priceCents)}</span>
                  <span className="text-xs text-muted-foreground font-mono uppercase">{f.cadence}</span>
                </div>

                <div className="mb-4 rounded-md border border-border/50 bg-card/40 p-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-amber mb-2">What's included</div>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {f.included.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {showFullSplit ? (
                  <div className="space-y-0">
                    <Row icon={<Building2 className="w-3.5 h-3.5" />} label="Company" value={fmtUsd(f.split.company)} />
                    <Row icon={<User className="w-3.5 h-3.5" />} label="Rep" value={fmtUsd(f.split.rep)} accent />
                    <Row icon={<Handshake className="w-3.5 h-3.5" />} label="Partner" value={fmtUsd(f.split.partner)} accent />
                  </div>
                ) : (
                  <div className="rounded-md border border-amber/40 bg-amber/10 p-4 text-center">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Your cut</div>
                    <div className="text-3xl font-bold text-amber leading-tight">{fmtUsd(f.split.rep)}</div>
                    <div className="text-[10px] font-mono uppercase text-muted-foreground mt-1">
                      {f.recurring ? 'EVERY MONTH client stays' : 'per closed sale'}
                    </div>
                  </div>
                )}

                {f.recurring && (
                  <div className="mt-4 rounded-md border border-amber/30 bg-amber/10 p-3 space-y-1">
                    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-amber">
                      <Calendar className="w-3 h-3" /> Recurring math (per client)
                    </div>
                    <div className="text-sm text-foreground">
                      <span className="text-amber font-bold">{fmtUsd(f.split.rep * 3)}</span> rep over 3-month minimum
                    </div>
                    <div className="text-sm text-foreground">
                      <span className="text-amber font-bold">{fmtUsd(f.split.rep * months)}</span> rep over {months} {months === 1 ? 'month' : 'months'}
                      {showFullSplit && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          · partner {fmtUsd(f.split.partner * months)} · co {fmtUsd(f.split.company * months)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {!f.recurring && (
                  <div className="mt-4 rounded-md border border-amber/30 bg-amber/10 p-3 space-y-1">
                    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-amber">
                      <Calendar className="w-3 h-3" /> Stacked over {months} {months === 1 ? 'month' : 'months'}
                    </div>
                    <div className="text-sm text-foreground">
                      <span className="text-amber font-bold">{fmtUsd(f.split.rep * months)}</span> rep if you close 1/mo for {months} {months === 1 ? 'month' : 'months'}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Combined-deal example — wired to the flagship offers by key, not array index. */}
          {(() => {
            const diag = FLAGSHIPS.find(f => f.key === 'diagnostic')!;
            const activeCase = FLAGSHIPS.find(f => f.key === 'activeCase')!;
            return (
              <div className="mt-5 rounded-lg border border-amber/40 bg-amber/10 p-5">
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-amber mb-2">
                  <TrendingUp className="w-3.5 h-3.5" /> Full-stack close, what one client is worth in {months} {months === 1 ? 'month' : 'months'}
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Diagnostic ({fmtUsd(diag.priceCents)} one-time) + Active Case ({fmtUsd(activeCase.priceCents)}/mo × {months} {months === 1 ? 'month' : 'months'}) ={' '}
                  <span className="text-foreground font-semibold">{fmtUsd(diag.priceCents + activeCase.priceCents * months)} in client revenue</span>.
                </p>
                {showFullSplit ? (
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="rounded-md border border-border/50 bg-background/60 p-3">
                      <div className="text-[10px] font-mono uppercase text-muted-foreground">Company</div>
                      <div className="text-xl font-bold text-foreground">
                        {fmtUsd(diag.split.company + activeCase.split.company * months)}
                      </div>
                    </div>
                    <div className="rounded-md border border-amber/40 bg-amber/10 p-3">
                      <div className="text-[10px] font-mono uppercase text-muted-foreground">Rep</div>
                      <div className="text-xl font-bold text-amber">
                        {fmtUsd(diag.split.rep + activeCase.split.rep * months)}
                      </div>
                    </div>
                    <div className="rounded-md border border-amber/40 bg-amber/10 p-3">
                      <div className="text-[10px] font-mono uppercase text-muted-foreground">Partner</div>
                      <div className="text-xl font-bold text-amber">
                        {fmtUsd(diag.split.partner + activeCase.split.partner * months)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border border-amber/40 bg-amber/10 p-4 text-center">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">You take home</div>
                    <div className="text-4xl font-bold text-amber leading-tight">
                      {fmtUsd(diag.split.rep + activeCase.split.rep * months)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      per full-stack client over {months} {months === 1 ? 'month' : 'months'}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* BONUS STACK */}
      <Card className="border-amber/40 bg-amber/[0.03]">
        <CardHeader>
          <div className="font-mono text-[10px] uppercase tracking-widest text-amber mb-1">
            Bonus stack, stacks on top of every commission above
          </div>
          <CardTitle className="flex items-center gap-2 font-display">
            <Gift className="w-5 h-5 text-amber" /> Volume · Retention · Referral
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Every bonus pays in addition to your base flagship cut. Recruit a new rep and you keep earning off them for a full year.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {BONUSES.map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.key} className="rounded-lg border border-amber/30 bg-background/40 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-amber" />
                    <h3 className="text-base font-bold text-foreground">{b.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{b.description}</p>
                  <div className="space-y-1">
                    {b.tiers.map((t) => (
                      <Row
                        key={t.threshold}
                        icon={<span className="text-amber font-mono text-[10px]">+</span>}
                        label={t.threshold}
                        value={`+${fmtUsd(t.amountCents)}`}
                        accent
                      />
                    ))}
                  </div>
                  <div className="mt-3 text-[10px] font-mono uppercase text-muted-foreground tracking-wider">
                    measured: {b.unit}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
