import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface SourceRow { label: string; value: string }

interface Props {
  company?: string
  eventLabel?: string
  location?: string
  recipient?: string
  openCount?: number
  when?: string
  adminUrl?: string
  reportUrl?: string
  subjectOverride?: string
  sourceTag?: string
  sourceLabel?: string
  isLiveLead?: boolean
  sourceRows?: SourceRow[]
}

const GoldenOpened = (p: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${p.sourceTag ? `[${p.sourceTag}] ` : ''}Golden Report ${p.eventLabel || 'opened'}: ${p.company || 'unknown'}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>AETHERIS · GOLDEN REPORT SIGNAL</Text>
        {p.sourceTag && (
          <Text style={p.isLiveLead ? tagLive : tagInternal}>{p.sourceTag}</Text>
        )}
        <Heading style={h1}>
          {p.company || 'Someone'} {p.eventLabel || 'opened their report'}
        </Heading>

        {p.sourceRows && p.sourceRows.length > 0 && (
          <Section style={sourceCard}>
            <Text style={sourceTitle}>SOURCE</Text>
            {p.sourceRows.map((r) => (
              <Row key={r.label} label={r.label} value={r.value} dark />
            ))}
          </Section>
        )}

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

const Row = ({ label, value, dark }: { label: string; value: string; dark?: boolean }) => (
  <Text style={rowText}>
    <span style={dark ? rowLabelDark : rowLabel}>{label}: </span>
    <span style={dark ? rowValueDark : rowValue}>{value}</span>

  </Text>
)

export const template = {
  component: GoldenOpened,
  subject: (d: Record<string, any>) =>
    d.subjectOverride ||
    `[Golden] ${d.company || 'Someone'} ${d.eventLabel || 'opened their report'}`,
  displayName: 'Golden Report opened',
  previewData: {
    company: 'Acme Corp',
    eventLabel: 'submitted a new report from the public website',
    sourceTag: 'LIVE WEBSITE LEAD',
    isLiveLead: true,
    sourceRows: [
      { label: 'Report Source', value: 'Public website (live potential lead)' },
      { label: 'Live Lead', value: 'Yes' },
      { label: 'Created By', value: 'Anonymous website visitor' },
    ],
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
const tagBase = { display: 'inline-block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', letterSpacing: '1.5px', padding: '6px 10px', borderRadius: '4px', margin: '0 0 12px', fontWeight: 700 as const }
const tagLive = { ...tagBase, backgroundColor: '#dc2626', color: '#ffffff' }
const tagInternal = { ...tagBase, backgroundColor: '#e5e7eb', color: '#374151' }
const sourceCard = { backgroundColor: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '8px', padding: '18px 20px', margin: '0 0 18px' }
const sourceTitle = { fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', letterSpacing: '2px', color: '#b45309', margin: '0 0 10px', fontWeight: 700 as const }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0a0a0a', margin: '0 0 20px', lineHeight: '1.3' }
const card = { backgroundColor: '#0a0a0a', borderRadius: '8px', padding: '20px 22px', margin: '0 0 20px' }
const rowText = { margin: '0 0 8px', fontSize: '14px', lineHeight: '1.5' }
const rowLabel = { color: '#9ca3af', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '1px' }
const rowValue = { color: '#f59e0b', fontWeight: 600 as const }
const rowLabelDark = { ...rowLabel, color: '#92400e' }
const rowValueDark = { color: '#0a0a0a', fontWeight: 600 as const }
const text = { fontSize: '14px', color: '#374151', margin: '0 0 12px' }
const small = { fontSize: '12px', color: '#6b7280', margin: '8px 0 0', wordBreak: 'break-all' as const }
const link = { color: '#f59e0b', textDecoration: 'underline' }
