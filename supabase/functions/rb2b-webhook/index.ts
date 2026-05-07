import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Webhook receiver for RB2B / Warmly / similar visitor identification services.
// Configure in their dashboard: POST https://<proj>.supabase.co/functions/v1/rb2b-webhook
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Shared-secret auth: require Authorization: Bearer <RB2B_WEBHOOK_SECRET>
  // or X-RB2B-Signature header matching the secret. Configure on the sender side.
  const expectedSecret = Deno.env.get('RB2B_WEBHOOK_SECRET');
  if (expectedSecret) {
    const authHeader = req.headers.get('authorization') || '';
    const sigHeader = req.headers.get('x-rb2b-signature') || '';
    const bearer = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : '';
    if (bearer !== expectedSecret && sigHeader !== expectedSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json();

    // RB2B-style payload: try to extract common fields, store full raw payload.
    // Supports both single object and array of identifications.
    const items = Array.isArray(body) ? body : [body];

    for (const item of items) {
      const company_name =
        item.company_name || item.company?.name || item.companyName || item.company || null;
      const company_domain =
        item.company_domain || item.company?.domain || item.companyDomain || item.domain || null;
      const person_name =
        item.person_name || item.name || item.full_name ||
        (item.first_name && item.last_name ? `${item.first_name} ${item.last_name}` : null);
      const person_email = item.email || item.person_email || null;
      const person_linkedin_url =
        item.linkedin_url || item.linkedinUrl || item.person_linkedin_url || item.linkedin || null;
      const title = item.title || item.job_title || item.jobTitle || null;
      const location =
        item.location ||
        [item.city, item.state, item.country].filter(Boolean).join(', ') || null;
      const pages_viewed = item.pages || item.pages_viewed || item.urls || [];
      const last_seen_at = item.last_seen_at || item.timestamp || new Date().toISOString();

      // Upsert by company_domain + person_email combo
      const dedupeKey = (person_email || `${company_domain || 'unknown'}:${person_name || 'anon'}`).toLowerCase();

      const { data: existing } = await supabase
        .from('identified_visitors')
        .select('id, pages_viewed')
        .or(`person_email.eq.${person_email || 'NULL'},and(company_domain.eq.${company_domain || 'NULL'},person_name.eq.${person_name || 'NULL'})`)
        .maybeSingle();

      if (existing) {
        const merged = Array.isArray(existing.pages_viewed)
          ? Array.from(new Set([...(existing.pages_viewed as string[]), ...(Array.isArray(pages_viewed) ? pages_viewed : [])]))
          : pages_viewed;
        await supabase
          .from('identified_visitors')
          .update({
            company_name,
            company_domain,
            person_name,
            person_email,
            person_linkedin_url,
            title,
            location,
            pages_viewed: merged,
            last_seen_at,
            raw_payload: item,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('identified_visitors').insert({
          company_name,
          company_domain,
          person_name,
          person_email,
          person_linkedin_url,
          title,
          location,
          pages_viewed,
          last_seen_at,
          raw_payload: item,
        });
      }

      console.log('rb2b-webhook ingested', { dedupeKey, company_name });
    }

    return new Response(JSON.stringify({ ok: true, count: items.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('rb2b-webhook error', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
