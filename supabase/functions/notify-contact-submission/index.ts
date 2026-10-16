import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

// Public endpoint for the site's lead-capture forms (contact form, free tools
// unlock, Nexus IQ unlock, What's-Wrong diagnostic). Sends the fixed-recipient
// contact-notification template to the site owner. The recipient is defined by
// the template — callers can never choose it.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function clean(value: unknown, max = 2000): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON in request body' }, 400)
  }

  const name = clean(body.name, 200)
  const email = clean(body.email, 320)
  const message = clean(body.message, 4000)
  if (!name || !email || !EMAIL_RE.test(email) || !message) {
    return json({ error: 'name, a valid email, and message are required' }, 400)
  }

  const idempotencyKey = clean(body.idempotencyKey, 200) || crypto.randomUUID()

  try {
    const result = await sendTemplateEmail('contact-notification', email, {
      idempotencyKey,
      templateData: {
        name,
        email,
        phone: clean(body.phone, 50),
        company: clean(body.company, 200),
        message,
        service_interest: clean(body.service_interest, 200),
      },
    })
    if (!result.sent) {
      return json({ success: false, reason: result.reason })
    }
    return json({ success: true })
  } catch (error) {
    console.error('notify-contact-submission failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return json({ error: 'Failed to send notification' }, 500)
  }
})
