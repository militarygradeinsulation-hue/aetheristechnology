/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'

interface ToolShopLicenseProps {
  name?: string
  code?: string
  plan?: string
  portalUrl?: string
  tools?: string[]
}

function ToolShopLicense({
  name = 'there',
  code = '',
  plan = '',
  portalUrl = 'https://aetheris.technology/tools-shop/redeem',
  tools = [],
}: ToolShopLicenseProps) {
  return (
    <div style={{ fontFamily: "'Inter', Arial, sans-serif", backgroundColor: '#0f0f0f', color: '#e5e5e5', padding: '40px 20px' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#f5a623', margin: 0 }}>Aetheris Technology</h1>
        </div>
        <div style={{ backgroundColor: '#1a1a1a', borderRadius: '12px', padding: '32px', border: '1px solid #333' }}>
          <p style={{ fontSize: '16px', margin: '0 0 16px' }}>Hey {name},</p>
          <p style={{ fontSize: '16px', margin: '0 0 24px' }}>Your lifetime license is ready. Here is your access code:</p>
          <div style={{ backgroundColor: '#252525', borderRadius: '8px', padding: '20px', marginBottom: '24px', borderLeft: '3px solid #f5a623', textAlign: 'center' }}>
            <code style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', letterSpacing: '2px' }}>{code}</code>
            {plan && <p style={{ fontSize: '13px', color: '#999', margin: '8px 0 0' }}>Plan: {plan}</p>}
          </div>
          {tools.length > 0 && (
            <ul style={{ fontSize: '14px', color: '#ccc', margin: '0 0 24px', paddingLeft: '20px' }}>
              {tools.map((t) => (
                <li key={t} style={{ marginBottom: '6px' }}>{t}</li>
              ))}
            </ul>
          )}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <a href={portalUrl} style={{ display: 'inline-block', backgroundColor: '#f5a623', color: '#0f0f0f', fontWeight: 700, fontSize: '14px', padding: '12px 28px', borderRadius: '8px', textDecoration: 'none' }}>
              Redeem Your License →
            </a>
          </div>
          <p style={{ fontSize: '13px', color: '#666', margin: 0, textAlign: 'center' }}>
            Keep this code safe — it is your permanent access key.
          </p>
        </div>
        <p style={{ fontSize: '11px', color: '#555', textAlign: 'center', marginTop: '24px' }}>
          Aetheris Technology · Indianapolis, IN
        </p>
      </div>
    </div>
  )
}

export const template = {
  component: ToolShopLicense,
  subject: 'Your Aetheris license code',
  displayName: 'Tool Shop License',
  previewData: {
    name: 'Jane',
    code: 'AETH-XXXX-XXXX',
    plan: 'triple',
    portalUrl: 'https://aetheris.technology/tools-shop/redeem?code=AETH-XXXX-XXXX',
    tools: ['Leak Audit', 'Whats Wrong Diagnostic'],
  },
} satisfies TemplateEntry
