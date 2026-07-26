import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Facebook, Instagram, Loader2, CheckCircle2, RefreshCw, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';

interface Status {
  connected: boolean;
  pageName?: string;
  igUsername?: string;
  igConnected?: boolean;
}

const AdminFacebookPublisher: React.FC = () => {
  const { toast } = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const [fbText, setFbText] = useState('');
  const [fbPublishing, setFbPublishing] = useState(false);
  const [fbLastId, setFbLastId] = useState<string | null>(null);

  const [igCaption, setIgCaption] = useState('');
  const [igMediaUrl, setIgMediaUrl] = useState('');
  const [igPublishing, setIgPublishing] = useState(false);
  const [igLastId, setIgLastId] = useState<string | null>(null);

  const call = useCallback(async (fn: 'facebook-auth' | 'facebook-post' | 'instagram-post', body: Record<string, unknown>) => {
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
      const data = await call('facebook-auth', { action: 'status' });
      setStatus(data);
    } catch (e) {
      toast({ title: 'Could not load Facebook status', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoadingStatus(false);
    }
  }, [call, toast]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  useEffect(() => {
    const handler = (ev: MessageEvent) => {
      if (ev.origin !== window.location.origin) return;
      if (ev.data?.source !== 'facebook-oauth-callback') return;
      if (ev.data.success) {
        toast({ title: 'Facebook connected', description: ev.data.message });
        loadStatus();
      } else {
        toast({ title: 'Facebook connection failed', description: ev.data.message, variant: 'destructive' });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [loadStatus, toast]);

  const connect = async () => {
    setConnecting(true);
    try {
      const redirect_uri = `${window.location.origin}/admin/facebook-callback`;
      const data = await call('facebook-auth', { action: 'authorize', redirect_uri });
      window.open(data.url, 'facebook-oauth', 'width=600,height=720');
    } catch (e) {
      toast({ title: 'Could not start Facebook connection', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    if (!confirm('Disconnect this Facebook Page (and its linked Instagram)?')) return;
    try {
      await call('facebook-auth', { action: 'disconnect' });
      setStatus({ connected: false });
      toast({ title: 'Facebook disconnected' });
    } catch (e) {
      toast({ title: 'Failed to disconnect', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const publishFacebook = async () => {
    if (!fbText.trim()) {
      toast({ title: 'Post is empty', variant: 'destructive' });
      return;
    }
    setFbPublishing(true);
    setFbLastId(null);
    try {
      const data = await call('facebook-post', { action: 'quick-post', content: fbText.trim() });
      setFbLastId(data?.facebookPostId ?? 'posted');
      toast({ title: 'Posted to Facebook Page' });
      setFbText('');
    } catch (e) {
      toast({ title: 'Facebook post failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setFbPublishing(false);
    }
  };

  const publishInstagram = async () => {
    if (!igMediaUrl.trim()) {
      toast({ title: 'Image URL required', description: "Instagram's API can't publish text-only posts.", variant: 'destructive' });
      return;
    }
    setIgPublishing(true);
    setIgLastId(null);
    try {
      const data = await call('instagram-post', { action: 'quick-post', caption: igCaption.trim(), mediaUrl: igMediaUrl.trim() });
      setIgLastId(data?.instagramPostId ?? 'posted');
      toast({ title: 'Posted to Instagram' });
      setIgCaption('');
      setIgMediaUrl('');
    } catch (e) {
      toast({ title: 'Instagram post failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setIgPublishing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between border border-border rounded-lg p-4 bg-card">
        <div className="flex items-center gap-3">
          <Facebook className="w-6 h-6 text-[#1877F2]" />
          <div>
            <div className="font-semibold text-sm">
              {loadingStatus ? 'Loading…' : status?.connected ? status.pageName : 'Not connected'}
            </div>
            <div className="text-xs text-muted-foreground">
              {status?.connected
                ? status.igConnected ? `Instagram linked: @${status.igUsername}` : 'No Instagram Business account linked to this Page'
                : 'Connect a Facebook Page to post'}
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
              {connecting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null} Connect Facebook Page
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={loadStatus} disabled={loadingStatus}>
            <RefreshCw className={`w-4 h-4 ${loadingStatus ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Facebook className="w-4 h-4 text-[#1877F2]" /> Post to Facebook Page
        </div>
        <Textarea
          value={fbText}
          onChange={(e) => setFbText(e.target.value)}
          rows={5}
          placeholder="Write your Facebook post…"
          className="font-mono text-sm"
          disabled={!status?.connected}
        />
        <div className="flex items-center gap-3">
          <Button onClick={publishFacebook} disabled={fbPublishing || !fbText.trim() || !status?.connected}>
            {fbPublishing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Posting…</> : <><Facebook className="w-4 h-4 mr-2" />Post to Facebook</>}
          </Button>
          {fbLastId && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Posted • {fbLastId}</span>}
        </div>
      </div>

      <div className="space-y-3 border-t border-border pt-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Instagram className="w-4 h-4 text-[#E1306C]" /> Post to Instagram
        </div>
        <p className="text-xs text-muted-foreground">
          Instagram's Graph API only publishes posts backed by an image or video — there's no text-only post.
        </p>
        <Input
          value={igMediaUrl}
          onChange={(e) => setIgMediaUrl(e.target.value)}
          placeholder="https://…/image.jpg (must be a public URL)"
          className="text-sm"
          disabled={!status?.igConnected}
        />
        <Textarea
          value={igCaption}
          onChange={(e) => setIgCaption(e.target.value)}
          rows={3}
          placeholder="Caption…"
          className="font-mono text-sm"
          disabled={!status?.igConnected}
        />
        <div className="flex items-center gap-3">
          <Button onClick={publishInstagram} disabled={igPublishing || !igMediaUrl.trim() || !status?.igConnected}>
            {igPublishing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Posting…</> : <><Instagram className="w-4 h-4 mr-2" />Post to Instagram</>}
          </Button>
          {igLastId && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Posted • {igLastId}</span>}
        </div>
      </div>

      <p className="text-xs text-muted-foreground border-t border-border pt-3">
        Requires a Meta App (Facebook Login for Business) with <code className="mx-1">FACEBOOK_APP_ID</code> /
        <code className="mx-1">FACEBOOK_APP_SECRET</code> secrets set, and <code className="mx-1">pages_manage_posts</code> /
        <code className="mx-1">instagram_content_publish</code> permissions approved in App Review for anything beyond
        your own test Page.
      </p>
    </div>
  );
};

export default AdminFacebookPublisher;
