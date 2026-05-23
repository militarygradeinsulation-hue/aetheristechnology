/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as repWelcome } from './rep-welcome.tsx'
import { template as contactNotification } from './contact-notification.tsx'
import { template as repApplicationNotification } from './rep-application-notification.tsx'
import { template as monthlyDelivery } from './monthly-delivery.tsx'
import { template as deliverableMagicLink } from './deliverable-magic-link.tsx'
import { template as leadIntakeNotification } from './lead-intake-notification.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'rep-welcome': repWelcome,
  'contact-notification': contactNotification,
  'rep-application-notification': repApplicationNotification,
  'monthly-delivery': monthlyDelivery,
  'deliverable-magic-link': deliverableMagicLink,
  'lead-intake-notification': leadIntakeNotification,
}
