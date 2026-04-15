import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Aetheris AI"

interface RepApplicationProps {
  name?: string
  email?: string
  phone?: string
  linkedin_url?: string
  experience?: string
}

const RepApplicationEmail = ({ name, email, phone, linkedin_url, experience }: RepApplicationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New sales rep application from {name || 'someone'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🚀 New Sales Rep Application</Heading>
        <Hr style={hr} />
        <Text style={label}>Name</Text>
        <Text style={value}>{name || '—'}</Text>
        <Text style={label}>Email</Text>
        <Text style={value}>{email || '—'}</Text>
        <Text style={label}>Phone</Text>
        <Text style={value}>{phone || '—'}</Text>
        <Text style={label}>LinkedIn</Text>
        <Text style={value}>{linkedin_url || '—'}</Text>
        <Hr style={hr} />
        <Text style={label}>Experience / Background</Text>
        <Text style={messageStyle}>{experience || '—'}</Text>
        <Hr style={hr} />
        <Text style={footer}>This application was submitted on the {SITE_NAME} careers page.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: RepApplicationEmail,
  subject: (data: Record<string, any>) => `New Rep Application: ${data.name || 'Unknown'}`,
  displayName: 'Rep application notification',
  to: 'joseph@aetheris.technology',
  previewData: { name: 'John Doe', email: 'john@example.com', phone: '(555) 987-6543', linkedin_url: 'https://linkedin.com/in/johndoe', experience: '5 years in B2B sales, SaaS background.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '580px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '0 0 16px' }
const label = { fontSize: '12px', fontWeight: 'bold' as const, color: '#999999', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 2px' }
const value = { fontSize: '15px', color: '#1a1a1a', margin: '0 0 14px' }
const messageStyle = { fontSize: '15px', color: '#333333', lineHeight: '1.6', margin: '0 0 14px', backgroundColor: '#f9f9f9', padding: '16px', borderRadius: '6px' }
const hr = { borderColor: '#e5e5e5', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '20px 0 0' }
