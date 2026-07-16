// Public endpoint: capture an email when someone opens a rep-shared tool link.
// Upserts into public.tool_leads (one row per email+tool), pings admin notification.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const isEmail = (v: unknown): v is string =>
  typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const s = (v: unknown, max = 255): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }

  if (!isEmail(body?.email) || !body?.tool_slug) {
    return new Response(JSON.stringify({ error: 'invalid_input' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const email = (body.email as string).trim().toLowerCase().slice(0, 255);
  const name = s(body.name, 120);
  const phone = s(body.phone, 40);
  const company = s(body.company, 160);
  const rep_code = s(body.rep_code, 32);
  const tool_slug = s(body.tool_slug, 80)!;
  const tool_title = s(body.tool_title, 160);
  const source = s(body.source, 80);
  const user_agent = s(body.user_agent, 500);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Check existing
  const { data: existing } = await supabase
    .from('tool_leads')
    .select('id, visit_count, name, phone, company, rep_code')
    .ilike('email', email)
    .eq('tool_slug', tool_slug)
    .maybeSingle();

  let isNew = false;
  if (existing) {
    await supabase.from('tool_leads').update({
      visit_count: (existing.visit_count || 1) + 1,
      last_seen: new Date().toISOString(),
      name: name || existing.name,
      phone: phone || existing.phone,
      company: company || existing.company,
      rep_code: rep_code || existing.rep_code,
      user_agent: user_agent || undefined,
    }).eq('id', existing.id);
  } else {
    isNew = true;
    await supabase.from('tool_leads').insert({
      email, name, phone, company, rep_code, tool_slug, tool_title,
      source: source || 'rep-share-link', user_agent,
    });
  }

  // Fire-and-forget admin notification for NEW leads only.
  if (isNew) {
    try {
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'contact-notification',
          recipientEmail: email,
          idempotencyKey: `tool-lead-${tool_slug}-${email}`,
          templateData: {
            name: name || 'Tool Lead',
            email,
            phone: phone || '—',
            company: company || '—',
            message: `Opened the "${tool_title || tool_slug}" tool via rep code ${rep_code || '(none)'}.`,
            service_interest: `tool:${tool_slug}`,
          },
        },
      });
    } catch (e) {
      console.warn('admin notify failed', e);
    }
  }

  return new Response(JSON.stringify({ ok: true, isNew }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
