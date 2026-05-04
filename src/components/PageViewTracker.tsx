import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import { useStaffUnlock } from '@/hooks/useStaffUnlock';

export const PageViewTracker = () => {
  const location = useLocation();
  const { trackEvent } = useTrackEvent();
  const isStaff = useStaffUnlock();
  const lastPath = useRef('');

  useEffect(() => {
    if (isStaff) return; // Filter internal staff/office traffic
    if (location.pathname === lastPath.current) return;
    lastPath.current = location.pathname;

    // Wait a tick so document.title (set by SEOHead/react-helmet) is updated
    const t = setTimeout(() => {
      trackEvent('page_view', {
        path: location.pathname,
        page_location: window.location.href,
        page_title: document.title,
        referrer: document.referrer || null,
        utm_source: new URLSearchParams(window.location.search).get('utm_source'),
        utm_medium: new URLSearchParams(window.location.search).get('utm_medium'),
        utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign'),
      });
    }, 80);
    return () => clearTimeout(t);
  }, [location.pathname, isStaff, trackEvent]);

  return null;
};
