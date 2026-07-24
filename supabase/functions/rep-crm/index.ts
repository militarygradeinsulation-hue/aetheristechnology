import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const PUBLIC_ORIGIN = 'https://aetheris.technology';

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

async function validateRep(code: string) {
  if (!code) return null;
  const { data } = await supabase
    .from('rep_codes')
    .select('code, rep_name, is_active')
    .eq('code', code)
    .eq('is_active', true)
    .maybeSingle();
  return data;
}

async function importLeads(rep: { code: string; rep_name: string | null }) {
  // Pull rep's leads from rep_leads + rep_code_scan_leads that aren't already in the CRM
  const [{ data: rl }, { data: sl }] = await Promise.all([
    supabase.from('rep_leads').select('*').eq('rep_code', rep.code).limit(200),
    supabase.from('rep_code_scan_leads').select('*').eq('rep_code', rep.code).limit(200),
  ]);

  const rows: any[] = [];
  for (const l of rl || []) {
    if (!l) continue;
    const email = (l.email || l.contact_email || '').toLowerCase();
    rows.push({
      rep_code: rep.code,
      owner_name: rep.rep_name,
      company: l.company_name || l.company || null,
      contact_name: l.contact_name || l.name || null,
      contact_email: email || null,
      contact_phone: l.phone || null,
      website: l.website || l.url || null,
      stage: 'new',
      source: 'rep_leads',
      source_id: String(l.id),
      metadata: { imported_from: 'rep_leads' },
    });
  }
  for (const l of sl || []) {
    if (!l) continue;
    const email = (l.email || '').toLowerCase();
    rows.push({
      rep_code: rep.code,
      owner_name: rep.rep_name,
      company: l.company_name || null,
      contact_name: l.contact_name || null,
      contact_email: email || null,
      contact_phone: l.phone || null,
      website: l.website || null,
      stage: 'new',
      source: 'scan',
      source_id: String(l.id),
      metadata: { imported_from: 'rep_code_scan_leads' },
    });
  }

  if (rows.length === 0) return { inserted: 0 };

  // Skip rows already imported (dedupe on source+source_id)
  const keys = rows.map((r) => `${r.source}:${r.source_id}`);
  const { data: existing } = await supabase
    .from('rep_crm_leads')
    .select('source, source_id')
    .eq('rep_code', rep.code)
    .in('source', ['rep_leads', 'scan']);
  const existingKeys = new Set((existing || []).map((r: any) => `${r.source}:${r.source_id}`));
  const fresh = rows.filter((_, i) => !existingKeys.has(keys[i]));

  if (fresh.length === 0) return { inserted: 0 };

  const { data: inserted, error } = await supabase.from('rep_crm_leads').insert(fresh).select('id');
  if (error) throw error;

  // Log activity for each import
  if (inserted && inserted.length) {
    await supabase.from('rep_crm_activity').insert(
      inserted.map((r: any) => ({
        lead_id: r.id,
        rep_code: rep.code,
        kind: 'import',
        title: 'Imported from existing pipeline',
      })),
    );
  }

  return { inserted: fresh.length };
}

function nextQuoteNumber() {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `AE-${stamp}-${rand}`;
}

function money(cents: number, currency = 'usd') {
  const dollars = (cents || 0) / 100;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(dollars);
}

async function createQuote(rep: any, payload: any) {
  const { lead_id, customer_name, customer_email, customer_company, items, discount_cents, notes, currency } = payload || {};
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('At least one line item is required');
  }
  const cleanItems = items.map((it: any) => ({
    stripe_price_id: it.stripe_price_id || null,
    name: String(it.name || 'Item').slice(0, 200),
    price_cents: Math.max(0, Number(it.price_cents) || 0),
    qty: Math.max(1, Number(it.qty) || 1),
    interval: it.interval || null,
  }));
  const subtotal = cleanItems.reduce((s, it) => s + it.price_cents * it.qty, 0);
  const discount = Math.max(0, Math.min(subtotal, Number(discount_cents) || 0));
  const total = subtotal - discount;
  const quote_number = nextQuoteNumber();

  const { data: quote, error } = await supabase
    .from('rep_crm_quotes')
    .insert({
      lead_id: lead_id || null,
      rep_code: rep.code,
      rep_name: rep.rep_name,
      quote_number,
      customer_name: customer_name || null,
      customer_email: (customer_email || '').toLowerCase() || null,
      customer_company: customer_company || null,
      status: 'draft',
      currency: (currency || 'usd').toLowerCase(),
      subtotal_cents: subtotal,
      discount_cents: discount,
      total_cents: total,
      items: cleanItems,
      notes: notes || null,
    })
    .select('*')
    .single();
  if (error) throw error;

  if (lead_id) {
    await supabase.from('rep_crm_activity').insert({
      lead_id,
      quote_id: quote.id,
      rep_code: rep.code,
      kind: 'note',
      title: `Quote created: ${quote_number}`,
      body: `${cleanItems.length} item(s) — ${money(total, quote.currency)}`,
    });
    // bump stage to quoted, keep value in sync
    await supabase
      .from('rep_crm_leads')
      .update({ stage: 'quoted', value_cents: total })
      .eq('id', lead_id);
  }

  return { quote };
}

async function sendQuote(rep: any, payload: { quote_id: string }) {
  const { data: q, error } = await supabase.from('rep_crm_quotes').select('*').eq('id', payload.quote_id).single();
  if (error || !q) throw new Error('Quote not found');
  if (!q.customer_email) throw new Error('Quote has no customer email');

  const viewUrl = `${PUBLIC_ORIGIN}/q/${q.access_token}`;

  await supabase.functions.invoke('send-transactional-email', {
    body: {
      templateName: 'rep-quote',
      recipientEmail: q.customer_email,
      idempotencyKey: `quote-send-${q.id}`,
      templateData: {
        customer_name: q.customer_name || 'there',
        rep_name: q.rep_name || 'the Aetheris team',
        quote_number: q.quote_number,
        items: q.items,
        subtotal_display: money(q.subtotal_cents, q.currency),
        discount_display: q.discount_cents > 0 ? money(q.discount_cents, q.currency) : null,
        total_display: money(q.total_cents, q.currency),
        notes: q.notes || null,
        view_url: viewUrl,
      },
    },
  });

  await supabase
    .from('rep_crm_quotes')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', q.id);

  if (q.lead_id) {
    await supabase.from('rep_crm_activity').insert({
      lead_id: q.lead_id,
      quote_id: q.id,
      rep_code: rep.code,
      kind: 'quote_sent',
      title: `Quote emailed to ${q.customer_email}`,
      body: `View: ${viewUrl}`,
    });
  }

  return { view_url: viewUrl, sent: true };
}

async function getLeadActivity(leadId: string) {
  const [{ data: crmActs }, { data: lead }] = await Promise.all([
    supabase.from('rep_crm_activity').select('*').eq('lead_id', leadId).order('occurred_at', { ascending: false }).limit(200),
    supabase.from('rep_crm_leads').select('contact_email, rep_code').eq('id', leadId).single(),
  ]);
  const merged: any[] = [...(crmActs || [])];
  const email = (lead as any)?.contact_email;
  if (email) {
    const { data: emails } = await supabase
      .from('rep_email_messages')
      .select('id, subject, direction, created_at, snippet:body_text')
      .or(`from_address.ilike.%${email}%,to_addresses.cs.{${email}}`)
      .limit(20);
    for (const e of emails || []) {
      merged.push({
        id: `email-${e.id}`,
        kind: 'email',
        title: `${e.direction === 'outbound' ? 'Sent' : 'Received'}: ${e.subject || '(no subject)'}`,
        body: (e as any).snippet ? String((e as any).snippet).slice(0, 200) : null,
        occurred_at: e.created_at,
      });
    }
  }
  merged.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
  return merged;
}

const LEAD_FIELDS = new Set([
  'company', 'contact_name', 'contact_email', 'contact_phone',
  'website', 'stage', 'source', 'value_cents', 'next_action', 'notes',
]);

function sanitizeLeadPatch(input: any): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!input || typeof input !== 'object') return out;
  for (const k of Object.keys(input)) {
    if (LEAD_FIELDS.has(k)) out[k] = input[k];
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json();
    const action = body.action as string;
    const code = body.rep_code as string;

    const rep = await validateRep(code);
    if (!rep) return fail('Invalid rep code', 401);

    if (action === 'list') {
      const [{ data: leads }, { data: quotes }] = await Promise.all([
        supabase.from('rep_crm_leads').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('rep_crm_quotes').select('*').order('created_at', { ascending: false }).limit(200),
      ]);
      return ok({ leads: leads || [], quotes: quotes || [] });
    }
    if (action === 'update_lead') {
      const patch = sanitizeLeadPatch(body.fields);
      if (!body.lead_id) return fail('lead_id required');
      const { error } = await supabase.from('rep_crm_leads').update(patch).eq('id', body.lead_id);
      if (error) throw error;
      return ok({ ok: true });
    }
    if (action === 'delete_lead') {
      if (!body.lead_id) return fail('lead_id required');
      const { error } = await supabase.from('rep_crm_leads').delete().eq('id', body.lead_id);
      if (error) throw error;
      return ok({ ok: true });
    }
    if (action === 'new_lead') {
      const patch = sanitizeLeadPatch(body.fields);
      const { data, error } = await supabase
        .from('rep_crm_leads')
        .insert({ ...patch, rep_code: rep.code, owner_name: rep.rep_name, stage: 'new', source: 'manual' })
        .select('*')
        .single();
      if (error) throw error;
      return ok({ lead: data });
    }
    if (action === 'import_leads') {
      const res = await importLeads(rep as any);
      return ok(res);
    }
    if (action === 'create_quote') {
      const res = await createQuote(rep as any, body);
      return ok(res);
    }
    if (action === 'send_quote') {
      const res = await sendQuote(rep as any, body);
      return ok(res);
    }
    if (action === 'lead_activity') {
      const res = await getLeadActivity(body.lead_id);
      return ok({ activity: res });
    }
    if (action === 'log_activity') {
      const { lead_id, kind, title, body: text } = body;
      const { data, error } = await supabase
        .from('rep_crm_activity')
        .insert({ lead_id, rep_code: code, kind: kind || 'note', title, body: text })
        .select('*')
        .single();
      if (error) throw error;
      return ok({ activity: data });
    }
    return fail('Unknown action');
  } catch (e) {
    console.error('rep-crm error', e);
    return fail((e as Error).message || 'error', 500);
  }
});

