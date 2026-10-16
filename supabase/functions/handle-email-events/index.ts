import { createEmailWebhookHandler } from 'npm:@lovable.dev/email-js@0.3.1'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0'

const sb = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// Ports the legacy suppression/unsubscribe handler writes: notification-only
// records in the kept tables. Never gates future sends — Lovable enforces
// suppression at send time. Throws on write failure so the event is retried.

async function recordSuppression(
  eventId: string,
  recipient: string,
  reason: 'bounce' | 'complaint' | 'unsubscribe',
) {
  const { error } = await sb
    .from('suppressed_emails')
    .upsert(
      { email: recipient.toLowerCase(), reason, metadata: null },
      { onConflict: 'email' },
    )
  if (error) {
    console.error('suppressed_emails write failed', { code: error.code, message: error.message, event_id: eventId })
    throw new Error('suppressed_emails write failed')
  }
}

async function logOutcome(
  eventId: string,
  recipient: string,
  status: 'bounced' | 'complained' | 'suppressed',
  errorMessage: string,
) {
  const { error } = await sb.from('email_send_log').insert({
    template_name: 'system',
    recipient_email: recipient.toLowerCase(),
    status,
    error_message: errorMessage,
    message_id: null,
  })
  if (error) {
    console.error('email_send_log write failed', { code: error.code, message: error.message, event_id: eventId })
    throw new Error('email_send_log write failed')
  }
}

const handler = createEmailWebhookHandler({
  apiKey: Deno.env.get('LOVABLE_API_KEY')!,
  on: {
    'email.bounced': async (event) => {
      await recordSuppression(event.event_id, event.data.recipient, 'bounce')
      await logOutcome(event.event_id, event.data.recipient, 'bounced', 'Email bounced (delivery failed)')
    },
    'email.complaint': async (event) => {
      await recordSuppression(event.event_id, event.data.recipient, 'complaint')
      await logOutcome(event.event_id, event.data.recipient, 'complained', 'Recipient reported the email as spam')
    },
    'email.unsubscribed': async (event) => {
      await recordSuppression(event.event_id, event.data.recipient, 'unsubscribe')
      await logOutcome(event.event_id, event.data.recipient, 'suppressed', 'Recipient unsubscribed')
    },
  },
})

Deno.serve((req) => handler(req))
