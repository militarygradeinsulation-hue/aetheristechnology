import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Pull every email source we have
    const [contacts, assess, diag, subs, prospects] = await Promise.all([
      supabase.from('contact_submissions').select('email, name, company, created_at'),
      supabase.from('assessment_leads').select('email, name, company, created_at'),
      supabase.from('diagnostic_leads').select('email, name, company, created_at'),
      supabase.from('subscriptions').select('user_id, created_at, stripe_customer_id'),
      supabase.from('drip_prospects').select('email, business_name, created_at').neq('status', 'bounced'),
    ]);

    type Row = { email: string; name: string; company: string; source: string; first_seen: string };
    const map = new Map<string, Row>();

    const add = (email: string | null | undefined, name: string | null, company: string | null, source: string, ts: string | null) => {
      if (!email) return;
      const e = email.toLowerCase().trim();
      if (!e.includes('@')) return;
      const existing = map.get(e);
      if (existing) {
        if (!existing.name && name) existing.name = name;
        if (!existing.company && company) existing.company = company;
        if (!existing.source.includes(source)) existing.source = `${existing.source};${source}`;
      } else {
        map.set(e, { email: e, name: name || '', company: company || '', source, first_seen: ts || '' });
      }
    };

    contacts.data?.forEach((r: Record<string, string | null>) => add(r.email, r.name, r.company, 'contact', r.created_at));
    assess.data?.forEach((r: Record<string, string | null>) => add(r.email, r.name, r.company, 'assessment', r.created_at));
    diag.data?.forEach((r: Record<string, string | null>) => add(r.email, r.name, r.company, 'diagnostic', r.created_at));
    prospects.data?.forEach((r: Record<string, string | null>) => add(r.email, null, r.business_name, 'prospect', r.created_at));

    // Subscriptions: pull email from auth.users via profiles table
    if (subs.data?.length) {
      const userIds = subs.data.map((s: { user_id: string | null }) => s.user_id).filter(Boolean) as string[];
      if (userIds.length) {
        const { data: profiles } = await supabase.from('profiles').select('id, email, full_name').in('id', userIds);
        profiles?.forEach((p: Record<string, string | null>) => add(p.email, p.full_name, null, 'subscriber', null));
      }
    }

    const rows = Array.from(map.values()).sort((a, b) => (b.first_seen || '').localeCompare(a.first_seen || ''));

    // Build CSV
    const escape = (v: string) => `"${(v || '').replace(/"/g, '""')}"`;
    const csv = [
      'email,name,company,source,first_seen',
      ...rows.map((r) => [r.email, r.name, r.company, r.source, r.first_seen].map(escape).join(',')),
    ].join('\n');

    return new Response(csv, {
      headers: { ...corsHeaders, 'Content-Type': 'text/csv' },
    });
  } catch (e) {
    console.error('export-retargeting-audience error', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
