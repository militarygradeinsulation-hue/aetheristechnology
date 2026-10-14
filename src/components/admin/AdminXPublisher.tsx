import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Twitter, Loader2, CheckCircle2, RefreshCw, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';

const MAX = 280;

interface Status {
  connected: boolean;
  username?: string;
}

const AdminXPublisher: React.FC = () => {
  const { toast } = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [text, setText] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [lastPostId, setLastPostId] = useState<string | null>(null);

  const call = useCallback(async (fn: 'x-auth' | 'x-post', body: Record<string, unknown>) => {
    const token = getAdminToken();
    const { data, error } = await supabase.functions.invoke(fn, {
      body,
      headers: token ? { 'x-admin-token': token } : {},
    });
    if (error || data?.error) throw new Error(data?.error || error?.message);
    return data;
  }, []);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const data = await call('x-auth', { action: 'status' });
      setStatus(data);
    } catch (e) {
      toast({ title: 'Could not load X status', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoadingStatus(false);
    }
  }, [call, toast]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  useEffect(() => {
    const handler = (ev: MessageEvent) => {
      if (ev.origin !== window.location.origin) return;
      if (ev.data?.source !== 'x-oauth-callback') return;
      if (ev.data.success) {
        toast({ title: 'X connected', description: ev.data.message });
        loadStatus();
      } else {
        toast({ title: 'X connection failed', description: ev.data.message, variant: 'destructive' });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [loadStatus, toast]);

  const connect = async () => {
    setConnecting(true);
    try {
      const redirect_uri = `${window.location.origin}/admin/x-callback`;
      const data = await call('x-auth', { action: 'authorize', redirect_uri });
      window.open(data.url, 'x-oauth', 'width=600,height=720');
    } catch (e) {
      toast({ title: 'Could not start X connection', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    if (!confirm('Disconnect this X account?')) return;
    try {
      await call('x-auth', { action: 'disconnect' });
      setStatus({ connected: false });
      toast({ title: 'X disconnected' });
    } catch (e) {
      toast({ title: 'Failed to disconnect', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const publish = async () => {
    if (!text.trim()) {
      toast({ title: 'Post is empty', variant: 'destructive' });
      return;
    }
    setPublishing(true);
    setLastPostId(null);
    try {
      const data = await call('x-post', { action: 'quick-post', content: text.trim() });
      setLastPostId(data?.xPostId ?? 'posted');
      toast({ title: 'Posted to X', description: data?.xPostId ? `Post ID: ${data.xPostId}` : 'Published successfully.' });
      setText('');
    } catch (e) {
      toast({ title: 'X post failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setPublishing(false);
    }
  };

  const remaining = MAX - text.length;
  const over = remaining < 0;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between border border-border rounded-lg p-4 bg-card">
        <div className="flex items-center gap-3">
          <Twitter className="w-6 h-6 text-foreground" />
          <div>
            <div className="font-semibold text-sm">
              {loadingStatus ? 'Loading…' : status?.connected ? `@${status.username}` : 'Not connected'}
            </div>
            <div className="text-xs text-muted-foreground">
              {status?.connected ? 'Connected via native X OAuth2' : 'Connect your X (Twitter) account to post'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status?.connected ? (
            <Button variant="ghost" size="sm" onClick={disconnect}>
              <LogOut className="w-4 h-4 mr-1.5" /> Disconnect
            </Button>
          ) : (
            <Button size="sm" onClick={connect} disabled={connecting}>
              {connecting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null} Connect X
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={loadStatus} disabled={loadingStatus}>
            <RefreshCw className={`w-4 h-4 ${loadingStatus ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div>
        <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1 block">
          Post content
        </label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="Write your post…"
          className="font-mono text-sm"
          disabled={!status?.connected}
        />
        <div className={`text-xs mt-1 ${over ? 'text-destructive' : 'text-muted-foreground'}`}>
          {remaining} characters remaining
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={publish} disabled={publishing || over || !text.trim() || !status?.connected}>
          {publishing ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Posting…</>
          ) : (
            <><Twitter className="w-4 h-4 mr-2" />Post to X</>
          )}
        </Button>
        {lastPostId && (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> Posted • {lastPostId}
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground border-t border-border pt-3">
        Requires an X Developer App with OAuth 2.0 enabled (Client ID/Secret set as
        <code className="mx-1">X_CLIENT_ID</code> / <code className="mx-1">X_CLIENT_SECRET</code> secrets) and
        <code className="mx-1">tweet.write</code> access approved for your app.
      </p>
    </div>
  );
};

export default AdminXPublisher;
