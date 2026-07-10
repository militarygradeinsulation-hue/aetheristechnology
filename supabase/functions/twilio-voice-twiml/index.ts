// TwiML endpoint Twilio calls when a rep places a call from the browser.
// This runs public (Twilio hits it directly, no user JWT).
// Returns <Dial><Number>+15551234567</Number></Dial>.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const callerId = Deno.env.get('TWILIO_CALLER_ID') || '';
  let to = '';
  try {
    if (req.method === 'POST') {
      const ctype = req.headers.get('content-type') || '';
      if (ctype.includes('application/x-www-form-urlencoded')) {
        const form = await req.formData();
        to = String(form.get('To') || form.get('to') || '');
      } else {
        const body = await req.json().catch(() => ({}));
        to = String(body.To || body.to || '');
      }
    } else {
      to = new URL(req.url).searchParams.get('To') || '';
    }
  } catch { /* ignore */ }

  // Basic E.164 validation
  const cleaned = to.trim();
  const isValid = /^\+[1-9]\d{6,15}$/.test(cleaned);

  const twiml = isValid
    ? `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${esc(callerId)}" answerOnBridge="true">
    <Number>${esc(cleaned)}</Number>
  </Dial>
</Response>`
    : `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Invalid destination number.</Say>
</Response>`;

  return new Response(twiml, {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' },
  });
});
