// Centralized external links so they never drift.

// The raw HubSpot meetings URL. Used by the /book redirect page and the embed iframe.
export const HUBSPOT_MEETING_URL =
  'https://meetings-na2.hubspot.com/jtoney';

// The Aetheris-branded booking link that we surface everywhere in the UI.
// Same-origin /book route redirects to HubSpot so shared links stay on-brand.
export const BOOK_MEETING_URL = '/book';

// Canonical Aetheris contact details. These mirror what ContactModal already
// surfaces, so public pages never invent a second email or phone number.
export const CONTACT_EMAIL = 'aetheris.technology@outlook.com';
export const CONTACT_EMAIL_HREF = `mailto:${CONTACT_EMAIL}`;
export const CONTACT_PHONE = '(317) 376-2110';
export const CONTACT_PHONE_HREF = 'tel:+13173762110';

// Where the public "Run My Revenue Leak Audit" CTA sends people: the live
// Golden Report scanner. Kept here so the audit page and partner page agree.
export const RUN_AUDIT_URL = '/golden-report';
// The Golden Report exhibit page, used for "View a Sample Golden Report".
export const SAMPLE_REPORT_URL = '/golden';
