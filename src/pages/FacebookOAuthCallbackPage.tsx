import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, XCircle, Facebook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';

type Page = { id: string; name: string };

// Popup target for the Facebook Login dialog. Facebook redirects here with
// ?code=&state= after approval. Because one Facebook login can manage
// several Pages, callback returns the list and — if there's more than one —
// this page lets the admin pick before finalizing the connection.
const FacebookOAuthCallbackPage: React.FC = () => {
  const [status, setStatus] = useState<'working' | 'picking' | 'done' | 'error'>('working');
  const [message, setMessage] = useState('Connecting your Facebook Page…');
  const [pages, setPages] = useState<Page[]>([]);
  const [state, setState] = useState('');
  const [connecting, setConnecting] = useState(false);

  const notifyAndClose = (ok: boolean, msg: string) => {
    try {
      window.opener?.postMessage({ source: 'facebook-oauth-callback', success: ok, message: msg }, window.location.origin);
    } catch { /* opener may be gone */ }
    if (ok) setTimeout(() => window.close(), 1200);
  };

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const error = params.get('error');
      const code = params.get('code');
      const s = params.get('state');

      if (error) {
        setStatus('error');
        setMessage(`Facebook denied the request: ${error}`);
        notifyAndClose(false, `Facebook denied the request: ${error}`);
        return;
      }
      if (!code || !s) {
        setStatus('error');
        setMessage('Missing code or state from Facebook.');
        notifyAndClose(false, 'Missing code or state from Facebook.');
        return;
      }

      const token = getAdminToken();
      if (!token) {
        setStatus('error');
        setMessage('Admin session expired — close this window and log in again.');
        notifyAndClose(false, 'Admin session expired.');
        return;
      }

      try {
        const redirect_uri = `${window.location.origin}${window.location.pathname}`;
        const { data, error: fnError } = await supabase.functions.invoke('facebook-auth', {
          body: { action: 'callback', code, state: s, redirect_uri },
          headers: { 'x-admin-token': token },
        });
        if (fnError || data?.error) throw new Error(data?.error || fnError?.message);

        const foundPages: Page[] = data?.pages || [];
        setState(data?.state || s);
        if (foundPages.length === 1) {
          await connectPage(data.state || s, foundPages[0].id, token);
        } else {
          setPages(foundPages);
          setStatus('picking');
          setMessage('Choose which Page to connect:');
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Connection failed';
        setStatus('error');
        setMessage(msg);
        notifyAndClose(false, msg);
      }
    })();
  }, []);

  const connectPage = async (st: string, pageId: string, tokenOverride?: string) => {
    setConnecting(true);
    const token = tokenOverride || getAdminToken();
    try {
      const { data, error: fnError } = await supabase.functions.invoke('facebook-auth', {
        body: { action: 'connect-page', state: st, pageId },
        headers: { 'x-admin-token': token! },
      });
      if (fnError || data?.error) throw new Error(data?.error || fnError?.message);
      const msg = `Connected Page "${data?.pageName}"${data?.igUsername ? ` + Instagram @${data.igUsername}` : ''}`;
      setStatus('done');
      setMessage(msg);
      notifyAndClose(true, msg);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Connection failed';
      setStatus('error');
      setMessage(msg);
      notifyAndClose(false, msg);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-3 text-center px-6 max-w-sm">
        {status === 'working' && <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />}
        {status === 'done' && <CheckCircle2 className="w-8 h-8 text-green-500" />}
        {status === 'error' && <XCircle className="w-8 h-8 text-destructive" />}
        {status === 'picking' && <Facebook className="w-8 h-8 text-[#1877F2]" />}
        <p className="text-sm text-muted-foreground">{message}</p>

        {status === 'picking' && (
          <div className="flex flex-col gap-2 w-full mt-2">
            {pages.map((p) => (
              <Button key={p.id} variant="outline" disabled={connecting} onClick={() => connectPage(state, p.id)}>
                {connecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {p.name}
              </Button>
            ))}
          </div>
        )}

        {(status === 'done' || status === 'error') && <p className="text-xs text-muted-foreground">You can close this window.</p>}
      </div>
    </div>
  );
};

export default FacebookOAuthCallbackPage;
