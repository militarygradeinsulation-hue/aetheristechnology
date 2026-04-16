/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

interface MonthlyDeliveryProps {
  name?: string
  delivery_title?: string
  delivery_summary?: string
  delivery_type?: string
  portal_url?: string
}

function MonthlyDelivery({ name = 'Subscriber', delivery_title = 'Your Monthly Delivery', delivery_summary = '', delivery_type = '', portal_url = 'https://aetheris.technology/my-subscription' }: MonthlyDeliveryProps) {
  return (
    <div style={{ fontFamily: "'Inter', Arial, sans-serif", backgroundColor: '#0f0f0f', color: '#e5e5e5', padding: '40px 20px' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#f5a623', margin: 0 }}>Aetheris Technology</h1>
        </div>
        <div style={{ backgroundColor: '#1a1a1a', borderRadius: '12px', padding: '32px', border: '1px solid #333' }}>
          <p style={{ fontSize: '16px', margin: '0 0 16px' }}>Hey {name},</p>
          <p style={{ fontSize: '16px', margin: '0 0 24px' }}>Your AI consultant just delivered this month's package:</p>
          <div style={{ backgroundColor: '#252525', borderRadius: '8px', padding: '20px', marginBottom: '24px', borderLeft: '3px solid #f5a623' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', margin: '0 0 8px' }}>{delivery_title}</h2>
            {delivery_summary && <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>{delivery_summary}</p>}
          </div>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <a href={portal_url} style={{ display: 'inline-block', backgroundColor: '#f5a623', color: '#0f0f0f', fontWeight: 700, fontSize: '14px', padding: '12px 28px', borderRadius: '8px', textDecoration: 'none' }}>
              View Full Delivery →
            </a>
          </div>
          <p style={{ fontSize: '13px', color: '#666', margin: 0, textAlign: 'center' }}>
            Your content adapts each month based on your feedback and business evolution.
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
  component: MonthlyDelivery,
  subject: (data: Record<string, any>) => `Your AI Consultant Delivery: ${data.delivery_title || 'Ready'}`,
  displayName: 'Monthly Delivery Notification',
  previewData: {
    name: 'Alex',
    delivery_title: 'March Strategy Update',
    delivery_summary: 'Refreshed social content pack with 25 new posts tailored to Q2 trends.',
    delivery_type: 'social_content',
    portal_url: 'https://aetheris.technology/my-subscription',
  },
}
