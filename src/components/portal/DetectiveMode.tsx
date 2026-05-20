import React, { useState, useRef, useEffect } from 'react';
import { Search, Sparkles, Loader2, Copy, Check, ArrowRight, ArrowDown, FileSearch, Mail, Linkedin, Brain, HelpCircle, Eye, Lightbulb, Gavel, Save, Download, CheckCircle2, MapPin, Pin, Stamp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getPortalToken } from '@/lib/portalAuth';
import { getAdminToken } from '@/lib/adminAuth';
import { saveToolRun } from '@/lib/toolSaveHelper';
import { portalLeads, type RepLead, type LeadScan } from '@/lib/portalLeads';
import { ReadAloudButton } from '@/components/ReadAloudButton';

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
  const [selfTalk, setSelfTalk] = useState<string[]>([]);
  // Live data — starts from props, gets overwritten as we auto-run tools.
  const [liveScan, setLiveScan] = useState<any>(scan);
  const [liveRr, setLiveRr] = useState<any>(rr);
  const [liveFc, setLiveFc] = useState<any>(fc);
  const [liveEnrich, setLiveEnrich] = useState<any>(enrichment);
  const tileRef = useRef<HTMLDivElement>(null);
  const talkScrollRef = useRef<HTMLDivElement>(null);

  // Live detective self-talk while loading. Cycles a bank of lead-aware lines.
  useEffect(() => {
    if (!loading) return;
    const who = (lead as any)?.business_name || (lead as any)?.contact_name || 'this one';
    const site = (lead as any)?.website || 'their site';
    const industry = (lead as any)?.industry || 'their space';
    const runningLabel = prepSteps.find((s) => s.status === 'running')?.label;
    const bank = [
      `Alright… ${who}. What are you hiding?`,
      `Pulling up ${site}. Let's see what the front door says about the back office.`,
      `${industry}, huh. I've seen this pattern before.`,
      `Where's the bleed? Has to be somewhere obvious if I just stop blinking.`,
      `Three things people never fix until it's too late. Which one is theirs?`,
      `If revenue's fine, then the leak is in time. If time's fine, it's in margin.`,
      `Don't trust the homepage. Trust the careers page. That's where the truth lives.`,
      `Who actually signs off here? Not the title — the person.`,
      runningLabel ? `Running ${runningLabel.toLowerCase()}…` : `Cross-referencing what I've got.`,
      `Okay. Connect the dots. From signal to dollar.`,
      `If I were them, what would I be lying to myself about right now?`,
      `One angle. Just one. The one they can't unsee.`,
      `Cost it. Name it. Make it impossible to ignore.`,
      `Almost there. Sharpening the hook.`,
    ];
    let i = 0;
    setSelfTalk([bank[0]]);
    const id = setInterval(() => {
      i = (i + 1) % bank.length;
      setSelfTalk((prev) => {
        const next = [...prev, bank[i]];
        return next.length > 20 ? next.slice(next.length - 20) : next;
      });
    }, 1700);
    return () => clearInterval(id);
  }, [loading, prepSteps, lead]);

  useEffect(() => {
    if (talkScrollRef.current) {
      talkScrollRef.current.scrollTop = talkScrollRef.current.scrollHeight;
    }
  }, [selfTalk]);

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
        <div className="flex flex-wrap gap-2 pt-1 items-center">
          <Button size="sm" onClick={() => run('email')} className="bg-amber text-background hover:bg-amber/90 h-8">
            <Search className="w-3 h-3 mr-1" /> Open the case (email)
          </Button>
          <Button size="sm" variant="outline" onClick={() => run('linkedin')} className="h-8 border-amber/50 text-amber hover:bg-amber/10">
            <Linkedin className="w-3 h-3 mr-1" /> LinkedIn version
          </Button>
          <ReadAloudButton
            text="Detective Mode. Reads every scrap on this lead, picks the single best angle from their leaks and gaps, shows the deduction from point A to point B, then writes the message in Aetheris voice."
            label="Listen"
            className="h-8 border-amber/40 text-amber hover:bg-amber/10"
          />
        </div>
      </div>
    );
  }

  if (loading) {
    const runningStep = prepSteps.find((s) => s.status === 'running');
    const activeLabel = runningStep?.label || 'Cross-referencing signals…';
    const thoughtWords = ['scan', 'leaks', 'gaps', 'stack', 'roles', 'revenue', 'evidence', 'angle', 'verdict', 'message'];
    return (
      <div className="rounded-lg border-2 border-amber/40 bg-gradient-to-br from-amber/10 to-transparent p-4 space-y-3 overflow-hidden">
        {/* Animated brain visualization */}
        <div className="relative h-32 rounded-md bg-background/40 border border-amber/20 overflow-hidden">
          {/* scanline */}
          <div className="absolute inset-x-0 top-0 h-px bg-amber/60 shadow-[0_0_8px_hsl(var(--amber))] animate-[detective-scan_2.4s_linear_infinite]" />
          {/* grid */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(to right, hsl(var(--amber)/0.25) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--amber)/0.25) 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          />
          {/* brain SVG */}
          <svg viewBox="0 0 200 120" className="absolute inset-0 w-full h-full">
            <defs>
              <radialGradient id="brainGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(var(--amber))" stopOpacity="0.45" />
                <stop offset="100%" stopColor="hsl(var(--amber))" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* soft glow */}
            <circle cx="100" cy="60" r="48" fill="url(#brainGlow)">
              <animate attributeName="r" values="40;52;40" dur="2.2s" repeatCount="indefinite" />
            </circle>
            {/* brain hemispheres */}
            <g
              fill="none"
              stroke="hsl(var(--amber))"
              strokeWidth="1.4"
              strokeLinecap="round"
              style={{ filter: 'drop-shadow(0 0 4px hsl(var(--amber)/0.6))' }}
            >
              <path d="M100 22 C 70 22, 52 40, 52 60 C 52 82, 72 98, 100 98 L 100 22 Z" opacity="0.85" />
              <path d="M100 22 C 130 22, 148 40, 148 60 C 148 82, 128 98, 100 98 L 100 22 Z" opacity="0.85" />
              {/* folds — left */}
              <path d="M60 48 C 70 44, 80 50, 88 46" opacity="0.7" />
              <path d="M58 62 C 70 58, 82 66, 92 60" opacity="0.7" />
              <path d="M62 78 C 72 74, 84 82, 94 76" opacity="0.7" />
              {/* folds — right */}
              <path d="M112 46 C 120 50, 130 44, 140 48" opacity="0.7" />
              <path d="M108 60 C 118 66, 130 58, 142 62" opacity="0.7" />
              <path d="M106 76 C 116 82, 128 74, 138 78" opacity="0.7" />
            </g>
            {/* synapse nodes firing */}
            {[
              { cx: 70, cy: 48, d: '0s' },
              { cx: 88, cy: 62, d: '0.4s' },
              { cx: 110, cy: 50, d: '0.8s' },
              { cx: 130, cy: 70, d: '1.2s' },
              { cx: 96, cy: 82, d: '1.6s' },
              { cx: 76, cy: 76, d: '2s' },
            ].map((n, i) => (
              <g key={i}>
                <circle cx={n.cx} cy={n.cy} r="2" fill="hsl(var(--amber))">
                  <animate attributeName="r" values="1.5;4;1.5" dur="1.6s" begin={n.d} repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;1;0.4" dur="1.6s" begin={n.d} repeatCount="indefinite" />
                </circle>
              </g>
            ))}
            {/* connecting pulses */}
            <g stroke="hsl(var(--amber))" strokeWidth="0.8" opacity="0.55">
              <line x1="70" y1="48" x2="88" y2="62">
                <animate attributeName="opacity" values="0.1;0.8;0.1" dur="1.6s" repeatCount="indefinite" />
              </line>
              <line x1="88" y1="62" x2="110" y2="50">
                <animate attributeName="opacity" values="0.1;0.8;0.1" dur="1.6s" begin="0.3s" repeatCount="indefinite" />
              </line>
              <line x1="110" y1="50" x2="130" y2="70">
                <animate attributeName="opacity" values="0.1;0.8;0.1" dur="1.6s" begin="0.6s" repeatCount="indefinite" />
              </line>
              <line x1="130" y1="70" x2="96" y2="82">
                <animate attributeName="opacity" values="0.1;0.8;0.1" dur="1.6s" begin="0.9s" repeatCount="indefinite" />
              </line>
              <line x1="96" y1="82" x2="76" y2="76">
                <animate attributeName="opacity" values="0.1;0.8;0.1" dur="1.6s" begin="1.2s" repeatCount="indefinite" />
              </line>
            </g>
          </svg>
          {/* floating thought words */}
          <div className="absolute inset-0 pointer-events-none">
            {thoughtWords.map((w, i) => (
              <span
                key={w}
                className="absolute text-[9px] font-mono uppercase tracking-wider text-amber/70"
                style={{
                  left: `${8 + ((i * 11) % 80)}%`,
                  top: `${10 + ((i * 19) % 75)}%`,
                  animation: `detective-float 3.2s ease-in-out ${i * 0.25}s infinite`,
                }}
              >
                {w}
              </span>
            ))}
          </div>
          {/* status badge */}
          <div className="absolute bottom-1.5 left-2 right-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-amber bg-background/70 backdrop-blur-sm rounded px-2 py-1 border border-amber/30">
            <Brain className="w-3 h-3 animate-pulse" />
            <span className="truncate">{activeLabel}</span>
            <span className="ml-auto inline-flex gap-0.5">
              <span className="w-1 h-1 rounded-full bg-amber animate-[detective-dot_1.2s_ease-in-out_infinite]" />
              <span className="w-1 h-1 rounded-full bg-amber animate-[detective-dot_1.2s_ease-in-out_0.2s_infinite]" />
              <span className="w-1 h-1 rounded-full bg-amber animate-[detective-dot_1.2s_ease-in-out_0.4s_infinite]" />
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Loader2 className="w-4 h-4 text-amber animate-spin flex-shrink-0" />
          <div>
            <p className="text-sm font-display font-semibold text-foreground">Working the case…</p>
            <p className="text-[11px] text-muted-foreground">Detective is talking to themself. Auto-running the toolbar.</p>
          </div>
        </div>

        {/* Live self-talk — the detective muttering as it works */}
        <div className="rounded-md border border-amber/25 bg-background/60 p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[9px] font-mono uppercase tracking-wider text-amber/80 flex items-center gap-1">
              <Brain className="w-3 h-3" /> internal monologue · live
            </p>
            <span className="text-[9px] font-mono text-muted-foreground/60">{selfTalk.length} thoughts</span>
          </div>
          <div ref={talkScrollRef} className="max-h-36 overflow-y-auto space-y-1 pr-1">
            {selfTalk.map((line, i) => {
              const isLast = i === selfTalk.length - 1;
              return (
                <p
                  key={`${i}-${line.slice(0, 8)}`}
                  className={`text-[11.5px] leading-snug font-case italic animate-fade-in ${
                    isLast ? 'text-amber' : 'text-muted-foreground/70'
                  }`}
                >
                  <span className="text-amber/50 mr-1.5 not-italic">›</span>
                  {line}
                  {isLast && <span className="inline-block w-1.5 h-3 ml-0.5 bg-amber/80 align-middle animate-pulse" />}
                </p>
              );
            })}
          </div>
        </div>

        {prepSteps.length > 0 && (
          <ul className="space-y-1.5 pl-1">
            {prepSteps.map((s) => (
              <li key={s.key} className="flex items-center gap-2 text-[11px]">
                {s.status === 'running' && <Loader2 className="w-3 h-3 text-amber animate-spin flex-shrink-0" />}
                {s.status === 'done' && <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
                {s.status === 'pending' && <span className="w-3 h-3 rounded-full border border-muted-foreground/40 flex-shrink-0" />}
                {s.status === 'fail' && <span className="w-3 h-3 rounded-full bg-red-500/60 flex-shrink-0" />}
                {s.status === 'skip' && <span className="w-3 h-3 rounded-full bg-muted flex-shrink-0" />}
                <span className={s.status === 'done' ? 'text-foreground' : 'text-muted-foreground'}>{s.label}</span>
                {s.note && <span className="text-[10px] text-amber/70 font-mono">· {s.note}</span>}
              </li>
            ))}
          </ul>
        )}
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
        <div className="flex gap-1 items-center">
          <ReadAloudButton
            text={buildCaseText(r)}
            label="Listen"
            className="h-7 text-[10px] border-amber/40 text-amber hover:bg-amber/10"
          />
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

        {/* Verdict — stamped index card */}
        {r.best_angle && (
          <div className="relative rounded-md border-2 border-amber/60 bg-[hsl(var(--background))]/80 p-4 shadow-[0_4px_20px_-8px_hsl(var(--amber)/0.5)] -rotate-[0.6deg]">
            {/* pin */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-crimson shadow-[0_0_8px_hsl(var(--crimson)/0.8)] border border-crimson-deep" />
            {/* stamp */}
            <div className="absolute -top-2 -right-2 rotate-12 px-2 py-0.5 border-2 border-crimson text-crimson font-case text-[9px] font-bold uppercase tracking-widest bg-background/70">
              <span className="flex items-center gap-1"><Stamp className="w-2.5 h-2.5" /> prime suspect</span>
            </div>
            <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-amber/80 mb-1.5">Case verdict · {(lead as any)?.business_name || 'subject'}</p>
            <p className="text-base font-forensic font-semibold text-foreground leading-tight">{r.best_angle.title || r.best_angle.leak_or_gap}</p>
            {r.best_angle.leak_or_gap && r.best_angle.title && r.best_angle.leak_or_gap !== r.best_angle.title && (
              <p className="text-xs text-muted-foreground mt-1.5"><span className="text-crimson/90 font-mono uppercase tracking-wider text-[10px]">Leak:</span> {r.best_angle.leak_or_gap}{r.best_angle.estimated_cost ? <span className="text-crimson font-case"> · ~{r.best_angle.estimated_cost}/yr bleeding</span> : null}</p>
            )}
            {r.best_angle.why_this_one && <p className="text-xs text-muted-foreground/90 mt-2 leading-relaxed border-t border-amber/20 pt-2 italic">{r.best_angle.why_this_one}</p>}
          </div>
        )}

        {/* Deduction trail — pinned clues connected by string */}
        {r.deduction_chain && r.deduction_chain.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-3.5 h-3.5 text-amber" />
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber">The trail of clues</p>
              <span className="text-[9px] font-mono text-muted-foreground/60">· follow the string</span>
            </div>
            <ol className="relative space-y-3 pl-6">
              {/* the string */}
              <div className="absolute left-[10px] top-2 bottom-2 w-px bg-gradient-to-b from-amber/60 via-amber/30 to-amber/60" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, hsl(var(--amber)/0.7) 0 4px, transparent 4px 8px)' }} />
              {r.deduction_chain.map((s, i) => {
                const tilt = i % 2 === 0 ? '-rotate-[0.4deg]' : 'rotate-[0.5deg]';
                return (
                  <li key={i} className="relative">
                    {/* thumbtack on the string */}
                    <div className="absolute -left-6 top-3 flex items-center justify-center w-5 h-5 rounded-full bg-amber/20 border border-amber/50 shadow-[0_0_6px_hsl(var(--amber)/0.4)]">
                      <span className="text-[9px] font-case font-bold text-amber">{String(s.step || i + 1).padStart(2, '0')}</span>
                    </div>
                    <div className={`rounded-sm border border-border/60 bg-[hsl(var(--card))]/70 backdrop-blur-sm p-2.5 shadow-md ${tilt} hover:rotate-0 transition-transform`}>
                      <p className="text-[9px] font-mono uppercase tracking-wider text-amber/70 mb-1">Clue #{String(s.step || i + 1).padStart(2, '0')}</p>
                      <div className="flex flex-col gap-1">
                        <p className="text-[11px] text-muted-foreground/80 font-case">spotted: <span className="text-muted-foreground">{s.from}</span></p>
                        <div className="flex items-center gap-1.5 text-[10px] text-amber/80">
                          <ArrowDown className="w-3 h-3" /><span className="font-mono uppercase tracking-wider">therefore</span>
                        </div>
                        <p className="text-[12.5px] text-foreground font-display font-medium leading-snug">{s.to}</p>
                      </div>
                      {s.evidence && (
                        <div className="mt-2 pt-2 border-t border-dashed border-border/50">
                          <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60 mb-0.5">Evidence pinned</p>
                          <p className="text-[11px] text-foreground/80 italic leading-relaxed">"{s.evidence}"</p>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {/* Deeper forensics — pinned reserve notes */}
        {r.deeper_forensics && r.deeper_forensics.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Pin className="w-3.5 h-3.5 text-amber" />
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber">Hold in reserve · play these on the reply</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {r.deeper_forensics.map((b, i) => (
                <div key={i} className={`relative rounded-sm border border-amber/25 bg-[hsl(var(--background))]/60 p-2.5 pl-3 ${i % 2 === 0 ? '-rotate-[0.5deg]' : 'rotate-[0.5deg]'} hover:rotate-0 transition-transform shadow-sm`}>
                  <div className="absolute -top-1 left-3 w-2 h-2 rounded-full bg-amber/80 shadow-[0_0_4px_hsl(var(--amber)/0.7)]" />
                  <p className="text-[11px] text-foreground/90 leading-relaxed font-case">{b}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* The message */}
        {msg.body && (
          <div className="rounded-md border border-amber/40 bg-background/80 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-mono uppercase tracking-wider text-amber flex items-center gap-1">
                {channel === 'email' ? <Mail className="w-3 h-3" /> : <Linkedin className="w-3 h-3" />} The message
              </p>
              <div className="flex items-center gap-1">
                <ReadAloudButton
                  text={[msg.subject ? `Subject: ${msg.subject}.` : '', msg.body || '', msg.why_it_lands ? `Why it lands: ${msg.why_it_lands}` : ''].filter(Boolean).join(' ')}
                  label="Listen"
                  className="h-6 text-[10px] border-amber/40 text-amber hover:bg-amber/10"
                />
                <Button size="sm" variant="ghost" onClick={() => copy(fullMsg, 'msg')} className="h-6 text-[10px] text-amber hover:text-amber">
                  {copied === 'msg' ? <><Check className="w-3 h-3 mr-1" /> Copied</> : <><Copy className="w-3 h-3 mr-1" /> Copy</>}
                </Button>
              </div>
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
