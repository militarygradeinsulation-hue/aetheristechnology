import React, { useState, useRef } from 'react';
import { Search, Sparkles, Loader2, Copy, Check, ArrowRight, FileSearch, Mail, Linkedin, Brain, HelpCircle, Eye, Lightbulb, Gavel, Save, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getPortalToken } from '@/lib/portalAuth';
import { getAdminToken } from '@/lib/adminAuth';
import { saveToolRun } from '@/lib/toolSaveHelper';
import type { RepLead, LeadScan } from '@/lib/portalLeads';

interface Props {
  lead: Partial<RepLead> & Record<string, any>;
  scan: LeadScan | null;
  rr: any | null;
  fc: any | null;
  enrichment?: any | null;
  auth?: 'portal' | 'admin';
}

interface DeductionStep { step: number; from: string; to: string; evidence: string }
interface MonologueBeat { type: 'question' | 'thought' | 'observation' | 'conclusion'; text: string }
interface DetectiveResult {
  monologue?: MonologueBeat[];
  best_angle?: { title?: string; leak_or_gap?: string; estimated_cost?: string | null; why_this_one?: string };
  deduction_chain?: DeductionStep[];
  deeper_forensics?: string[];
  message?: { channel?: 'email' | 'linkedin'; subject?: string | null; body?: string; why_it_lands?: string };
  fallback_subjects?: string[];
}

export const DetectiveMode: React.FC<Props> = ({ lead, scan, rr, fc, enrichment, auth = 'portal' }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [channel, setChannel] = useState<'email' | 'linkedin'>('email');
  const [result, setResult] = useState<DetectiveResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const run = async (ch: 'email' | 'linkedin' = channel) => {
    const headers: Record<string, string> = {};
    if (auth === 'admin') {
      const t = getAdminToken();
      if (!t) { toast({ title: 'Admin session expired', variant: 'destructive' }); return; }
      headers['x-admin-token'] = t;
    } else {
      const t = getPortalToken();
      if (!t) { toast({ title: 'Sign in again', variant: 'destructive' }); return; }
      headers['x-portal-token'] = t;
    }
    setChannel(ch);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('portal-detective', {
        body: { lead, scan, rocketreach: rr, firecrawl: fc, enrichment, score: (lead as any)?.score, channel: ch },
        headers,
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult((data as any).result || null);
    } catch (e) {
      toast({ title: 'Detective failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };


  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  if (!result && !loading) {
    return (
      <div className="rounded-lg border-2 border-amber/40 bg-gradient-to-br from-amber/10 to-transparent p-3 space-y-2">
        <div className="flex items-center gap-2">
          <FileSearch className="w-4 h-4 text-amber" />
          <span className="text-sm font-display font-semibold text-foreground">Detective Mode</span>
          <span className="text-[10px] font-mono uppercase tracking-wider text-amber/70">case file</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Reads every scrap on this lead, picks the single best angle from their leaks and gaps,
          shows the deduction (point A → point B), then writes the message in Aetheris voice.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" onClick={() => run('email')} className="bg-amber text-background hover:bg-amber/90 h-8">
            <Search className="w-3 h-3 mr-1" /> Open the case (email)
          </Button>
          <Button size="sm" variant="outline" onClick={() => run('linkedin')} className="h-8 border-amber/50 text-amber hover:bg-amber/10">
            <Linkedin className="w-3 h-3 mr-1" /> LinkedIn version
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-lg border-2 border-amber/40 bg-gradient-to-br from-amber/10 to-transparent p-4 flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-amber animate-spin" />
        <div>
          <p className="text-sm font-display font-semibold text-foreground">Working the case…</p>
          <p className="text-[11px] text-muted-foreground">Cross-referencing scan, contact intel, company facts, and tech stack.</p>
        </div>
      </div>
    );
  }

  const r = result!;
  const msg = r.message || {};
  const fullMsg = msg.channel === 'email' && msg.subject
    ? `Subject: ${msg.subject}\n\n${msg.body || ''}`
    : (msg.body || '');

  return (
    <div className="rounded-lg border-2 border-amber/40 bg-gradient-to-br from-amber/10 to-transparent">
      <div className="p-3 border-b border-amber/30 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileSearch className="w-4 h-4 text-amber" />
          <span className="text-sm font-display font-semibold text-foreground">Case File</span>
          <span className="text-[10px] font-mono uppercase tracking-wider text-amber/70">{channel === 'email' ? 'email build' : 'linkedin build'}</span>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => run(channel === 'email' ? 'linkedin' : 'email')} className="h-7 text-[10px] text-amber hover:text-amber">
            <Sparkles className="w-3 h-3 mr-1" /> Rerun as {channel === 'email' ? 'LinkedIn' : 'email'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => run(channel)} className="h-7 text-[10px] text-muted-foreground">
            Regenerate
          </Button>
        </div>
      </div>

      <div className="p-3 space-y-4">
        {/* Verdict */}
        {r.best_angle && (
          <div className="rounded-md bg-background/60 border border-amber/30 p-3">
            <p className="text-[10px] font-mono uppercase tracking-wider text-amber mb-1">The verdict</p>
            <p className="text-sm font-display font-semibold text-foreground">{r.best_angle.title || r.best_angle.leak_or_gap}</p>
            {r.best_angle.leak_or_gap && r.best_angle.title && r.best_angle.leak_or_gap !== r.best_angle.title && (
              <p className="text-xs text-muted-foreground mt-0.5"><span className="text-amber/80">Leak:</span> {r.best_angle.leak_or_gap}{r.best_angle.estimated_cost ? <span className="text-amber/80"> · ~{r.best_angle.estimated_cost}/yr</span> : null}</p>
            )}
            {r.best_angle.why_this_one && <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{r.best_angle.why_this_one}</p>}
          </div>
        )}

        {/* Deduction chain */}
        {r.deduction_chain && r.deduction_chain.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-mono uppercase tracking-wider text-amber">Deduction — point A → point B</p>
            <ol className="space-y-2">
              {r.deduction_chain.map((s, i) => (
                <li key={i} className="rounded-md border border-border/50 bg-card/40 p-2.5">
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-mono text-amber bg-amber/10 border border-amber/30 rounded px-1.5 py-0.5 flex-shrink-0">{String(s.step || i + 1).padStart(2, '0')}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-muted-foreground">{s.from}</span>
                        <ArrowRight className="w-3 h-3 text-amber flex-shrink-0" />
                        <span className="text-foreground font-medium">{s.to}</span>
                      </div>
                      {s.evidence && <p className="text-[11px] text-muted-foreground/80 italic mt-1 leading-relaxed">Evidence: {s.evidence}</p>}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Deeper forensics */}
        {r.deeper_forensics && r.deeper_forensics.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-amber">Hold in reserve — bring these out on the reply</p>
            <ul className="list-disc pl-5 space-y-1 marker:text-amber/60">
              {r.deeper_forensics.map((b, i) => <li key={i} className="text-xs text-muted-foreground leading-relaxed">{b}</li>)}
            </ul>
          </div>
        )}

        {/* The message */}
        {msg.body && (
          <div className="rounded-md border border-amber/40 bg-background/80 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-mono uppercase tracking-wider text-amber flex items-center gap-1">
                {channel === 'email' ? <Mail className="w-3 h-3" /> : <Linkedin className="w-3 h-3" />} The message
              </p>
              <Button size="sm" variant="ghost" onClick={() => copy(fullMsg, 'msg')} className="h-6 text-[10px] text-amber hover:text-amber">
                {copied === 'msg' ? <><Check className="w-3 h-3 mr-1" /> Copied</> : <><Copy className="w-3 h-3 mr-1" /> Copy</>}
              </Button>
            </div>
            {msg.subject && channel === 'email' && (
              <p className="text-xs"><span className="text-muted-foreground">Subject: </span><span className="text-foreground font-medium">{msg.subject}</span></p>
            )}
            <pre className="text-[12px] text-foreground whitespace-pre-wrap font-sans leading-relaxed">{msg.body}</pre>
            {msg.why_it_lands && <p className="text-[11px] text-amber/80 italic border-t border-amber/20 pt-2">Why it lands: {msg.why_it_lands}</p>}
          </div>
        )}

        {/* Fallback subjects */}
        {r.fallback_subjects && r.fallback_subjects.length > 0 && channel === 'email' && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-amber">Alt subject lines</p>
            <div className="flex flex-wrap gap-1.5">
              {r.fallback_subjects.map((s, i) => (
                <button key={i} type="button" onClick={() => copy(s, `subj-${i}`)} className="text-[11px] rounded border border-border/50 bg-card/40 px-2 py-1 hover:border-amber/40 hover:bg-amber/5 text-muted-foreground hover:text-foreground transition-colors">
                  {copied === `subj-${i}` ? '✓ copied' : s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
