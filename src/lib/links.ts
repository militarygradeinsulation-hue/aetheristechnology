// Centralized external links so they never drift.

// The raw HubSpot meetings URL. Used by the /book redirect page and the embed iframe.
export const HUBSPOT_MEETING_URL =
  'https://meetings-na2.hubspot.com/jtoney';

// The Aetheris-branded booking link that we surface everywhere in the UI.
// Same-origin /book route redirects to HubSpot so shared links stay on-brand.
export const BOOK_MEETING_URL = '/book';
