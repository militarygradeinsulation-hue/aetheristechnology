import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Aetheris AI"

interface ContactNotificationProps {
  name?: string
  email?: string
  phone?: string
  company?: string
  message?: string
  service_interest?: string
}

const ContactNotificationEmail = ({ name, email, phone, company, message, service_interest }: ContactNotificationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New lead from {name || 'someone'} — {service_interest || 'no service selected'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🚨 New Contact Form Submission</Heading>
        <Hr style={hr} />
        <Text style={label}>Name</Text>
        <Text style={value}>{name || '—'}</Text>
        <Text style={label}>Email</Text>
        <Text style={value}>{email || '—'}</Text>
        <Text style={label}>Phone</Text>
        <Text style={value}>{phone || '—'}</Text>
        <Text style={label}>Company</Text>
        <Text style={value}>{company || '—'}</Text>
        <Text style={label}>Service Interest</Text>
        <Text style={value}>{service_interest || '—'}</Text>
        <Hr style={hr} />
        <Text style={label}>Message</Text>
        <Text style={messageStyle}>{message || '—'}</Text>
        <Hr style={hr} />
        <Text style={footer}>This was sent from the {SITE_NAME} website contact form.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactNotificationEmail,
  subject: (data: Record<string, any>) => `New Lead: ${data.name || 'Unknown'} — ${data.service_interest || 'General Inquiry'}`,
  displayName: 'Contact form notification',
  to: 'joseph@aetheris.technology',
  previewData: { name: 'Jane Smith', email: 'jane@acme.com', phone: '(555) 123-4567', company: 'Acme Corp', message: 'Our website is outdated and we need help with branding.', service_interest: 'The Diagnostic — $4,500' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '580px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '0 0 16px' }
const label = { fontSize: '12px', fontWeight: 'bold' as const, color: '#999999', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 2px' }
const value = { fontSize: '15px', color: '#1a1a1a', margin: '0 0 14px' }
const messageStyle = { fontSize: '15px', color: '#333333', lineHeight: '1.6', margin: '0 0 14px', backgroundColor: '#f9f9f9', padding: '16px', borderRadius: '6px' }
const hr = { borderColor: '#e5e5e5', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '20px 0 0' }
