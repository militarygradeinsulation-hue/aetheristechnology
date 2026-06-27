// Admin-only: list/export tool_leads. Requires x-admin-token (HMAC, 12h).
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
  const ok = await verifyAdminToken(token);
  if (!ok) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: any = {};
  try { body = await req.json(); } catch { /* */ }
  const limit = Math.min(Math.max(Number(body?.limit) || 200, 1), 1000);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data, error } = await supabase
    .from('tool_leads')
    .select('id, email, name, phone, company, rep_code, tool_slug, tool_title, visit_count, first_seen, last_seen, source')
    .order('last_seen', { ascending: false })
    .limit(limit);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ items: data || [] }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
