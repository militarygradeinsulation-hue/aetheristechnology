import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Loader2, DollarSign, TrendingUp, Percent, Shield, Repeat } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { REP_PRODUCTS, fmtUsd, commissionCents } from '@/lib/repProducts';

interface RepData {
  rep_name: string;
  code: string;
  commission_rate: number;
  total_sales_cents: number;
  total_commission_cents: number;
  is_active: boolean;
}

const RepPortalPage: React.FC = () => {
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [repData, setRepData] = useState<RepData | null>(null);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rep_codes')
        .select('rep_name, code, commission_rate, total_sales_cents, total_commission_cents, is_active, rep_email')
        .eq('code', code.trim())
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      if (!data || data.rep_email?.toLowerCase() !== email.trim().toLowerCase()) {
        toast({ title: 'Invalid credentials', description: 'Code or email does not match.', variant: 'destructive' });
        return;
      }

      setRepData({
        rep_name: data.rep_name,
        code: data.code,
        commission_rate: Number(data.commission_rate),
        total_sales_cents: data.total_sales_cents,
        total_commission_cents: data.total_commission_cents,
        is_active: data.is_active,
      });
    } catch {
      toast({ title: 'Error', description: 'Something went wrong. Try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fmt = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

  if (repData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 relative">
      <Button variant="ghost" size="sm" className="absolute top-4 left-4" onClick={() => setRepData(null)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Log out
        </Button>
        <div className="max-w-3xl w-full space-y-6 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground font-display">
              {repData.rep_name || 'Rep'} Dashboard
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Code: {repData.code}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> Total Sales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{fmt(repData.total_sales_cents)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Commission Earned
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{fmt(repData.total_commission_cents)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Percent className="w-4 h-4" /> Commission Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{(repData.commission_rate * 100).toFixed(0)}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">Active</p>
              </CardContent>
            </Card>
          </div>

          {/* COMMISSION STRUCTURE */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display">
                <DollarSign className="w-5 h-5 text-primary" /> Your Commission Structure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <p className="text-foreground font-medium">
                  You earn <span className="text-primary font-bold">{(repData.commission_rate * 100).toFixed(0)}%</span> of every sale tied to your code — including recurring monthly invoices for as long as the client stays subscribed.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Paid within 7 days of the client's payment clearing. No tiers. No caps. No clawbacks on completed work.
                </p>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Client Price</TableHead>
                      <TableHead className="text-right">Your Cut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {REP_PRODUCTS.map((p) => (
                      <TableRow key={p.name} className={p.highlight ? 'bg-primary/5' : undefined}>
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
                        <TableCell className={`text-right font-semibold ${p.highlight ? 'text-primary' : 'text-foreground'}`}>
                          {fmtUsd(commissionCents(p.priceCents, repData.commission_rate))}{p.recurring ? '/mo' : ''}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell className="text-foreground">Monthly Subscriptions ($25–$1,990/mo)</TableCell>
                      <TableCell className="text-right text-muted-foreground">varies</TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {(repData.commission_rate * 100).toFixed(0)}% of every invoice
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-3">Realistic Monthly Earnings</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    { label: 'Light month', detail: '5 small unlocks + 1 Snapshot', total: '~$40' },
                    { label: 'Solid month', detail: '3 Snapshots + 2 Blueprints + 1 Website Eval', total: '~$164' },
                    { label: 'Strong month', detail: '1 Diagnostic + 2 Snapshots + 1 Fractional retainer', total: '$910 + $590/mo recurring' },
                    { label: 'Heavy month', detail: '2 Diagnostics + 1 Fractional retainer', total: '$1,170 + $590/mo recurring' },
                  ].map((row) => (
                    <div key={row.label} className="rounded-lg border border-border/50 bg-card/50 p-3">
                      <p className="text-sm text-muted-foreground">{row.label}</p>
                      <p className="text-foreground text-sm mt-1">{row.detail}</p>
                      <p className="text-primary font-semibold mt-1">{row.total}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border/50">
                <p>• Tracked automatically when the client uses your 6-digit code at checkout. Visible live in this dashboard.</p>
                <p>• Paid via your chosen payout channel (PayPal, ACH, or Stripe Connect).</p>
                <p>• Recurring products keep paying for as long as the client stays subscribed.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative">
      <Link
        to="/"
        className="absolute top-4 left-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to website
      </Link>
      <div className="glass p-8 rounded-2xl max-w-sm w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground font-display">Rep Portal</h1>
          <p className="text-muted-foreground text-sm mt-1">Enter your code and email to view your stats</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-3">
          <Input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit Rep Code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            required
            autoFocus
          />
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</> : 'View Dashboard'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default RepPortalPage;
