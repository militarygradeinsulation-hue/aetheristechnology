// Logs Aetheris Universe tool interactions and notifies Joseph.
// Public endpoint (no JWT). Rate-limits notifications to at most one
// per (tool_id, event_type) per 30 minutes via admin_kv.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const NOTIFY_EMAIL = 'joseph@aetheris.technology'
const NOTIFY_BUCKET_MIN = 30

const sb = createClient(SUPABASE_URL, SERVICE_KEY)

function clientIp(req: Request): string | null {
  const h = req.headers
  return (h.get('cf-connecting-ip') || h.get('x-real-ip') || h.get('x-forwarded-for')?.split(',')[0] || null)?.trim() || null
}

async function shouldNotify(toolId: string, evt: string): Promise<boolean> {
  const key = `universe_notify_${toolId}_${evt}`
  const { data } = await sb.from('admin_kv').select('value').eq('key', key).maybeSingle()
  const lastIso = (data as any)?.value?.last as string | undefined
  const cutoff = Date.now() - NOTIFY_BUCKET_MIN * 60 * 1000
  if (lastIso && new Date(lastIso).getTime() > cutoff) return false
  await sb.from('admin_kv').upsert({ key, value: { last: new Date().toISOString() } as any })
  return true
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const body = await req.json().catch(() => ({}))
    const toolId = String(body?.tool_id || '').slice(0, 80)
    const toolName = String(body?.tool_name || '').slice(0, 120)
    const evt = String(body?.event_type || 'universe_tool_open').slice(0, 40)
    const sessionId = String(body?.session_id || '').slice(0, 80) || null
    const route = String(body?.route || '').slice(0, 200) || null
    if (!toolId) {
      return new Response(JSON.stringify({ ok: false, error: 'missing_tool_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const ip = clientIp(req)
    const ua = req.headers.get('user-agent') || null

    // Log to site_events (best-effort)
    try {
      await sb.from('site_events').insert([{
        event_type: evt,
        event_data: { tool_id: toolId, tool_name: toolName, route, ip, country: req.headers.get('cf-ipcountry') || null } as any,
        session_id: sessionId,
        user_agent: ua,
      }])
    } catch (e) { console.error('site_events insert failed', e) }

    // Rate-limited notification
    try {
      if (await shouldNotify(toolId, evt)) {
        await sb.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'raw-html',
            recipientEmail: NOTIFY_EMAIL,
            idempotencyKey: `universe-tool-${toolId}-${evt}-${Math.floor(Date.now() / (NOTIFY_BUCKET_MIN * 60_000))}`,
            subject: `[Universe] ${toolName || toolId} · ${evt.replace('universe_tool_', '')}`,
            html: `<p>Someone just interacted with an Aetheris Universe tool.</p>
<ul>
  <li><strong>Tool:</strong> ${toolName || toolId}</li>
  <li><strong>Event:</strong> ${evt}</li>
  <li><strong>Route:</strong> ${route || '—'}</li>
  <li><strong>IP:</strong> ${ip || '—'} (${req.headers.get('cf-ipcountry') || '—'})</li>
  <li><strong>UA:</strong> ${(ua || '').slice(0, 200)}</li>
  <li><strong>When:</strong> ${new Date().toISOString()}</li>
</ul>
<p>Live analytics: <a href="https://aetheris.technology/admin">Admin → Universe Analytics</a></p>
<p><em>Rate-limited: one alert per tool+event per ${NOTIFY_BUCKET_MIN} min.</em></p>`,
            templateData: {},
          },
        })
      }
    } catch (e) { console.error('notify failed', e) }

    return new Response(JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
