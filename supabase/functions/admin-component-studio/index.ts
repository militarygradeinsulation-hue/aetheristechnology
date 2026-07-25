// Admin Component Studio — generates React+Tailwind components on demand.
// Uses Lovable AI (GPT-5.5) with an Aetheris design-system system prompt.
// PIN-gated (staff PIN 9822). Stores results in admin_generated_components.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!
const STAFF_PIN = Deno.env.get('ADMIN_PIN') || '9822'

const sb = createClient(SUPABASE_URL, SERVICE_KEY)

const STYLE_PRESETS: Record<string, string> = {
  forensic_dark: `Aetheris Forensic Dark — bg #0f0f10 charcoal, text #f5f0e6 warm ivory, primary #f59e0b amber, danger #dc2626 crimson (reserved for leak/loss signals). Fraunces serif for headlines, JetBrains Mono for micro-labels (uppercase, tracking-wider, text-[10px]), Space Grotesk for UI, Inter body. Case-file aesthetic: thin borders (border-white/10), amber rules, mono labels like "CASE FILE #04-A" above headings. NO purple/indigo gradients.`,
  executive_light: `Executive Light — paper white #faf8f3, ink black, restrained amber accents. Fraunces serif for headlines, IBM Plex or Inter body. Editorial, plenty of whitespace, thin 1px rules. Feels like a printed client dossier.`,
  data_dense: `Data Dense — dark charcoal grid, small KPI tiles (grid-cols-4), sparklines, tabular numbers (tabular-nums), amber accents on active metrics, crimson only for negative deltas. JetBrains Mono for numbers, Inter for labels. Compact spacing (p-3, gap-2).`,
  marketing_landing: `Marketing Landing — dark hero with amber CTA, big Fraunces serif headline, social proof band, feature grid. High contrast, blunt operator copy, no fluff.`,
  crm_kanban: `CRM Kanban — dark columns for pipeline stages (Discovery, Diagnostic, Proposal, Closed Won), deal cards with amber value badges, drag handles, tabular numbers, subtle hover lift.`,
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function requireAuth(body: any) {
  const pin = String(body?.pin || '')
  if (!pin) return false
  // Accept the configured ADMIN_PIN secret OR the documented staff PIN 9822.
  return pin === STAFF_PIN || pin === '9822'
}

async function generate(body: any) {
  const prompt = String(body?.prompt || '').trim()
  const preset = String(body?.style_preset || 'forensic_dark')
  const category = String(body?.category || 'dashboard')
  if (!prompt) return json(400, { ok: false, error: 'prompt_required' })

  const styleBrief = STYLE_PRESETS[preset] || STYLE_PRESETS.forensic_dark

  const system = `You are a senior React + Tailwind CSS component author for Aetheris Technology (Business Forensics Operator brand).

OUTPUT CONTRACT — CRITICAL:
- Return ONE self-contained React function component as TSX.
- No imports. No exports. Assume React, Tailwind, and lucide-react icons are globally available (use icons via <Icon.Zap className="..."/> style — the runtime provides an Icon namespace).
- The component MUST be named GeneratedComponent and must render standalone with no props.
- Use realistic placeholder data inline (arrays of objects), never fetch.
- Tailwind classes only. No inline style objects except for measured values (heights, widths). No CSS variables the runtime doesn't have.
- Money always in USD ($), never €/£/¥.
- Do not include markdown fences, prose, comments outside JSX, or explanations. Return raw TSX only.

DESIGN SYSTEM:
${styleBrief}

CATEGORY: ${category}

USER SPEC:
${prompt}`

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Lovable-API-Key': LOVABLE_API_KEY,
    },
    body: JSON.stringify({
      model: 'openai/gpt-5.5',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    }),
  })

  if (!res.ok) {
    const t = await res.text()
    if (res.status === 429) return json(429, { ok: false, error: 'rate_limited', details: t })
    if (res.status === 402) return json(402, { ok: false, error: 'credits_exhausted', details: t })
    return json(500, { ok: false, error: 'ai_gateway_error', status: res.status, details: t.slice(0, 500) })
  }

  const data = await res.json()
  let tsx = String(data?.choices?.[0]?.message?.content || '').trim()
  // Strip markdown fences if the model returned any.
  tsx = tsx.replace(/^```(?:tsx|jsx|ts|js|typescript|javascript)?\s*/i, '').replace(/```\s*$/i, '').trim()

  const name = String(body?.name || '').trim() || `component_${Date.now()}`
  const { data: row, error } = await sb.from('admin_generated_components').insert({
    name, prompt, style_preset: preset, category, tsx_code: tsx,
    created_by: 'admin',
  }).select('*').single()
  if (error) return json(500, { ok: false, error: 'db_insert_failed', details: error.message })

  return json(200, { ok: true, component: row })
}

async function list() {
  const { data, error } = await sb.from('admin_generated_components')
    .select('*').order('created_at', { ascending: false }).limit(100)
  if (error) return json(500, { ok: false, error: error.message })
  return json(200, { ok: true, items: data ?? [] })
}

async function remove(body: any) {
  const id = String(body?.id || '')
  if (!id) return json(400, { ok: false, error: 'id_required' })
  const { error } = await sb.from('admin_generated_components').delete().eq('id', id)
  if (error) return json(500, { ok: false, error: error.message })
  return json(200, { ok: true })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const body = await req.json().catch(() => ({}))
    if (!requireAuth(body)) return json(401, { ok: false, error: 'unauthorized' })
    const action = String(body?.action || 'generate')
    if (action === 'generate') return await generate(body)
    if (action === 'list') return await list()
    if (action === 'delete') return await remove(body)
    return json(400, { ok: false, error: 'invalid_action' })
  } catch (e) {
    return json(500, { ok: false, error: String(e) })
  }
})
