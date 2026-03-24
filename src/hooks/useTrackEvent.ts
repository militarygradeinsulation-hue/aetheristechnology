import { useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const SESSION_KEY = 'aetheris_session_id';

function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function useTrackEvent() {
  const trackEvent = useCallback(async (eventType: string, eventData: Record<string, unknown> = {}) => {
    try {
      await supabase.from('site_events').insert({
        event_type: eventType,
        event_data: eventData,
        session_id: getSessionId(),
        user_agent: navigator.userAgent,
      });
    } catch (e) {
      // Silent fail — don't break UX for analytics
    }
  }, []);

  return { trackEvent };
}

export function usePageViewTracker() {
  const location = useLocation();
  const { trackEvent } = useTrackEvent();
  const lastPath = useRef('');

  useEffect(() => {
    if (location.pathname !== lastPath.current) {
      lastPath.current = location.pathname;
      trackEvent('page_view', {
        path: location.pathname,
        referrer: document.referrer || null,
      });
    }
  }, [location.pathname, trackEvent]);
}
