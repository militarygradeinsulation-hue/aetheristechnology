import React, { useState, useRef } from 'react';
import { Search, Sparkles, Loader2, Copy, Check, ArrowRight, FileSearch, Mail, Linkedin, Brain, HelpCircle, Eye, Lightbulb, Gavel, Save, Download, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getPortalToken } from '@/lib/portalAuth';
import { getAdminToken } from '@/lib/adminAuth';
import { saveToolRun } from '@/lib/toolSaveHelper';
import { portalLeads, type RepLead, type LeadScan } from '@/lib/portalLeads';

type PrepStep = { key: string; label: string; status: 'pending' | 'running' | 'done' | 'skip' | 'fail'; note?: string };

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
  const [revealed, setRevealed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [prepSteps, setPrepSteps] = useState<PrepStep[]>([]);
  // Live data — starts from props, gets overwritten as we auto-run tools.
  const [liveScan, setLiveScan] = useState<any>(scan);
  const [liveRr, setLiveRr] = useState<any>(rr);
  const [liveFc, setLiveFc] = useState<any>(fc);
  const [liveEnrich, setLiveEnrich] = useState<any>(enrichment);
  const tileRef = useRef<HTMLDivElement>(null);

  const updateStep = (key: string, patch: Partial<PrepStep>) =>
    setPrepSteps((s) => s.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  const gatherIntel = async (): Promise<{ scan: any; rr: any; fc: any; enrich: any }> => {
    let curScan = liveScan;
    let curRr = liveRr;
    let curFc = liveFc;
    let curEnrich = liveEnrich;

    if (auth === 'admin') {
      const steps: PrepStep[] = [];
      if (!curEnrich && (lead as any)?.id) steps.push({ key: 'enrich', label: 'AI enrichment (weak points, talking points, decision makers)', status: 'pending' });
      setPrepSteps(steps);

      if (!curEnrich && (lead as any)?.id) {
        updateStep('enrich', { status: 'running' });
        try {
          const t = getAdminToken();
          const { data, error } = await supabase.functions.invoke('admin-enrich-lead', {
            body: { ids: [(lead as any).id] },
            headers: { 'x-admin-token': t || '' },
          });
          if (error) throw new Error(error.message);
          // Re-fetch the lead row to get fresh enrichment
          const { data: rows } = await supabase.functions.invoke('admin-data', {
            body: { action: 'leads_browser', filter: 'all', search: (lead as any).business_name || '', minScore: null },
            headers: { 'x-admin-token': t || '' },
          });
          const fresh = (rows?.leads || []).find((l: any) => l.id === (lead as any).id);
          if (fresh?.enrichment) {
            curEnrich = fresh.enrichment;
            curScan = fresh.enrichment?.scan || curScan;
            curRr = fresh.enrichment?.rocketreach || curRr;
            curFc = fresh.enrichment?.firecrawl || curFc;
            setLiveEnrich(curEnrich); setLiveScan(curScan); setLiveRr(curRr); setLiveFc(curFc);
          }
          updateStep('enrich', { status: 'done', note: 'intel cached' });
        } catch (e) {
          updateStep('enrich', { status: 'fail', note: e instanceof Error ? e.message : 'failed' });
        }
      }
      return { scan: curScan, rr: curRr, fc: curFc, enrich: curEnrich };
    }

    // Portal path — chain the rep's toolbar: forensic scan, then deep scan (RocketReach + Firecrawl)
    const steps: PrepStep[] = [];
    const hasWebsite = !!(lead as any)?.website;
    if (!curScan && hasWebsite) steps.push({ key: 'scan', label: 'Forensic website scan', status: 'pending' });
    if (!curRr || !curFc) steps.push({ key: 'deep', label: 'Deep scan (RocketReach + Firecrawl)', status: 'pending' });
    setPrepSteps(steps);

    if (!curScan && hasWebsite) {
      updateStep('scan', { status: 'running' });
      try {
        const res = await portalLeads.scan((lead as any).id, { url: (lead as any).website });
        curScan = res.scan;
        setLiveScan(curScan);
        updateStep('scan', { status: 'done', note: res.scan?.grade ? `Grade ${res.scan.grade}` : 'done' });
      } catch (e) {
        updateStep('scan', { status: 'fail', note: e instanceof Error ? e.message : 'failed' });
      }
    } else if (curScan) {
      // nothing
    } else if (!hasWebsite) {
      // no scan possible
    }

    if (!curRr || !curFc) {
      updateStep('deep', { status: 'running' });
      try {
        const res: any = await portalLeads.rocketReach((lead as any).id, {});
        curRr = res.person || curRr;
        if (res.firecrawl) curFc = res.firecrawl;
        setLiveRr(curRr); setLiveFc(curFc);
        updateStep('deep', { status: 'done', note: res.cached ? 'loaded saved' : 'fresh pull' });
      } catch (e) {
        updateStep('deep', { status: 'fail', note: e instanceof Error ? e.message : 'failed' });
      }
    }

    return { scan: curScan, rr: curRr, fc: curFc, enrich: curEnrich };
  };

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
    setResult(null);
    setRevealed(0);
    try {
      // 1) Auto-run the rep's toolbar so the detective has everything.
      const intel = await gatherIntel();
      // 2) Now run the detective with the freshly assembled dossier.
      const { data, error } = await supabase.functions.invoke('portal-detective', {
        body: { lead, scan: intel.scan, rocketreach: intel.rr, firecrawl: intel.fc, enrichment: intel.enrich, score: (lead as any)?.score, channel: ch },
        headers,
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      const res = (data as any).result || null;
      setResult(res);
      const beats = res?.monologue?.length || 0;
      if (beats > 0) {
        for (let i = 1; i <= beats; i++) {
          setTimeout(() => setRevealed((r) => Math.max(r, i)), i * 650);
        }
      }
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

  const buildCaseText = (r: DetectiveResult): string => {
    const L: string[] = [];
    const who = (lead as any)?.business_name || (lead as any)?.contact_name || 'lead';
    L.push(`AETHERIS — CASE FILE`);
    L.push(`Subject: ${who}`);
    L.push(`Channel: ${channel}`);
    L.push(`Generated: ${new Date().toLocaleString()}`);
    L.push('');
    if (r.monologue?.length) {
      L.push('── DETECTIVE MONOLOGUE ──');
      r.monologue.forEach((b) => L.push(`[${b.type.toUpperCase()}] ${b.text}`));
      L.push('');
    }
    if (r.best_angle) {
      L.push('── VERDICT ──');
      L.push(r.best_angle.title || r.best_angle.leak_or_gap || '');
      if (r.best_angle.leak_or_gap) L.push(`Leak: ${r.best_angle.leak_or_gap}${r.best_angle.estimated_cost ? ` (~${r.best_angle.estimated_cost}/yr)` : ''}`);
      if (r.best_angle.why_this_one) L.push(r.best_angle.why_this_one);
      L.push('');
    }
    if (r.deduction_chain?.length) {
      L.push('── DEDUCTION (A → B) ──');
      r.deduction_chain.forEach((s, i) => {
        L.push(`${String(s.step || i + 1).padStart(2, '0')}. ${s.from}  →  ${s.to}`);
        if (s.evidence) L.push(`    Evidence: ${s.evidence}`);
      });
      L.push('');
    }
    if (r.deeper_forensics?.length) {
      L.push('── HOLD IN RESERVE ──');
      r.deeper_forensics.forEach((b) => L.push(`• ${b}`));
      L.push('');
    }
    if (r.message?.body) {
      L.push('── THE MESSAGE ──');
      if (r.message.subject && channel === 'email') L.push(`Subject: ${r.message.subject}`);
      L.push('');
      L.push(r.message.body);
      if (r.message.why_it_lands) { L.push(''); L.push(`Why it lands: ${r.message.why_it_lands}`); }
    }
    return L.join('\n');
  };

  const downloadCase = (r: DetectiveResult) => {
    const text = buildCaseText(r);
    const who = ((lead as any)?.business_name || 'case').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `case-file-${who}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const saveCase = async (r: DetectiveResult) => {
    setSaving(true);
    try {
      await saveToolRun({
        tool_type: 'detective_case',
        title: `Case File — ${(lead as any)?.business_name || (lead as any)?.contact_name || 'lead'}`,
        input_data: { lead_id: (lead as any)?.id, channel },
        output_data: { ...r, _text: buildCaseText(r) },
      });
      toast({ title: 'Saved to library' });
    } catch (e) {
      toast({ title: 'Save failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const beatIcon = (t: MonologueBeat['type']) => {
    if (t === 'question') return <HelpCircle className="w-3.5 h-3.5 text-amber" />;
    if (t === 'observation') return <Eye className="w-3.5 h-3.5 text-sky-400" />;
    if (t === 'conclusion') return <Gavel className="w-3.5 h-3.5 text-emerald-400" />;
    return <Lightbulb className="w-3.5 h-3.5 text-amber/70" />;
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

      <div className="p-3 space-y-4" ref={tileRef}>
        {/* Detective monologue — the brain on display */}
        {r.monologue && r.monologue.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Brain className="w-3.5 h-3.5 text-amber" />
              <p className="text-[10px] font-mono uppercase tracking-wider text-amber">Inside the detective's head</p>
            </div>
            <div className="space-y-1.5">
              {r.monologue.slice(0, revealed).map((b, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 rounded-md border p-2 animate-fade-in ${
                    b.type === 'question'
                      ? 'border-amber/30 bg-amber/5'
                      : b.type === 'conclusion'
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : b.type === 'observation'
                      ? 'border-sky-500/20 bg-sky-500/5'
                      : 'border-border/40 bg-card/30'
                  }`}
                >
                  <div className="mt-0.5 flex-shrink-0">{beatIcon(b.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                      {b.type === 'question' ? 'asks itself' : b.type}
                    </p>
                    <p className={`text-[12px] leading-relaxed ${b.type === 'question' ? 'text-amber italic' : 'text-foreground'}`}>
                      {b.type === 'question' ? `"${b.text}"` : b.text}
                    </p>
                  </div>
                </div>
              ))}
              {revealed < r.monologue.length && (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground italic pl-1">
                  <Loader2 className="w-3 h-3 animate-spin text-amber" /> thinking…
                </div>
              )}
            </div>
          </div>
        )}

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

        {/* Save / Copy / Download — the case-file tile actions */}
        <div className="rounded-md border-2 border-dashed border-amber/40 bg-background/40 p-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileSearch className="w-4 h-4 text-amber flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-display font-semibold text-foreground truncate">Keep this case file</p>
              <p className="text-[10px] text-muted-foreground truncate">Save the full deduction + monologue + message</p>
            </div>
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <Button size="sm" variant="outline" onClick={() => copy(buildCaseText(r), 'case')} className="h-7 text-[10px] border-amber/40 text-amber hover:bg-amber/10">
              {copied === 'case' ? <><Check className="w-3 h-3 mr-1" /> Copied</> : <><Copy className="w-3 h-3 mr-1" /> Copy</>}
            </Button>
            <Button size="sm" variant="outline" onClick={() => downloadCase(r)} className="h-7 text-[10px] border-amber/40 text-amber hover:bg-amber/10">
              <Download className="w-3 h-3 mr-1" /> Download
            </Button>
            <Button size="sm" onClick={() => saveCase(r)} disabled={saving} className="h-7 text-[10px] bg-amber text-background hover:bg-amber/90">
              {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />} Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
