import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  company?: string
  eventLabel?: string
  location?: string
  recipient?: string
  openCount?: number
  when?: string
  adminUrl?: string
  reportUrl?: string
}

const GoldenOpened = (p: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Golden Report ${p.eventLabel || 'opened'}: ${p.company || 'unknown'}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>AETHERIS · GOLDEN REPORT SIGNAL</Text>
        <Heading style={h1}>
          {p.company || 'Someone'} {p.eventLabel || 'opened their report'}
        </Heading>
        <Section style={card}>
          <Row label="Event" value={p.eventLabel || '—'} />
          <Row label="Company" value={p.company || '—'} />
          <Row label="Recipient" value={p.recipient || 'anonymous'} />
          <Row label="Location" value={p.location || 'unknown'} />
          <Row label="When" value={p.when || 'just now'} />
          <Row label="Total opens" value={String(p.openCount ?? 1)} />
        </Section>
        {p.adminUrl && (
          <Text style={text}>
            <Link href={p.adminUrl} style={link}>Open the admin feed →</Link>
          </Text>
        )}
        {p.reportUrl && (
          <Text style={small}>Report: <Link href={p.reportUrl} style={link}>{p.reportUrl}</Link></Text>
        )}
      </Container>
    </Body>
  </Html>
)

const Row = ({ label, value }: { label: string; value: string }) => (
  <Text style={rowText}>
    <span style={rowLabel}>{label}: </span>
    <span style={rowValue}>{value}</span>
  </Text>
)

export const template = {
  component: GoldenOpened,
  subject: (d: Record<string, any>) =>
    `[Golden] ${d.company || 'Someone'} ${d.eventLabel || 'opened their report'}`,
  displayName: 'Golden Report opened',
  previewData: {
    company: 'Acme Corp',
    eventLabel: 'opened the report',
    location: 'Indianapolis, IN, US',
    recipient: 'buyer@acme.com',
    openCount: 3,
    when: 'just now',
    adminUrl: 'https://aetheris.technology/admin',
    reportUrl: 'https://aetheris.technology/golden-report?scan=xxxx',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const eyebrow = { fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', letterSpacing: '2px', color: '#f59e0b', margin: '0 0 12px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0a0a0a', margin: '0 0 20px', lineHeight: '1.3' }
const card = { backgroundColor: '#0a0a0a', borderRadius: '8px', padding: '20px 22px', margin: '0 0 20px' }
const rowText = { margin: '0 0 8px', fontSize: '14px', lineHeight: '1.5' }
const rowLabel = { color: '#9ca3af', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '1px' }
const rowValue = { color: '#f59e0b', fontWeight: 600 as const }
const text = { fontSize: '14px', color: '#374151', margin: '0 0 12px' }
const small = { fontSize: '12px', color: '#6b7280', margin: '8px 0 0', wordBreak: 'break-all' as const }
const link = { color: '#f59e0b', textDecoration: 'underline' }
