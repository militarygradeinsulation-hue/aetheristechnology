import * as React from 'npm:react@18.3.1';
import { Body, Container, Head, Heading, Html, Preview, Text, Section, Link } from 'npm:@react-email/components@0.0.22';
import type { TemplateEntry } from './registry.ts';
import type { buildLeakAuditAppendix } from '../leak-audit-appendix.ts';
type Appendix = NonNullable<ReturnType<typeof buildLeakAuditAppendix>>;
const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const Findings = ({ appendix }: { appendix?: Appendix }) => (
  <Html lang="en" dir="ltr"><Head /><Preview>Your Leak Audit findings from Aetheris</Preview>
    <Body style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }}>
      <Container style={{ maxWidth: '640px', padding: '32px 24px' }}>
        <Text>AETHERIS · LEAK AUDIT™</Text>
        <Heading>Your findings: {appendix?.domain || 'your company'}</Heading>
        <Text>This is your plain-language appendix from the Golden Report. The complete case file stays private.</Text>
        {appendix?.annual ? <Section>
          <Heading as="h2">Potential annual financial exposure</Heading>
          <Text>{money(appendix.annual.low)} – {money(appendix.annual.high)} / year</Text>
          <Text>Source: {appendix.source}. This is the report’s evidence-based estimate, not guaranteed savings or verified recovered revenue.</Text>
        </Section> : <Text>The report does not establish an annual financial range. We have not invented one.</Text>}
        {appendix?.findings.map((f, i) => <Section key={i} style={{ borderTop: '1px solid #dddddd', paddingTop: '16px', marginTop: '20px' }}>
          <Heading as="h2">{i + 1}. {f.finding}</Heading>
          <Text>Evidence status: {f.status}</Text>
          {f.evidence.map((e, j) => <Section key={j}>
            <Text>{e.observation}</Text>
            <Text>{e.status} · {e.source}{e.url ? ` · ${e.url}` : ''}</Text>
            {e.limitations && <Text>Limits: {e.limitations}</Text>}
          </Section>)}
          {f.solutions.length > 0 && <><Heading as="h3">Recommended correction</Heading>{f.solutions.map((s, j) => <Text key={j}>{s}</Text>)}</>}
        </Section>)}
        <Text>The recommended corrections are ready for discussion. We confirm access, scope, and measurement before promising a financial result.</Text>
        <Link href="https://aetheris.technology/book">Request a tailored scope</Link>
        <Text>— Aetheris Technology</Text>
      </Container>
    </Body>
  </Html>
);
export const template = {
  component: Findings,
  subject: (data: Record<string, any>) => `Your Leak Audit findings — ${data.appendix?.domain || 'Aetheris'}`,
  displayName: 'Leak Audit findings appendix',
  previewData: { appendix: { domain: 'example.com', annual: null, source: 'financial_ledger', findings: [] } },
} satisfies TemplateEntry;