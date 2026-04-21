import React, { useState } from 'react';
import { PostImageGenerator } from '@/components/admin/PostImageGenerator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Lock, Copy, Check, Globe, X, FileText, Droplets, Stethoscope, PenLine, Swords, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { StripeEmbeddedCheckout } from './StripeEmbeddedCheckout';
import { toast } from '@/hooks/use-toast';
import { saveToAdminLibrary } from '@/lib/adminLibrary';
import { Badge } from '@/components/ui/badge';

const PHASES = [
  { label: 'Running forensic scan...', target: 18 },
  { label: 'Building Case Files...', target: 38 },
  { label: 'Identifying leak patterns...', target: 55 },
  { label: 'Writing field notes...', target: 72 },
  { label: 'Drafting contrarian positions...', target: 88 },
  { label: 'Assembling weekly rotation...', target: 98 },
];

const FORMAT_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  case_file: { icon: <FileText className="w-4 h-4" />, label: 'Case File', color: 'bg-amber/20 text-amber border-amber/30' },
  leak_of_week: { icon: <Droplets className="w-4 h-4" />, label: 'Leak of the Week', color: 'bg-crimson/20 text-crimson border-crimson/30' },
  diagnostic: { icon: <Stethoscope className="w-4 h-4" />, label: 'Dead Simple Diagnostic', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  operators_journal: { icon: <PenLine className="w-4 h-4" />, label: "Operator's Journal", color: 'bg-muted text-muted-foreground border-border' },
  contrarian: { icon: <Swords className="w-4 h-4" />, label: 'The Contrarian', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
};

/* ── Format-specific renderers ── */

const CaseFileCard = ({ post, visible, copyFn, copiedId, id }: any) => (
  <div className={`relative glass rounded-lg p-5 border border-border ${!visible ? 'select-none' : ''}`}>
    {!visible && <LockedOverlay />}
    <div className="flex items-center gap-2 mb-3">
      <Badge variant="outline" className={FORMAT_META.case_file.color + ' text-xs font-mono'}>{FORMAT_META.case_file.icon}<span className="ml-1">{post.caseId || 'CASE FILE'}</span></Badge>
      <span className="text-xs font-mono text-crimson font-bold tracking-wider">STATUS: {post.status || 'ACTIVE'}</span>
    </div>
    <div className="space-y-3 text-sm">
      <div><span className="font-mono text-xs text-muted-foreground tracking-wider">THE FINDING</span><p className="text-foreground font-bold mt-1">{post.finding}</p></div>
      <div><span className="font-mono text-xs text-muted-foreground tracking-wider">THE EVIDENCE</span><p className="text-muted-foreground mt-1">{post.evidence}</p></div>
      <div><span className="font-mono text-xs text-muted-foreground tracking-wider">THE MATH</span><p className="text-amber font-bold mt-1">{post.math}</p></div>
      <div><span className="font-mono text-xs text-muted-foreground tracking-wider">THE FIX</span><p className="text-muted-foreground mt-1 italic">{post.fixTease}</p></div>
      <div className="border-t border-border pt-2"><span className="font-mono text-xs text-muted-foreground tracking-wider">THE LESSON</span><p className="text-foreground mt-1">{post.lesson}</p></div>
    </div>
    {visible && <CopyBtn copyFn={copyFn} id={id} copiedId={copiedId} text={`${post.finding}\n\n${post.evidence}\n\n${post.math}\n\n${post.fixTease}\n\n${post.lesson}`} />}
  </div>
);

const LeakCard = ({ post, visible, copyFn, copiedId, id }: any) => (
  <div className={`relative glass rounded-lg p-5 border border-crimson/30 ${!visible ? 'select-none' : ''}`}>
    {!visible && <LockedOverlay />}
    <Badge variant="outline" className={FORMAT_META.leak_of_week.color + ' text-xs mb-3'}>{FORMAT_META.leak_of_week.icon}<span className="ml-1">Leak of the Week</span></Badge>
    <h4 className="text-lg font-bold text-crimson mb-2">{post.leakName}</h4>
    <p className="text-sm text-muted-foreground mb-3">{post.definition}</p>
    {post.signs?.length > 0 && (
      <div className="mb-3">
        <span className="font-mono text-xs text-muted-foreground tracking-wider">SIGNS TO WATCH</span>
        <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-1">
          {post.signs.map((s: string, i: number) => <li key={i}>{s}</li>)}
        </ul>
      </div>
    )}
    <div><span className="font-mono text-xs text-muted-foreground tracking-wider">HOW TO SPOT IT</span><p className="text-sm text-foreground mt-1">{post.spotIt}</p></div>
    {visible && <CopyBtn copyFn={copyFn} id={id} copiedId={copiedId} text={`${post.leakName}\n\n${post.definition}\n\n${post.signs?.join('\n')}\n\n${post.spotIt}`} />}
  </div>
);

const DiagnosticCard = ({ post, visible, copyFn, copiedId, id }: any) => (
  <div className={`relative glass rounded-lg p-5 border border-blue-500/30 ${!visible ? 'select-none' : ''}`}>
    {!visible && <LockedOverlay />}
    <Badge variant="outline" className={FORMAT_META.diagnostic.color + ' text-xs mb-3'}>{FORMAT_META.diagnostic.icon}<span className="ml-1">60-Second Diagnostic</span></Badge>
    <h4 className="text-lg font-bold text-foreground mb-2">{post.testName}</h4>
    <div className="mb-3"><span className="font-mono text-xs text-muted-foreground tracking-wider">THE TEST</span><p className="text-sm text-muted-foreground whitespace-pre-line mt-1">{post.test}</p></div>
    <div className="mb-3"><span className="font-mono text-xs text-muted-foreground tracking-wider">THE THRESHOLD</span><p className="text-sm text-amber font-semibold mt-1">{post.threshold}</p></div>
    <div><span className="font-mono text-xs text-muted-foreground tracking-wider">WHAT IT MEANS</span><p className="text-sm text-foreground mt-1">{post.whatItMeans}</p></div>
    {visible && <CopyBtn copyFn={copyFn} id={id} copiedId={copiedId} text={`${post.testName}\n\n${post.test}\n\n${post.threshold}\n\n${post.whatItMeans}`} />}
  </div>
);

const JournalCard = ({ post, visible }: any) => (
  <div className={`relative glass rounded-lg p-5 border border-border ${!visible ? 'select-none' : ''}`}>
    {!visible && <LockedOverlay />}
    <Badge variant="outline" className={FORMAT_META.operators_journal.color + ' text-xs mb-3'}>{FORMAT_META.operators_journal.icon}<span className="ml-1">Field Note</span></Badge>
    <p className="text-sm text-muted-foreground whitespace-pre-line font-mono leading-relaxed">{post.body}</p>
  </div>
);

const ContrarianCard = ({ post, visible, copyFn, copiedId, id }: any) => (
  <div className={`relative glass rounded-lg p-5 border border-purple-500/30 ${!visible ? 'select-none' : ''}`}>
    {!visible && <LockedOverlay />}
    <Badge variant="outline" className={FORMAT_META.contrarian.color + ' text-xs mb-3'}>{FORMAT_META.contrarian.icon}<span className="ml-1">Contrarian</span></Badge>
    <div className="space-y-3 text-sm">
      <div><span className="font-mono text-xs text-muted-foreground tracking-wider">THE CLAIM</span><p className="text-foreground font-bold mt-1">{post.claim}</p></div>
      <div><span className="font-mono text-xs text-muted-foreground tracking-wider">THE EVIDENCE</span><p className="text-muted-foreground mt-1">{post.evidence}</p></div>
      <div><span className="font-mono text-xs text-muted-foreground tracking-wider">THE COUNTER</span><p className="text-muted-foreground mt-1 italic">{post.counter}</p></div>
      <div className="border-t border-border pt-2"><span className="font-mono text-xs text-muted-foreground tracking-wider">THE POSITION</span><p className="text-foreground font-semibold mt-1">{post.position}</p></div>
    </div>
    {visible && <CopyBtn copyFn={copyFn} id={id} copiedId={copiedId} text={`${post.claim}\n\n${post.evidence}\n\n${post.counter}\n\n${post.position}`} />}
  </div>
);

const LockedOverlay = () => (
  <div className="absolute inset-0 backdrop-blur-md bg-background/60 rounded-lg z-10 flex items-center justify-center">
    <Lock className="w-5 h-5 text-muted-foreground" />
  </div>
);

const CopyBtn = ({ copyFn, id, copiedId, text }: { copyFn: (t: string, id: string) => void; id: string; copiedId: string | null; text: string }) => (
  <Button variant="ghost" size="sm" className="absolute top-2 right-2" onClick={() => copyFn(text, id)}>
    {copiedId === id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
  </Button>
);

/* ── Main Component ── */

export const SocialContentGenerator: React.FC<{ adminMode?: boolean }> = ({ adminMode = false }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phaseLabel, setPhaseLabel] = useState('');
  const [result, setResult] = useState<any>(null);
  const [unlocked, setUnlocked] = useState(adminMode);
  const [showCheckout, setShowCheckout] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setProgress(0);
    setResult(null);

    let phase = 0;
    const interval = setInterval(() => {
      if (phase < PHASES.length) {
        setPhaseLabel(PHASES[phase].label);
        const target = PHASES[phase].target;
        setProgress((prev) => Math.min(prev + Math.random() * 8 + 4, target));
        phase++;
      }
    }, 3000);

    try {
      const { data, error } = await supabase.functions.invoke('generate-social-content', {
        body: { url: url.trim() },
      });
      clearInterval(interval);
      if (error || !data) throw new Error(error?.message || 'Failed to generate');
      setProgress(100);
      setPhaseLabel('Done!');
      setTimeout(() => setResult(data), 500);
      if (adminMode) {
        saveToAdminLibrary({
          tool_type: 'social_content',
          title: `${data.businessName || url.trim()} — ${new Date().toLocaleDateString()}`,
          input_data: { url: url.trim() },
          output_data: data,
        }).catch(e => console.error('Library save failed:', e));
      }
    } catch (err: any) {
      clearInterval(interval);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      setLoading(false);
      setProgress(0);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: 'Copied!' });
  };

  const sections = [
    { key: 'case_file', dataKey: 'caseFiles', title: 'The Case File', desc: 'Flagship forensic case studies — find the leak, show the math, tease the fix' },
    { key: 'leak_of_week', dataKey: 'leakOfTheWeek', title: 'Leak of the Week', desc: 'Name one specific leak pattern. Define it. Show the signs.' },
    { key: 'diagnostic', dataKey: 'deadSimpleDiagnostics', title: 'Dead Simple Diagnostic', desc: 'One 60-second test. Shareable. Saveable.' },
    { key: 'operators_journal', dataKey: 'operatorsJournal', title: "Operator's Journal", desc: 'Field notes. Unpolished. Personal. No CTA.' },
    { key: 'contrarian', dataKey: 'contrarians', title: 'The Contrarian', desc: 'One defensible dissent. Pattern-recognition, not rage-bait.' },
  ];

  const renderFormatPost = (post: any, index: number, sectionKey: string, visible: boolean) => {
    const id = `${sectionKey}-${index}`;
    const props = { post, visible, copyFn: copyToClipboard, copiedId, id };

    switch (sectionKey) {
      case 'case_file': return <CaseFileCard key={id} {...props} />;
      case 'leak_of_week': return <LeakCard key={id} {...props} />;
      case 'diagnostic': return <DiagnosticCard key={id} {...props} />;
      case 'operators_journal': return <JournalCard key={id} post={post} visible={visible} />;
      case 'contrarian': return <ContrarianCard key={id} {...props} />;
      default: return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Input */}
      {!result && !loading && (
        <div className="glass rounded-xl p-8 border border-border">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="w-6 h-6 text-amber" />
            <h2 className="text-2xl font-bold text-foreground font-display">Enter Your Website</h2>
          </div>
          <p className="text-muted-foreground mb-6">We'll scan your site and generate a Forensic Content Pack — 7 posts across five formats, each built to find a leak, name a leak, or fix a leak.</p>
          <div className="flex gap-3">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourbusiness.com" className="flex-1" onKeyDown={(e) => e.key === 'Enter' && handleGenerate()} />
            <Button onClick={handleGenerate} className="bg-amber hover:bg-amber/90 text-background font-bold px-8">Run Forensic Scan</Button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && !result && (
        <div className="glass rounded-xl p-8 border border-border text-center">
          <p className="text-amber font-semibold mb-4">{phaseLabel}</p>
          <Progress value={progress} className="h-3 mb-2" />
          <p className="text-sm text-muted-foreground">{Math.round(progress)}%</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground font-display mb-2">
              Forensic Content Pack: <span className="text-amber">{result.businessName || 'Your Business'}</span>
            </h2>
            <p className="text-muted-foreground">7 forensic posts + weekly rotation — five formats, each finds a leak, names a leak, or fixes a leak</p>
          </div>

          {/* Format Sections */}
          {sections.map(({ key, dataKey, title, desc }) => {
            const posts = result[dataKey];
            if (!posts?.length) return null;
            const meta = FORMAT_META[key];
            return (
              <div key={key}>
                <div className="flex items-center gap-2 mb-1">
                  {meta.icon}
                  <h3 className="text-xl font-bold text-foreground font-display">{title}</h3>
                  <span className="text-sm text-muted-foreground">({posts.length})</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{desc}</p>
                <div className="grid md:grid-cols-2 gap-4">
                  {posts.map((p: any, i: number) => renderFormatPost(p, i, key, unlocked || i < 1))}
                </div>
              </div>
            );
          })}

          {/* Weekly Schedule */}
          {result.weeklySchedule?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-amber" />
                <h3 className="text-xl font-bold text-foreground font-display">Weekly Rotation</h3>
              </div>
              <div className="grid sm:grid-cols-7 gap-2">
                {result.weeklySchedule.map((entry: any, i: number) => (
                  <div key={i} className="glass rounded-lg p-3 border border-border text-center">
                    <p className="font-bold text-foreground text-xs mb-1">{entry.day}</p>
                    <Badge variant="outline" className={`text-xs mb-1 ${FORMAT_META[entry.format]?.color || 'bg-muted text-muted-foreground'}`}>
                      {FORMAT_META[entry.format]?.label || entry.format}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground leading-tight">{entry.goal}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Paywall */}
          {!unlocked && !adminMode && (
            <div className="glass rounded-xl p-8 border-2 border-amber/40 text-center">
              <Lock className="w-8 h-8 text-amber mx-auto mb-3" />
              <h3 className="text-2xl font-bold text-foreground font-display mb-2">Unlock Full Forensic Pack</h3>
              <p className="text-muted-foreground mb-4">Get all 7 forensic posts — Case Files, Leak of the Week, Diagnostics, Field Notes, and Contrarian takes — plus the weekly rotation.</p>
              <p className="text-3xl font-bold text-amber mb-4">$29</p>
              <Button onClick={() => setShowCheckout(true)} className="bg-amber hover:bg-amber/90 text-background font-bold px-10 py-3 text-lg">
                Unlock Now
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && !adminMode && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 relative">
            <Button variant="ghost" size="icon" className="absolute top-3 right-3" onClick={() => setShowCheckout(false)}>
              <X className="w-5 h-5" />
            </Button>
            <h3 className="text-xl font-bold mb-4">Complete Purchase</h3>
            <StripeEmbeddedCheckout
              priceId="social_content_pack_once"
              returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&type=tool_purchase`}
              metadata={{ tool_type: 'social_content' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
