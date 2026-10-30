import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Link, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface ReadyProps {
  title?: string
  reportUrl?: string
  websiteUrl?: string
}
const WebsiteReportReadyEmail = ({ title, reportUrl, websiteUrl }: ReadyProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your paid Aetheris website report is ready</Preview>
    <Body style={{ backgroundColor: '#f6f6f4', fontFamily: 'Arial, sans-serif', margin: 0, padding: '28px 10px' }}>
      <Container style={{ backgroundColor: '#fff', maxWidth: '580px', padding: '30px', borderRadius: '10px' }}>
        <Text style={{ color: '#a85634', fontSize: '12px', letterSpacing: '2px', fontWeight: 700 }}>AETHERIS.TECHNOLOGY</Text>
        <Heading style={{ fontSize: '27px', color: '#1c2224' }}>Your website report is ready.</Heading>
        <Text style={{ lineHeight: '1.65', color: '#3b4142' }}>
          Your {title || 'Automated Website Report'} for {websiteUrl || 'the public website you supplied'} finished generating.
          You can open the secure report link below to view and download the result.
        </Text>
        <Section style={{ margin: '26px 0' }}>
          <Link href={reportUrl || 'https://aetheris.technology/'} style={{
            display: 'inline-block', backgroundColor: '#b95f37', borderRadius: '7px',
            padding: '14px 22px', fontSize: '15px', color: '#ffffff', fontWeight: 700, textDecoration: 'none',
          }}>View my report</Link>
        </Section>
        <Hr style={{ borderColor: '#e7e7e6' }} />
        <Text style={{ color: '#636b6d', lineHeight: '1.6', fontSize: '13px' }}>
          This is an automated review of publicly accessible website information, not a verified
          financial audit. Never share this report link publicly. Contact Aetheris if something needs clarification.
        </Text>
        <Text style={{ color: '#777', fontSize: '12px' }}>
          Copyright © 2026 · Owned by Aetheris.Technology · All rights reserved.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WebsiteReportReadyEmail,
  subject: 'Your Aetheris automated website report is ready',
  displayName: 'Paid website report ready',
  previewData: {
    title: 'Automated Website Report',
    reportUrl: 'https://aetheris.technology/checkout/return?type=deliverable',
    websiteUrl: 'https://example.com/',
  },
} satisfies TemplateEntry
