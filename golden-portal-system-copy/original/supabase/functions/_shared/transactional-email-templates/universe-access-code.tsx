import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  code?: string
  name?: string
  universeUrl?: string
}

const UniverseAccessCode = ({ code, name, universeUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Aetheris Universe access code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {name ? `Nice work, ${name}.` : 'Nice work.'}
        </Heading>
        <Text style={text}>
          You ran the Golden Report — that unlocks the Aetheris Universe, our
          full interactive map of every tool, system, and signal we run.
        </Text>
        <Text style={text}>Your one-time access code:</Text>
        <Section style={codeBox}>
          <Text style={codeText}>{code || '—'}</Text>
        </Section>
        <Text style={text}>
          Enter it on the Universe page to open the gate:
        </Text>
        <Text style={small}>
          <span style={{ wordBreak: 'break-all' as const }}>
            {universeUrl || 'https://aetheris.technology/aetheris-universe'}
          </span>
        </Text>
        <Text style={footer}>— The Aetheris team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: UniverseAccessCode,
  subject: 'Your Aetheris Universe access code',
  displayName: 'Aetheris Universe access code',
  previewData: {
    code: 'AU-4F2K9X',
    name: 'Jane',
    universeUrl: 'https://aetheris.technology/aetheris-universe',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '40px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#0a0a0a', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const codeBox = {
  backgroundColor: '#0a0a0a',
  border: '1px solid #f59e0b',
  borderRadius: '6px',
  padding: '20px',
  textAlign: 'center' as const,
  margin: '20px 0',
}
const codeText = {
  fontFamily: 'JetBrains Mono, Menlo, monospace',
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#f59e0b',
  letterSpacing: '4px',
  margin: 0,
}
const small = { fontSize: '12px', color: '#6b7280', lineHeight: '1.5', margin: '8px 0 0' }
const footer = { fontSize: '13px', color: '#9ca3af', margin: '32px 0 0' }
