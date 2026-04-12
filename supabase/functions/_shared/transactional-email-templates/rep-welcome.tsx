import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Aetheris AI"
const PLAYBOOK_URL = "https://ihdjpxhcaiaixmqxyqoe.supabase.co/storage/v1/object/public/playbooks/rep_playbook.pdf"

interface RepWelcomeProps {
  name?: string
}

const RepWelcomeEmail = ({ name }: RepWelcomeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to {SITE_NAME} — your sales playbook is ready</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {name ? `Welcome aboard, ${name}!` : 'Welcome aboard!'}
        </Heading>
        <Text style={text}>
          You've been accepted as an independent sales rep for {SITE_NAME}. We're excited to have you on the team.
        </Text>
        <Text style={text}>
          Your Rep Playbook is ready — it covers everything you need to start closing deals: the pricing ladder, your commission structure, outreach scripts, daily action checklist, and how you get paid.
        </Text>
        <Section style={buttonSection}>
          <Button style={button} href={PLAYBOOK_URL}>
            Download Your Playbook (PDF)
          </Button>
        </Section>
        <Hr style={hr} />
        <Heading style={h2}>Quick Start — Do This Today</Heading>
        <Text style={text}>
          1. <strong>Download and read the playbook</strong> — it's your blueprint{'\n'}
          2. <strong>Follow Aetheris on LinkedIn</strong> — repost our content daily{'\n'}
          3. <strong>Find 10 playground companies</strong> with bad websites{'\n'}
          4. <strong>Send your first outreach emails</strong> — templates are in the playbook{'\n'}
          5. <strong>Use our scanner</strong> at aetheristechnology.lovable.app/scan as a conversation starter
        </Text>
        <Hr style={hr} />
        <Text style={text}>
          <strong>Commission rates:</strong> 25% on snapshots & evaluations, 12% on diagnostics, 8–10% on implementation. Paid within 7 days of client payment clearing.
        </Text>
        <Text style={text}>
          Questions? Need help with a prospect? Reply to this email or call us at <strong>(317) 376-2110</strong>.
        </Text>
        <Text style={footer}>
          — The {SITE_NAME} Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: RepWelcomeEmail,
  subject: 'Welcome to Aetheris AI — Your Sales Playbook Is Ready',
  displayName: 'Rep welcome with playbook',
  previewData: { name: 'Jordan' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '580px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '0 0 20px' }
const h2 = { fontSize: '18px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '0 0 12px' }
const text = { fontSize: '15px', color: '#444444', lineHeight: '1.6', margin: '0 0 18px' }
const buttonSection = { textAlign: 'center' as const, margin: '28px 0' }
const button = {
  backgroundColor: '#d97706',
  color: '#ffffff',
  padding: '14px 32px',
  borderRadius: '8px',
  fontSize: '16px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
}
const hr = { borderColor: '#e5e5e5', margin: '24px 0' }
const footer = { fontSize: '13px', color: '#999999', margin: '30px 0 0' }
