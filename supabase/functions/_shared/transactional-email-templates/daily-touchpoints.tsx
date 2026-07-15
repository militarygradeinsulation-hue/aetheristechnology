import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Touchpoint {
  title: string
  kind: string
  time?: string
  lead_name?: string
  body?: string
  auto?: boolean
}

interface Props {
  rep_name?: string
  date_label?: string
  portal_url?: string
  touchpoints?: Touchpoint[]
}

const KIND_ICON: Record<string, string> = {
  call: '☎️', follow_up: '🔁', meeting: '🤝', task: '✅',
  reminder: '⏰', event: '📅', note: '📝',
}

const DailyTouchpoints = ({
  rep_name = 'there',
  date_label = 'Today',
  portal_url = 'https://aetheris.technology/portal',
  touchpoints = [],
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{touchpoints.length} touchpoint{touchpoints.length === 1 ? '' : 's'} scheduled for {date_label}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your touchpoints for {date_label}</Heading>
        <Text style={intro}>
          Morning {rep_name}. {touchpoints.length} step{touchpoints.length === 1 ? '' : 's'} on the board today.
          Work them in order — the sequence is what closes.
        </Text>

        <Hr style={hr} />

        {touchpoints.length === 0 ? (
          <Text style={value}>Nothing auto-scheduled. Prospect, claim a lead, or open the portal to schedule your day.</Text>
        ) : touchpoints.map((t, i) => (
          <Section key={i} style={card}>
            <Text style={label}>
              {KIND_ICON[t.kind] || '•'} {t.title}
              {t.auto ? <span style={badge}>AUTO</span> : null}
            </Text>
            {t.lead_name ? <Text style={value}>Lead: <strong>{t.lead_name}</strong></Text> : null}
            {t.time ? <Text style={value}>Time: {t.time}</Text> : null}
            {t.body ? <Text style={body_style}>{t.body}</Text> : null}
          </Section>
        ))}

        <Hr style={hr} />
        <Text style={footer}>
          Open your full calendar and check items off as you go:{' '}
          <Link style={linkStyle} href={portal_url}>{portal_url}</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, system-ui, sans-serif', color: '#111' }
const container = { padding: '28px 24px', maxWidth: '620px', margin: '0 auto' }
const h1 = { color: '#111', fontSize: '22px', margin: '0 0 8px', fontWeight: 700 }
const intro = { fontSize: '14px', margin: '0 0 8px', color: '#333' }
const card = { padding: '12px 14px', border: '1px solid #e5e5e5', borderRadius: '6px', marginBottom: '10px', background: '#fafafa' }
const label = { fontSize: '15px', fontWeight: 700, margin: '0 0 4px', color: '#111' }
const value = { fontSize: '13px', margin: '2px 0', color: '#444' }
const body_style = { fontSize: '13px', margin: '6px 0 0', color: '#555', whiteSpace: 'pre-wrap' as const }
const badge = { marginLeft: '8px', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#f59e0b', color: '#111', fontWeight: 700 }
const hr = { borderColor: '#e5e5e5', margin: '18px 0' }
const footer = { fontSize: '12px', color: '#666' }
const linkStyle = { color: '#b45309' }

export const template = {
  component: DailyTouchpoints,
  subject: (data: Record<string, any>) => {
    const n = Array.isArray(data.touchpoints) ? data.touchpoints.length : 0
    return `Your ${n} touchpoint${n === 1 ? '' : 's'} for today`
  },
  displayName: 'Daily touchpoint reminder',
  previewData: {
    rep_name: 'Jane',
    date_label: 'Wed, Jul 15',
    touchpoints: [
      { title: '☎️ Touchpoint 1: Intro call — Acme HVAC', kind: 'call', lead_name: 'Acme HVAC', time: '10:00 AM', auto: true, body: 'First contact. Reference their business, ask 2 discovery questions, book a next step.' },
      { title: 'Follow up on proposal', kind: 'follow_up', lead_name: 'Beta Roofing', time: '2:00 PM' },
    ],
  },
} satisfies TemplateEntry
