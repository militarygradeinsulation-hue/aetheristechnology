import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface InactiveRep {
  code: string
  rep_name: string
  rep_email?: string
  role?: string
  last_seen?: string | null
  days_idle: number
}

interface Props {
  reps?: InactiveRep[]
  threshold_days?: number
  revoked?: boolean
}

const RepInactivityAlert = ({ reps = [], threshold_days = 3, revoked = true }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{reps.length} rep(s) inactive {threshold_days}+ days{revoked ? ' — access revoked' : ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🚨 Inactive Rep Sweep</Heading>
        <Text style={value}>
          {reps.length} rep{reps.length === 1 ? '' : 's'} had zero portal activity for {threshold_days}+ consecutive days.
          {revoked ? ' Their portal access has been revoked (deactivated).' : ''}
        </Text>
        <Hr style={hr} />
        {reps.length === 0 ? (
          <Text style={value}>No inactive reps found.</Text>
        ) : reps.map(r => (
          <Section key={r.code} style={card}>
            <Text style={label}>{r.rep_name} <span style={{ opacity: 0.6 }}>({r.code})</span></Text>
            <Text style={value}>Role: {r.role || '—'}</Text>
            <Text style={value}>Email: {r.rep_email || '—'}</Text>
            <Text style={value}>
              Last activity: {r.last_seen ? new Date(r.last_seen).toLocaleString() : 'Never'} ({r.days_idle}d idle)
            </Text>
          </Section>
        ))}
        <Hr style={hr} />
        <Text style={footer}>
          To reinstate a rep, open Admin → Reps and toggle them active again.
        </Text>
      </Container>
    </Body>
  </Html>
)

const main = { backgroundColor: '#0f0f0f', fontFamily: '-apple-system, system-ui, sans-serif', color: '#e5e5e5' }
const container = { padding: '32px', maxWidth: '600px', margin: '0 auto' }
const h1 = { color: '#f59e0b', fontSize: '22px', margin: '0 0 16px' }
const card = { padding: '12px 14px', border: '1px solid #2a2a2a', borderRadius: '6px', marginBottom: '10px', background: '#161616' }
const label = { fontSize: '14px', fontWeight: 700, margin: '0 0 4px', color: '#fafafa' }
const value = { fontSize: '13px', margin: '2px 0', color: '#bdbdbd' }
const hr = { borderColor: '#2a2a2a', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#888' }

export const template: TemplateEntry = {
  component: RepInactivityAlert,
  subject: (data: Record<string, any>) => {
    const n = Array.isArray(data.reps) ? data.reps.length : 0
    return `🚨 ${n} rep${n === 1 ? '' : 's'} inactive ${data.threshold_days || 3}+ days — access revoked`
  },
  to: 'joseph@aetheris.technology',
  displayName: 'Rep inactivity alert',
  previewData: {
    threshold_days: 3,
    revoked: true,
    reps: [
      { code: 'DEMO1', rep_name: 'Jane Demo', rep_email: 'jane@example.com', role: 'rep', last_seen: new Date(Date.now() - 4 * 86400000).toISOString(), days_idle: 4 },
    ],
  },
}
