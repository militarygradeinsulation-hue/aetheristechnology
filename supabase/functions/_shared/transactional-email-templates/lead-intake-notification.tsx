import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface LeadIntakeProps {
  prospect_name?: string
  prospect_email?: string
  prospect_phone?: string
  company?: string
  website_url?: string
  rep_code?: string
  operator?: string
  score?: number | string
  grade?: string
  gap_count?: number | string
  critical_count?: number | string
  executive_summary?: string
}

const LeadIntakeEmail = ({
  prospect_name, prospect_email, prospect_phone, company, website_url,
  rep_code, operator, score, grade, gap_count, critical_count, executive_summary,
}: LeadIntakeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New Leak Audit intake: {prospect_name || prospect_email || 'lead'} ({company || website_url || '—'})</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🩸 New Leak Audit Intake</Heading>
        <Text style={subtle}>A prospect just submitted the rep-code intake form.</Text>
        <Hr style={hr} />

        <Text style={label}>Prospect</Text>
        <Text style={value}>{prospect_name || '—'}</Text>

        <Text style={label}>Company</Text>
        <Text style={value}>{company || '—'}</Text>

        <Text style={label}>Email</Text>
        <Text style={value}>{prospect_email || '—'}</Text>

        <Text style={label}>Phone</Text>
        <Text style={value}>{prospect_phone || '—'}</Text>

        <Text style={label}>Website</Text>
        <Text style={value}>{website_url || '—'}</Text>

        <Hr style={hr} />

        <Text style={label}>Operator Code</Text>
        <Text style={value}>{rep_code || '—'}{operator ? ` (${operator})` : ''}</Text>

        <Section style={scoreBox}>
          <Text style={scoreLabel}>Scan Snapshot</Text>
          <Text style={scoreValue}>Score: {score ?? '—'} {grade ? `(${grade})` : ''}</Text>
          <Text style={scoreValue}>Gaps: {gap_count ?? '—'} · Critical: {critical_count ?? '—'}</Text>
        </Section>

        {executive_summary ? (
          <>
            <Text style={label}>Executive Summary</Text>
            <Text style={summary}>{executive_summary}</Text>
          </>
        ) : null}

        <Hr style={hr} />
        <Text style={footer}>Aetheris Business Forensics — operator intake notification.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LeadIntakeEmail,
  subject: (data: Record<string, any>) =>
    `New Leak Audit Intake: ${data.prospect_name || data.prospect_email || 'Unknown'}${data.company ? ` — ${data.company}` : ''}`,
  displayName: 'Leak Audit intake notification',
  // No fixed `to` — caller specifies recipient so we can fan-out to multiple operators.
  previewData: {
    prospect_name: 'Jane Smith', prospect_email: 'jane@acme.com', prospect_phone: '(555) 123-4567',
    company: 'Acme Corp', website_url: 'https://acme.com', rep_code: '963169', operator: 'Braden Roberts',
    score: 62, grade: 'C', gap_count: 14, critical_count: 3,
    executive_summary: 'Site converts cold, CTA is buried, no proof above fold. Three critical leaks identified.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '580px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '0 0 6px' }
const subtle = { fontSize: '13px', color: '#666666', margin: '0 0 8px' }
const label = { fontSize: '12px', fontWeight: 'bold' as const, color: '#999999', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 2px' }
const value = { fontSize: '15px', color: '#1a1a1a', margin: '0 0 14px' }
const summary = { fontSize: '14px', color: '#333333', lineHeight: '1.6', margin: '0 0 14px', backgroundColor: '#f9f9f9', padding: '14px', borderRadius: '6px' }
const hr = { borderColor: '#e5e5e5', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '20px 0 0' }
const scoreBox = { backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '14px', margin: '8px 0 14px' }
const scoreLabel = { fontSize: '12px', fontWeight: 'bold' as const, color: '#9a3412', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 4px' }
const scoreValue = { fontSize: '14px', color: '#1a1a1a', margin: '2px 0' }
