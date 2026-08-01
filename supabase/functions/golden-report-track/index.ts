// Golden Report tracking beacon.
//
// GET /golden-report-track?scan=<id>&evt=open           → 1x1 gif
// GET /golden-report-track?scan=<id>&evt=click&to=<url> → 302 redirect
// GET /golden-report-track?scan=<id>&evt=view           → 204
// GET /golden-report-track?scan=<id>&evt=download       → 204
// POST body { scan_id, event_type, recipient_email? }   → 204
//
// Also invoked internally to log 'scan_completed' events (POST + service key).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  formatDetroit,
  claimNewReportNotification,
  buildNewReportEmail,
} from '../_shared/golden-report-source.ts'



const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const sb = createClient(SUPABASE_URL, SERVICE_KEY)

const PIXEL = Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), c => c.charCodeAt(0))

const BOT_UA = /bot|crawl|spider|preview|slurp|facebookexternalhit|linkedinbot|whatsapp|telegram|discord|pinterest|redditbot|monitoring|uptime|pingdom|newrelic|datadog/i

async function detectInternal(opts: {
  ip: string | null
  email: string | null
  userAgent: string
  repCode: string | null
}) {
  const { ip, email, userAgent, repCode } = opts
  let rep_code = repCode
  let is_internal = false

  if (repCode) is_internal = true

  if (email) {
    const e = email.toLowerCase()
    const { data: rc } = await sb.from('rep_codes').select('code').eq('rep_email', e).maybeSingle()
    if (rc?.code) { is_internal = true; rep_code = rep_code || rc.code }
    if (!is_internal) {
      const { data: mb } = await sb.from('rep_mailboxes').select('code').eq('address', e).maybeSingle()
      if (mb?.code) { is_internal = true; rep_code = rep_code || mb.code }
    }
    if (!is_internal && e.endsWith('@aetheris.technology')) is_internal = true
  }

  if (ip && !is_internal) {
    const { data: kv } = await sb.from('admin_kv').select('value').eq('key', 'golden_report_internal_ips').maybeSingle()
    const ips = Array.isArray((kv?.value as any)?.ips) ? (kv!.value as any).ips as string[] : []
    if (ips.includes(ip)) is_internal = true
  }

  if (BOT_UA.test(userAgent)) is_internal = true

  return { is_internal, rep_code }
}

async function geoLookup(ip: string | null, cfCountry: string | null) {
  const out: { country: string | null; region: string | null; city: string | null } = {
    country: cfCountry, region: null, city: null,
  }
  if (!ip) return out
  try {
    const r = await fetch(`https://ipapi.co/${ip}/json/`, { signal: AbortSignal.timeout(2500) })
    if (r.ok) {
      const j = await r.json()
      out.country = j.country_code || out.country
      out.region = j.region || null
      out.city = j.city || null
    }
  } catch { /* ignore */ }
  return out
}

async function maybeNotify(ev: any) {
  try {
    const { data: kv } = await sb.from('admin_kv').select('value').eq('key', 'golden_report_notify_email').maybeSingle()
    const to = (kv?.value as any)?.email || 'joseph@aetheris.technology'
    const reportUrl = ev.scan_id ? `https://aetheris.technology/golden-report?scan=${ev.scan_id}` : null
    const adminUrl = 'https://aetheris.technology/admin'

    // ── New report created: exactly one categorised notification, ever. ──
    if (ev.event_type === 'scan_completed') {
      if (!ev.scan_id) return
      // Conditional claim on source_notified_at — retries, reopens, downloads,
      // regeneration and backfills can never produce a second email.
      const scan = await claimNewReportNotification(sb as any, ev.scan_id)
      if (!scan) return

      await sb.functions.invoke('send-transactional-email', {
        body: buildNewReportEmail(scan, {
          to,
          reportUrl,
          adminUrl,
          location: [ev.city, ev.region, ev.country].filter(Boolean).join(', ') || 'unknown',
        }),
      })
      return
    }


    // ── Engagement events keep the existing behaviour. ──
    if (ev.is_internal) return

    // Rate limit: 1 notification per (scan_id, event_type) per hour.
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count } = await sb
      .from('golden_report_events')
      .select('id', { count: 'exact', head: true })
      .eq('scan_id', ev.scan_id)
      .eq('event_type', ev.event_type)
      .eq('is_internal', false)
      .gte('created_at', since)
    if ((count ?? 0) > 1) return // this row + one earlier = already notified

    // Total non-internal opens on this scan
    const { count: total } = await sb
      .from('golden_report_events')
      .select('id', { count: 'exact', head: true })
      .eq('scan_id', ev.scan_id)
      .eq('is_internal', false)

    const eventLabel = ({
      page_view: 'viewed their report page',
      email_open: 'opened the report email',
      link_click: 'clicked the report link',
      pdf_download: 'downloaded the PDF',
    } as Record<string, string>)[ev.event_type] || 'engaged with their report'

    const location = [ev.city, ev.region, ev.country].filter(Boolean).join(', ') || 'unknown'

    await sb.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'golden-report-opened',
        recipientEmail: to,
        idempotencyKey: `golden-open-${ev.scan_id}-${ev.event_type}-${Math.floor(Date.now() / 3600000)}`,
        templateData: {
          company: ev.company_name || 'Someone',
          eventLabel,
          location,
          recipient: ev.recipient_email || 'anonymous',
          openCount: total ?? 1,
          when: formatDetroit(ev.created_at),
          adminUrl,
          reportUrl,
        },
      },
    })
  } catch (e) {
    console.error('notify failed:', (e as Error).message)
  }

}

async function logEvent(input: {
  scan_id: string | null
  event_type: string
  recipient_email: string | null
  ip: string | null
  cfCountry: string | null
  userAgent: string
  referrer: string | null
  repCode: string | null
  metadata?: Record<string, unknown>
}) {
  const { is_internal, rep_code } = await detectInternal({
    ip: input.ip, email: input.recipient_email, userAgent: input.userAgent, repCode: input.repCode,
  })
  const geo = await geoLookup(input.ip, input.cfCountry)

  let company_name: string | null = null
  let target_url: string | null = null
  if (input.scan_id) {
    const { data } = await sb.from('forensic_scans')
      .select('company_name, target_url').eq('id', input.scan_id).maybeSingle()
    company_name = data?.company_name ?? null
    target_url = data?.target_url ?? null
  }

  const { data: row, error } = await sb.from('golden_report_events').insert({
    scan_id: input.scan_id,
    company_name,
    target_url,
    event_type: input.event_type,
    recipient_email: input.recipient_email,
    ip: input.ip,
    country: geo.country,
    region: geo.region,
    city: geo.city,
    user_agent: input.userAgent,
    referrer: input.referrer,
    is_internal,
    rep_code,
    metadata: input.metadata || {},
  }).select().single()

  if (error) { console.error('insert failed:', error.message); return null }
  await maybeNotify(row)
  return row
}

function getIP(req: Request) {
  const h = req.headers
  return (h.get('cf-connecting-ip') || h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || null)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const url = new URL(req.url)
  const ip = getIP(req)
  const cfCountry = req.headers.get('cf-ipcountry')
  const userAgent = req.headers.get('user-agent') || ''
  const referrer = req.headers.get('referer') || null
  const repCode = req.headers.get('x-rep-code') || url.searchParams.get('rep') || null

  try {
    if (req.method === 'GET') {
      const scan_id = url.searchParams.get('scan')
      const evt = (url.searchParams.get('evt') || 'open').toLowerCase()
      const email = url.searchParams.get('e')?.toLowerCase() || null
      const to = url.searchParams.get('to')

      const validEvt = ['open', 'click', 'view', 'download'].includes(evt) ? evt : 'open'
      const eventType = validEvt === 'open' ? 'email_open'
        : validEvt === 'click' ? 'link_click'
        : validEvt === 'view' ? 'page_view'
        : 'pdf_download'

      // Fire-and-forget so pixel/redirect responds instantly.
      logEvent({
        scan_id, event_type: eventType, recipient_email: email,
        ip, cfCountry, userAgent, referrer, repCode,
      }).catch(e => console.error(e))

      if (validEvt === 'click' && to) {
        return new Response(null, { status: 302, headers: { ...corsHeaders, Location: to, 'Cache-Control': 'no-store' } })
      }
      if (validEvt === 'open') {
        return new Response(PIXEL, {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' },
        })
      }
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    // POST
    const body = await req.json().catch(() => ({} as any))
    const scan_id = body.scan_id || null
    const event_type = String(body.event_type || 'page_view')
    if (!['scan_completed', 'page_view', 'email_open', 'link_click', 'pdf_download'].includes(event_type)) {
      return new Response(JSON.stringify({ error: 'invalid event_type' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    await logEvent({
      scan_id,
      event_type,
      recipient_email: body.recipient_email?.toLowerCase() || null,
      ip, cfCountry, userAgent, referrer,
      repCode: body.rep_code || repCode,
      metadata: body.metadata || {},
    })
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('track error:', (e as Error).message)
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
