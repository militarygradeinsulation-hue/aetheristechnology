import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const CONSENT_KEY = 'aetheris_retargeting_consent';

declare global {
  interface Window {
    _linkedin_partner_id?: string;
    _linkedin_data_partner_ids?: string[];
    lintrk?: (action: string, data?: Record<string, unknown>) => void;
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function categorize(path: string): string {
  if (path === '/') return 'home';
  if (path.startsWith('/blog')) return 'blog';
  if (path.startsWith('/services') || path.startsWith('/why-us') || path.startsWith('/capabilities')) return 'services';
  if (path.startsWith('/contact')) return 'contact';
  if (path.startsWith('/checkout')) return 'checkout';
  if (path.startsWith('/admin')) return 'admin';
  return 'other';
}

function loadLinkedIn(partnerId: string) {
  if (window.lintrk || !partnerId) return;
  window._linkedin_partner_id = partnerId;
  window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
  window._linkedin_data_partner_ids.push(partnerId);

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
  script.dataset.retargetingPixel = 'linkedin';
  document.head.appendChild(script);
}

function loadMeta(pixelId: string) {
  if (window.fbq || !pixelId) return;
  /* eslint-disable */
  // @ts-ignore - Meta pixel snippet
  (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!f._fbq) f._fbq = n;
    n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
    t = b.createElement(e); t.async = !0; t.src = v;
    t.dataset.retargetingPixel = 'meta';
    s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  window.fbq?.('init', pixelId);
}

function loadRb2b(scriptId: string) {
  if (!scriptId || document.querySelector('script[data-retargeting-pixel="rb2b"]')) return;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://b2bjsstore.s3.us-west-2.amazonaws.com/b/${scriptId}/${scriptId}.js.gz`;
  script.dataset.retargetingPixel = 'rb2b';
  document.head.appendChild(script);
}

export const RetargetingPixel = () => {
  const location = useLocation();
  const initialized = useRef(false);
  const settingsRef = useRef<{ linkedin?: string; meta?: string; rb2b?: string; enabled: boolean }>({ enabled: false });

  // Load settings + initialize pixels once consent is given
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from('retargeting_settings')
        .select('linkedin_partner_id, meta_pixel_id, rb2b_script_id, enabled')
        .eq('id', 1)
        .maybeSingle();
      if (!mounted || !data || !data.enabled) return;

      settingsRef.current = {
        linkedin: data.linkedin_partner_id || undefined,
        meta: data.meta_pixel_id || undefined,
        rb2b: data.rb2b_script_id || undefined,
        enabled: data.enabled,
      };

      // Consent is implicit by visiting (banner is informational); admin can require localStorage opt-in by setting key to 'declined'
      if (localStorage.getItem(CONSENT_KEY) === 'declined') return;

      if (settingsRef.current.linkedin) loadLinkedIn(settingsRef.current.linkedin);
      if (settingsRef.current.meta) loadMeta(settingsRef.current.meta);
      if (settingsRef.current.rb2b) loadRb2b(settingsRef.current.rb2b);
      initialized.current = true;
    })();
    return () => { mounted = false; };
  }, []);

  // Fire PageView on route change
  useEffect(() => {
    if (!initialized.current) return;
    const category = categorize(location.pathname);
    try {
      window.lintrk?.('track', { conversion_id: undefined });
      window.fbq?.('track', 'PageView', { category, path: location.pathname });
    } catch {
      /* noop */
    }
  }, [location.pathname]);

  return null;
};

export function trackRetargetingConversion(eventName: string, value?: number) {
  try {
    window.fbq?.('track', eventName, value ? { value, currency: 'USD' } : undefined);
    window.lintrk?.('track', {});
  } catch {
    /* noop */
  }
}
