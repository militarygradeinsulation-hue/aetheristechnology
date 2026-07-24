// Public quote viewer — customers open a quote by its access_token and can accept/decline.
// Uses service role so RLS on rep_crm_quotes/leads/activity stays fully locked to server-side.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

function fail(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}
function ok(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
}

// Whitelist the small set of public-safe columns — never expose internal notes,
// rep info, or metadata that isn't meant for the customer.
const PUBLIC_COLS =
  'id, quote_number, status, currency, subtotal_cents, discount_cents, total_cents, ' +
  'items, notes, customer_name, customer_email, customer_company, sent_at, viewed_at, accepted_at';

async function loadByToken(token: string) {
  const { data } = await supabase
    .from('rep_crm_quotes')
    .select('*')
    .eq('access_token', token)
    .maybeSingle();
  return data;
}

function publicShape(q: any) {
  if (!q) return null;
  return {
    id: q.id,
    quote_number: q.quote_number,
    status: q.status,
    currency: q.currency,
    subtotal_cents: q.subtotal_cents,
    discount_cents: q.discount_cents,
    total_cents: q.total_cents,
    items: q.items,
    notes: q.notes,
    customer_name: q.customer_name,
    customer_email: q.customer_email,
    customer_company: q.customer_company,
    sent_at: q.sent_at,
    viewed_at: q.viewed_at,
    accepted_at: q.accepted_at,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json();
    const action = body.action as string;
    const token = typeof body.token === 'string' ? body.token : '';
    // Access tokens are opaque server-issued strings; require a plausible length before hitting the DB.
    if (!token || token.length < 16 || token.length > 200) return fail('Invalid token', 400);

    const q = await loadByToken(token);
    if (!q) return fail('Quote not found', 404);

    if (action === 'view') {
      if (!q.viewed_at) {
        await supabase
          .from('rep_crm_quotes')
          .update({ viewed_at: new Date().toISOString(), status: q.status === 'sent' ? 'viewed' : q.status })
          .eq('id', q.id);
        if (q.lead_id) {
          await supabase.from('rep_crm_activity').insert({
            lead_id: q.lead_id, quote_id: q.id, rep_code: q.rep_code,
            kind: 'quote_viewed', title: `Customer opened quote ${q.quote_number}`,
          });
        }
      }
      const fresh = await loadByToken(token);
      return ok({ quote: publicShape(fresh) });
    }

    if (action === 'respond') {
      if (q.status === 'accepted' || q.status === 'declined') {
        return ok({ quote: publicShape(q) });
      }
      const accept = body.accept === true;
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
        if (accept) {
          await supabase.from('rep_crm_leads').update({ stage: 'won' }).eq('id', q.lead_id);
        }
      }
      return ok({ quote: publicShape({ ...q, ...patch }) });
    }

    return fail('Unknown action', 400);
  } catch (e) {
    console.error('quote-view error', e);
    return fail((e as Error).message || 'error', 500);
  }
});
