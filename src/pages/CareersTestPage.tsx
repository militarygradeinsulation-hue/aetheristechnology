import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Timer, CheckCircle2, XCircle, Upload, Copy, BookOpen, AlertTriangle } from 'lucide-react';

type Choice = { id: string; text: string };
type Question = { id: string; question: string; choices: Choice[] };
type Phase = 'intro' | 'identify' | 'in_test' | 'graded' | 'apply' | 'done';

const STUDY_LINKS = [
  { href: '/', label: 'Home — positioning & hook' },
  { href: '/leak-audit', label: 'The Leak Audit (free self-scan)' },
  { href: '/services', label: 'Services & pricing ladder' },
  { href: '/careers', label: 'Careers (commission structure)' },
];

const CareersTestPage = () => {
  const [contactOpen, setContactOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('intro');
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [result, setResult] = useState<{ passed: boolean; score_pct: number; correct: number; total: number; share_code?: string | null; expired?: boolean } | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [appNotes, setAppNotes] = useState('');
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (phase === 'in_test') {
      tickRef.current = window.setInterval(() => setNow(Date.now()), 1000);
      return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
    }
  }, [phase]);

  const remainingMs = expiresAt ? Math.max(0, new Date(expiresAt).getTime() - now) : 0;
  const remaining = useMemo(() => {
    const m = Math.floor(remainingMs / 60000);
    const s = Math.floor((remainingMs % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, [remainingMs]);

  useEffect(() => {
    if (phase === 'in_test' && remainingMs <= 0 && expiresAt) {
      submit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingMs, phase]);

  const startTest = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast({ title: 'Name and email required', variant: 'destructive' }); return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('careers-test', {
        body: { action: 'start', name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      setAttemptId((data as any).attempt_id);
      setQuestions((data as any).questions);
      setExpiresAt((data as any).expires_at);
      setNow(Date.now());
      setAnswers({});
      setPhase('in_test');
    } catch (e) {
      toast({ title: 'Could not start', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const submit = async (auto = false) => {
    if (!attemptId) return;
    if (!auto && Object.keys(answers).length < questions.length) {
      if (!confirm(`You've answered ${Object.keys(answers).length}/${questions.length}. Submit anyway?`)) return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('careers-test', {
        body: { action: 'submit', attempt_id: attemptId, answers, notes },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(data as any);
      setPhase((data as any).passed ? 'apply' : 'graded');
    } catch (e) {
      toast({ title: 'Submit failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const noteWordCount = useMemo(() => appNotes.trim().split(/\s+/).filter(Boolean).length, [appNotes]);
  const MIN_NOTE_WORDS = 150;

  const submitApplication = async () => {
    if (!result?.share_code) return;
    if (!resumeFile) {
      toast({ title: 'Resume required', description: 'Upload your resume (PDF or DOC) to apply.', variant: 'destructive' });
      return;
    }
    if (noteWordCount < MIN_NOTE_WORDS) {
      toast({ title: 'Note too short', description: `Write at least ${MIN_NOTE_WORDS} words on why I should interview you (currently ${noteWordCount}).`, variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      let resumePath: string | null = null;
      if (resumeFile) {
        const { data: signed, error: sErr } = await supabase.functions.invoke('careers-test', {
          body: { action: 'upload_resume_url', share_code: result.share_code, filename: resumeFile.name },
        });
        if (sErr) throw new Error(sErr.message);
        if ((signed as any)?.error) throw new Error((signed as any).error);
        resumePath = (signed as any).path;
        const { error: upErr } = await supabase.storage.from('careers-resumes')
          .uploadToSignedUrl(resumePath!, (signed as any).token, resumeFile);
        if (upErr) throw upErr;
      }
      const { data, error } = await supabase.functions.invoke('careers-test', {
        body: { action: 'finalize_application', share_code: result.share_code, resume_path: resumePath, resume_filename: resumeFile?.name, notes: appNotes },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      setPhase('done');
    } catch (e) {
      toast({ title: 'Could not submit application', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  return (
    <div className="relative min-h-screen">
      <SEOHead title="Careers Test — Aetheris AI" description="Take the 20-question knowledge test to apply as a sales rep." path="/careers/test" />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setContactOpen(true)} />
        <div className="pt-24 pb-32 px-4 max-w-3xl mx-auto">

          {phase === 'intro' && (
            <Card className="bg-card/60 backdrop-blur border-border/50 premium-tile">
              <CardHeader>
                <CardTitle className="font-display text-3xl">Sales Rep Knowledge Test</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  We don't accept random applications. To prove you've read the site, you'll take a 25-question multiple-choice test pulled from a 60-question bank. Score <strong>80%+</strong> in <strong>50 minutes</strong>. <strong>5 attempts per day</strong>. Answer order is randomized per attempt — guessing one letter won't pass.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="font-mono uppercase text-[10px] tracking-[0.3em] text-amber flex items-center gap-2"><BookOpen className="w-3.5 h-3.5" /> Study these first</div>
                  <div className="flex flex-wrap gap-2">
                    {STUDY_LINKS.map(l => (
                      <a
                        key={l.href}
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="premium-tile rounded-full px-4 py-2 text-xs font-case uppercase tracking-widest text-amber hover:text-amber/80 border border-amber/30 transition-colors"
                      >
                        {l.label}
                      </a>
                    ))}
                  </div>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                  <li>Topics: positioning, Leak Audit, pricing ($149 Snapshot · $599 Eval · $2,500 Forensic Diagnostic · Fractional retainers), commission (15% flat, recurring for life), sales process, brand rules.</li>
                  <li>Questions are randomized. No back-tracking once submitted.</li>
                  <li>Pass &rarr; you'll get a unique <strong>code</strong> + a resume upload form. Save the code — it's how I review you.</li>
                </ul>
                <Button size="lg" className="bg-amber text-background hover:bg-amber/90" onClick={() => setPhase('identify')}>I've studied. Start the test &rarr;</Button>
              </CardContent>
            </Card>
          )}

          {phase === 'identify' && (
            <Card className="bg-card/60 backdrop-blur border-border/50">
              <CardHeader><CardTitle className="font-display text-2xl">Who are you?</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><Label>Full name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} maxLength={100} /></div>
                  <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} maxLength={255} /></div>
                </div>
                <div><Label>Phone (optional)</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} maxLength={20} /></div>
                <div className="rounded-lg border border-amber/30 bg-amber/5 p-3 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber shrink-0 mt-0.5" />
                  <span>Once you click below, your <strong>50-minute timer</strong> starts. You get <strong>5 submitted attempts per day</strong>.</span>
                </div>
                <Button onClick={startTest} disabled={loading} className="bg-amber text-background hover:bg-amber/90">
                  {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Timer className="w-4 h-4 mr-1" />}
                  Start 50-minute test
                </Button>
              </CardContent>
            </Card>
          )}

          {phase === 'in_test' && (
            <div className="space-y-4">
              <div className="sticky top-16 z-20 flex items-center justify-between gap-2 px-3 py-1.5 rounded-md border border-border/50 bg-card/90 backdrop-blur shadow-sm">
                <div className="text-xs font-mono">{Object.keys(answers).length}/{questions.length}</div>
                <div className={`text-xs font-mono px-2 py-0.5 rounded ${remainingMs < 5 * 60000 ? 'bg-destructive/20 text-destructive' : 'bg-amber/15 text-amber'}`}>
                  <Timer className="w-3 h-3 inline mr-1" /> {remaining}
                </div>
              </div>
              {questions.map((q, idx) => (
                <Card key={q.id} className="bg-card/60 backdrop-blur border-border/50">
                  <CardContent className="p-4 space-y-2">
                    <p className="text-sm font-mono text-muted-foreground">Q{idx + 1}</p>
                    <p className="font-semibold">{q.question}</p>
                    <div className="space-y-1.5">
                      {q.choices.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setAnswers(a => ({ ...a, [q.id]: c.id }))}
                          className={`w-full text-left px-3 py-2 rounded border text-sm transition-colors ${
                            answers[q.id] === c.id
                              ? 'border-amber bg-amber/10 text-foreground'
                              : 'border-border/50 hover:border-amber/40 text-muted-foreground'
                          }`}
                        >
                          <span className="font-mono text-xs mr-2 uppercase">{c.id}.</span> {c.text}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Card className="bg-card/60 backdrop-blur border-border/50">
                <CardContent className="p-4 space-y-2">
                  <Label>Anything you want me to know? (optional, sent to admin)</Label>
                  <Textarea rows={3} maxLength={4000} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Why you, what you'll bring, what jumped out from the site..." />
                </CardContent>
              </Card>
              <Button onClick={() => submit(false)} disabled={loading} size="lg" className="w-full bg-amber text-background hover:bg-amber/90">
                {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Submit test
              </Button>
            </div>
          )}

          {phase === 'graded' && result && (
            <Card className="bg-card/60 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="font-display text-2xl flex items-center gap-2">
                  <XCircle className="w-6 h-6 text-destructive" /> {result.expired ? 'Time expired' : "You didn't pass"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p>Score: <strong>{result.score_pct}%</strong> ({result.correct}/{result.total}). Pass mark: 80%.</p>
                <p className="text-sm text-muted-foreground">You can try again — up to 5 attempts per day. Re-read the site first; the questions test what's actually on it.</p>
                <Button variant="outline" onClick={() => { setPhase('intro'); setResult(null); setAnswers({}); setNotes(''); }}>Go back to intro</Button>
              </CardContent>
            </Card>
          )}

          {phase === 'apply' && result?.share_code && (
            <Card className="bg-card/60 backdrop-blur border-amber/40">
              <CardHeader>
                <CardTitle className="font-display text-2xl flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-green-400" /> You passed — {result.score_pct}%
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-amber bg-amber/10 p-4">
                  <p className="text-xs uppercase font-mono text-amber mb-1">Your share code (save it)</p>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-mono font-bold text-amber tracking-widest">{result.share_code}</span>
                    <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(result.share_code!); toast({ title: 'Copied' }); }}>
                      <Copy className="w-3 h-3 mr-1" /> Copy
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">I'll use this code to pull up your test results, resume, and notes. Don't lose it.</p>
                </div>
                <div className="space-y-2">
                  <Label>Upload your resume (PDF/DOC, max 10 MB) <span className="text-destructive">*</span></Label>
                  <Input type="file" accept=".pdf,.doc,.docx" onChange={e => setResumeFile(e.target.files?.[0] || null)} />
                  {resumeFile && <p className="text-xs text-muted-foreground">Selected: {resumeFile.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Why should I invite you to an interview? <span className="text-destructive">*</span> <span className="text-xs text-muted-foreground font-normal">(minimum {MIN_NOTE_WORDS} words)</span></Label>
                  <Textarea rows={8} maxLength={4000} value={appNotes} onChange={e => setAppNotes(e.target.value)} placeholder="Tell me what jumped out from the site, why you specifically, what you'll bring, and how you'd open your first 5 conversations. Be specific — generic answers get rejected." />
                  <p className={`text-xs font-mono ${noteWordCount >= MIN_NOTE_WORDS ? 'text-green-400' : 'text-amber'}`}>
                    {noteWordCount} / {MIN_NOTE_WORDS} words {noteWordCount >= MIN_NOTE_WORDS ? '✓' : `(${MIN_NOTE_WORDS - noteWordCount} more needed)`}
                  </p>
                </div>
                <Button onClick={submitApplication} disabled={loading || !resumeFile || noteWordCount < MIN_NOTE_WORDS} className="bg-amber text-background hover:bg-amber/90">
                  {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                  Submit application
                </Button>
              </CardContent>
            </Card>
          )}

          {phase === 'done' && result?.share_code && (
            <Card className="bg-card/60 backdrop-blur border-border/50">
              <CardContent className="p-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
                <h2 className="font-display text-2xl">Submitted</h2>
                <p className="text-muted-foreground">I'll review your application and reach out if it's a fit.</p>
                <Badge className="bg-amber text-background text-base font-mono">Code: {result.share_code}</Badge>
              </CardContent>
            </Card>
          )}

        </div>
        <Footer />
      </div>
      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
};

export default CareersTestPage;
