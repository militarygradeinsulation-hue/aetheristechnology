import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ShoppingBag, ReceiptText, Trash2, RefreshCw, DollarSign, User, Handshake, Building2, Plus } from 'lucide-react';
import {
  REP_PRODUCTS, fmtUsd, repCentsForProduct, partnerCentsForProduct, companyCentsForProduct,
  type RepProduct,
} from '@/lib/repProducts';
import { getPortalToken, getPortalProfile } from '@/lib/portalAuth';
import { getAdminToken } from '@/lib/adminAuth';

interface CartLine {
  product: RepProduct;
  qty: number;
}

interface SaleRow {
  id: string;
  occurred_at: string;
  product_name: string;
  amount_cents: number;
  kind: string;
  status: string;
  rep_code: string | null;
  partner_code: string | null;
  email: string | null;
  environment: string;
  metadata: any;
}

const PRODUCT_GROUPS: { label: string; filter: (p: RepProduct) => boolean }[] = [
  { label: 'Flagships', filter: (p) => !!p.flagship },
  { label: 'Bundles',   filter: (p) => !!p.bundle && !p.flagship },
  { label: 'Tier 3 — High-Ticket', filter: (p) => p.tier === 3 && !p.bundle && !p.flagship },
  { label: 'Tier 2 — Mid',          filter: (p) => p.tier === 2 },
  { label: 'Tier 1 — Entry',        filter: (p) => p.tier === 1 },
];

interface RepPosTerminalProps {
  /** When true, allows the operator to enter ANY rep_code (partner/admin mode). */
  allowRepOverride?: boolean;
}

export const RepPosTerminal: React.FC<RepPosTerminalProps> = ({ allowRepOverride }) => {
  const { toast } = useToast();
  const portalProfile = getPortalProfile();
  const portalToken = getPortalToken();
  const adminToken = getAdminToken();
  const isAdmin = !!adminToken;
  const isPartner = portalProfile?.role === 'partner';
  const canOverrideRep = allowRepOverride ?? (isAdmin || isPartner);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [partnerCode, setPartnerCode] = useState('');
  const [repCodeOverride, setRepCodeOverride] = useState(portalProfile?.code || '');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'paid' | 'pending'>('paid');
  const [environment, setEnvironment] = useState<'sandbox' | 'live'>('live');
  const [submitting, setSubmitting] = useState(false);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);

  const callPos = async (body: any) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (adminToken) headers['x-admin-token'] = adminToken;
    else if (portalToken) headers['Authorization'] = `Bearer ${portalToken}`;
    const { data, error } = await supabase.functions.invoke('portal-pos-sale', {
      body, headers,
    });
    if (error) throw new Error(error.message);
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  };

  const loadSales = async () => {
    if (!portalToken && !adminToken) return;
    setLoadingSales(true);
    try {
      const r = await callPos({ action: 'list', limit: 50 });
      setSales((r?.sales || []) as SaleRow[]);
    } catch (e: any) {
      toast({ title: 'Failed to load sales log', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingSales(false);
    }
  };

  useEffect(() => { loadSales(); /* eslint-disable-next-line */ }, []);

  const addLine = (p: RepProduct) => {
    setCart(prev => {
      const i = prev.findIndex(l => l.product.name === p.name);
      if (i >= 0) {
        const next = [...prev]; next[i] = { ...next[i], qty: next[i].qty + 1 }; return next;
      }
      return [...prev, { product: p, qty: 1 }];
    });
  };
  const setLineQty = (name: string, qty: number) => {
    setCart(prev => prev.map(l => l.product.name === name ? { ...l, qty: Math.max(0, qty) } : l).filter(l => l.qty > 0));
  };
  const removeLine = (name: string) => setCart(prev => prev.filter(l => l.product.name !== name));
  const clearCart = () => { setCart([]); setCustomerName(''); setCustomerEmail(''); setCustomerPhone(''); setNotes(''); };

  const totals = useMemo(() => {
    let oneTime = 0, monthly = 0, repCut = 0, partnerCut = 0, companyCut = 0;
    for (const l of cart) {
      const amt = l.product.priceCents * l.qty;
      if (l.product.recurring) monthly += amt; else oneTime += amt;
      repCut += repCentsForProduct(l.product) * l.qty;
      partnerCut += partnerCentsForProduct(l.product) * l.qty;
      companyCut += companyCentsForProduct(l.product) * l.qty;
    }
    return { oneTime, monthly, repCut, partnerCut, companyCut, total: oneTime + monthly };
  }, [cart]);

  const checkout = async () => {
    if (cart.length === 0) return toast({ title: 'Cart is empty' });
    const repCode = canOverrideRep ? repCodeOverride.trim() : (portalProfile?.code || '');
    if (!/^\d{6}$/.test(repCode)) {
      return toast({ title: 'Rep code required', description: 'Enter the 6-digit code of the closing rep.', variant: 'destructive' });
    }
    setSubmitting(true);
    try {
      // One sale row per cart line so commissions and Stripe-style tracking line up.
      let recorded = 0;
      for (const line of cart) {
        await callPos({
          action: 'record',
          product_name: line.product.name + (line.qty > 1 ? ` (×${line.qty})` : ''),
          product_id: line.product.name.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
          amount_cents: line.product.priceCents * line.qty,
          kind: line.product.recurring ? 'recurring' : 'one_time',
          customer_email: customerEmail || null,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          rep_code: repCode,
          partner_code: partnerCode.trim() || null,
          environment,
          status,
          notes,
        });
        recorded++;
      }
      toast({ title: `Recorded ${recorded} sale${recorded === 1 ? '' : 's'}`, description: `${fmtUsd(totals.total)} tagged to rep ${repCode}.` });
      clearCart();
      loadSales();
    } catch (e: any) {
      toast({ title: 'Sale failed', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!portalToken && !adminToken) {
    return null; // POS hidden for unauthenticated visitors
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-amber">Operator POS · live tracking</div>
          <h2 className="font-display text-2xl font-bold text-foreground">Sell from the Catalog</h2>
          <p className="text-sm text-muted-foreground">
            Every sale here is logged to the company sales ledger with the closing rep's code. Commissions follow.
          </p>
        </div>
        <Badge variant="outline" className="font-mono border-amber/50 text-amber">
          {isAdmin ? 'ADMIN MODE' : isPartner ? 'PARTNER MODE' : `REP ${portalProfile?.code}`}
        </Badge>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* LEFT — Product picker */}
        <div className="lg:col-span-2 space-y-4">
          {PRODUCT_GROUPS.map(group => {
            const items = REP_PRODUCTS.filter(group.filter);
            if (!items.length) return null;
            return (
              <Card key={group.label}>
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-sm flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-amber" /> {group.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.map(p => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => addLine(p)}
                      className="w-full text-left p-3 rounded-lg border border-border/60 bg-card/40 hover:border-amber/60 hover:bg-amber/5 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground">{p.name}</span>
                            {p.flagship && <Badge variant="outline" className="border-amber/60 text-amber font-mono text-[9px]">FLAGSHIP</Badge>}
                            {p.bundle && <Badge variant="outline" className="border-amber/60 text-amber font-mono text-[9px]">BUNDLE</Badge>}
                            {p.recurring && <Badge variant="outline" className="font-mono text-[9px]">RECURRING</Badge>}
                          </div>
                          {p.description && <p className="text-xs text-muted-foreground mt-1 leading-snug">{p.description}</p>}
                          {p.forWho && <p className="text-[11px] text-amber/80 font-mono mt-1"><span className="uppercase">For:</span> {p.forWho}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-base font-bold text-foreground">{fmtUsd(p.priceCents)}{p.recurring ? '/mo' : ''}</div>
                          <div className="text-[10px] text-amber font-mono">+ {fmtUsd(repCentsForProduct(p))} rep</div>
                          <Button type="button" size="sm" variant="ghost" className="mt-1 h-6 text-[11px] text-amber hover:bg-amber/10">
                            <Plus className="w-3 h-3 mr-1" /> Add
                          </Button>
                        </div>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* RIGHT — Cart & customer */}
        <div className="space-y-4">
          <Card className="border-amber/40">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base flex items-center gap-2">
                <ReceiptText className="w-4 h-4 text-amber" /> Cart
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No items yet. Click any product on the left.</p>
              ) : (
                <div className="space-y-1.5">
                  {cart.map(l => (
                    <div key={l.product.name} className="flex items-center gap-2 p-2 rounded border border-border/50 bg-secondary/30">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground truncate">{l.product.name}</p>
                        <p className="text-[10px] text-muted-foreground">{fmtUsd(l.product.priceCents)}{l.product.recurring ? '/mo' : ''} × {l.qty}</p>
                      </div>
                      <Input
                        type="number"
                        min={1}
                        value={l.qty}
                        onChange={(e) => setLineQty(l.product.name, Number(e.target.value) || 1)}
                        className="h-7 w-14 text-center text-xs"
                      />
                      <button onClick={() => removeLine(l.product.name)} className="text-red-400 hover:text-red-300">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-md border border-border/50 bg-background/40 p-2 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">One-time</span><span className="font-mono">{fmtUsd(totals.oneTime)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Monthly</span><span className="font-mono">{fmtUsd(totals.monthly)}/mo</span></div>
                <div className="flex justify-between font-semibold border-t border-border/40 pt-1 mt-1"><span>First-month total</span><span className="font-mono text-foreground">{fmtUsd(totals.total)}</span></div>
                <div className="flex justify-between text-amber"><span className="flex items-center gap-1"><User className="w-3 h-3" /> Rep cut</span><span className="font-mono">{fmtUsd(totals.repCut)}</span></div>
                <div className="flex justify-between text-amber"><span className="flex items-center gap-1"><Handshake className="w-3 h-3" /> Partner cut</span><span className="font-mono">{fmtUsd(totals.partnerCut)}</span></div>
                <div className="flex justify-between"><span className="flex items-center gap-1 text-muted-foreground"><Building2 className="w-3 h-3" /> Company</span><span className="font-mono">{fmtUsd(totals.companyCut)}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <Label className="text-xs">Name</Label>
                <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="e.g. Acme Plumbing" className="h-8" />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="owner@acme.com" className="h-8" />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="(317) 555-1234" className="h-8" />
              </div>

              {canOverrideRep ? (
                <div>
                  <Label className="text-xs">Closing rep code <span className="text-amber">(required)</span></Label>
                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    value={repCodeOverride}
                    onChange={e => setRepCodeOverride(e.target.value.replace(/\D/g, ''))}
                    placeholder="6-digit rep code"
                    className="h-8 font-mono"
                  />
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">Tagged to your code <span className="font-mono text-amber">{portalProfile?.code}</span>.</div>
              )}
              <div>
                <Label className="text-xs">Partner code (optional)</Label>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  value={partnerCode}
                  onChange={e => setPartnerCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="6-digit partner code"
                  className="h-8 font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Status</Label>
                  <select value={status} onChange={e => setStatus(e.target.value as any)} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs">
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Env</Label>
                  <select value={environment} onChange={e => setEnvironment(e.target.value as any)} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs">
                    <option value="live">Live</option>
                    <option value="sandbox">Sandbox</option>
                  </select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Deal context, special pricing, install timeline…" rows={2} className="text-xs" />
              </div>

              <Button
                onClick={checkout}
                disabled={submitting || cart.length === 0}
                className="w-full bg-amber text-background hover:bg-amber/90"
              >
                {submitting ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Recording…</> : <><DollarSign className="w-4 h-4 mr-1" /> Record sale ({fmtUsd(totals.total)})</>}
              </Button>
              {cart.length > 0 && (
                <Button onClick={clearCart} variant="ghost" size="sm" className="w-full text-muted-foreground">Clear cart</Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sales log */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-display flex items-center gap-2">
              <ReceiptText className="w-5 h-5 text-amber" /> Sales Log
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {isAdmin || isPartner ? 'All POS sales across every rep.' : 'Your sales only.'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadSales} disabled={loadingSales}>
            {loadingSales ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No sales recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                  <tr>
                    <th className="py-2 pr-3">When</th>
                    <th className="py-2 pr-3">Product</th>
                    <th className="py-2 pr-3 text-right">Amount</th>
                    <th className="py-2 pr-3">Rep</th>
                    <th className="py-2 pr-3">Customer</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Env</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map(s => (
                    <tr key={s.id} className="border-t border-border/40">
                      <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{new Date(s.occurred_at).toLocaleString()}</td>
                      <td className="py-2 pr-3 text-foreground">
                        {s.product_name}
                        {s.kind === 'recurring' && <Badge variant="outline" className="ml-1 font-mono text-[9px]">/mo</Badge>}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-foreground">{fmtUsd(s.amount_cents)}</td>
                      <td className="py-2 pr-3 font-mono text-amber">{s.rep_code || '—'}</td>
                      <td className="py-2 pr-3 text-muted-foreground truncate max-w-[180px]">{s.email || s.metadata?.customer_name || '—'}</td>
                      <td className="py-2 pr-3"><Badge variant="outline" className="text-[9px]">{s.status}</Badge></td>
                      <td className="py-2 pr-3 text-muted-foreground">{s.environment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RepPosTerminal;
