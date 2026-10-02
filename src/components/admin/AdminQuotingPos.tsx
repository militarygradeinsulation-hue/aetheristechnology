import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import {
  computeQuote, dollarsToCents, centsToDollarString, CADENCES, CADENCE_LABEL, CADENCE_SUFFIX,
  type QuoteCadence, type QuoteLineInput, type DiscountType, type QuoteDiscount,
} from '@/lib/quoteMath';
import {
  catalogFromRepProducts, emptyDraft, snapshotFor, usd, fmtDate, type QuoteDraft, type CatalogItem,
} from '@/lib/quoteDocument';
import { buildQuotePdf, quotePdfFilename } from '@/lib/generateQuotePdf';
import {
  Search, Plus, Trash2, Save, FileDown, Printer, Eye, Copy, FolderOpen, Loader2, ShoppingCart, X, FilePlus2,
} from 'lucide-react';

async function call(action: string, payload: Record<string, unknown> = {}) {
  const token = getAdminToken();
  if (!token) throw new Error('Admin session expired. Sign in again.');
  const { data, error } = await supabase.functions.invoke('admin-quotes', {
    body: { action, ...payload },
    headers: { 'x-admin-token': token },
  });
  if ((data as any)?.error) throw new Error((data as any).error);
  if (error) {
    let msg = error.message;
    try { const b = await (error as any).context?.json?.(); if (b?.error) msg = b.error; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return data as any;
}

interface QuoteRow {
  id: string; quote_number: string; status: string; client_company: string | null; client_contact: string | null;
  client_email: string | null; quote_date: string; sow_title: string | null; totals: any; created_by: string;
  created_at: string; updated_at: string;
}

const uid = () => (crypto?.randomUUID?.() ?? `l-${Date.now()}-${Math.random().toString(36).slice(2)}`);

function rowToDraft(row: any): QuoteDraft {
  const p = row.payload || {};
  const base = emptyDraft();
  return {
    ...base,
    id: row.id,
    quoteNumber: row.quote_number,
    status: row.status === 'issued' ? 'issued' : 'draft',
    client: { ...base.client, ...(p.client || {}) },
    quoteDate: p.quoteDate || row.quote_date,
    validUntil: p.validUntil ?? null,
    projectStart: p.projectStart ?? null,
    projectEnd: p.projectEnd ?? null,
    lines: Array.isArray(p.lines) ? p.lines : [],
    quoteDiscount: p.quoteDiscount || { type: 'none', value: 0 },
    quoteDiscountCadence: p.quoteDiscountCadence || 'one_time',
    sow: { ...base.sow, ...(p.sow || {}) },
    createdAt: row.created_at, updatedAt: row.updated_at, createdBy: row.created_by,
  };
}

const discText = (d: QuoteDiscount) =>
  d.type === 'percent' ? (Number.isFinite(d.value) ? String(d.value) : '') : d.type === 'amount' ? (Number.isFinite(d.value) ? centsToDollarString(d.value) : '') : '';

const parseDisc = (type: DiscountType, text: string): QuoteDiscount => {
  if (type === 'none') return { type, value: 0 };
  if (text.trim() === '') return { type, value: 0 };
  if (type === 'percent') { const n = Number(text); return { type, value: Number.isFinite(n) ? n : NaN }; }
  const c = dollarsToCents(text); return { type, value: c === null ? NaN : c };
};

const DiscountEditor: React.FC<{ value: QuoteDiscount; onChange: (d: QuoteDiscount) => void; label: string }> = ({ value, onChange, label }) => {
  const [text, setText] = useState(discText(value));
  useEffect(() => { setText(discText(value)); }, [value.type]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="flex gap-2 items-center">
      <Select value={value.type} onValueChange={(t) => { setText(''); onChange(parseDisc(t as DiscountType, '')); }}>
        <SelectTrigger className="w-[120px] h-9" aria-label={`${label} type`}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No discount</SelectItem>
          <SelectItem value="percent">Percent %</SelectItem>
          <SelectItem value="amount">Amount $</SelectItem>
        </SelectContent>
      </Select>
      {value.type !== 'none' && (
        <Input className="h-9 w-28" inputMode="decimal" aria-label={`${label} value`}
          placeholder={value.type === 'percent' ? '0-100' : '0.00'} value={text}
          onChange={(e) => { setText(e.target.value); onChange(parseDisc(value.type, e.target.value)); }} />
      )}
    </div>
  );
};

const PriceInput: React.FC<{ cents: number | null; onChange: (c: number | null) => void; label: string }> = ({ cents, onChange, label }) => {
  const [text, setText] = useState(centsToDollarString(cents));
  const [bad, setBad] = useState(false);
  useEffect(() => { if (dollarsToCents(text) !== cents) setText(centsToDollarString(cents)); }, [cents]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="relative">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
      <Input className={`h-9 pl-5 w-32 font-mono ${bad ? 'border-destructive' : ''}`} inputMode="decimal" aria-label={label}
        placeholder="Required" value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (e.target.value.trim() === '') { setBad(false); onChange(null); return; }
          const c = dollarsToCents(e.target.value); setBad(c === null); onChange(c === null ? NaN : c);
        }} />
    </div>
  );
};

export const AdminQuotingPos: React.FC = () => {
  const { toast } = useToast();
  const catalog = useMemo(() => catalogFromRepProducts(), []);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState<'all' | CatalogItem['group']>('all');
  const [draft, setDraft] = useState<QuoteDraft>(emptyDraft);
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(emptyDraft()));
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<QuoteRow[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const printFrame = useRef<HTMLIFrameElement | null>(null);

  const dirty = JSON.stringify(draft) !== savedJson;
  const totals = useMemo(() => computeQuote(draft.lines, draft.quoteDiscount, draft.quoteDiscountCadence), [draft]);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const loadHistory = useCallback(async (q = historySearch) => {
    setHistoryLoading(true);
    try { const d = await call('list', { search: q }); setHistory(d.quotes || []); }
    catch (e) { toast({ title: 'Could not load saved quotes', description: (e as Error).message, variant: 'destructive' }); }
    finally { setHistoryLoading(false); }
  }, [historySearch, toast]);
  useEffect(() => { loadHistory(''); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return catalog.filter((c) => (group === 'all' || c.group === group) &&
      (!s || c.name.toLowerCase().includes(s) || c.description.toLowerCase().includes(s)));
  }, [catalog, search, group]);

  const update = (patch: Partial<QuoteDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const updateLine = (id: string, patch: Partial<QuoteLineInput>) =>
    setDraft((d) => ({ ...d, lines: d.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));

  const addCatalog = (c: CatalogItem) => {
    setDraft((d) => {
      const existing = d.lines.find((l) => l.catalogName === c.name);
      if (existing && Number.isInteger(existing.quantity) && existing.quantity < 1000) {
        return { ...d, lines: d.lines.map((l) => (l.id === existing.id ? { ...l, quantity: l.quantity + 1 } : l)) };
      }
      return {
        ...d, lines: [...d.lines, {
          id: uid(), catalogName: c.name, name: c.name, cadence: c.cadence, quantity: 1,
          listPriceCents: c.priceCents, unitPriceCents: c.priceCents, discount: { type: 'none', value: 0 },
          scope: c.description,
        }],
      };
    });
  };
  const addCustom = () => setDraft((d) => ({
    ...d, lines: [...d.lines, {
      id: uid(), catalogName: null, name: '', cadence: 'one_time', quantity: 1, listPriceCents: null,
      unitPriceCents: null, discount: { type: 'none', value: 0 }, scope: '',
    }],
  }));
  const clearCart = () => {
    if (!draft.lines.length) return;
    if (window.confirm(`Remove all ${draft.lines.length} line items from this quote? Client details and SOW text stay.`)) {
      update({ lines: [], quoteDiscount: { type: 'none', value: 0 } });
    }
  };
  const confirmDiscard = () => !dirty || window.confirm('You have unsaved changes. Discard them?');

  const newQuote = () => { if (!confirmDiscard()) return; const e = emptyDraft(); setDraft(e); setSavedJson(JSON.stringify(e)); };

  const save = async (status: 'draft' | 'issued') => {
    setSaving(true);
    try {
      const body = { ...draft, status, catalogSnapshot: snapshotFor(draft.lines, catalog) };
      const d = await call('save', { quote: body });
      const nd = rowToDraft(d.quote);
      setDraft(nd); setSavedJson(JSON.stringify(nd));
      toast({ title: status === 'issued' ? 'SOW issued and saved' : 'Draft saved', description: `Quote ${nd.quoteNumber}` });
      loadHistory();
    } catch (e) {
      toast({ title: 'Save failed', description: (e as Error).message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const open = async (id: string) => {
    if (!confirmDiscard()) return;
    try { const d = await call('get', { id }); const nd = rowToDraft(d.quote); setDraft(nd); setSavedJson(JSON.stringify(nd)); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    catch (e) { toast({ title: 'Could not open quote', description: (e as Error).message, variant: 'destructive' }); }
  };
  const duplicate = async (id: string) => {
    if (!confirmDiscard()) return;
    try {
      const g = await call('get', { id });
      const src = rowToDraft(g.quote);
      const d = await call('duplicate', { quote: { ...src, catalogSnapshot: g.quote.catalog_snapshot } });
      const nd = rowToDraft(d.quote); setDraft(nd); setSavedJson(JSON.stringify(nd));
      toast({ title: 'Duplicated as new draft', description: `Quote ${nd.quoteNumber}` });
      loadHistory();
    } catch (e) { toast({ title: 'Duplicate failed', description: (e as Error).message, variant: 'destructive' }); }
  };

  const pdfBlobUrl = () => {
    const doc = buildQuotePdf(draft);
    return URL.createObjectURL(doc.output('blob'));
  };
  const download = () => {
    try { const doc = buildQuotePdf(draft); doc.save(quotePdfFilename(draft)); }
    catch (e) { toast({ title: 'PDF export failed', description: (e as Error).message, variant: 'destructive' }); }
  };
  const preview = () => {
    try { setPreviewUrl(pdfBlobUrl()); }
    catch (e) { toast({ title: 'Preview failed', description: (e as Error).message, variant: 'destructive' }); }
  };
  const print = () => {
    try {
      const url = pdfBlobUrl();
      const f = printFrame.current; if (!f) return;
      f.onload = () => { try { f.contentWindow?.focus(); f.contentWindow?.print(); } catch { window.open(url, '_blank'); } };
      f.src = url;
    } catch (e) { toast({ title: 'Print failed', description: (e as Error).message, variant: 'destructive' }); }
  };

  const field = (label: string, value: string, onChange: (v: string) => void, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="space-y-1">
      <Label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} {...props} />
    </div>
  );
  const area = (label: string, key: keyof QuoteDraft['sow'], rows = 3) => (
    <div className="space-y-1">
      <Label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Textarea rows={rows} value={draft.sow[key]} onChange={(e) => update({ sow: { ...draft.sow, [key]: e.target.value } })} />
    </div>
  );

  return (
    <Card className="border-amber/40">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 font-display">
          <ShoppingCart className="w-5 h-5 text-amber" /> Quoting POS · Quote &amp; SOW builder
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-mono text-[10px] uppercase border-amber/40 text-amber">
            {draft.id ? `${draft.quoteNumber} · ${draft.status}` : 'New quote'}
          </Badge>
          {dirty && <Badge variant="outline" className="font-mono text-[10px] uppercase">Unsaved changes</Badge>}
          <Button size="sm" variant="outline" onClick={newQuote}><FilePlus2 className="w-4 h-4 mr-1" />New</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-xs text-muted-foreground">
          Prices come from the commissions catalog below. Overrides change only this quote. Creates quotes and SOW documents only: no emails, charges or commission entries.
        </p>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          {/* Catalog */}
          <section className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-8" placeholder="Search services" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search catalog" />
              </div>
              <Select value={group} onValueChange={(v) => setGroup(v as any)}>
                <SelectTrigger className="w-[140px]" aria-label="Filter catalog"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ({catalog.length})</SelectItem>
                  <SelectItem value="Engagement">Engagements</SelectItem>
                  <SelectItem value="Tool Shop">Tool Shop</SelectItem>
                  <SelectItem value="Legacy">Legacy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="max-h-[560px] overflow-y-auto space-y-2 pr-1">
              {filtered.map((c) => (
                <button key={c.key} type="button" onClick={() => addCatalog(c)}
                  className="w-full text-left rounded-lg border border-border/60 bg-card/40 p-3 hover:border-amber/60 hover:bg-amber/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">{c.name}</span>
                    <span className="font-mono text-sm text-amber whitespace-nowrap">
                      {c.priceCents === null ? 'Price required' : `${usd(c.priceCents)}${CADENCE_SUFFIX[c.cadence]}`}
                    </span>
                  </div>
                  {c.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</p>}
                  <div className="mt-1.5 flex gap-1.5">
                    <Badge variant="outline" className="text-[9px] font-mono uppercase">{c.group}</Badge>
                    <Badge variant="outline" className="text-[9px] font-mono uppercase">{CADENCE_LABEL[c.cadence]}</Badge>
                  </div>
                </button>
              ))}
              {!filtered.length && <p className="text-sm text-muted-foreground py-6 text-center">No services match.</p>}
            </div>
            <Button variant="outline" className="w-full" onClick={addCustom}><Plus className="w-4 h-4 mr-1" />Add custom service line</Button>
          </section>

          {/* Cart */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Cart · {draft.lines.length} line{draft.lines.length === 1 ? '' : 's'}</h3>
              <Button size="sm" variant="ghost" onClick={clearCart} disabled={!draft.lines.length}><X className="w-4 h-4 mr-1" />Clear cart</Button>
            </div>
            {!draft.lines.length && (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Click a service to add it.</div>
            )}
            {draft.lines.map((l, i) => {
              const r = totals.lines[i];
              return (
                <div key={l.id} className="rounded-lg border border-border/60 bg-card/30 p-3 space-y-3">
                  <div className="flex gap-2 items-start">
                    <Input value={l.name} placeholder="Service name" aria-label="Service name" className="font-semibold"
                      onChange={(e) => updateLine(l.id, { name: e.target.value })} />
                    <Button size="icon" variant="ghost" aria-label={`Remove ${l.name || 'line'}`} onClick={() => setDraft((d) => ({ ...d, lines: d.lines.filter((x) => x.id !== l.id) }))}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-3 items-end">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-mono uppercase text-muted-foreground">Qty</Label>
                      <Input type="number" min={1} max={1000} step={1} className="h-9 w-20" aria-label="Quantity"
                        value={Number.isFinite(l.quantity) ? l.quantity : ''}
                        onChange={(e) => updateLine(l.id, { quantity: e.target.value === '' ? NaN : Number(e.target.value) })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-mono uppercase text-muted-foreground">Unit price</Label>
                      <PriceInput cents={l.unitPriceCents} label="Unit price" onChange={(c) => updateLine(l.id, { unitPriceCents: c })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-mono uppercase text-muted-foreground">Cadence</Label>
                      <Select value={l.cadence} disabled={!!l.catalogName} onValueChange={(v) => updateLine(l.id, { cadence: v as QuoteCadence })}>
                        <SelectTrigger className="h-9 w-[120px]" aria-label="Cadence"><SelectValue /></SelectTrigger>
                        <SelectContent>{CADENCES.map((c) => <SelectItem key={c} value={c}>{CADENCE_LABEL[c]}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-mono uppercase text-muted-foreground">Line discount</Label>
                      <DiscountEditor label="Line discount" value={l.discount} onChange={(d) => updateLine(l.id, { discount: d })} />
                    </div>
                  </div>
                  <div className="text-xs font-mono flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                    {l.listPriceCents !== null && <span>List {usd(l.listPriceCents)}{CADENCE_SUFFIX[l.cadence]}</span>}
                    {r.overrideDeltaCents !== 0 && <span className="text-amber">Override {r.overrideDeltaCents > 0 ? '+' : '-'}{usd(Math.abs(r.overrideDeltaCents))}</span>}
                    {r.discountCents > 0 && <span>Discount -{usd(r.discountCents)}</span>}
                    <span className="text-foreground">Line total {usd(r.netCents)}{CADENCE_SUFFIX[l.cadence]}</span>
                  </div>
                  {r.errors.length > 0 && <ul className="text-xs text-destructive space-y-0.5">{r.errors.map((e) => <li key={e}>{e}</li>)}</ul>}
                  <div className="space-y-1">
                    <Label className="text-[10px] font-mono uppercase text-muted-foreground">Included scope / deliverables</Label>
                    <Textarea rows={3} value={l.scope} onChange={(e) => updateLine(l.id, { scope: e.target.value })} />
                  </div>
                </div>
              );
            })}

            {/* Totals */}
            <div className="rounded-lg border border-amber/40 bg-amber/5 p-4 space-y-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-mono uppercase text-muted-foreground">Quote discount</Label>
                  <DiscountEditor label="Quote discount" value={draft.quoteDiscount} onChange={(d) => update({ quoteDiscount: d })} />
                </div>
                {draft.quoteDiscount.type !== 'none' && (
                  <div className="space-y-1">
                    <Label className="text-[10px] font-mono uppercase text-muted-foreground">Applies to</Label>
                    <Select value={draft.quoteDiscountCadence} onValueChange={(v) => update({ quoteDiscountCadence: v as QuoteCadence })}>
                      <SelectTrigger className="h-9 w-[150px]" aria-label="Quote discount applies to"><SelectValue /></SelectTrigger>
                      <SelectContent>{CADENCES.map((c) => <SelectItem key={c} value={c}>{CADENCE_LABEL[c]} items</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">Order: line price x qty, then line discount, then the quote discount on the chosen cadence subtotal. Totals never go below $0.</p>
              {CADENCES.filter((c) => totals.groups[c].lineCount).map((c) => {
                const g = totals.groups[c];
                return (
                  <div key={c} className="text-sm space-y-1 border-t border-border/40 pt-2">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-amber">{CADENCE_LABEL[c]}</div>
                    <div className="flex justify-between text-muted-foreground"><span>List price</span><span className="font-mono">{usd(g.listCents)}</span></div>
                    {g.lineDiscountCents > 0 && <div className="flex justify-between text-muted-foreground"><span>Line discounts</span><span className="font-mono">-{usd(g.lineDiscountCents)}</span></div>}
                    <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="font-mono">{usd(g.subtotalCents)}</span></div>
                    {g.quoteDiscountCents > 0 && <div className="flex justify-between text-muted-foreground"><span>Quote discount</span><span className="font-mono">-{usd(g.quoteDiscountCents)}</span></div>}
                    <div className="flex justify-between font-bold"><span>Total {CADENCE_LABEL[c].toLowerCase()}</span><span className="font-mono text-amber">{usd(g.totalCents)}{CADENCE_SUFFIX[c]}</span></div>
                  </div>
                );
              })}
              {totals.errors.filter((e) => !totals.lines.some((l) => l.errors.includes(e))).map((e) => (
                <p key={e} className="text-xs text-destructive">{e}</p>
              ))}
            </div>
          </section>
        </div>

        {/* Client + dates */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Client</h3>
            {field('Legal / company name', draft.client.company, (v) => update({ client: { ...draft.client, company: v } }))}
            {field('Contact name', draft.client.contact, (v) => update({ client: { ...draft.client, contact: v } }))}
            <div className="grid grid-cols-2 gap-3">
              {field('Email', draft.client.email, (v) => update({ client: { ...draft.client, email: v } }), { type: 'email' })}
              {field('Phone', draft.client.phone, (v) => update({ client: { ...draft.client, phone: v } }), { type: 'tel' })}
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Address</Label>
              <Textarea rows={2} value={draft.client.address} onChange={(e) => update({ client: { ...draft.client, address: e.target.value } })} />
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Quote details · Provider: Aetheris Technology</h3>
            {field('Quote number (auto if blank)', draft.quoteNumber, (v) => update({ quoteNumber: v }), { placeholder: 'Assigned on save' })}
            <div className="grid grid-cols-2 gap-3">
              {field('Quote date', draft.quoteDate, (v) => update({ quoteDate: v }), { type: 'date' })}
              {field('Valid until', draft.validUntil ?? '', (v) => update({ validUntil: v || null }), { type: 'date' })}
              {field('Project start', draft.projectStart ?? '', (v) => update({ projectStart: v || null }), { type: 'date' })}
              {field('Project end', draft.projectEnd ?? '', (v) => update({ projectEnd: v || null }), { type: 'date' })}
            </div>
            {draft.createdAt && (
              <p className="text-[11px] text-muted-foreground font-mono">Created {new Date(draft.createdAt).toLocaleString()} by {draft.createdBy} · Updated {draft.updatedAt ? new Date(draft.updatedAt).toLocaleString() : ''}</p>
            )}
          </div>
        </section>

        {/* SOW */}
        <section className="space-y-3">
          <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Statement of work</h3>
          {field('SOW title', draft.sow.title, (v) => update({ sow: { ...draft.sow, title: v } }))}
          <div className="grid gap-3 md:grid-cols-2">
            {area('Objectives', 'objectives')}
            {area('Exclusions', 'exclusions')}
            {area('Timeline', 'timeline')}
            {area('Responsibilities', 'responsibilities')}
            {area('Payment terms', 'paymentTerms')}
            {area('Assumptions', 'assumptions')}
          </div>
          {area('Notes', 'notes', 2)}
        </section>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 sticky bottom-0 bg-background/95 backdrop-blur py-3 border-t border-border/40 z-10">
          <Button onClick={() => save('draft')} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}Save draft</Button>
          <Button variant="outline" onClick={() => save('issued')} disabled={saving || !totals.valid} title={totals.valid ? '' : 'Fix the highlighted issues first'}>Save as issued SOW</Button>
          <Button variant="outline" onClick={preview} disabled={!draft.lines.length}><Eye className="w-4 h-4 mr-1" />Preview</Button>
          <Button variant="outline" onClick={download} disabled={!draft.lines.length}><FileDown className="w-4 h-4 mr-1" />Download PDF</Button>
          <Button variant="outline" onClick={print} disabled={!draft.lines.length}><Printer className="w-4 h-4 mr-1" />Print</Button>
        </div>
        <iframe ref={printFrame} title="Print quote" className="hidden" />

        {/* History */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Saved quotes</h3>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); loadHistory(historySearch); }}>
              <Input className="h-9 w-56" placeholder="Search number, client, email" value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} aria-label="Search saved quotes" />
              <Button size="sm" type="submit" variant="outline">{historyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}</Button>
            </form>
          </div>
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="flex flex-wrap items-center gap-3 justify-between rounded-lg border border-border/50 p-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{h.client_company || h.client_contact || 'Unnamed client'} <span className="font-mono text-xs text-muted-foreground">· {h.quote_number}</span></div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {h.status} · {fmtDate(h.quote_date)} · updated {new Date(h.updated_at).toLocaleDateString()}
                    {CADENCES.filter((c) => h.totals?.groups?.[c]?.lineCount).map((c) => ` · ${usd(h.totals.groups[c].totalCents)}${CADENCE_SUFFIX[c]}`).join('')}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => open(h.id)}><FolderOpen className="w-4 h-4 mr-1" />Open</Button>
                  <Button size="sm" variant="outline" onClick={() => duplicate(h.id)}><Copy className="w-4 h-4 mr-1" />Duplicate</Button>
                </div>
              </div>
            ))}
            {!history.length && !historyLoading && <p className="text-sm text-muted-foreground">No saved quotes yet.</p>}
          </div>
        </section>
      </CardContent>

      <Dialog open={!!previewUrl} onOpenChange={(o) => { if (!o && previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); } }}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle>Quote preview</DialogTitle></DialogHeader>
          {previewUrl && <iframe src={previewUrl} title="Quote PDF preview" className="flex-1 w-full rounded border" />}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
