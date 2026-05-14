import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ContactModal } from '@/components/ContactModal';
import { StripeEmbeddedCheckout } from '@/components/StripeEmbeddedCheckout';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, ArrowRight, Search, Building2, FileText, Sparkles, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';

type Brief = {
  company_name?: string;
  one_liner?: string;
  industry?: string;
  stage?: string;
  size_estimate?: string;
  mission?: string;
  values?: string[];
  culture_signals?: string[];
  hiring_posture?: string;
  tech_stack_or_specialties?: string[];
  ideal_candidate_traits?: string[];
  watch_outs?: string[];
};

type Analysis = {
  candidate_name?: string;
  headline?: string;
  years_experience?: number;
  executive_summary?: string;
  fit_score?: number;
  fit_band?: string;
  culture_alignment?: { point: string; evidence: string; rating: string }[];
  capability_match?: { requirement: string; evidence: string; rating: string }[];
  strengths?: string[];
  risk_flags?: string[];
  interview_questions?: string[];
  recommended_next_steps?: string;
  recommendation?: string;
};

const PACKS = [
  { id: 'resume_scan_1', label: '1 Scan', price: '$20', perScan: '$20/scan', credits: 1, highlight: false },
  { id: 'resume_scan_5', label: '5-Pack', price: '$80', perScan: '$16/scan · save $20', credits: 5, highlight: true },
  { id: 'resume_scan_10', label: '10-Pack', price: '$150', perScan: '$15/scan · save $50', credits: 10, highlight: false },
];

export default function ResumeForensicsPage() {
  const [contactOpen, setContactOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [credits, setCredits] = useState<number | null>(null);
  const [checkingCredits, setCheckingCredits] = useState(false);
  const [checkoutPriceId, setCheckoutPriceId] = useState<string | null>(null);

  const [companyUrl, setCompanyUrl] = useState('');
  const [brief, setBrief] = useState<Brief | null>(null);
  const [scanningCompany, setScanningCompany] = useState(false);

  const [roleTitle, setRoleTitle] = useState('');
  const [roleNotes, setRoleNotes] = useState('');

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  async function checkCredits() {
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast.error('Enter a valid email');
      return;
    }
    setCheckingCredits(true);
    try {
      const { data, error } = await supabase.functions.invoke('resume-credits-check', { body: { email } });
      if (error) throw error;
      setCredits(data?.credits_remaining ?? 0);
    } catch (e: any) {
      toast.error(e?.message || 'Could not check credits');
    } finally {
      setCheckingCredits(false);
    }
  }

  async function scanCompany() {
    if (!companyUrl) { toast.error('Enter a company website'); return; }
    setScanningCompany(true);
    setBrief(null);
    try {
      const { data, error } = await supabase.functions.invoke('resume-company-scan', { body: { url: companyUrl } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setBrief(data?.brief || {});
      toast.success(data?.cached ? 'Loaded cached company brief' : 'Company scanned');
    } catch (e: any) {
      toast.error(e?.message || 'Company scan failed');
    } finally {
      setScanningCompany(false);
    }
  }

  async function runScan() {
    if (!resumeFile) { toast.error('Upload a resume'); return; }
    if (!email) { toast.error('Email required'); return; }
    if (!brief) { toast.error('Scan the company first'); return; }
    if (!roleTitle) { toast.error('Enter the role title'); return; }
    setScanning(true);
    setAnalysis(null);
    try {
      const fd = new FormData();
      fd.append('file', resumeFile);
      fd.append('email', email);
      fd.append('company_url', companyUrl);
      fd.append('role_title', roleTitle);
      fd.append('role_notes', roleNotes);
      fd.append('brief', JSON.stringify(brief));

      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/resume-public-scan`;
      const r = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: fd,
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `Scan failed (${r.status})`);
      setAnalysis(j.analysis);
      setCredits((c) => (c == null ? c : Math.max(0, c - 1)));
      toast.success('Scan complete');
      setTimeout(() => document.getElementById('scan-results')?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e: any) {
      toast.error(e?.message || 'Scan failed');
    } finally {
      setScanning(false);
    }
  }

  const score = analysis?.fit_score ?? null;
  const scoreColor = score == null ? 'text-foreground' : score < 50 ? 'text-crimson' : score < 70 ? 'text-amber' : 'text-emerald-400';

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Resume Forensics — $20 AI Culture-Fit Scan | Aetheris"
        description="Live AI tool. Paste any company URL, upload a resume, get a forensic culture-fit score in 90 seconds. $20 per scan. No account required."
        path="/resume-forensics"
        keywords="resume analysis, AI culture fit, hiring tool, resume screener, candidate evaluation"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Resume Forensics', path: '/resume-forensics' }]}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setContactOpen(true)} />
        <main className="px-4 pb-24 pt-12">
          <div className="max-w-5xl mx-auto">

            {/* Hero */}
            <div className="text-center mb-10">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-3">
                Resume Forensics · Live tool
              </div>
              <h1 className="font-forensic text-4xl md:text-6xl font-bold text-foreground mb-4">
                Hire wrong, your business <span className="text-crimson">starts leaking</span>.
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Run any resume against any company in 90 seconds. Multi-page company scan, role-context analysis, blunt fit score. <span className="text-amber font-semibold">$20 per scan.</span>
              </p>
            </div>

            {/* STEP 1 — Email + credits */}
            <section className="premium-tile rounded-sm border border-amber/30 p-6 md:p-8 mb-6">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">Step 1 · Identify</div>
              <h2 className="font-forensic text-2xl font-bold mb-4">Your email</h2>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={checkCredits} disabled={checkingCredits || !email} variant="outline">
                  {checkingCredits ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check credits'}
                </Button>
              </div>
              {credits !== null && (
                <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
                  <div className="font-case text-sm">
                    <span className="text-muted-foreground">Scan credits remaining:</span>{' '}
                    <span className={`font-bold text-lg ${credits > 0 ? 'text-amber' : 'text-crimson'}`}>{credits}</span>
                  </div>
                  {credits === 0 && (
                    <Badge variant="outline" className="border-crimson text-crimson">No credits — buy a pack below</Badge>
                  )}
                </div>
              )}
            </section>

            {/* PACKS — always visible */}
            <section className="mb-6">
              <div className="grid md:grid-cols-3 gap-4">
                {PACKS.map((p) => (
                  <div
                    key={p.id}
                    className={`premium-tile rounded-sm border p-5 flex flex-col ${p.highlight ? 'border-amber' : 'border-amber/20'}`}
                  >
                    {p.highlight && (
                      <div className="font-case text-[9px] uppercase tracking-widest text-amber mb-2">
                        Most popular
                      </div>
                    )}
                    <div className="font-forensic text-xl font-bold mb-1">{p.label}</div>
                    <div className="text-3xl font-bold text-amber mb-1">{p.price}</div>
                    <div className="font-case text-xs text-muted-foreground mb-4">{p.perScan}</div>
                    <Button
                      onClick={() => {
                        if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
                          toast.error('Enter your email above first');
                          return;
                        }
                        setCheckoutPriceId(p.id);
                      }}
                      className="mt-auto"
                      variant={p.highlight ? 'default' : 'outline'}
                    >
                      Buy {p.credits} {p.credits === 1 ? 'scan' : 'scans'}
                    </Button>
                  </div>
                ))}
              </div>
            </section>

            {/* STEP 2 — Company */}
            <section className="premium-tile rounded-sm border border-amber/30 p-6 md:p-8 mb-6">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">Step 2 · Scan target company</div>
              <h2 className="font-forensic text-2xl font-bold mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5" /> Company website
              </h2>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="url"
                  placeholder="https://acme.com"
                  value={companyUrl}
                  onChange={(e) => setCompanyUrl(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={scanCompany} disabled={scanningCompany || !companyUrl}>
                  {scanningCompany ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scanning…</>
                  ) : (
                    <><Search className="h-4 w-4 mr-2" /> Scan company</>
                  )}
                </Button>
              </div>

              {brief && (
                <div className="mt-6 grid md:grid-cols-2 gap-4 text-sm">
                  <Field label="Company" value={brief.company_name} />
                  <Field label="Industry / stage" value={[brief.industry, brief.stage].filter(Boolean).join(' · ')} />
                  <Field label="One-liner" value={brief.one_liner} full />
                  <Field label="Mission" value={brief.mission} full />
                  <ListField label="Values" items={brief.values} />
                  <ListField label="Culture signals" items={brief.culture_signals} />
                  <ListField label="Ideal candidate traits" items={brief.ideal_candidate_traits} full />
                  <ListField label="Watch-outs" items={brief.watch_outs} full crimson />
                </div>
              )}
            </section>

            {/* STEP 3 — Role */}
            <section className="premium-tile rounded-sm border border-amber/30 p-6 md:p-8 mb-6">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">Step 3 · Role context</div>
              <h2 className="font-forensic text-2xl font-bold mb-4">What are you hiring for?</h2>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="role-title">Role title</Label>
                  <Input
                    id="role-title"
                    placeholder="e.g. Senior Account Executive — Manufacturing"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="role-notes">Notes <span className="text-muted-foreground">(priorities, deal-breakers, seniority, comp range, etc.)</span></Label>
                  <Textarea
                    id="role-notes"
                    rows={4}
                    placeholder="Must own a $1.5M quota. Must have CRM rigor. No agency-only backgrounds. Remote, US only…"
                    value={roleNotes}
                    onChange={(e) => setRoleNotes(e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* STEP 4 — Resume + run */}
            <section className="premium-tile rounded-sm border border-amber/30 p-6 md:p-8 mb-6">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">Step 4 · Upload resume</div>
              <h2 className="font-forensic text-2xl font-bold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" /> Candidate resume
              </h2>
              <Input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
              />
              {resumeFile && (
                <div className="mt-2 font-case text-xs text-muted-foreground">
                  {resumeFile.name} · {(resumeFile.size / 1024).toFixed(0)} KB
                </div>
              )}
              <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
                <div className="font-case text-xs text-muted-foreground">
                  This scan will use <span className="text-amber font-bold">1 credit</span>.
                </div>
                <Button
                  size="lg"
                  onClick={runScan}
                  disabled={scanning || !resumeFile || !brief || !roleTitle || !email || credits === 0}
                  className="font-bold"
                >
                  {scanning ? (
                    <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Running forensic scan…</>
                  ) : (
                    <><Sparkles className="h-5 w-5 mr-2" /> Run scan</>
                  )}
                </Button>
              </div>
              {credits === 0 && (
                <div className="mt-3 text-sm text-crimson font-case">No credits remaining — buy a pack above.</div>
              )}
            </section>

            {/* RESULTS */}
            {analysis && (
              <section id="scan-results" className="premium-tile rounded-sm border border-amber p-6 md:p-10 mb-6">
                <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">Forensic result</div>
                <div className="grid md:grid-cols-3 gap-6 items-start mb-6">
                  <div className="md:col-span-2">
                    <h2 className="font-forensic text-3xl font-bold mb-2">{analysis.candidate_name || 'Candidate'}</h2>
                    <div className="text-muted-foreground mb-2">{analysis.headline}</div>
                    <Badge variant="outline" className="border-amber text-amber">{analysis.fit_band}</Badge>
                  </div>
                  <div className="text-center md:text-right">
                    <div className={`font-forensic text-7xl font-bold ${scoreColor}`}>{score ?? '?'}</div>
                    <div className="font-case text-xs uppercase tracking-widest text-muted-foreground">Fit score / 100</div>
                    <div className="font-case text-sm text-amber mt-1">{analysis.recommendation}</div>
                  </div>
                </div>

                <p className="text-foreground/90 mb-6 leading-relaxed">{analysis.executive_summary}</p>

                <div className="grid md:grid-cols-2 gap-6">
                  <RatingList title="Culture alignment" icon={<CheckCircle2 className="h-4 w-4" />} items={analysis.culture_alignment} keyName="point" />
                  <RatingList title="Capability match" icon={<CheckCircle2 className="h-4 w-4" />} items={analysis.capability_match} keyName="requirement" />
                </div>

                <div className="grid md:grid-cols-2 gap-6 mt-6">
                  <div>
                    <h3 className="font-forensic text-xl font-bold mb-2 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Strengths</h3>
                    <ul className="space-y-1 text-sm">
                      {(analysis.strengths || []).map((s, i) => <li key={i} className="text-foreground/90">• {s}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-forensic text-xl font-bold mb-2 flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-crimson" /> Risk flags</h3>
                    <ul className="space-y-1 text-sm">
                      {(analysis.risk_flags || []).map((s, i) => <li key={i} className="text-foreground/90">• {s}</li>)}
                    </ul>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="font-forensic text-xl font-bold mb-2">Sharp interview questions</h3>
                  <ol className="space-y-1 text-sm list-decimal list-inside">
                    {(analysis.interview_questions || []).map((q, i) => <li key={i} className="text-foreground/90">{q}</li>)}
                  </ol>
                </div>

                {analysis.recommended_next_steps && (
                  <div className="mt-6 border-l-2 border-amber pl-4">
                    <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-1">Next steps</div>
                    <p className="text-foreground/90">{analysis.recommended_next_steps}</p>
                  </div>
                )}

                {/* Follow-up CTA per fit band */}
                <div className="mt-8 pt-6 border-t border-amber/20">
                  {score !== null && score !== undefined && score >= 70 && (
                    <CTA
                      eyebrow="Lock this hire in"
                      title="Stress-test your hiring system before they start."
                      body="A great resume hides bad onboarding. Run our $2,500 Forensic Diagnostic and we'll find the leaks before your new hire steps on them."
                      href="/leak-audit"
                      cta="Book the Forensic Diagnostic"
                    />
                  )}
                  {score !== null && score !== undefined && score >= 40 && score < 70 && (
                    <CTA
                      eyebrow="Borderline candidate"
                      title="Don't gamble on a 50/50 hire."
                      body="Book a 15-minute review with the operator. We'll pressure-test the resume and the role spec together."
                      onClick={() => setContactOpen(true)}
                      cta="Book a 15-min review"
                    />
                  )}
                  {score !== null && score !== undefined && score < 40 && (
                    <CTA
                      eyebrow="This one's leaking before day 1"
                      title="The candidate isn't the problem — your filter is."
                      body="If your top of funnel is producing this, you have a sourcing leak. Run the free Leak Audit™."
                      href="/leak-audit"
                      cta="Run the Leak Audit"
                      crimson
                    />
                  )}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button variant="outline" onClick={() => { setAnalysis(null); setResumeFile(null); }}>
                    Scan another resume
                  </Button>
                  <Button variant="outline" onClick={() => setCheckoutPriceId('resume_scan_5')}>
                    Buy more scans
                  </Button>
                </div>
              </section>
            )}
          </div>
        </main>
        <Footer />
      </div>

      <Dialog open={!!checkoutPriceId} onOpenChange={(o) => !o && setCheckoutPriceId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resume Forensics — Buy scan credits</DialogTitle>
          </DialogHeader>
          {checkoutPriceId && (
            <StripeEmbeddedCheckout
              priceId={checkoutPriceId}
              customerEmail={email}
              returnUrl={`${window.location.origin}/resume-forensics?session_id={CHECKOUT_SESSION_ID}&purchased=1`}
              metadata={{ priceId: checkoutPriceId, product_name: 'Resume Forensics scans' }}
            />
          )}
        </DialogContent>
      </Dialog>

      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
}

function Field({ label, value, full }: { label: string; value?: string; full?: boolean }) {
  if (!value) return null;
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-1">{label}</div>
      <div className="text-foreground/90">{value}</div>
    </div>
  );
}

function ListField({ label, items, full, crimson }: { label: string; items?: string[]; full?: boolean; crimson?: boolean }) {
  if (!items || items.length === 0) return null;
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <div className={`font-case text-[10px] uppercase tracking-widest mb-1 ${crimson ? 'text-crimson' : 'text-amber'}`}>{label}</div>
      <ul className="text-foreground/90 space-y-0.5">
        {items.map((it, i) => <li key={i}>• {it}</li>)}
      </ul>
    </div>
  );
}

function RatingList({ title, icon, items, keyName }: { title: string; icon: React.ReactNode; items?: any[]; keyName: string }) {
  return (
    <div>
      <h3 className="font-forensic text-xl font-bold mb-2 flex items-center gap-2">{icon} {title}</h3>
      <ul className="space-y-2 text-sm">
        {(items || []).map((it, i) => (
          <li key={i} className="border-l-2 border-amber/40 pl-3">
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold text-foreground">{it[keyName]}</span>
              <Badge
                variant="outline"
                className={
                  it.rating === 'high' ? 'border-emerald-400 text-emerald-400' :
                  it.rating === 'low' ? 'border-crimson text-crimson' :
                  'border-amber text-amber'
                }
              >
                {it.rating}
              </Badge>
            </div>
            {it.evidence && <div className="text-xs text-muted-foreground mt-0.5">{it.evidence}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CTA({ eyebrow, title, body, href, cta, onClick, crimson }: {
  eyebrow: string; title: string; body: string; href?: string; cta: string; onClick?: () => void; crimson?: boolean;
}) {
  const inner = (
    <>
      <span>{cta}</span>
      <ArrowRight className="h-4 w-4 ml-2" />
    </>
  );
  return (
    <div className={`p-5 rounded-sm border ${crimson ? 'border-crimson/40 bg-crimson/5' : 'border-amber/40 bg-amber/5'}`}>
      <div className={`font-case text-[10px] uppercase tracking-widest mb-1 ${crimson ? 'text-crimson' : 'text-amber'}`}>{eyebrow}</div>
      <h3 className="font-forensic text-xl font-bold mb-1">{title}</h3>
      <p className="text-foreground/90 mb-3 text-sm">{body}</p>
      {href ? (
        <Button asChild variant={crimson ? 'destructive' : 'default'}>
          <Link to={href}>{inner}</Link>
        </Button>
      ) : (
        <Button onClick={onClick} variant={crimson ? 'destructive' : 'default'}>{inner}</Button>
      )}
    </div>
  );
}
