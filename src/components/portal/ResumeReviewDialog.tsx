import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Download, Lock, Paperclip, Send, FileText, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getPortalToken } from '@/lib/portalAuth';

interface Application {
  id: string;
  share_code: string;
  candidate_name: string;
  candidate_email: string;
  resume_filename: string | null;
  resume_path: string | null;
  ai_fit_score?: number | null;
  ai_summary?: string | null;
  ai_strengths?: string[] | null;
  ai_concerns?: string[] | null;
  ai_analyzed_at?: string | null;
}

interface MessageRow {
  id: string;
  body: string;
  author_rep_code: string;
  author_name: string | null;
  attachment_path: string | null;
  attachment_filename: string | null;
  attachment_url: string | null;
  created_at: string;
}

interface Props {
  app: Application | null;
  onClose: () => void;
  onAppUpdated?: (a: Application) => void;
}

const invokeAuth = async (body: Record<string, unknown>) => {
  const token = getPortalToken();
  if (!token) throw new Error('Portal session expired');
  const { data, error } = await supabase.functions.invoke('careers-test', {
    body, headers: { 'x-portal-token': token },
  });
  if (error) throw new Error(error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as any;
};

export const ResumeReviewDialog: React.FC<Props> = ({ app, onClose, onAppUpdated }) => {
  const { toast } = useToast();
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [resumeHtml, setResumeHtml] = useState<string | null>(null);
  const [resumeMime, setResumeMime] = useState<string>('application/pdf');
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Local copy so we can show fresh AI results immediately
  const [local, setLocal] = useState<Application | null>(app);
  useEffect(() => { setLocal(app); setResumeUrl(null); setResumeHtml(null); setMessages([]); setDraft(''); setPendingFile(null); }, [app?.id]);

  useEffect(() => {
    if (!app) return;
    (async () => {
      setLoadingUrl(true);
      try {
        const data = await invokeAuth({ action: 'admin_resume_url', share_code: app.share_code });
        if (data.html) {
          const blobUrl = URL.createObjectURL(new Blob([data.html], { type: 'text/html' }));
          setResumeHtml(blobUrl);
          setResumeUrl(data.url || blobUrl);
        } else {
          setResumeUrl(data.url);
        }
        setResumeMime(data.mime || 'application/pdf');
      } catch (e) {
        toast({ title: 'Could not load resume', description: e instanceof Error ? e.message : '', variant: 'destructive' });
      } finally { setLoadingUrl(false); }
    })();
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app?.id]);

  useEffect(() => () => { if (resumeHtml) URL.revokeObjectURL(resumeHtml); }, [resumeHtml]);

  const loadMessages = async () => {
    if (!app) return;
    setLoadingMsgs(true);
    try {
      const data = await invokeAuth({ action: 'messages_list', share_code: app.share_code });
      setMessages(data.messages || []);
    } catch (e) {
      // not fatal
    } finally { setLoadingMsgs(false); }
  };

  const runAi = async () => {
    if (!local) return;
    setAnalyzing(true);
    try {
      const data = await invokeAuth({ action: 'ai_analyze_resume', share_code: local.share_code });
      const next: Application = {
        ...local,
        ai_fit_score: data.fit_score,
        ai_summary: data.summary,
        ai_strengths: data.strengths,
        ai_concerns: data.concerns,
        ai_analyzed_at: new Date().toISOString(),
      };
      setLocal(next);
      onAppUpdated?.(next);
      toast({ title: `Fit score: ${data.fit_score}/100` });
    } catch (e) {
      toast({ title: 'AI analysis failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally { setAnalyzing(false); }
  };

  const sendMessage = async () => {
    if (!app) return;
    if (!draft.trim() && !pendingFile) return;
    setSending(true);
    try {
      let attachment_path: string | undefined;
      let attachment_filename: string | undefined;
      if (pendingFile) {
        const up = await invokeAuth({ action: 'messages_upload_url', share_code: app.share_code, filename: pendingFile.name });
        const r = await fetch(up.signed_url, { method: 'PUT', body: pendingFile, headers: { 'Content-Type': pendingFile.type || 'application/octet-stream' } });
        if (!r.ok) throw new Error(`Upload failed (${r.status})`);
        attachment_path = up.path;
        attachment_filename = pendingFile.name;
      }
      await invokeAuth({
        action: 'messages_send',
        share_code: app.share_code,
        body: draft.trim(),
        attachment_path,
        attachment_filename,
      });
      setDraft('');
      setPendingFile(null);
      if (fileRef.current) fileRef.current.value = '';
      await loadMessages();
    } catch (e) {
      toast({ title: 'Send failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally { setSending(false); }
  };

  if (!app || !local) return null;

  const scoreColor = (s: number) =>
    s >= 80 ? 'bg-green-500/20 text-green-400 border-green-500/40' :
    s >= 60 ? 'bg-amber/20 text-amber border-amber/40' :
    'bg-destructive/20 text-destructive border-destructive/40';

  const isPdf = resumeMime === 'application/pdf';

  return (
    <Dialog open={!!app} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl w-[95vw] h-[92vh] p-0 flex flex-col">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle className="font-display flex items-center gap-2 flex-wrap">
            <FileText className="w-4 h-4 text-amber" />
            {local.candidate_name}
            <Badge variant="outline" className="font-mono text-xs">{local.share_code}</Badge>
            {local.ai_fit_score != null && (
              <Badge className={`border ${scoreColor(local.ai_fit_score)}`}>Fit {local.ai_fit_score}/100</Badge>
            )}
            <span className="text-xs text-muted-foreground font-normal ml-1">{local.candidate_email}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-0 min-h-0">
          {/* Left: resume viewer */}
          <div className="bg-muted/20 border-r flex flex-col min-h-0">
            <div className="flex items-center justify-between px-3 py-2 border-b text-xs">
              <span className="font-mono text-muted-foreground truncate">{local.resume_filename || 'resume'}</span>
              {resumeUrl && (
                <a href={resumeUrl} download={local.resume_filename || 'resume'} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="ghost"><Download className="w-3 h-3 mr-1" />Download</Button>
                </a>
              )}
            </div>
            <div className="flex-1 min-h-0">
              {loadingUrl ? (
                <div className="flex items-center justify-center h-full"><Loader2 className="w-5 h-5 animate-spin" /></div>
              ) : !resumeUrl && !resumeHtml ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No resume on file.</div>
              ) : resumeHtml ? (
                <iframe src={resumeHtml} title="Recreated resume" className="w-full h-full border-0" />
              ) : isPdf ? (
                <iframe src={resumeUrl} title="Resume" className="w-full h-full border-0" />
              ) : (
                <div className="p-6 text-sm space-y-3">
                  <p className="text-muted-foreground">This file type can't preview inline.</p>
                  <a href={resumeUrl} target="_blank" rel="noreferrer">
                    <Button size="sm"><Download className="w-3 h-3 mr-1" />Open / Download</Button>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Right: AI + private messages */}
          <div className="flex flex-col min-h-0">
            {/* AI panel */}
            <div className="border-b p-3 space-y-2 max-h-[45%] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h4 className="font-display font-bold text-sm flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber" /> AI Fit Assessment
                </h4>
                <Button size="sm" onClick={runAi} disabled={analyzing} className="bg-amber text-background hover:bg-amber/90">
                  {analyzing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                  {local.ai_analyzed_at ? 'Re-analyze' : 'Analyze with AI'}
                </Button>
              </div>
              {!local.ai_analyzed_at && !analyzing && (
                <p className="text-xs text-muted-foreground">Click Analyze to score this candidate against Aetheris hiring standards.</p>
              )}
              {local.ai_summary && (
                <>
                  <p className="text-xs whitespace-pre-wrap text-foreground/90">{local.ai_summary}</p>
                  {!!(local.ai_strengths?.length) && (
                    <div>
                      <div className="text-[10px] font-mono uppercase text-green-400 mt-2">Strengths</div>
                      <ul className="text-xs list-disc list-inside space-y-0.5">{local.ai_strengths!.map((s, i) => <li key={i}>{s}</li>)}</ul>
                    </div>
                  )}
                  {!!(local.ai_concerns?.length) && (
                    <div>
                      <div className="text-[10px] font-mono uppercase text-destructive mt-2">Concerns</div>
                      <ul className="text-xs list-disc list-inside space-y-0.5">{local.ai_concerns!.map((s, i) => <li key={i}>{s}</li>)}</ul>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Private messages */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-3 py-2 border-b flex items-center gap-2 text-xs">
                <Lock className="w-3 h-3 text-amber" />
                <span className="font-mono uppercase tracking-wider text-muted-foreground">Private notes & messages</span>
                <span className="text-muted-foreground/70">(only you can see these)</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {loadingMsgs ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> :
                  messages.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">No messages yet.</p> :
                  messages.map(m => (
                    <div key={m.id} className="rounded-md bg-secondary/40 p-2 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                        <span>{m.author_name || m.author_rep_code}</span>
                        <span>{new Date(m.created_at).toLocaleString()}</span>
                      </div>
                      {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
                      {m.attachment_url && (
                        <a href={m.attachment_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-amber hover:underline">
                          <Paperclip className="w-3 h-3" />{m.attachment_filename || 'attachment'}
                        </a>
                      )}
                    </div>
                  ))
                }
              </div>
              <div className="border-t p-2 space-y-2">
                {pendingFile && (
                  <div className="flex items-center gap-2 text-xs bg-secondary/40 rounded px-2 py-1">
                    <Paperclip className="w-3 h-3" /> <span className="truncate flex-1">{pendingFile.name}</span>
                    <button onClick={() => { setPendingFile(null); if (fileRef.current) fileRef.current.value = ''; }} className="hover:text-destructive"><X className="w-3 h-3" /></button>
                  </div>
                )}
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a private note or message…"
                  rows={2}
                  className="text-sm bg-background/40"
                />
                <div className="flex items-center justify-between gap-2">
                  <input ref={fileRef} type="file" hidden onChange={(e) => setPendingFile(e.target.files?.[0] || null)} />
                  <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                    <Paperclip className="w-3 h-3 mr-1" />Attach
                  </Button>
                  <Button size="sm" onClick={sendMessage} disabled={sending || (!draft.trim() && !pendingFile)} className="bg-amber text-background hover:bg-amber/90">
                    {sending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ResumeReviewDialog;
