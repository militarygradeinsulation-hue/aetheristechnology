// Builds a compose-email URL based on the rep's (or admin's) saved email provider preference.
import { getRepSettings } from '@/lib/portalWorkspace';
import { getPortalToken, getPortalProfile } from '@/lib/portalAuth';

const LOGO_URL = 'https://businessforensics.tech/aetheris-logo.png';

export function buildDefaultSignature(fullName?: string | null): string {
  const first = (fullName || '').trim().split(/\s+/)[0] || '';
  return [
    first,
    'Operator',
    'Aetheris Business Forensics',
    'https://businessforensics.tech/',
    LOGO_URL,
  ].filter(Boolean).join('\n');
}

export type EmailProvider = 'default' | 'gmail' | 'outlook' | 'yahoo';

export interface RepMailPrefs {
  sender_email?: string;
  email_provider?: EmailProvider;
  signature?: string;
}

const ADMIN_PREFS_KEY = 'aetheris_admin_mail_prefs';

export function getAdminMailPrefs(): RepMailPrefs {
  try {
    const raw = localStorage.getItem(ADMIN_PREFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { email_provider: 'default' };
}

export function saveAdminMailPrefs(prefs: RepMailPrefs) {
  try {
    localStorage.setItem(ADMIN_PREFS_KEY, JSON.stringify(prefs));
    cached = prefs;
  } catch {}
}

let cached: RepMailPrefs | null = null;

export function clearMailPrefsCache() { cached = null; }

export async function loadRepMailPrefs(force = false): Promise<RepMailPrefs> {
  if (cached && !force) return cached;
  // If signed into the rep portal, use rep settings; otherwise fall back to admin localStorage prefs.
  if (getPortalToken()) {
    try {
      const s = await getRepSettings();
      const d = (s?.defaults || {}) as Record<string, string>;
      cached = {
        sender_email: d.sender_email || '',
        email_provider: (d.email_provider as EmailProvider) || 'default',
        signature: d.signature || '',
      };
      return cached;
    } catch {
      // fall through to admin prefs
    }
  }
  cached = getAdminMailPrefs();
  return cached;
}

export function buildComposeUrl(
  to: string,
  prefs: RepMailPrefs,
  opts: { subject?: string; body?: string } = {},
): string {
  const subject = opts.subject || '';
  const body = opts.body || (prefs.signature ? `\n\n--\n${prefs.signature}` : '');
  const provider = prefs.email_provider || 'default';
  const from = prefs.sender_email || '';

  const enc = encodeURIComponent;

  if (provider === 'gmail') {
    const params = new URLSearchParams({ view: 'cm', fs: '1', to, su: subject, body });
    if (from) params.set('authuser', from);
    return `https://mail.google.com/mail/?${params.toString()}`;
  }
  if (provider === 'outlook') {
    return `https://outlook.office.com/mail/deeplink/compose?to=${enc(to)}&subject=${enc(subject)}&body=${enc(body)}`;
  }
  if (provider === 'yahoo') {
    return `https://compose.mail.yahoo.com/?to=${enc(to)}&subject=${enc(subject)}&body=${enc(body)}`;
  }
  // mailto: respects the user's OS default mail client (which they've configured to their inbox)
  const q = new URLSearchParams();
  if (subject) q.set('subject', subject);
  if (body) q.set('body', body);
  const qs = q.toString();
  return `mailto:${to}${qs ? `?${qs}` : ''}`;
}

export async function openRepMail(to: string, opts: { subject?: string; body?: string } = {}) {
  const prefs = await loadRepMailPrefs();
  const url = buildComposeUrl(to, prefs, opts);
  // mailto: must use location to trigger handler; web URLs open in new tab
  if (url.startsWith('mailto:')) window.location.href = url;
  else window.open(url, '_blank', 'noopener,noreferrer');
}
