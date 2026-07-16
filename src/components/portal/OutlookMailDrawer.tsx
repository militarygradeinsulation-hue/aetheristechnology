// In-app Outlook compose drawer. Mounted once at the portal root; opens when any
// caller dispatches the `aetheris:openOutlookCompose` event (see src/lib/outlookMail.ts).
import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Send, ExternalLink, Inbox, RefreshCw, Plug } from 'lucide-react';
import { onOutlookCompose, sendOutlookMail, listOutlookMessagesWith, type OutlookMessage } from '@/lib/outlookMail';
import { outlookConnect, type OutlookStatus } from '@/lib/outlookConnect';
import { loadRepMailPrefs, buildDefaultSignature } from '@/lib/repMail';
import { getPortalProfile } from '@/lib/portalAuth';

export const OutlookMailDrawer: React.FC = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<OutlookStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [thread, setThread] = useState<OutlookMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadErr, setThreadErr] = useState<string | null>(null);

  // Listen for global open requests.
  useEffect(() => {
    return onOutlookCompose(async (d) => {
      setTo(d.to || '');
      setCc(d.cc || '');
      setSubject(d.subject || '');
      // Auto-append signature when body is provided without one
      let nextBody = d.body || '';
      try {
        const prefs = await loadRepMailPrefs();
        const sig = prefs.signature || buildDefaultSignature(getPortalProfile()?.rep_name);
        if (sig && nextBody && !nextBody.includes(sig.split('\n')[0])) {
          nextBody = `${nextBody}\n\n--\n${sig}`;
        } else if (sig && !nextBody) {
          nextBody = `\n\n--\n${sig}`;
        }
      } catch { /* ignore */ }
      setBody(nextBody);
      setOpen(true);
    });
  }, []);

  // When drawer opens, fetch connection status + thread history.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setStatusLoading(true);
      try {
        const s = await outlookConnect.getStatus();
        if (!cancelled) setStatus(s);
      } catch (e: any) {
        if (!cancelled) setStatus({ configured: false, connected: false, outlook_email: null, expires_at: null, connected_at: null, has_refresh_token: false, scope: null });
      } finally {
        if (!cancelled) setStatusLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (!open || !status?.connected || !to || !to.includes('@')) {
      setThread([]); return;
    }
    let cancelled = false;
    (async () => {
      setThreadLoading(true);
      setThreadErr(null);
      try {
        const r = await listOutlookMessagesWith(to.trim(), 8);
        if (!cancelled) setThread(r.messages || []);
      } catch (e: any) {
        if (!cancelled) setThreadErr(String(e?.message || e));
      } finally {
        if (!cancelled) setThreadLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, status?.connected, to]);

  const handleConnect = async () => {
    try {
      const url = await outlookConnect.getAuthUrl();
      const w = window.open(url, 'outlookauth', 'width=520,height=720');
      if (!w) {
        window.location.href = url;
        return;
      }
      const handler = async (ev: MessageEvent) => {
        if (ev?.data?.type === 'outlook_oauth') {
          window.removeEventListener('message', handler);
          const s = await outlookConnect.getStatus();
          setStatus(s);
          if (s.connected) toast({ title: 'Outlook connected', description: s.outlook_email || '' });
        }
      };
      window.addEventListener('message', handler);
    } catch (e: any) {
      toast({ title: 'Could not start sign-in', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  const handleSend = async () => {
    if (!to.trim()) { toast({ title: 'Add a recipient' }); return; }
    setSending(true);
    try {
      const r = await sendOutlookMail({ to: to.trim(), cc: cc.trim() || undefined, subject, body });
      toast({ title: 'Email sent', description: r.from ? `From ${r.from}` : undefined });
      setOpen(false);
      setSubject(''); setBody(''); setCc('');
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg === 'OUTLOOK_NOT_CONNECTED') {
        const s = await outlookConnect.getStatus().catch(() => null);
        if (s) setStatus(s);
        toast({ title: 'Connect Outlook first', description: 'Your Outlook session expired — reconnect to send.', variant: 'destructive' });
      } else {
        toast({ title: 'Send failed', description: msg, variant: 'destructive' });
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/40">
          <SheetTitle className="flex items-center gap-2 font-display">
            <Mail className="w-5 h-5 text-amber" /> Outlook compose
          </SheetTitle>
          <SheetDescription className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {statusLoading ? 'Checking connection…' :
              status?.connected ? <>Sending as <span className="text-amber">{status.outlook_email}</span></> :
              'Outlook not connected'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {!statusLoading && !status?.connected && (
            <div className="rounded-md border border-amber/40 bg-amber/10 p-4 space-y-3">
              <p className="text-sm">
                Connect your Outlook account to send and review email from inside the portal — no tab-switching.
              </p>
              {!status?.configured && (
                <p className="text-xs text-muted-foreground">
                  (Server is missing Microsoft OAuth credentials. Ask Joseph to set <code className="font-mono">MS_OAUTH_CLIENT_ID</code> / <code className="font-mono">MS_OAUTH_CLIENT_SECRET</code>.)
                </p>
              )}
              <Button size="sm" onClick={handleConnect} disabled={!status?.configured} className="bg-amber text-background hover:bg-amber/90">
                <Plug className="w-4 h-4 mr-1" /> Connect Outlook
              </Button>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="ml-to" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">To</Label>
            <Input id="ml-to" value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@company.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ml-cc" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Cc (optional)</Label>
            <Input id="ml-cc" value={cc} onChange={(e) => setCc(e.target.value)} placeholder="comma separated" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ml-sub" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Subject</Label>
            <Input id="ml-sub" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ml-body" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Message</Label>
            <Textarea id="ml-body" value={body} onChange={(e) => setBody(e.target.value)} rows={14} className="font-sans" />
          </div>

          {status?.connected && to.includes('@') && (
            <div className="pt-3 border-t border-border/40">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Inbox className="w-3.5 h-3.5" /> Recent thread with {to}
                </p>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setTo(t => t)} disabled={threadLoading}>
                  <RefreshCw className={`w-3.5 h-3.5 ${threadLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              {threadLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : threadErr ? (
                <p className="text-xs text-destructive">{threadErr}</p>
              ) : thread.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No prior emails with this address.</p>
              ) : (
                <ul className="space-y-2">
                  {thread.map((m) => (
                    <li key={m.id} className="rounded border border-border/40 bg-secondary/30 p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{m.subject}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {m.from_name || m.from} · {new Date(m.received).toLocaleString()}
                          </p>
                        </div>
                        {m.web_link && (
                          <a href={m.web_link} target="_blank" rel="noopener noreferrer" className="text-amber hover:opacity-80" title="Open in Outlook Web">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{m.preview}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <SheetFooter className="px-5 py-3 border-t border-border/40 flex-row gap-2 sm:justify-end">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={sending}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending || !status?.connected} className="bg-amber text-background hover:bg-amber/90">
            {sending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
            Send
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default OutlookMailDrawer;
