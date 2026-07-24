import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Download, Plus, Send, RefreshCw, Trash2, ExternalLink, FileText, X } from 'lucide-react';

const STAGES = ['new', 'contacted', 'quoted', 'won', 'lost'] as const;
type Stage = typeof STAGES[number];

interface Lead {
  id: string;
  rep_code: string;
  company: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  stage: Stage;
  source: string | null;
  value_cents: number | null;
  next_action: string | null;
  notes: string | null;
  created_at: string;
}

interface CatalogItem {
  stripe_price_id: string;
  name: string;
  currency: string;
  unit_amount: number;
  recurring_interval: string | null;
  description: string | null;
}

interface Quote {
  id: string;
  quote_number: string;
  status: string;
  customer_name: string | null;
  customer_email: string | null;
  total_cents: number;
  currency: string;
  access_token: string;
  sent_at: string | null;
  created_at: string;
  lead_id: string | null;
  items: any[];
}

const money = (cents: number, currency = 'usd') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format((cents || 0) / 100);

export default function RepCRMPanel({ repCode }: { repCode: string }) {
  const [tab, setTab] = useState<'pipeline' | 'quotes' | 'catalog'>('pipeline');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [quoteBuilderFor, setQuoteBuilderFor] = useState<Lead | null>(null);

  const load = async () => {
    setLoading(true);
    const [listRes, catRes] = await Promise.all([
      supabase.functions.invoke('rep-crm', { body: { action: 'list', rep_code: repCode } }),
      supabase.functions.invoke('stripe-catalog'),
    ]);
    if (!listRes.error && listRes.data) {
      setLeads((listRes.data.leads as Lead[]) || []);
      setQuotes((listRes.data.quotes as Quote[]) || []);
    }
    if (!catRes.error && catRes.data?.catalog) setCatalog(catRes.data.catalog);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // Poll for shared-team updates every 30s (RLS is server-side only, no realtime).
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const importFromExisting = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('rep-crm', {
      body: { action: 'import_leads', rep_code: repCode },
    });
    setLoading(false);
    if (error) return toast.error('Import failed');
    toast.success(`Imported ${data?.inserted ?? 0} leads`);
    load();
  };

  const updateLeadStage = async (lead: Lead, stage: Stage) => {
    const { error } = await supabase.functions.invoke('rep-crm', {
      body: { action: 'update_lead', rep_code: repCode, lead_id: lead.id, fields: { stage } },
    });
    if (error) toast.error('Could not update stage');
    else { toast.success(`Moved to ${stage}`); load(); }
  };

  const deleteLead = async (lead: Lead) => {
    if (!confirm(`Delete ${lead.company || lead.contact_name || 'this lead'}?`)) return;
    const { error } = await supabase.functions.invoke('rep-crm', {
      body: { action: 'delete_lead', rep_code: repCode, lead_id: lead.id },
    });
    if (error) toast.error('Delete failed');
    else { toast.success('Deleted'); load(); }
  };


  const grouped = useMemo(() => {
    const g: Record<Stage, Lead[]> = { new: [], contacted: [], quoted: [], won: [], lost: [] };
    for (const l of leads) g[l.stage]?.push(l);
    return g;
  }, [leads]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-1 bg-black/40 border border-amber-400/20 rounded-md p-1">
          {(['pipeline', 'quotes', 'catalog'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-[11px] font-mono uppercase tracking-widest rounded ${
                tab === t ? 'bg-amber-400/20 text-amber-200' : 'text-muted-foreground hover:text-amber-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={importFromExisting} disabled={loading}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Import leads
          </Button>
          <Button size="sm" onClick={() => setNewLeadOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New lead
          </Button>
        </div>
      </div>

      {tab === 'pipeline' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {STAGES.map((stage) => (
            <div key={stage} className="bg-black/30 border border-amber-400/15 rounded-md p-2 min-h-[200px]">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="font-mono text-[10px] uppercase tracking-widest text-amber-300">{stage}</span>
                <span className="text-[10px] text-muted-foreground">{grouped[stage].length}</span>
              </div>
              <div className="space-y-2">
                {grouped[stage].map((l) => (
                  <div
                    key={l.id}
                    className="bg-black/60 border border-amber-400/10 hover:border-amber-400/40 rounded p-2 cursor-pointer transition-colors"
                    onClick={() => setActiveLead(l)}
                  >
                    <div className="font-semibold text-xs text-amber-100 truncate">{l.company || l.contact_name || '—'}</div>
                    {l.contact_name && l.company && (
                      <div className="text-[10px] text-muted-foreground truncate">{l.contact_name}</div>
                    )}
                    {l.contact_email && (
                      <div className="text-[10px] text-muted-foreground truncate">{l.contact_email}</div>
                    )}
                    {l.value_cents ? (
                      <div className="text-[10px] text-amber-300 mt-1 font-mono">{money(l.value_cents)}</div>
                    ) : null}
                    {l.source && (
                      <Badge variant="outline" className="text-[9px] mt-1 border-amber-400/20 text-muted-foreground">
                        {l.source}
                      </Badge>
                    )}
                  </div>
                ))}
                {grouped[stage].length === 0 && (
                  <div className="text-[10px] text-muted-foreground text-center py-4 opacity-50">empty</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'quotes' && (
        <div className="space-y-2">
          {quotes.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No quotes yet. Open a lead and build one.
            </div>
          )}
          {quotes.map((q) => (
            <div key={q.id} className="bg-black/40 border border-amber-400/15 rounded p-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-amber-200">{q.quote_number}</span>
                  <Badge variant="outline" className="text-[9px] border-amber-400/30">{q.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                  {q.customer_name || q.customer_email || '—'} · {q.items?.length || 0} items
                </div>
              </div>
              <div className="text-sm font-bold text-amber-300 font-mono whitespace-nowrap">{money(q.total_cents, q.currency)}</div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => window.open(`/q/${q.access_token}`, '_blank')}>
                  <ExternalLink className="w-3 h-3" />
                </Button>
                {q.status === 'draft' && q.customer_email && (
                  <Button
                    size="sm"
                    onClick={async () => {
                      const { error } = await supabase.functions.invoke('rep-crm', {
                        body: { action: 'send_quote', rep_code: repCode, quote_id: q.id },
                      });
                      if (error) toast.error('Send failed');
                      else toast.success('Quote emailed');
                    }}
                  >
                    <Send className="w-3 h-3 mr-1" /> Send
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'catalog' && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground mb-2">
            Live product catalog synced from Stripe — this is exactly what customers see on the website.
          </div>
          {catalog.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No products found. Make sure Stripe products are active.
            </div>
          )}
          {catalog.map((p) => (
            <div key={p.stripe_price_id} className="bg-black/40 border border-amber-400/15 rounded p-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm text-amber-100 font-semibold">{p.name}</div>
                {p.description && <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{p.description}</div>}
              </div>
              <div className="text-sm font-bold text-amber-300 font-mono whitespace-nowrap">
                {money(p.unit_amount, p.currency)}{p.recurring_interval ? ` /${p.recurring_interval}` : ''}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lead detail drawer */}
      {activeLead && (
        <LeadDetailDialog
          lead={activeLead}
          repCode={repCode}
          onClose={() => setActiveLead(null)}
          onStageChange={(s) => updateLeadStage(activeLead, s)}
          onDelete={() => { deleteLead(activeLead); setActiveLead(null); }}
          onBuildQuote={() => { setQuoteBuilderFor(activeLead); setActiveLead(null); }}
        />
      )}

      {newLeadOpen && (
        <NewLeadDialog repCode={repCode} onClose={() => setNewLeadOpen(false)} onSaved={() => { setNewLeadOpen(false); }} />
      )}

      {quoteBuilderFor && (
        <QuoteBuilderDialog
          lead={quoteBuilderFor}
          repCode={repCode}
          catalog={catalog}
          onClose={() => setQuoteBuilderFor(null)}
        />
      )}
    </div>
  );
}

function LeadDetailDialog({
  lead, repCode, onClose, onStageChange, onDelete, onBuildQuote,
}: {
  lead: Lead; repCode: string; onClose: () => void; onStageChange: (s: Stage) => void; onDelete: () => void; onBuildQuote: () => void;
}) {
  const [activity, setActivity] = useState<any[]>([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState({
    company: lead.company || '',
    contact_name: lead.contact_name || '',
    contact_email: lead.contact_email || '',
    contact_phone: lead.contact_phone || '',
    website: lead.website || '',
    next_action: lead.next_action || '',
    notes: lead.notes || '',
  });

  useEffect(() => {
    supabase.functions.invoke('rep-crm', { body: { action: 'lead_activity', rep_code: repCode, lead_id: lead.id } })
      .then(({ data }) => setActivity(data?.activity || []));
  }, [lead.id, repCode]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.functions.invoke('rep-crm', {
      body: { action: 'update_lead', rep_code: repCode, lead_id: lead.id, fields },
    });
    setSaving(false);
    if (error) toast.error('Save failed');
    else toast.success('Saved');
  };


  const addNote = async () => {
    if (!note.trim()) return;
    await supabase.functions.invoke('rep-crm', {
      body: { action: 'log_activity', rep_code: repCode, lead_id: lead.id, kind: 'note', title: note.slice(0, 80), body: note },
    });
    setNote('');
    const { data } = await supabase.functions.invoke('rep-crm', {
      body: { action: 'lead_activity', rep_code: repCode, lead_id: lead.id },
    });
    setActivity(data?.activity || []);
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {fields.company || fields.contact_name || 'Lead'}
            <Badge variant="outline">{lead.stage}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Input placeholder="Company" value={fields.company} onChange={(e) => setFields({ ...fields, company: e.target.value })} />
            <Input placeholder="Contact name" value={fields.contact_name} onChange={(e) => setFields({ ...fields, contact_name: e.target.value })} />
            <Input placeholder="Email" value={fields.contact_email} onChange={(e) => setFields({ ...fields, contact_email: e.target.value })} />
            <Input placeholder="Phone" value={fields.contact_phone} onChange={(e) => setFields({ ...fields, contact_phone: e.target.value })} />
            <Input placeholder="Website" value={fields.website} onChange={(e) => setFields({ ...fields, website: e.target.value })} />
            <Input placeholder="Next action" value={fields.next_action} onChange={(e) => setFields({ ...fields, next_action: e.target.value })} />
            <Textarea rows={3} placeholder="Notes" value={fields.notes} onChange={(e) => setFields({ ...fields, notes: e.target.value })} />
            <div className="flex gap-2">
              <Select value={lead.stage} onValueChange={(v) => onStageChange(v as Stage)}>
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={save} disabled={saving}>Save</Button>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={onBuildQuote} className="flex-1"><FileText className="w-4 h-4 mr-2" /> Build quote</Button>
              <Button variant="destructive" size="icon" onClick={onDelete}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-amber-400 mb-2">Activity</div>
            <div className="flex gap-2 mb-3">
              <Input placeholder="Add note or log a call…" value={note} onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNote()} />
              <Button size="sm" onClick={addNote}>Log</Button>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {activity.length === 0 && <div className="text-xs text-muted-foreground">No activity yet.</div>}
              {activity.map((a) => (
                <div key={a.id} className="bg-black/40 border border-amber-400/10 rounded p-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[9px] uppercase text-amber-400">{a.kind}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(a.occurred_at).toLocaleString()}</span>
                  </div>
                  {a.title && <div className="mt-1 text-amber-100">{a.title}</div>}
                  {a.body && <div className="mt-1 text-muted-foreground whitespace-pre-wrap">{a.body}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewLeadDialog({ repCode, onClose, onSaved }: { repCode: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ company: '', contact_name: '', contact_email: '', contact_phone: '', website: '' });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const { error } = await supabase.functions.invoke('rep-crm', {
      body: { action: 'new_lead', rep_code: repCode, fields: f },
    });
    setSaving(false);
    if (error) toast.error('Save failed');
    else { toast.success('Lead added'); onSaved(); }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>New lead</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Input placeholder="Company" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} />
          <Input placeholder="Contact name" value={f.contact_name} onChange={(e) => setF({ ...f, contact_name: e.target.value })} />
          <Input placeholder="Email" value={f.contact_email} onChange={(e) => setF({ ...f, contact_email: e.target.value })} />
          <Input placeholder="Phone" value={f.contact_phone} onChange={(e) => setF({ ...f, contact_phone: e.target.value })} />
          <Input placeholder="Website" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuoteBuilderDialog({
  lead, repCode, catalog, onClose,
}: { lead: Lead; repCode: string; catalog: CatalogItem[]; onClose: () => void }) {
  const [items, setItems] = useState<Array<{ stripe_price_id: string; name: string; price_cents: number; qty: number; interval: string | null }>>([]);
  const [discountDollars, setDiscountDollars] = useState('0');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [customerEmail, setCustomerEmail] = useState(lead.contact_email || '');

  const addItem = (p: CatalogItem) => {
    setItems((prev) => [...prev, { stripe_price_id: p.stripe_price_id, name: p.name, price_cents: p.unit_amount, qty: 1, interval: p.recurring_interval }]);
  };
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const subtotal = items.reduce((s, it) => s + it.price_cents * it.qty, 0);
  const discount = Math.max(0, Math.round(parseFloat(discountDollars || '0') * 100));
  const total = Math.max(0, subtotal - discount);

  const create = async (thenSend: boolean) => {
    if (items.length === 0) return toast.error('Add at least one item');
    setSaving(true);
    const { data, error } = await supabase.functions.invoke('rep-crm', {
      body: {
        action: 'create_quote', rep_code: repCode, lead_id: lead.id,
        customer_name: lead.contact_name, customer_email: customerEmail, customer_company: lead.company,
        items, discount_cents: discount, notes,
      },
    });
    if (error || !data?.quote) { setSaving(false); return toast.error('Quote failed'); }
    if (thenSend) {
      const r = await supabase.functions.invoke('rep-crm', {
        body: { action: 'send_quote', rep_code: repCode, quote_id: data.quote.id },
      });
      if (r.error) toast.error('Sent draft, email failed');
      else toast.success('Quote sent');
    } else {
      toast.success('Draft saved');
    }
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Build quote for {lead.company || lead.contact_name}</DialogTitle></DialogHeader>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-amber-400 mb-2">Catalog</div>
            <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2">
              {catalog.map((p) => (
                <button key={p.stripe_price_id} onClick={() => addItem(p)}
                  className="w-full text-left bg-black/40 border border-amber-400/15 hover:border-amber-400/50 rounded p-2 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-amber-100 truncate">{p.name}</span>
                    <span className="text-xs font-mono text-amber-300 whitespace-nowrap">{money(p.unit_amount, p.currency)}{p.recurring_interval ? `/${p.recurring_interval}` : ''}</span>
                  </div>
                </button>
              ))}
              {catalog.length === 0 && <div className="text-xs text-muted-foreground">No catalog loaded.</div>}
            </div>
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-amber-400 mb-2">Line items</div>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="bg-black/40 border border-amber-400/15 rounded p-2 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-amber-100 truncate">{it.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{money(it.price_cents)}{it.interval ? `/${it.interval}` : ''}</div>
                  </div>
                  <Input type="number" min={1} value={it.qty} onChange={(e) => {
                    const qty = Math.max(1, parseInt(e.target.value) || 1);
                    setItems((prev) => prev.map((p, idx) => idx === i ? { ...p, qty } : p));
                  }} className="w-16 h-8 text-xs" />
                  <Button size="icon" variant="ghost" onClick={() => removeItem(i)}><X className="w-3 h-3" /></Button>
                </div>
              ))}
              {items.length === 0 && <div className="text-xs text-muted-foreground text-center py-4">Click products on the left to add.</div>}
            </div>
            <div className="mt-4 space-y-2">
              <Input placeholder="Customer email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
              <Input placeholder="Discount ($)" type="number" value={discountDollars} onChange={(e) => setDiscountDollars(e.target.value)} />
              <Textarea rows={2} placeholder="Notes to customer" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="mt-4 border-t border-amber-400/20 pt-3 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">{money(subtotal)}</span></div>
              {discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="font-mono">− {money(discount)}</span></div>}
              <div className="flex justify-between text-base pt-1"><span className="font-bold">Total</span><span className="font-mono font-bold text-amber-300">{money(total)}</span></div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="outline" onClick={() => create(false)} disabled={saving}>Save draft</Button>
          <Button onClick={() => create(true)} disabled={saving || !customerEmail}>
            <Send className="w-4 h-4 mr-2" /> Send to customer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
