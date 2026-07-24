import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Item {
  name: string
  qty: number
  price_cents: number
  interval?: string | null
}

interface Props {
  customer_name?: string
  rep_name?: string
  quote_number?: string
  items?: Item[]
  subtotal_display?: string
  discount_display?: string | null
  total_display?: string
  notes?: string | null
  view_url?: string
}

const RepQuote = ({
  customer_name, rep_name, quote_number, items = [],
  subtotal_display, discount_display, total_display, notes, view_url,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Aetheris quote {quote_number}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>AETHERIS TECHNOLOGY — QUOTE</Text>
        <Heading style={h1}>Quote {quote_number}</Heading>
        <Text style={text}>
          Hi {customer_name || 'there'}, here is the quote we discussed.
        </Text>

        <Section style={quoteBox}>
          {items.map((it, i) => (
            <Section key={i} style={rowStyle}>
              <Text style={itemName}>
                {it.name} {it.qty > 1 ? `× ${it.qty}` : ''}
              </Text>
              <Text style={itemPrice}>
                ${((it.price_cents * it.qty) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                {it.interval ? ` /${it.interval}` : ''}
              </Text>
            </Section>
          ))}

          <Hr style={hr} />
          <Section style={rowStyle}>
            <Text style={subtotalLabel}>Subtotal</Text>
            <Text style={subtotalValue}>{subtotal_display}</Text>
          </Section>
          {discount_display ? (
            <Section style={rowStyle}>
              <Text style={subtotalLabel}>Discount</Text>
              <Text style={subtotalValue}>− {discount_display}</Text>
            </Section>
          ) : null}
          <Section style={rowStyle}>
            <Text style={totalLabel}>Total</Text>
            <Text style={totalValue}>{total_display}</Text>
          </Section>
        </Section>

        {notes ? (
          <Section style={notesBox}>
            <Text style={notesLabel}>Notes</Text>
            <Text style={notesText}>{notes}</Text>
          </Section>
        ) : null}

        <Section style={{ textAlign: 'center' as const, margin: '28px 0' }}>
          <Button href={view_url} style={cta}>View & Accept Quote</Button>
        </Section>

        <Text style={small}>
          Or copy this link: <span style={{ wordBreak: 'break-all' as const }}>{view_url}</span>
        </Text>

        <Text style={footer}>— {rep_name || 'The Aetheris team'}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: RepQuote,
  subject: (d: Record<string, any>) => `Your Aetheris quote ${d?.quote_number || ''}`.trim(),
  displayName: 'Rep CRM quote',
  previewData: {
    customer_name: 'Jane',
    rep_name: 'Nick Burns',
    quote_number: 'AE-20260724-4821',
    items: [{ name: 'Golden Report', qty: 1, price_cents: 50000, interval: null }],
    subtotal_display: '$500.00',
    discount_display: null,
    total_display: '$500.00',
    notes: null,
    view_url: 'https://aetheris.technology/q/example',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '40px 28px', maxWidth: '600px', margin: '0 auto' }
const eyebrow = { fontFamily: 'JetBrains Mono, Menlo, monospace', fontSize: '10px', letterSpacing: '3px', color: '#f59e0b', margin: '0 0 8px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0a0a0a', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const quoteBox = { border: '1px solid #e5e7eb', borderRadius: '8px', padding: '18px 20px', margin: '16px 0' }
const rowStyle = { display: 'flex', justifyContent: 'space-between' as const, alignItems: 'center' as const, margin: '4px 0' }
const itemName = { fontSize: '14px', color: '#0a0a0a', margin: 0, flex: '1 1 auto' as const }
const itemPrice = { fontSize: '14px', color: '#0a0a0a', margin: 0, fontWeight: 'bold' as const }
const hr = { borderColor: '#e5e7eb', margin: '12px 0' }
const subtotalLabel = { fontSize: '13px', color: '#6b7280', margin: 0 }
const subtotalValue = { fontSize: '13px', color: '#6b7280', margin: 0 }
const totalLabel = { fontSize: '16px', fontWeight: 'bold' as const, color: '#0a0a0a', margin: '8px 0 0' }
const totalValue = { fontSize: '18px', fontWeight: 'bold' as const, color: '#f59e0b', margin: '8px 0 0' }
const notesBox = { backgroundColor: '#fafafa', borderLeft: '3px solid #f59e0b', padding: '12px 16px', margin: '16px 0' }
const notesLabel = { fontFamily: 'JetBrains Mono, Menlo, monospace', fontSize: '10px', letterSpacing: '2px', color: '#6b7280', margin: '0 0 4px' }
const notesText = { fontSize: '13px', color: '#374151', margin: 0, lineHeight: '1.5' }
const cta = { backgroundColor: '#f59e0b', color: '#0a0a0a', padding: '14px 28px', borderRadius: '6px', fontWeight: 'bold' as const, textDecoration: 'none', fontSize: '15px' }
const small = { fontSize: '11px', color: '#9ca3af', textAlign: 'center' as const, margin: '4px 0 0' }
const footer = { fontSize: '13px', color: '#9ca3af', margin: '32px 0 0' }
