import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DollarSign, TrendingUp, RotateCcw, Repeat, Building2, Handshake, User } from 'lucide-react';
import {
  REP_PRODUCTS,
  fmtUsd,
  commissionCents,
  partnerCents,
  REP_RATE,
  PARTNER_RATE,
  COMPANY_RATE,
} from '@/lib/repProducts';

const DEFAULT_RATE = REP_RATE;

export const CommissionStructurePanel: React.FC = () => {
  const [rate, setRate] = useState(DEFAULT_RATE);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [retentionMonths, setRetentionMonths] = useState(6);

  const setQty = (name: string, qty: number) =>
    setQuantities((prev) => ({ ...prev, [name]: Math.max(0, Math.floor(qty || 0)) }));

  const adjustQty = (name: string, delta: number) =>
    setQuantities((prev) => ({ ...prev, [name]: Math.max(0, (prev[name] || 0) + delta) }));

  const reset = () => {
    setQuantities({});
    setRetentionMonths(6);
    setRate(DEFAULT_RATE);
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
      const repCut = commissionCents(p.priceCents, rate) * qty;
      const partnerCut = partnerCents(p.priceCents) * qty;
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

    const firstMonthRevenue = oneTimeRevenueCents + monthlyRevenueCents;
    const firstMonthRep = oneTimeRepCents + monthlyRepCents;
    const firstMonthPartner = oneTimePartnerCents + monthlyPartnerCents;

    const projectedRevenue = oneTimeRevenueCents + monthlyRevenueCents * retentionMonths;
    const projectedRep = oneTimeRepCents + monthlyRepCents * retentionMonths;
    const projectedPartner = oneTimePartnerCents + monthlyPartnerCents * retentionMonths;
    const projectedCompany = projectedRevenue - projectedRep - projectedPartner;

    return {
      oneTimeRevenueCents,
      oneTimeRepCents,
      oneTimePartnerCents,
      monthlyRevenueCents,
      monthlyRepCents,
      monthlyPartnerCents,
      firstMonthRevenue,
      firstMonthRep,
      firstMonthPartner,
      projectedRevenue,
      projectedRep,
      projectedPartner,
      projectedCompany,
    };
  }, [quantities, rate, retentionMonths]);

  const repPct = (rate * 100).toFixed(0);
  const partnerPct = (PARTNER_RATE * 100).toFixed(0);
  const companyPct = (((1 - rate - PARTNER_RATE)) * 100).toFixed(0);

  return (
    <div className="space-y-6">
      {/* Rule + rate control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <DollarSign className="w-5 h-5 text-amber" /> Commission Structure — 3-Way Split
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-amber/30 bg-amber/5 p-4">
            <p className="text-foreground font-medium">
              Every closed sale tied to the rep's 6-digit code splits three ways:
            </p>
            <div className="grid sm:grid-cols-3 gap-3 mt-3">
              <div className="rounded-md border border-border/50 bg-card/40 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase tracking-wider">
                  <Building2 className="w-3.5 h-3.5" /> Company
                </div>
                <p className="text-2xl font-bold text-foreground mt-1">{companyPct}%</p>
                <p className="text-xs text-muted-foreground">Delivery, ops, overhead</p>
              </div>
              <div className="rounded-md border border-amber/40 bg-amber/10 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase tracking-wider">
                  <User className="w-3.5 h-3.5" /> Rep
                </div>
                <p className="text-2xl font-bold text-amber mt-1">{repPct}%</p>
                <p className="text-xs text-muted-foreground">Closer / source of deal</p>
              </div>
              <div className="rounded-md border border-amber/40 bg-amber/10 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase tracking-wider">
                  <Handshake className="w-3.5 h-3.5" /> Business Partner
                </div>
                <p className="text-2xl font-bold text-amber mt-1">{partnerPct}%</p>
                <p className="text-xs text-muted-foreground">Override on every sale</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Applies to one-time AND recurring monthly invoices for as long as the client stays subscribed.
              No tiers. No caps. No clawbacks on completed work. Paid within 7 days of the client's payment clearing.
              Rep cut stored as <code className="text-amber">commission_rate</code> in <code className="text-amber">rep_codes</code> (default {DEFAULT_RATE.toFixed(2)}). Partner override is fixed at {partnerPct}%.
            </p>
          </div>

          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="text-xs text-muted-foreground block mb-1 font-mono uppercase tracking-wider">
                Test rep rate (%)
              </label>
              <Input
                type="number"
                min={1}
                max={50}
                step={1}
                value={Math.round(rate * 100)}
                onChange={(e) => setRate(Math.max(0.01, Math.min(0.5, Number(e.target.value) / 100 || DEFAULT_RATE)))}
                className="w-28"
              />
            </div>
            <p className="text-xs text-muted-foreground pb-2">
              Default rep cut is {(DEFAULT_RATE * 100).toFixed(0)}%. Partner stays at {partnerPct}%. Adjust to model a custom rep rate.
            </p>
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
                  <TableHead className="text-right">Client Price</TableHead>
                  <TableHead className="text-right">Company ({companyPct}%)</TableHead>
                  <TableHead className="text-right">Rep ({repPct}%)</TableHead>
                  <TableHead className="text-right">Partner ({partnerPct}%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {REP_PRODUCTS.map((p) => {
                  const repCut = commissionCents(p.priceCents, rate);
                  const partnerCut = partnerCents(p.priceCents);
                  const companyCut = p.priceCents - repCut - partnerCut;
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
                      <TableCell className="text-right text-muted-foreground">
                        {fmtUsd(p.priceCents)}{p.recurring ? '/mo' : ''}
                      </TableCell>
                      <TableCell className="text-right text-foreground">
                        {fmtUsd(companyCut)}{p.recurring ? '/mo' : ''}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${p.highlight ? 'text-amber' : 'text-foreground'}`}>
                        {fmtUsd(repCut)}{p.recurring ? '/mo' : ''}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-amber">
                        {fmtUsd(partnerCut)}{p.recurring ? '/mo' : ''}
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
            Set how many of each product the rep closes this month. Recurring retainers are projected over your retention window. Splits company / rep / partner automatically.
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            {REP_PRODUCTS.map((p) => {
              const qty = quantities[p.name] || 0;
              const repLine = commissionCents(p.priceCents, rate) * qty;
              const partnerLine = partnerCents(p.priceCents) * qty;
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
                        {p.recurring && (
                          <span className="ml-1 text-xs text-muted-foreground">/mo</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {fmtUsd(p.priceCents)} → rep {fmtUsd(commissionCents(p.priceCents, rate))} · partner {fmtUsd(partnerCents(p.priceCents))}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => adjustQty(p.name, -1)}
                      disabled={qty <= 0}
                      className="h-8 w-8 p-0"
                    >
                      −
                    </Button>
                    <Input
                      type="number"
                      min={0}
                      value={qty}
                      onChange={(e) => setQty(p.name, Number(e.target.value))}
                      className="h-8 w-16 text-center"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => adjustQty(p.name, 1)}
                      className="h-8 w-8 p-0"
                    >
                      +
                    </Button>
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
              type="range"
              min={1}
              max={36}
              step={1}
              value={retentionMonths}
              onChange={(e) => setRetentionMonths(Number(e.target.value))}
              className="w-full accent-amber"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1 font-mono">
              <span>1 mo</span>
              <span>12 mo</span>
              <span>24 mo</span>
              <span>36 mo</span>
            </div>
          </div>

          {/* Totals — 3-way */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-border/50 bg-card/40 p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5" /> Company ({companyPct}%)
              </div>
              <p className="text-2xl font-semibold text-foreground mt-1">
                {fmtUsd(totals.projectedCompany)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Over {retentionMonths} mo. Funds delivery + overhead.
              </p>
            </div>
            <div className="rounded-lg border border-amber/40 bg-amber/10 p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase tracking-wider">
                <User className="w-3.5 h-3.5" /> Rep ({repPct}%)
              </div>
              <p className="text-2xl font-bold text-amber mt-1">
                {fmtUsd(totals.projectedRep)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                First-month {fmtUsd(totals.firstMonthRep)} · MRR {fmtUsd(totals.monthlyRepCents)}/mo
              </p>
            </div>
            <div className="rounded-lg border border-amber/40 bg-amber/10 p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase tracking-wider">
                <Handshake className="w-3.5 h-3.5" /> Partner ({partnerPct}%)
              </div>
              <p className="text-2xl font-bold text-amber mt-1">
                {fmtUsd(totals.projectedPartner)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                First-month {fmtUsd(totals.firstMonthPartner)} · MRR {fmtUsd(totals.monthlyPartnerCents)}/mo
              </p>
            </div>
            <div className="sm:col-span-3 rounded-lg border border-border/50 bg-card/40 p-4">
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Total client revenue</p>
              <p className="text-xl font-semibold text-foreground mt-1">
                {fmtUsd(totals.projectedRevenue)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                One-time {fmtUsd(totals.oneTimeRevenueCents)} + recurring {fmtUsd(totals.monthlyRevenueCents)}/mo × {retentionMonths} mo.
                Math sanity: company {companyPct} + rep {repPct} + partner {partnerPct} = 100%.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
