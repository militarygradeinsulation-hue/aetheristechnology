import React, { useEffect, useRef, useState } from 'react';
import { X, Calendar, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const BOOKING_HOST = 'meetings-na2.hubspot.com';
const STORAGE_KEY = 'aetheris.bookingGate.email';
const ALLOW_KEY = 'aetheris.bookingGate.allowedAt';
const ALLOW_TTL_MS = 1000 * 60 * 60 * 12; // 12h

function isBookingUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url, window.location.origin);
    return u.host === BOOKING_HOST;
  } catch {
    return false;
  }
}

function isAllowedCached(): boolean {
  try {
    const ts = Number(localStorage.getItem(ALLOW_KEY) || '0');
    return ts > 0 && Date.now() - ts < ALLOW_TTL_MS;
  } catch {
    return false;
  }
}

interface PendingAction {
  url: string;
  newTab: boolean;
  // For embedded iframes that requested the gate via custom event
  onAllow?: () => void;
}

export const BookMeetingGate: React.FC = () => {
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [email, setEmail] = useState<string>(() => {
    try { return localStorage.getItem(STORAGE_KEY) || ''; } catch { return ''; }
  });
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dispatchAllow = useRef<(() => void) | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = (e.target as HTMLElement | null)?.closest('a') as HTMLAnchorElement | null;
      if (!target) return;
      if (!isBookingUrl(target.href)) return;
      if (isAllowedCached()) return;

      e.preventDefault();
      e.stopPropagation();
      setError(null);
      setBlocked(null);
      setPending({ url: target.href, newTab: target.target === '_blank' });
    };

    const onGateRequest = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const url: string = detail.url || '';
      if (!isBookingUrl(url)) return;
      if (isAllowedCached()) {
        detail.onAllow?.();
        return;
      }
      setError(null);
      setBlocked(null);
      dispatchAllow.current = detail.onAllow || null;
      setPending({ url, newTab: false, onAllow: detail.onAllow });
    };

    document.addEventListener('click', onClick, true);
    window.addEventListener('aetheris:book-meeting-request', onGateRequest as EventListener);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('aetheris:book-meeting-request', onGateRequest as EventListener);
    };
  }, []);

  const close = () => {
    setPending(null);
    setLoading(false);
    setError(null);
    setBlocked(null);
  };

  const proceed = (action: PendingAction) => {
    try { localStorage.setItem(ALLOW_KEY, String(Date.now())); } catch { /* ignore */ }
    if (action.onAllow) {
      action.onAllow();
    } else if (action.newTab) {
      window.open(action.url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = action.url;
    }
    close();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending) return;
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      try { localStorage.setItem(STORAGE_KEY, trimmed); } catch { /* ignore */ }
      const { data, error: invokeErr } = await supabase.functions.invoke('meeting-gate-check', {
        body: { email: trimmed, context: pending.url },
      });
      if (invokeErr) throw invokeErr;
      if (!data?.ok) throw new Error(data?.error || 'Gate check failed');
      if (data.allowed === false) {
        setBlocked(data.message || 'This calendar is for clients only.');
        setLoading(false);
        return;
      }
      proceed(pending);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Try again.');
      setLoading(false);
    }
  };

  if (!pending) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={close} />
      <div className="relative glass p-6 md:p-8 rounded-2xl max-w-md w-full border border-amber/30">
        <button onClick={close} className="absolute top-3 right-3 p-2 glass-hover rounded-lg" aria-label="Close">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {!blocked ? (
          <>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-amber" />
              </div>
              <h3 className="text-xl font-bold text-foreground font-display">Quick check</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              This calendar is reserved for prospective clients. Drop your work email so we can confirm before opening the booking page.
            </p>
            <form onSubmit={submit} className="space-y-3">
              <input
                type="email"
                required
                autoFocus
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-background/60 border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-amber text-background font-bold rounded-lg px-4 py-3 hover:bg-amber/90 transition disabled:opacity-60"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : 'Continue to calendar'}
              </button>
              <p className="text-[11px] text-muted-foreground text-center">
                Applying for a role? Use <a href="/careers" className="text-amber underline">/careers</a> instead, bookings are for clients only.
              </p>
            </form>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <h3 className="text-xl font-bold text-foreground font-display">Booking blocked</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{blocked}</p>
            <a
              href="/careers"
              className="block text-center bg-amber text-background font-bold rounded-lg px-4 py-3 hover:bg-amber/90 transition"
            >
              Continue with the careers process
            </a>
            <button onClick={close} className="w-full mt-2 text-sm text-muted-foreground py-2 hover:text-foreground">
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
};

/**
 * Helper for embedded iframe slots: render a button that triggers the gate
 * and reveals the iframe only after the email passes the applicant check.
 */
export const GatedHubSpotEmbed: React.FC<{ src: string; className?: string }> = ({ src, className }) => {
  const [revealed, setRevealed] = useState<boolean>(() => isAllowedCached());

  const open = () => {
    if (isAllowedCached()) { setRevealed(true); return; }
    window.dispatchEvent(new CustomEvent('aetheris:book-meeting-request', {
      detail: { url: src, onAllow: () => setRevealed(true) },
    }));
  };

  useEffect(() => {
    if (!revealed) return;
    // (Re)inject HubSpot embed loader so it picks up newly-mounted containers.
    const s = document.createElement('script');
    s.src = 'https://static.hsappstatic.net/MeetingsEmbed/ex/MeetingsEmbedCode.js';
    s.type = 'text/javascript';
    s.async = true;
    document.body.appendChild(s);
    return () => { try { document.body.removeChild(s); } catch { /* ignore */ } };
  }, [revealed]);

  if (revealed) {
    return <div className={className} data-src={src} />;
  }
  return (
    <div className={`${className || ''} flex flex-col items-center justify-center text-center p-10 border border-dashed border-amber/40 rounded-sm bg-background/40 min-h-[300px]`}>
      <Calendar className="w-10 h-10 text-amber mb-3" />
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        Bookings are for prospective clients only. Verify your email to load the calendar.
      </p>
      <button
        onClick={open}
        className="bg-amber text-background font-bold rounded-lg px-6 py-3 hover:bg-amber/90 transition"
      >
        Load booking calendar
      </button>
    </div>
  );
};
