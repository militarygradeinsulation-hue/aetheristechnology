import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Aetheris"

interface Props {
  title?: string
  intakeUrl?: string
  name?: string
}

const DeliverableMagicLink = ({ title, intakeUrl, name }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Start your {title || 'deliverable'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {name ? `Thanks, ${name}.` : 'Thanks for your purchase.'}
        </Heading>
        <Text style={text}>
          Your <strong>{title || 'system'}</strong> is queued. We need a few quick answers before our operators (and our AI) can build it.
        </Text>
        <Text style={text}>
          Click below to open your private intake page. The link is unique to you — no login needed.
        </Text>
        <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
          <Button style={button} href={intakeUrl || '#'}>
            Open my intake page
          </Button>
        </Section>
        <Text style={small}>
          Or copy this link:<br />
          <span style={{ wordBreak: 'break-all' as const }}>{intakeUrl}</span>
        </Text>
        <Text style={footer}>— The Aetheris team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DeliverableMagicLink,
  subject: (data: Record<string, any>) =>
    `Start your ${data?.title || 'deliverable'} — Aetheris`,
  displayName: 'Deliverable magic link',
  previewData: {
    title: 'CRM Health Check',
    intakeUrl: 'https://aetheris.technology/deliverable/abc123',
    name: 'Jane',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '40px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#0a0a0a', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const small = { fontSize: '12px', color: '#6b7280', lineHeight: '1.5', margin: '24px 0 0' }
const footer = { fontSize: '13px', color: '#9ca3af', margin: '32px 0 0' }
const button = {
  backgroundColor: '#f59e0b',
  color: '#0a0a0a',
  padding: '14px 28px',
  borderRadius: '6px',
  fontWeight: 'bold' as const,
  fontSize: '15px',
  textDecoration: 'none',
  display: 'inline-block',
}
