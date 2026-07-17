// Aetheris Universe access — issue & redeem codes.
// - action "issue": require completed Golden Report for the email, then upsert an
//   access_codes row and send the code via transactional email.
// - action "redeem": accept staff PIN, active rep code, or a code stored in access_codes.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const STAFF_PIN = Deno.env.get('ADMIN_PIN') || '9822'
const UNIVERSE_URL = 'https://aetheris.technology/aetheris-universe'

const sb = createClient(SUPABASE_URL, SERVICE_KEY)

function generateCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)]
  return `AU-${s}`
}

function normalizeEmail(e: unknown): string | null {
  if (typeof e !== 'string') return null
  const t = e.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return null
  return t
}

async function hasCompletedReport(email: string): Promise<boolean> {
  const { data } = await sb
    .from('forensic_scans')
    .select('id')
    .ilike('requested_by', email)
    .eq('status', 'completed')
    .limit(1)
  return !!(data && data.length > 0)
}

async function issue(email: string) {
  const ok = await hasCompletedReport(email)
  if (!ok) {
    return { ok: false, error: 'no_report',
      message: "We couldn't find a completed Golden Report for that email. Run the report first — the code is issued the moment it finishes." }
  }
  // Reuse existing code if any
  const { data: existing } = await sb
    .from('access_codes').select('code').ilike('email', email).limit(1)
  let code = existing?.[0]?.code as string | undefined
  if (!code) {
    code = generateCode()
    // Ensure unique (retry once on collision)
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error } = await sb.from('access_codes').insert({
        code, email, name: null, phone: null,
      })
      if (!error) break
      code = generateCode()
    }
  }
  // Send email (best-effort)
  try {
    await sb.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'universe-access-code',
        recipientEmail: email,
        idempotencyKey: `universe-code-${code}`,
        templateData: { code, universeUrl: UNIVERSE_URL },
      },
    })
  } catch (e) {
    console.error('universe-access: email send failed', e)
  }
  return { ok: true, message: 'Access code sent — check your inbox.' }
}

async function redeem(code: string) {
  const c = code.trim().toUpperCase()
  if (!c) return { ok: false, error: 'empty' }
  if (c === STAFF_PIN) return { ok: true, plan: 'staff', code: 'STAFF' }
  // Rep code
  try {
    const { data: repOk } = await sb.rpc('validate_rep_code', { _code: c })
    if (repOk === true) return { ok: true, plan: 'rep', code: c }
  } catch (_) { /* fall through */ }
  // Access code row
  const { data } = await sb.from('access_codes').select('code, email').eq('code', c).limit(1)
  if (data && data.length > 0) {
    await sb.from('access_codes').update({ last_used_at: new Date().toISOString() }).eq('code', c)
    return { ok: true, plan: 'universe', code: c, email: data[0].email ?? null }
  }
  return { ok: false, error: 'invalid', message: "That code isn't valid." }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const body = await req.json().catch(() => ({}))
    const action = String(body?.action || '').toLowerCase()
    let result: Record<string, unknown>
    if (action === 'issue') {
      const email = normalizeEmail(body?.email)
      if (!email) return new Response(JSON.stringify({ ok: false, error: 'invalid_email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      result = await issue(email)
    } else if (action === 'redeem') {
      result = await redeem(String(body?.code || ''))
    } else {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('universe-access error', e)
    return new Response(JSON.stringify({ ok: false, error: 'server_error', details: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
