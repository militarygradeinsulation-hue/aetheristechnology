import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, RotateCcw, Repeat, Building2, Handshake, User } from 'lucide-react';
import {
  REP_PRODUCTS,
  TIER_RATES,
  TIER_LABEL,
  fmtUsd,
  repCentsForProduct,
  partnerCentsForProduct,
  companyCentsForProduct,
  type CommissionTier,
} from '@/lib/repProducts';

const TIERS: CommissionTier[] = [1, 2, 3];

export const CommissionStructurePanel: React.FC = () => {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [retentionMonths, setRetentionMonths] = useState(6);

  const setQty = (name: string, qty: number) =>
    setQuantities((prev) => ({ ...prev, [name]: Math.max(0, Math.floor(qty || 0)) }));

  const adjustQty = (name: string, delta: number) =>
    setQuantities((prev) => ({ ...prev, [name]: Math.max(0, (prev[name] || 0) + delta) }));

  const reset = () => {
    setQuantities({});
    setRetentionMonths(6);
  };

  const totals = useMemo(() => {
    let oneTimeRevenueCents = 0;
    let oneTimeRepCents = 0;
    let oneTimePartnerCents = 0;
    let monthlyRevenueCents = 0;
    let monthlyRepCents = 0;
    let monthlyPartnerCents = 0;

    for (const p of REP_PRODUCTS) {
      const qty = quantities[p.name] || 0;
      if (qty <= 0) continue;
      const revenue = p.priceCents * qty;
      const repCut = repCentsForProduct(p) * qty;
      const partnerCut = partnerCentsForProduct(p) * qty;
      if (p.recurring) {
        monthlyRevenueCents += revenue;
        monthlyRepCents += repCut;
        monthlyPartnerCents += partnerCut;
      } else {
        oneTimeRevenueCents += revenue;
        oneTimeRepCents += repCut;
        oneTimePartnerCents += partnerCut;
      }
    }

    const projectedRevenue = oneTimeRevenueCents + monthlyRevenueCents * retentionMonths;
    const projectedRep = oneTimeRepCents + monthlyRepCents * retentionMonths;
    const projectedPartner = oneTimePartnerCents + monthlyPartnerCents * retentionMonths;
    const projectedCompany = projectedRevenue - projectedRep - projectedPartner;

    return {
      oneTimeRevenueCents, monthlyRevenueCents,
      monthlyRepCents, monthlyPartnerCents,
      firstMonthRep: oneTimeRepCents + monthlyRepCents,
      firstMonthPartner: oneTimePartnerCents + monthlyPartnerCents,
      projectedRevenue, projectedRep, projectedPartner, projectedCompany,
    };
  }, [quantities, retentionMonths]);

  return (
    <details className="group rounded-lg border border-border/50 bg-card/30">
      <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between hover:bg-card/50">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Product catalog · tiered splits · mix-&amp;-match calculator
        </span>
        <span className="text-xs text-amber font-mono group-open:hidden">Expand ▾</span>
        <span className="text-xs text-amber font-mono hidden group-open:inline">Collapse ▴</span>
      </summary>
      <div className="space-y-6 p-4 pt-2">
      {/* Tiered rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <DollarSign className="w-5 h-5 text-amber" /> Commission Structure — Tiered 3-Way Split
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Every closed sale tied to the rep's 6-digit code splits three ways. The percentage depends on the product's price tier — entry-level products pay reps a higher % to drive volume; high-ticket deals pay reps fewer points but far more dollars per close. Applies to one-time and recurring invoices.
          </p>

          <div className="grid md:grid-cols-3 gap-3">
            {TIERS.map((t) => {
              const r = TIER_RATES[t];
              return (
                <div key={t} className="rounded-lg border border-amber/30 bg-amber/5 p-4">
                  <Badge variant="outline" className="mb-2 border-amber/40 text-amber font-mono uppercase text-xs">
                    {TIER_LABEL[t]}
                  </Badge>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono uppercase">
                        <Building2 className="w-3 h-3" /> Co
                      </div>
                      <p className="text-lg font-bold text-foreground">{Math.round(r.company * 100)}%</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono uppercase">
                        <User className="w-3 h-3" /> Rep
                      </div>
                      <p className="text-lg font-bold text-amber">{Math.round(r.rep * 100)}%</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono uppercase">
                        <Handshake className="w-3 h-3" /> Partner
                      </div>
                      <p className="text-lg font-bold text-amber">{Math.round(r.partner * 100)}%</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t === 1 && 'Entry-level $29–$59. Built for volume + fast wins.'}
                    {t === 2 && 'Mid-level $79–$349. Bread-and-butter consultative sales.'}
                    {t === 3 && 'High-ticket $599+. Fewer points, big dollars per close.'}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Per-product table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <TrendingUp className="w-5 h-5 text-amber" /> Per-Product Split
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Client Price</TableHead>
                  <TableHead className="text-right">Company</TableHead>
                  <TableHead className="text-right">Rep</TableHead>
                  <TableHead className="text-right">Partner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {REP_PRODUCTS.map((p) => {
                  const r = TIER_RATES[p.tier];
                  const repCut = repCentsForProduct(p);
                  const partnerCut = partnerCentsForProduct(p);
                  const companyCut = companyCentsForProduct(p);
                  return (
                    <TableRow key={p.name} className={p.highlight ? 'bg-amber/5' : undefined}>
                      <TableCell className={p.highlight ? 'font-semibold text-foreground' : 'text-foreground'}>
                        {p.name}
                        {p.recurring && (
                          <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Repeat className="w-3 h-3" /> recurring
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px]">T{p.tier}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {fmtUsd(p.priceCents)}{p.recurring ? '/mo' : ''}
                      </TableCell>
                      <TableCell className="text-right text-foreground">
                        {fmtUsd(companyCut)} <span className="text-xs text-muted-foreground">({Math.round(r.company * 100)}%)</span>
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${p.highlight ? 'text-amber' : 'text-foreground'}`}>
                        {fmtUsd(repCut)} <span className="text-xs text-muted-foreground">({Math.round(r.rep * 100)}%)</span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-amber">
                        {fmtUsd(partnerCut)} <span className="text-xs text-muted-foreground">({Math.round(r.partner * 100)}%)</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Mix & Match calculator */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-display">
            <DollarSign className="w-5 h-5 text-amber" /> Mix &amp; Match Calculator
          </CardTitle>
          <Button variant="outline" size="sm" onClick={reset} className="gap-2">
            <RotateCcw className="w-3 h-3" /> Reset
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Set how many of each product the rep closes this month. Each product uses its own tier rate. Recurring retainers project over your retention window.
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            {REP_PRODUCTS.map((p) => {
              const qty = quantities[p.name] || 0;
              const repLine = repCentsForProduct(p) * qty;
              const partnerLine = partnerCentsForProduct(p) * qty;
              return (
                <div
                  key={p.name}
                  className={`rounded-lg border p-3 ${
                    qty > 0 ? 'border-amber/40 bg-amber/5' : 'border-border/50 bg-card/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {p.name}
                        {p.recurring && <span className="ml-1 text-xs text-muted-foreground">/mo</span>}
                        <Badge variant="outline" className="ml-2 font-mono text-[10px]">T{p.tier}</Badge>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {fmtUsd(p.priceCents)} → rep {fmtUsd(repCentsForProduct(p))} · partner {fmtUsd(partnerCentsForProduct(p))}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => adjustQty(p.name, -1)} disabled={qty <= 0} className="h-8 w-8 p-0">−</Button>
                    <Input type="number" min={0} value={qty} onChange={(e) => setQty(p.name, Number(e.target.value))} className="h-8 w-16 text-center" />
                    <Button type="button" variant="outline" size="sm" onClick={() => adjustQty(p.name, 1)} className="h-8 w-8 p-0">+</Button>
                    <span className="ml-auto text-xs font-semibold text-amber text-right leading-tight">
                      {qty > 0 ? (
                        <>
                          R: {fmtUsd(repLine)}{p.recurring ? '/mo' : ''}<br />
                          P: {fmtUsd(partnerLine)}{p.recurring ? '/mo' : ''}
                        </>
                      ) : '—'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Retention slider */}
          <div className="rounded-lg border border-border/50 bg-card/40 p-4">
            <label className="text-xs text-muted-foreground block mb-2 font-mono uppercase tracking-wider">
              Project recurring revenue over: <span className="text-amber font-bold">{retentionMonths} months</span>
            </label>
            <input
              type="range" min={1} max={36} step={1}
              value={retentionMonths}
              onChange={(e) => setRetentionMonths(Number(e.target.value))}
              className="w-full accent-amber"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1 font-mono">
              <span>1 mo</span><span>12 mo</span><span>24 mo</span><span>36 mo</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-border/50 bg-card/40 p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5" /> Company
              </div>
              <p className="text-2xl font-semibold text-foreground mt-1">{fmtUsd(totals.projectedCompany)}</p>
              <p className="text-xs text-muted-foreground mt-1">Over {retentionMonths} mo. Funds delivery + overhead.</p>
            </div>
            <div className="rounded-lg border border-amber/40 bg-amber/10 p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase tracking-wider">
                <User className="w-3.5 h-3.5" /> Rep
              </div>
              <p className="text-2xl font-bold text-amber mt-1">{fmtUsd(totals.projectedRep)}</p>
              <p className="text-xs text-muted-foreground mt-1">First-month {fmtUsd(totals.firstMonthRep)} · MRR {fmtUsd(totals.monthlyRepCents)}/mo</p>
            </div>
            <div className="rounded-lg border border-amber/40 bg-amber/10 p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase tracking-wider">
                <Handshake className="w-3.5 h-3.5" /> Partner
              </div>
              <p className="text-2xl font-bold text-amber mt-1">{fmtUsd(totals.projectedPartner)}</p>
              <p className="text-xs text-muted-foreground mt-1">First-month {fmtUsd(totals.firstMonthPartner)} · MRR {fmtUsd(totals.monthlyPartnerCents)}/mo</p>
            </div>
            <div className="sm:col-span-3 rounded-lg border border-border/50 bg-card/40 p-4">
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Total client revenue</p>
              <p className="text-xl font-semibold text-foreground mt-1">{fmtUsd(totals.projectedRevenue)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                One-time {fmtUsd(totals.oneTimeRevenueCents)} + recurring {fmtUsd(totals.monthlyRevenueCents)}/mo × {retentionMonths} mo. Each line uses its tier's split.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
