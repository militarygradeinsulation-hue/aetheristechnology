// Logs a completed Twilio browser call:
//   1) rep_activity (always)
//   2) HubSpot call engagement (best-effort, if contact matches by phone)
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyPortalToken } from '../_shared/portal-token.ts';

interface Body {
  to_number: string;
  duration_seconds: number;
  status: 'completed' | 'canceled' | 'failed' | 'busy' | 'no-answer';
  lead_id?: string | null;
  notes?: string | null;
  call_sid?: string | null;
}

async function logToHubspot(phone: string, durationSec: number, notes: string, whenIso: string) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const HUBSPOT_API_KEY = Deno.env.get('HUBSPOT_API_KEY');
  if (!LOVABLE_API_KEY || !HUBSPOT_API_KEY) return { skipped: true, reason: 'no_hubspot' };

  const GW = 'https://connector-gateway.lovable.dev/hubspot';
  const headers = {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    'X-Connection-Api-Key': HUBSPOT_API_KEY,
    'Content-Type': 'application/json',
  };

  // Find contact by phone
  const search = await fetch(`${GW}/crm/v3/objects/contacts/search`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      filterGroups: [
        { filters: [{ propertyName: 'phone', operator: 'EQ', value: phone }] },
        { filters: [{ propertyName: 'mobilephone', operator: 'EQ', value: phone }] },
      ],
      limit: 1,
    }),
  });
  if (!search.ok) return { skipped: true, reason: `search_${search.status}` };
  const sj = await search.json();
  const contactId = sj?.results?.[0]?.id;
  if (!contactId) return { skipped: true, reason: 'contact_not_found' };

  // Create call engagement
  const engagement = await fetch(`${GW}/crm/v3/objects/calls`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      properties: {
        hs_timestamp: whenIso,
        hs_call_body: notes || 'Call placed from Aetheris portal dialer.',
        hs_call_duration: String(durationSec * 1000),
        hs_call_to_number: phone,
        hs_call_status: 'COMPLETED',
        hs_call_direction: 'OUTBOUND',
      },
      associations: [{
        to: { id: contactId },
        types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 194 }],
      }],
    }),
  });
  if (!engagement.ok) {
    const t = await engagement.text();
    return { skipped: true, reason: `engagement_${engagement.status}`, details: t.slice(0, 200) };
  }
  return { logged: true, contact_id: contactId };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const svcKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supaUrl = Deno.env.get('SUPABASE_URL')!;
    const claims = await verifyPortalToken(req.headers.get('x-portal-token'), svcKey);
    if (!claims) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as Body;
    if (!body?.to_number || typeof body.duration_seconds !== 'number') {
      return new Response(JSON.stringify({ error: 'bad_request' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supa = createClient(supaUrl, svcKey);
    const whenIso = new Date().toISOString();

    await supa.from('rep_activity').insert({
      rep_code: claims.code,
      action: 'call_placed',
      meta: {
        to: body.to_number,
        duration_seconds: body.duration_seconds,
        status: body.status,
        lead_id: body.lead_id ?? null,
        call_sid: body.call_sid ?? null,
        notes: body.notes ?? null,
      },
    });

    const hs = await logToHubspot(
      body.to_number,
      body.duration_seconds,
      body.notes || `Outbound call by rep ${claims.code}`,
      whenIso,
    ).catch((e) => ({ skipped: true, reason: String(e) }));

    return new Response(JSON.stringify({ ok: true, hubspot: hs }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('twilio-call-log error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
