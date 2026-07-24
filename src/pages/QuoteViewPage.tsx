import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const money = (cents: number, currency = 'usd') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format((cents || 0) / 100);

export default function QuoteViewPage() {
  const { token } = useParams<{ token: string }>();
  const [q, setQ] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data } = await supabase.from('rep_crm_quotes').select('*').eq('access_token', token).maybeSingle();
      setQ(data);
      setLoading(false);
      if (data && !data.viewed_at) {
        await supabase.from('rep_crm_quotes').update({ viewed_at: new Date().toISOString(), status: data.status === 'sent' ? 'viewed' : data.status }).eq('id', data.id);
        if (data.lead_id) {
          await supabase.from('rep_crm_activity').insert({
            lead_id: data.lead_id, quote_id: data.id, rep_code: data.rep_code,
            kind: 'quote_viewed', title: `Customer opened quote ${data.quote_number}`,
          });
        }
      }
    })();
  }, [token]);

  const respond = async (accept: boolean) => {
    setActing(true);
    const patch = accept
      ? { status: 'accepted', accepted_at: new Date().toISOString() }
      : { status: 'declined' };
    await supabase.from('rep_crm_quotes').update(patch).eq('id', q.id);
    if (q.lead_id) {
      await supabase.from('rep_crm_activity').insert({
        lead_id: q.lead_id, quote_id: q.id, rep_code: q.rep_code,
        kind: accept ? 'quote_accepted' : 'note',
        title: accept ? `Customer ACCEPTED quote ${q.quote_number}` : `Customer declined quote ${q.quote_number}`,
      });
      if (accept) await supabase.from('rep_crm_leads').update({ stage: 'won' }).eq('id', q.lead_id);
    }
    toast.success(accept ? 'Quote accepted — the team will reach out.' : 'Response recorded.');
    setQ({ ...q, ...patch });
    setActing(false);
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!q) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Quote not found.</div>;

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber mb-2">AETHERIS TECHNOLOGY — QUOTE</div>
        <h1 className="text-3xl font-forensic font-bold mb-1">Quote {q.quote_number}</h1>
        <div className="text-sm text-muted-foreground mb-6">
          For {q.customer_name || q.customer_email} {q.customer_company ? `· ${q.customer_company}` : ''}
        </div>

        <div className="glass border border-amber/30 rounded-lg p-5 mb-4">
          {(q.items || []).map((it: any, i: number) => (
            <div key={i} className="flex justify-between py-2 border-b border-border/40 last:border-0">
              <div>
                <div className="text-sm font-medium">{it.name}</div>
                {it.qty > 1 && <div className="text-xs text-muted-foreground">Qty {it.qty}</div>}
              </div>
              <div className="text-sm font-mono">
                {money(it.price_cents * it.qty, q.currency)}
                {it.interval ? <span className="text-xs text-muted-foreground"> /{it.interval}</span> : null}
              </div>
            </div>
          ))}
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-sm text-muted-foreground"><span>Subtotal</span><span className="font-mono">{money(q.subtotal_cents, q.currency)}</span></div>
            {q.discount_cents > 0 && <div className="flex justify-between text-sm text-muted-foreground"><span>Discount</span><span className="font-mono">− {money(q.discount_cents, q.currency)}</span></div>}
            <div className="flex justify-between text-xl font-bold pt-2 border-t border-border/40 mt-2">
              <span>Total</span>
              <span className="font-mono text-amber">{money(q.total_cents, q.currency)}</span>
            </div>
          </div>
        </div>

        {q.notes && (
          <div className="glass border-l-4 border-amber rounded p-4 mb-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Notes</div>
            <div className="text-sm whitespace-pre-wrap">{q.notes}</div>
          </div>
        )}

        {q.status === 'accepted' ? (
          <div className="bg-green-500/10 border border-green-500/40 rounded p-4 text-center">
            <div className="text-green-400 font-semibold">Quote accepted</div>
            <div className="text-xs text-muted-foreground mt-1">We'll be in touch shortly to finalize.</div>
          </div>
        ) : q.status === 'declined' ? (
          <div className="bg-muted/20 border border-border rounded p-4 text-center text-sm text-muted-foreground">
            You've declined this quote.
          </div>
        ) : (
          <div className="flex gap-3">
            <Button className="flex-1" onClick={() => respond(true)} disabled={acting}>Accept Quote</Button>
            <Button variant="outline" className="flex-1" onClick={() => respond(false)} disabled={acting}>Decline</Button>
          </div>
        )}
      </div>
    </div>
  );
}
