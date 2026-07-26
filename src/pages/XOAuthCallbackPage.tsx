import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';

// Popup target for the X (Twitter) OAuth2/PKCE dialog. X redirects here with
// ?code=&state= after the user approves; we exchange it server-side, then
// tell the admin panel that opened us and close.
const XOAuthCallbackPage: React.FC = () => {
  const [status, setStatus] = useState<'working' | 'done' | 'error'>('working');
  const [message, setMessage] = useState('Connecting your X account…');

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const error = params.get('error');
      const code = params.get('code');
      const state = params.get('state');

      const finish = (ok: boolean, msg: string) => {
        setStatus(ok ? 'done' : 'error');
        setMessage(msg);
        try {
          window.opener?.postMessage({ source: 'x-oauth-callback', success: ok, message: msg }, window.location.origin);
        } catch { /* opener may be gone */ }
        if (ok) setTimeout(() => window.close(), 1200);
      };

      if (error) {
        finish(false, `X denied the request: ${error}`);
        return;
      }
      if (!code || !state) {
        finish(false, 'Missing code or state from X.');
        return;
      }

      const token = getAdminToken();
      if (!token) {
        finish(false, 'Admin session expired — close this window and log in again.');
        return;
      }

      try {
        const redirect_uri = `${window.location.origin}${window.location.pathname}`;
        const { data, error: fnError } = await supabase.functions.invoke('x-auth', {
          body: { action: 'callback', code, state, redirect_uri },
          headers: { 'x-admin-token': token },
        });
        if (fnError || data?.error) throw new Error(data?.error || fnError?.message);
        finish(true, `Connected as @${data?.username || 'unknown'}`);
      } catch (e) {
        finish(false, e instanceof Error ? e.message : 'Connection failed');
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-3 text-center px-6">
        {status === 'working' && <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />}
        {status === 'done' && <CheckCircle2 className="w-8 h-8 text-green-500" />}
        {status === 'error' && <XCircle className="w-8 h-8 text-destructive" />}
        <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
        {status !== 'working' && <p className="text-xs text-muted-foreground">You can close this window.</p>}
      </div>
    </div>
  );
};

export default XOAuthCallbackPage;
