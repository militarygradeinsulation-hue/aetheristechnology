import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DollarSign, TrendingUp, RotateCcw, Repeat } from 'lucide-react';
import { REP_PRODUCTS, fmtUsd, commissionCents } from '@/lib/repProducts';

const DEFAULT_RATE = 0.10;

export const CommissionStructurePanel: React.FC = () => {
  const [rate, setRate] = useState(DEFAULT_RATE);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  // Number of months we project recurring revenue for in the Mix & Match.
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
    let oneTimeCommissionCents = 0;
    let monthlyRevenueCents = 0;
    let monthlyCommissionCents = 0;

    for (const p of REP_PRODUCTS) {
      const qty = quantities[p.name] || 0;
      if (qty <= 0) continue;
      const revenue = p.priceCents * qty;
      const commission = commissionCents(p.priceCents, rate) * qty;
      if (p.recurring) {
        monthlyRevenueCents += revenue;
        monthlyCommissionCents += commission;
      } else {
        oneTimeRevenueCents += revenue;
        oneTimeCommissionCents += commission;
      }
    }

    const firstMonthRevenue = oneTimeRevenueCents + monthlyRevenueCents;
    const firstMonthCommission = oneTimeCommissionCents + monthlyCommissionCents;
    const projectedRevenue = oneTimeRevenueCents + monthlyRevenueCents * retentionMonths;
    const projectedCommission =
      oneTimeCommissionCents + monthlyCommissionCents * retentionMonths;

    return {
      oneTimeRevenueCents,
      oneTimeCommissionCents,
      monthlyRevenueCents,
      monthlyCommissionCents,
      firstMonthRevenue,
      firstMonthCommission,
      projectedRevenue,
      projectedCommission,
    };
  }, [quantities, rate, retentionMonths]);

  const ratePct = (rate * 100).toFixed(0);

  return (
    <div className="space-y-6">
      {/* Rule + rate control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <DollarSign className="w-5 h-5 text-amber" /> Commission Structure
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-amber/30 bg-amber/5 p-4">
            <p className="text-foreground font-medium">
              Flat <span className="text-amber font-bold">{ratePct}%</span> of every closed
              sale tied to the rep's 6-digit code — including recurring monthly invoices for as
              long as the client stays subscribed.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              No tiers. No caps. No clawbacks on completed work. Paid within 7 days of the
              client's payment clearing. Stored as <code className="text-amber">commission_rate</code> in <code className="text-amber">rep_codes</code> (default 0.10).
            </p>
          </div>

          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="text-xs text-muted-foreground block mb-1 font-mono uppercase tracking-wider">
                Test rate (%)
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
              Default is 10%. Change this to model what a custom rep rate would look like across the table below.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Per-product table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <TrendingUp className="w-5 h-5 text-amber" /> Per-Product Cuts at {ratePct}%
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Client Price</TableHead>
                  <TableHead className="text-right">Rep Cut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {REP_PRODUCTS.map((p) => (
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
                    <TableCell className={`text-right font-semibold ${p.highlight ? 'text-amber' : 'text-foreground'}`}>
                      {fmtUsd(commissionCents(p.priceCents, rate))}{p.recurring ? '/mo' : ''}
                    </TableCell>
                  </TableRow>
                ))}
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
            Set how many of each product the rep closes this month. Recurring retainers are projected over your retention window.
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            {REP_PRODUCTS.map((p) => {
              const qty = quantities[p.name] || 0;
              const lineCommission = commissionCents(p.priceCents, rate) * qty;
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
                        {fmtUsd(p.priceCents)} → {fmtUsd(commissionCents(p.priceCents, rate))} per sale
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
                    <span className="ml-auto text-sm font-semibold text-amber">
                      {qty > 0 ? fmtUsd(lineCommission) + (p.recurring ? '/mo' : '') : '—'}
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

          {/* Totals */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-amber/40 bg-amber/10 p-4">
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">First-month commission</p>
              <p className="text-3xl font-bold text-amber mt-1">
                {fmtUsd(totals.firstMonthCommission)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                One-time {fmtUsd(totals.oneTimeCommissionCents)} + recurring {fmtUsd(totals.monthlyCommissionCents)}/mo
              </p>
            </div>
            <div className="rounded-lg border border-amber/40 bg-amber/10 p-4">
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                Projected over {retentionMonths} mo
              </p>
              <p className="text-3xl font-bold text-amber mt-1">
                {fmtUsd(totals.projectedCommission)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Total client revenue: {fmtUsd(totals.projectedRevenue)}
              </p>
            </div>
            <div className="rounded-lg border border-border/50 bg-card/40 p-4">
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Recurring MRR commission</p>
              <p className="text-2xl font-semibold text-foreground mt-1">
                {fmtUsd(totals.monthlyCommissionCents)}<span className="text-sm text-muted-foreground">/mo</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Keeps paying as long as the client stays subscribed.
              </p>
            </div>
            <div className="rounded-lg border border-border/50 bg-card/40 p-4">
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Business take (after rep cut)</p>
              <p className="text-2xl font-semibold text-foreground mt-1">
                {fmtUsd(totals.projectedRevenue - totals.projectedCommission)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Over the {retentionMonths}-month projection.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
