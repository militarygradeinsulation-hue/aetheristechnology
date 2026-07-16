// ElevenLabs Text-to-Speech proxy. Returns raw MP3 bytes.
// Request: POST { text: string, voiceId?: string }
// Auth: requires either x-admin-token (admin panel) or x-portal-token (rep portal).
import { corsHeaders as baseCors } from 'npm:@supabase/supabase-js@2/cors';
import { verifyAdminToken, getAdminTokenFromRequest } from '../_shared/admin-token.ts';
import { verifyPortalToken, getPortalTokenFromRequest } from '../_shared/portal-token.ts';

const corsHeaders = {
  ...baseCors,
  'Access-Control-Allow-Headers':
    (baseCors as any)['Access-Control-Allow-Headers']
      ? `${(baseCors as any)['Access-Control-Allow-Headers']}, x-admin-token, x-portal-token`
      : 'authorization, x-client-info, apikey, content-type, x-admin-token, x-portal-token',
};

const DEFAULT_VOICE = 'JBFqnCBsd6RMkjVDRZzb'; // George — warm, professional


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ok =
      (await verifyAdminToken(getAdminTokenFromRequest(req), secret)) ||
      !!(await verifyPortalToken(getPortalTokenFromRequest(req), secret));
    if (!ok) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ELEVENLABS_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const voiceId = (typeof body.voiceId === 'string' && body.voiceId) || DEFAULT_VOICE;

    if (!text) {
      return new Response(JSON.stringify({ error: 'text is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cap length to keep latency / cost sane
    const safeText = text.slice(0, 4500);

    const r = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: safeText,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true, speed: 1.0 },
        }),
      }
    );

    if (!r.ok) {
      const errText = await r.text();
      return new Response(JSON.stringify({ error: errText || `TTS failed: ${r.status}` }), {
        status: r.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const audio = await r.arrayBuffer();
    return new Response(audio, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
