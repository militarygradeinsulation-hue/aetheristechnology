// Mints a Twilio Voice SDK access token for the calling rep/partner.
// Gated by the portal HMAC token — same auth system as rep-assistant.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { verifyPortalToken } from '../_shared/portal-token.ts';

const enc = new TextEncoder();

function b64url(bytes: Uint8Array | string): string {
  const b = typeof bytes === 'string' ? enc.encode(bytes) : bytes;
  let s = btoa(String.fromCharCode(...b));
  return s.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function signJwt(header: object, payload: object, secret: string): Promise<string> {
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(payload));
  const data = `${h}.${p}`;
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
  return `${data}.${b64url(sig)}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const svcKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const apiKeySid = Deno.env.get('TWILIO_API_KEY_SID');
    const apiKeySecret = Deno.env.get('TWILIO_API_KEY_SECRET');
    const twimlAppSid = Deno.env.get('TWILIO_TWIML_APP_SID');
    if (!svcKey || !accountSid || !apiKeySid || !apiKeySecret || !twimlAppSid) {
      return new Response(JSON.stringify({ error: 'twilio_not_configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const auth = req.headers.get('x-portal-token');
    const claims = await verifyPortalToken(auth, svcKey);
    if (!claims) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = Math.floor(Date.now() / 1000);
    const identity = `rep_${claims.code}`;
    const token = await signJwt(
      { cty: 'twilio-fpa;v=1', typ: 'JWT', alg: 'HS256' },
      {
        jti: `${apiKeySid}-${now}`,
        iss: apiKeySid,
        sub: accountSid,
        iat: now,
        nbf: now,
        exp: now + 3600,
        grants: {
          identity,
          voice: {
            incoming: { allow: false },
            outgoing: { application_sid: twimlAppSid },
          },
        },
      },
      apiKeySecret,
    );

    return new Response(JSON.stringify({ token, identity, expires_at: now + 3600 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('twilio-voice-token error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
