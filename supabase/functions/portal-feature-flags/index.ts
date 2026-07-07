// Admin-only edge function to list/update portal feature flags.
// Public GET/list is not needed here — the client reads via anon SELECT policy.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { verifyAdminToken } from '../_shared/admin-token.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const token = req.headers.get('x-admin-token');
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const ok = await verifyAdminToken(token, secret);
  if (!ok) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let body: any = {};
  try { body = await req.json(); } catch { /* */ }
  const action = String(body?.action || 'list');

  if (action === 'list') {
    const { data, error } = await supabase
      .from('portal_feature_flags')
      .select('*')
      .order('label', { ascending: true });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify({ items: data || [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (action === 'set') {
    const key = String(body?.flag_key || '');
    if (!key) return new Response(JSON.stringify({ error: 'flag_key required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const patch: Record<string, unknown> = { updated_by: String(body?.updated_by || 'test-portal') };
    if (typeof body?.enabled === 'boolean') patch.enabled = body.enabled;
    if (body?.config && typeof body.config === 'object') patch.config = body.config;
    if (typeof body?.label === 'string') patch.label = body.label;
    if (typeof body?.description === 'string') patch.description = body.description;
    const { data, error } = await supabase
      .from('portal_feature_flags')
      .update(patch)
      .eq('flag_key', key)
      .select()
      .maybeSingle();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify({ item: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (action === 'promote_all') {
    // Turn every flag ON for all portals in one shot ("push to live").
    const { error } = await supabase
      .from('portal_feature_flags')
      .update({ enabled: true, updated_by: 'test-portal:promote_all' })
      .neq('flag_key', '');
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
